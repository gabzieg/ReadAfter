import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Image, Alert, TextInput, KeyboardAvoidingView, Platform, Modal, Pressable
} from 'react-native';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography, fonts } from '../services/theme';
import { fetchReels, saveReel, waitForJob, deleteReel, assignReelToFolder, updateReel } from '../services/api';
import { loadDeletedReels, saveDeletedReels, loadFolders } from '../services/folderStore';
import ReelSkeleton from '../components/ReelSkeleton';

// Tempo de leitura estimado (estilo "18 min" do Instapaper)
function readingTime(reel) {
  const text = reel.full_transcript || reel.transcript || reel.summary || '';
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  return Math.max(1, Math.round(words / 200));
}

// Excerpt limpo para o card
function excerptOf(reel) {
  const raw = reel.full_transcript || (reel.transcript || '').replace(/\[IMAGEM_\d+\]/g, '') || reel.summary || '';
  return raw.replace(/\s+/g, ' ').trim();
}

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

  const [selectedReel, setSelectedReel] = useState(null);
  const [isActionModalVisible, setIsActionModalVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  const [folders, setFolders] = useState([]);
  const [isFolderModalVisible, setIsFolderModalVisible] = useState(false);

  const abortControllerRef = useRef(null);

  useEffect(() => () => { if (abortControllerRef.current) abortControllerRef.current.abort(); }, []);

  // Header estilo Instapaper: wordmark serif centralizado + ••• à direita
  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => <Text style={styles.wordmark}>ReadAfter</Text>,
      headerRight: () => (
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ marginRight: 16 }}>
          <Ionicons name="ellipsis-horizontal" size={22} color={colors.text} />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

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
    finally { setLoading(false); setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { load(true); }, [searchQuery, filterParams]));

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
      setReels(prev => prev.find(r => r.id === reel.id) ? prev : [reel, ...prev]);
      setUrl('');
    } catch (e) {
      if (e.message !== 'Cancelado pelo usuário') Alert.alert('Erro ao processar', e.message);
    } finally {
      setProcessing(false);
      setStep('');
    }
  };

  const handleActionMenu = (reel) => { setSelectedReel(reel); setIsActionModalVisible(true); };
  const showToast = (msg) => Alert.alert('Sucesso', msg);

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
      { text: 'Salvar', onPress: async (text) => { if (!text) return; await updateReel(selectedReel.id, { tags: text }); showToast('Tag adicionada!'); } }
    ]);
  };
  const handleMove = async () => {
    setIsActionModalVisible(false);
    setFolders(await loadFolders());
    setIsFolderModalVisible(true);
  };
  const handleSelectFolder = async (folderId) => {
    setIsFolderModalVisible(false);
    await assignReelToFolder(selectedReel.id, folderId);
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

  const renderReel = ({ item }) => {
    const title = item.central_theme || item.title || 'Inspiração';
    const meta = `${item.author || 'Reel'} · ${readingTime(item)} min`;
    return (
      <TouchableOpacity style={styles.row} activeOpacity={0.6}
        onPress={() => navigation.navigate('Detail', { reel: item })}
        onLongPress={() => handleActionMenu(item)}
      >
        <View style={styles.rowText}>
          <Text style={styles.rowTitle} numberOfLines={2}>{title}</Text>
          <Text style={styles.rowMeta} numberOfLines={1}>{meta}</Text>
          <Text style={styles.rowExcerpt} numberOfLines={2}>{excerptOf(item)}</Text>
        </View>
        {item.thumbnail
          ? <Image source={{ uri: item.thumbnail }} style={styles.thumb} />
          : <View style={[styles.thumb, { backgroundColor: colors.tag }]} />}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => {
    if (loading) return null;
    let msg = 'Sua biblioteca está vazia.\nCole um link para começar.';
    if (filterParams === 'folder') msg = 'Esta pasta está vazia.';
    if (filterParams === 'liked') msg = 'Você ainda não favoritou nenhum Reel.';
    if (filterParams === 'archived') msg = 'O arquivo está vazio.';
    if (searchQuery) msg = 'Nenhum resultado encontrado.';
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="albums-outline" size={56} color={colors.border} />
        <Text style={styles.emptyText}>{msg}</Text>
      </View>
    );
  };

  const ListHeader = (
    <View>
      {(filterParams === 'home' || filterParams === 'folder') && (
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={url}
            onChangeText={setUrl}
            placeholder="Cole o link do Instagram aqui..."
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="none" autoCorrect={false}
            returnKeyType="done" onSubmitEditing={handleSave} editable={!processing}
          />
          <TouchableOpacity
            style={[styles.saveBtn, (!url || processing) && styles.saveBtnDisabled]}
            onPress={handleSave} disabled={!url || processing}
          >
            <Ionicons name="add" size={18} color="white" />
            <Text style={styles.saveBtnText}>{processing ? step : 'Salvar'}</Text>
          </TouchableOpacity>
        </View>
      )}
      <View style={styles.searchPill}>
        <Ionicons name="search" size={18} color={colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search"
          placeholderTextColor={colors.textTertiary}
          value={searchQuery} onChangeText={setSearchQuery}
          returnKeyType="search" autoCapitalize="none" autoCorrect={false}
        />
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <FlatList
        data={reels}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderReel}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={renderEmptyState}
        ItemSeparatorComponent={() => <View style={styles.divider} />}
        contentContainerStyle={{ paddingBottom: 40 }}
        onEndReached={() => load(false)}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loading && offset > 0 ? <ReelSkeleton /> : null}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={colors.textSecondary} />}
      />

      {/* ••• menu (Sort/Filter/Select/Playlist) */}
      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <Pressable style={styles.menuOverlay} onPress={() => setMenuVisible(false)}>
          <View style={styles.menuPopover}>
            {[
              { icon: 'swap-vertical', label: 'Sort' },
              { icon: 'filter', label: 'Filter' },
              { icon: 'checkmark-circle-outline', label: 'Select' },
              { icon: 'list', label: 'Playlist' },
            ].map((m, i) => (
              <TouchableOpacity key={m.label}
                style={[styles.menuRow, i > 0 && styles.menuRowBorder]}
                onPress={() => { setMenuVisible(false); Alert.alert(m.label, 'Em breve.'); }}>
                <Text style={styles.menuLabel}>{m.label}</Text>
                <Ionicons name={m.icon} size={20} color={colors.text} />
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* Ações do reel */}
      <Modal visible={isActionModalVisible} transparent animationType="fade" onRequestClose={() => setIsActionModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setIsActionModalVisible(false)}>
          <Pressable style={styles.bottomSheet}>
            <View style={styles.sheetHandle} />
            <TouchableOpacity style={styles.actionOption} onPress={handleLike}>
              <Ionicons name={selectedReel?.is_liked ? "heart" : "heart-outline"} size={22} color={selectedReel?.is_liked ? colors.danger : colors.textSecondary} />
              <Text style={[styles.actionOptionText, selectedReel?.is_liked && { color: colors.danger }]}>{selectedReel?.is_liked ? 'Descurtir' : 'Curtir'}</Text>
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
              <Ionicons name="trash-outline" size={22} color={colors.danger} />
              <Text style={[styles.actionOptionText, { color: colors.danger }]}>Excluir (Mover p/ Lixeira)</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={isFolderModalVisible} transparent animationType="fade" onRequestClose={() => setIsFolderModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setIsFolderModalVisible(false)}>
          <Pressable style={styles.bottomSheet}>
            <Text style={styles.bottomSheetTitle}>Salvar na Pasta</Text>
            {folders.length === 0 ? (
              <Text style={{ textAlign: 'center', color: colors.textTertiary, marginVertical: 16 }}>Nenhuma pasta criada.</Text>
            ) : (
              <FlatList data={folders} keyExtractor={f => f.id} style={{ maxHeight: 300 }}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.folderOption} onPress={() => handleSelectFolder(item.id)}>
                    <Ionicons name="folder-outline" size={20} color={colors.textSecondary} />
                    <Text style={styles.folderOptionText}>{item.name}</Text>
                  </TouchableOpacity>
                )} />
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  wordmark: { ...typography.wordmark },

  inputRow: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingHorizontal: spacing.md, paddingTop: spacing.md },
  input: { flex: 1, backgroundColor: colors.tag, borderRadius: radius.md, paddingHorizontal: 14, height: 44, fontSize: 14, color: colors.text },
  saveBtn: { backgroundColor: colors.accent, borderRadius: radius.md, paddingHorizontal: 16, height: 44, flexDirection: 'row', alignItems: 'center', gap: 4 },
  saveBtnDisabled: { opacity: 0.35 },
  saveBtnText: { color: 'white', fontWeight: '600', fontSize: 14 },

  searchPill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.tag, borderRadius: radius.md, marginHorizontal: spacing.md, marginVertical: spacing.md, paddingHorizontal: 12, height: 42 },
  searchInput: { flex: 1, fontSize: 16, color: colors.text, paddingVertical: 0 },

  row: { flexDirection: 'row', paddingHorizontal: spacing.md, paddingVertical: spacing.md, gap: spacing.md, alignItems: 'flex-start' },
  rowText: { flex: 1 },
  rowTitle: { ...typography.cardTitle, marginBottom: 6 },
  rowMeta: { ...typography.meta, marginBottom: 6 },
  rowExcerpt: { ...typography.excerpt },
  thumb: { width: 92, height: 92, borderRadius: radius.sm, resizeMode: 'cover' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginHorizontal: spacing.md },

  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyText: { ...typography.body, color: colors.textTertiary, marginTop: 16, textAlign: 'center' },

  menuOverlay: { flex: 1, backgroundColor: 'transparent' },
  menuPopover: { position: 'absolute', top: 8, right: 12, width: 240, backgroundColor: colors.card, borderRadius: radius.lg, paddingVertical: 4, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 16 }, android: { elevation: 8 } }) },
  menuRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, height: 52 },
  menuRowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  menuLabel: { fontSize: 17, color: colors.text },

  modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: colors.background, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: Platform.OS === 'ios' ? 40 : spacing.lg },
  sheetHandle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  actionOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  actionOptionText: { fontSize: 16, marginLeft: 16, color: colors.text },
  actionDivider: { height: 1, backgroundColor: colors.border, marginVertical: 8 },
  bottomSheetTitle: { ...typography.h2, fontSize: 16, textAlign: 'center', marginBottom: spacing.md },
  folderOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  folderOptionText: { fontSize: 15, color: colors.textSecondary, marginLeft: 12, fontWeight: '500' },
});
