import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Image, Dimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../services/theme';
import { loadDeletedFolders, saveDeletedFolders, saveFolders, loadFolders, loadDeletedReels, saveDeletedReels } from '../services/folderStore';
import { deleteReel } from '../services/api';

const { width } = Dimensions.get('window');
const CARD_MARGIN = 6;
const CARD_WIDTH = (width - spacing.md * 2 - CARD_MARGIN * 2) / 2;

export default function TrashScreen({ navigation }) {
  const [deletedFolders, setDeletedFolders] = useState([]);
  const [deletedReels, setDeletedReels] = useState([]);
  const [tab, setTab] = useState('reels'); // 'reels' | 'folders'

  useFocusEffect(
    useCallback(() => {
      loadDeletedFolders().then(setDeletedFolders);
      loadDeletedReels().then(setDeletedReels);
    }, [])
  );

  const handleRestoreFolder = (folder) => {
    Alert.alert('Restaurar', `Restaurar a pasta "${folder.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Restaurar', onPress: async () => {
          const newDeleted = deletedFolders.filter(f => f.id !== folder.id);
          setDeletedFolders(newDeleted);
          await saveDeletedFolders(newDeleted);
          
          const currentFolders = await loadFolders();
          await saveFolders([...currentFolders, { ...folder, deleted_at: undefined }]);
      }}
    ]);
  };

  const handleRestoreReel = (reel) => {
    Alert.alert('Restaurar', `Restaurar o reel "${reel.title || 'Inspiração'}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Restaurar', onPress: async () => {
          const newDeleted = deletedReels.filter(r => r.id !== reel.id);
          setDeletedReels(newDeleted);
          await saveDeletedReels(newDeleted);
          // O reel voltará a aparecer na HomeScreen pois aHomeScreen busca da API
          // Se a API for mockada, precisaríamos reativar, mas por enquanto remover da lixeira basta
      }}
    ]);
  };

  const handlePermanentDeleteReel = (reel) => {
    Alert.alert('Excluir Definitivamente', `Esta ação não pode ser desfeita. Excluir?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
          const newDeleted = deletedReels.filter(r => r.id !== reel.id);
          setDeletedReels(newDeleted);
          await saveDeletedReels(newDeleted);
          try {
            await deleteReel(reel.id); // deleta do backend pra valer
          } catch(e) {}
      }}
    ]);
  };

  const renderFolder = ({ item }) => (
    <View style={styles.folderRow}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Ionicons name="folder-outline" size={20} color={colors.textTertiary} />
        <Text style={styles.folderName}>{item.name}</Text>
      </View>
      <TouchableOpacity onPress={() => handleRestoreFolder(item)} style={styles.restoreBtn}>
        <Ionicons name="refresh" size={18} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );

  const renderReel = ({ item, index }) => (
    <View style={[styles.card, {
      marginLeft: index % 2 === 0 ? spacing.md : CARD_MARGIN,
      marginRight: index % 2 === 0 ? CARD_MARGIN : spacing.md,
    }]}>
      <View style={[styles.thumbnail, { backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center' }]}>
        {item.thumbnail ? (
          <Image source={{ uri: item.thumbnail }} style={StyleSheet.absoluteFill} />
        ) : (
          <Ionicons name="videocam-outline" size={24} color={colors.border} />
        )}
        <View style={styles.cardOverlay}>
          <TouchableOpacity style={styles.actionIcon} onPress={() => handleRestoreReel(item)}>
            <Ionicons name="refresh" size={20} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionIcon, { backgroundColor: '#FF4444' }]} onPress={() => handlePermanentDeleteReel(item)}>
            <Ionicons name="trash" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.title || 'Inspiração'}</Text>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="trash-outline" size={64} color={colors.border} />
      <Text style={styles.emptyText}>A lixeira está vazia</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, tab === 'reels' && styles.tabActive]} onPress={() => setTab('reels')}>
          <Text style={[styles.tabText, tab === 'reels' && styles.tabTextActive]}>Reels</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'folders' && styles.tabActive]} onPress={() => setTab('folders')}>
          <Text style={[styles.tabText, tab === 'folders' && styles.tabTextActive]}>Pastas</Text>
        </TouchableOpacity>
      </View>

      {tab === 'folders' ? (
        <FlatList
          data={deletedFolders}
          keyExtractor={i => i.id}
          renderItem={renderFolder}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={{ padding: spacing.lg }}
        />
      ) : (
        <FlatList
          data={deletedReels}
          keyExtractor={i => i.id}
          renderItem={renderReel}
          numColumns={2}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={{ paddingVertical: spacing.lg }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, paddingVertical: 16, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.primary },
  tabText: { fontSize: 15, color: colors.textSecondary, fontWeight: '500' },
  tabTextActive: { color: colors.primary, fontWeight: '600' },
  
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyText: { ...typography.body, color: colors.textTertiary, marginTop: 16 },

  folderRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, backgroundColor: '#F9F9F9', borderRadius: radius.md, marginBottom: 8
  },
  folderName: { fontSize: 16, color: colors.text, marginLeft: 12 },
  restoreBtn: { backgroundColor: colors.primary, padding: 8, borderRadius: 20 },

  card: { width: CARD_WIDTH, marginBottom: spacing.md },
  thumbnail: { width: '100%', height: CARD_WIDTH * 1.3, borderRadius: radius.md, overflow: 'hidden' },
  cardInfo: { paddingVertical: spacing.xs, paddingHorizontal: 4 },
  cardTitle: { fontSize: 13, fontWeight: '500', color: colors.text },
  cardOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  actionIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }
});
