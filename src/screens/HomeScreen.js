import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Image, Alert, TextInput, KeyboardAvoidingView, Platform, Dimensions, LayoutAnimation, Modal, Pressable
} from 'react-native';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography, shadows } from '../services/theme';
import { fetchReels, saveReel, waitForJob, deleteReel, assignReelToFolder, updateReel } from '../services/api';
import { loadDeletedReels, saveDeletedReels, loadFolders } from '../services/folderStore';
import ReelSkeleton from '../components/ReelSkeleton';

const { width } = Dimensions.get('window');
const CARD_MARGIN = 6;
const CARD_WIDTH = (width - spacing.md * 2 - CARD_MARGIN * 2) / 2;

export default function HomeScreen({ navigation }) {
  const route = useRoute();
  const filterParams = route.params?.filter || 'home';

  const [reels,       setReels]       = useState([]);
  const [refreshing,  setRefreshing]  = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [hasMore,     setHasMore]     = useState(true);
  const [offset,      setOffset]      = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [url,         setUrl]         = useState('');
  const [processing,  setProcessing]  = useState(false);
  const [step,        setStep]        = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  const [selectedReel, setSelectedReel] = useState(null);
  const [isActionModalVisible, setIsActionModalVisible] = useState(false);
  
  const [folders, setFolders] = useState([]);
  const [isFolderModalVisible, setIsFolderModalVisible] = useState(false);

  const abortControllerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  const getPageTitle = useCallback(() => {
    switch (filterParams) {
      case 'liked': return 'Favoritos';
      case 'archived': return 'Arquivo';
      case 'tags': return 'Tags';
      case 'folder': return route.params?.folderName || 'Pasta';
      default: return 'Todos os Reels';
    }
  }, [filterParams, route.params]);

  useEffect(() => {
    navigation.setOptions({
      headerTitle: isSearchVisible 
        ? () => (
            <TextInput
              style={{
                backgroundColor: colors.background, borderRadius: 8, paddingHorizontal: 12, 
                height: 36, width: width * 0.55, fontSize: 14, color: colors.text
              }}
              placeholder="Buscar inspiração..."
              placeholderTextColor={colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus={true}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
            />
          )
        : getPageTitle(),
      headerRight: () => (
        <TouchableOpacity 
          onPress={() => {
            setIsSearchVisible(prev => {
              if (prev) setSearchQuery('');
              return !prev;
            });
          }}
          style={{ marginRight: 16 }}
        >
          <Ionicons name={isSearchVisible ? "close" : "search"} size={22} color={colors.text} />
        </TouchableOpacity>
      )
    });
  }, [navigation, isSearchVisible, searchQuery, getPageTitle]);

  const load = async (reset = false) => {
    if (!reset && (!hasMore || loading)) return;
    
    if (reset) setLoading(true);
    try {
      const currentOffset = reset ? 0 : offset;
      
      const isLiked = filterParams === 'liked';
      const isArchived = filterParams === 'archived';
      const folderId = filterParams === 'folder' ? route.params?.folderId : null;
      
      const data = await fetchReels(20, currentOffset, searchQuery, isLiked, isArchived, folderId);
      
      setHasMore(data.length === 20);
      setReels(prev => reset ? data : [...prev, ...data]);
      setOffset(currentOffset + 20);
    } catch {}
    finally { 
      setLoading(false); 
      setRefreshing(false); 
    }
  };

  useFocusEffect(
    useCallback(() => {
      load(true);
    }, [searchQuery, filterParams])
  );

  const handleSave = async () => {
    const trimmed = url.trim();
    if (!trimmed || !trimmed.includes('instagram.com')) {
      Alert.alert('URL inválida', 'Cole um link válido do Instagram Reels.');
      return;
    }
    setProcessing(true);
    setStep('Iniciando...');
    abortControllerRef.current = new AbortController();
    
    try {
      const jobId = await saveReel(trimmed);
      const reel  = await waitForJob(jobId, setStep, abortControllerRef.current.signal);
      
      if (filterParams === 'folder' && route.params?.folderId) {
        setStep('Movendo para a pasta...');
        await assignReelToFolder(reel.id, route.params.folderId);
      }
      
      setReels(prev => {
        if (!prev.find(r => r.id === reel.id)) return [reel, ...prev];
        return prev;
      });
      setUrl('');
    } catch (e) {
      if (e.message !== 'Cancelado pelo usuário') {
        Alert.alert('Erro ao processar', e.message);
      }
    } finally {
      setProcessing(false);
      setStep('');
    }
  };

  const handleActionMenu = (reel) => {
    setSelectedReel(reel);
    setIsActionModalVisible(true);
  };

  const showToast = (msg) => {
    Alert.alert('Sucesso', msg);
  };

  const handleLike = async () => {
    setIsActionModalVisible(false);
    const newLiked = !selectedReel.is_liked;
    setReels(prev => prev.map(r => r.id === selectedReel.id ? { ...r, is_liked: newLiked } : r));
    await updateReel(selectedReel.id, { is_liked: newLiked });
  };

  const handleArchive = async () => {
    setIsActionModalVisible(false);
    const newArchived = !selectedReel.is_archived;
    setReels(prev => prev.filter(r => r.id !== selectedReel.id));
    await updateReel(selectedReel.id, { is_archived: newArchived });
    showToast(newArchived ? 'Movido para o Arquivo' : 'Removido do Arquivo');
  };

  const handleTag = () => {
    setIsActionModalVisible(false);
    Alert.prompt('Adicionar Tag', 'Digite as tags separadas por vírgula:', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salvar', onPress: async (text) => {
          if(!text) return;
          await updateReel(selectedReel.id, { tags: text });
          showToast('Tag adicionada!');
      }}
    ]);
  };

  const handleMove = async () => {
    setIsActionModalVisible(false);
    const loaded = await loadFolders();
    setFolders(loaded);
    setIsFolderModalVisible(true);
  };

  const handleSelectFolder = async (folderId) => {
    setIsFolderModalVisible(false);
    await assignReelToFolder(selectedReel.id, folderId);
    
    // Se estivermos na "Home", não removemos o Reel, ele apenas ganhou uma tag de pasta
    // Mas se o usuário estivesse dentro de uma pasta X e moveu para Y, poderíamos remover.
    // Como a lógica principal é "adicionar cópia", vamos apenas notificar sucesso.
    showToast('Reel salvo na pasta!');
  };

  const handleDeleteToTrash = async () => {
    setIsActionModalVisible(false);
    Alert.alert('Excluir Reel', 'Deseja enviar este Reel para a Lixeira?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
          setReels(prev => prev.filter(r => r.id !== selectedReel.id));
          const trash = await loadDeletedReels();
          await saveDeletedReels([...trash, { ...selectedReel, deleted_at: new Date().toISOString() }]);
          showToast('Enviado para a lixeira.');
      }}
    ]);
  };

  const renderReel = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      onPress={() => navigation.navigate('Detail', { reel: item })}
    >
      <View style={styles.thumbContainer}>
        {item.thumbnail
          ? <Image source={{ uri: item.thumbnail }} style={styles.thumb} />
          : <View style={[styles.thumb, { backgroundColor: '#F0F0F0' }]} />
        }
      </View>
      <View style={styles.cardInfo}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle} numberOfLines={2}>{item.central_theme || item.title || 'Inspiração'}</Text>
          <Text style={styles.cardAuthor} numberOfLines={1}>{item.author}</Text>
        </View>
        <TouchableOpacity style={{ padding: 4 }} onPress={() => handleActionMenu(item)}>
          <Ionicons name="ellipsis-vertical" size={16} color={colors.textTertiary} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => {
    if (loading) return null;
    let msg = 'Sua biblioteca está vazia.\nQue tal colar um link para começar?';
    if (filterParams === 'folder') msg = 'Esta pasta está vazia.';
    if (filterParams === 'liked') msg = 'Você ainda não favoritou nenhum Reel.';
    if (filterParams === 'archived') msg = 'O arquivo está vazio.';
    if (searchQuery) msg = 'Nenhum resultado encontrado.';

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="albums-outline" size={64} color={colors.border} />
        <Text style={styles.emptyText}>{msg}</Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {(filterParams === 'home' || filterParams === 'folder') && (
        <View style={styles.inputSection}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={url}
              onChangeText={setUrl}
              placeholder="Cole o link do Instagram aqui..."
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleSave}
              editable={!processing}
            />
            <TouchableOpacity
              style={[styles.saveBtn, (!url || processing) && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={!url || processing}
            >
              <Ionicons name="add" size={18} color="white" />
              <Text style={styles.saveBtnText}>{processing ? step : 'Salvar'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {!isSearchVisible && (
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>{getPageTitle()}</Text>
        </View>
      )}

      <FlatList
        data={reels}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        renderItem={renderReel}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={{ paddingVertical: spacing.md, paddingHorizontal: spacing.md - CARD_MARGIN }}
        columnWrapperStyle={styles.row}
        onEndReached={() => load(false)}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loading && offset > 0 ? <ReelSkeleton /> : null}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(true); }}
            tintColor={colors.primary}
          />
        }
      />

      <Modal visible={isActionModalVisible} transparent={true} animationType="fade" onRequestClose={() => setIsActionModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setIsActionModalVisible(false)}>
          <Pressable style={styles.bottomSheet}>
            <View style={styles.sheetHandle} />
            <TouchableOpacity style={styles.actionOption} onPress={handleLike}>
              <Ionicons name={selectedReel?.is_liked ? "heart" : "heart-outline"} size={22} color={selectedReel?.is_liked ? '#FF3B30' : colors.textSecondary} />
              <Text style={[styles.actionOptionText, selectedReel?.is_liked && { color: '#FF3B30' }]}>
                {selectedReel?.is_liked ? 'Descurtir' : 'Curtir'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionOption} onPress={handleTag}>
              <Ionicons name="pricetag-outline" size={22} color={colors.textSecondary} />
              <Text style={styles.actionOptionText}>Adicionar Tag</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionOption} onPress={handleMove}>
              <Ionicons name="folder-outline" size={22} color={colors.textSecondary} />
              <Text style={styles.actionOptionText}>Mover para Pasta</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionOption} onPress={handleArchive}>
              <Ionicons name="archive-outline" size={22} color={colors.textSecondary} />
              <Text style={styles.actionOptionText}>{selectedReel?.is_archived ? 'Desarquivar' : 'Arquivar'}</Text>
            </TouchableOpacity>
            <View style={styles.actionDivider} />
            <TouchableOpacity style={styles.actionOption} onPress={handleDeleteToTrash}>
              <Ionicons name="trash-outline" size={22} color="#FF3B30" />
              <Text style={[styles.actionOptionText, { color: '#FF3B30' }]}>Excluir (Mover p/ Lixeira)</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={isFolderModalVisible} transparent={true} animationType="fade" onRequestClose={() => setIsFolderModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setIsFolderModalVisible(false)}>
          <Pressable style={styles.bottomSheet}>
            <Text style={styles.bottomSheetTitle}>Salvar na Pasta</Text>
            {folders.length === 0 ? (
              <Text style={{ textAlign: 'center', color: colors.textTertiary, marginVertical: 16 }}>Nenhuma pasta criada.</Text>
            ) : (
              <FlatList 
                data={folders}
                keyExtractor={f => f.id}
                style={{ maxHeight: 300 }}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.folderOption} onPress={() => handleSelectFolder(item.id)}>
                    <Ionicons name="folder-outline" size={20} color={colors.textSecondary} />
                    <Text style={styles.folderOptionText}>{item.name}</Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: colors.background },
  inputSection: { paddingHorizontal: spacing.md, marginTop: spacing.md, marginBottom: 8 },
  inputRow:     { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input:        { flex: 1, backgroundColor: colors.background, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 16, height: 48, fontSize: 13, color: colors.text, ...shadows.soft },
  saveBtn:      { backgroundColor: colors.primary, borderRadius: radius.full, paddingHorizontal: 20, height: 48, flexDirection: 'row', alignItems: 'center', gap: 6, ...shadows.soft },
  saveBtnDisabled: { opacity: 0.3 },
  saveBtnText:  { color: 'white', fontWeight: '500', fontSize: 13 },
  pageHeader:   { paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  pageTitle:    { ...typography.h1, fontSize: 28 },
  row:          { justifyContent: 'space-between' },
  card:         { width: CARD_WIDTH, marginBottom: spacing.lg, marginHorizontal: CARD_MARGIN },
  thumbContainer: { width: '100%', height: CARD_WIDTH * 1.35, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.tag, marginBottom: 10, ...shadows.soft },
  thumb:        { width: '100%', height: '100%', resizeMode: 'cover' },
  cardInfo:     { paddingVertical: spacing.xs, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  cardTitle:    { fontSize: 13, fontWeight: '500', color: colors.text, marginBottom: 2 },
  cardAuthor:   { fontSize: 11, color: colors.textTertiary },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyText:    { ...typography.body, color: colors.textTertiary, marginTop: 16, textAlign: 'center' },
  modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  bottomSheet:  { backgroundColor: colors.background, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: Platform.OS === 'ios' ? 40 : spacing.lg },
  sheetHandle:  { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  actionOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  actionOptionText: { fontSize: 16, marginLeft: 16, color: colors.text },
  actionDivider: { height: 1, backgroundColor: colors.border, marginVertical: 8 },
  bottomSheetTitle: { ...typography.h2, fontSize: 16, textAlign: 'center', marginBottom: spacing.md },
  folderOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  folderOptionText: { fontSize: 15, color: colors.textSecondary, marginLeft: 12, fontWeight: '500' },
});
