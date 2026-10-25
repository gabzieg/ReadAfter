import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, LayoutAnimation, Platform, UIManager, Modal, Pressable, TextInput } from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator, DrawerContentScrollView } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';

import { colors, typography, spacing, radius, fonts } from '../services/theme';

import HomeScreen from '../screens/HomeScreen';
import DetailScreen from '../screens/DetailScreen';
import TrashScreen from '../screens/TrashScreen';
import { SettingsScreen, AppearanceScreen } from '../screens/SettingsScreen';
import { loadFolders, saveFolders, loadDeletedFolders, saveDeletedFolders } from '../services/folderStore';

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

function CustomDrawerContent(props) {
  const [folders, setFolders] = useState([]);
  const [deletedFolders, setDeletedFolders] = useState([]);
  const [folderMenuVisible, setFolderMenuVisible] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState(null);

  // States para criação de pasta
  const [newFolderModalVisible, setNewFolderModalVisible] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [addMenuVisible, setAddMenuVisible] = useState(false);

  // Carregar dados no mount
  useEffect(() => {
    async function init() {
      const storedFolders = await loadFolders();
      const storedTrash = await loadDeletedFolders();
      setFolders(storedFolders);
      setDeletedFolders(storedTrash);
    }
    init();
  }, []);

  // Salvar sempre que alterar
  useEffect(() => {
    if (folders.length > 0 || deletedFolders.length > 0) {
      saveFolders(folders);
      saveDeletedFolders(deletedFolders);
    }
  }, [folders, deletedFolders]);

  const handleCreateFolder = () => {
    const trimmedName = newFolderName.trim();
    if (!trimmedName) {
      Alert.alert('Aviso', 'O nome da pasta não pode ser vazio.');
      return;
    }
    const newFolder = {
      id: Date.now().toString(),
      name: trimmedName,
      is_pinned: 0
    };
    setFolders(prev => [...prev, newFolder]);
    setNewFolderName('');
    setNewFolderModalVisible(false);
  };

  const handleRestore = (folder) => {
    Alert.alert('Excluir Pasta', 'Deseja mover esta pasta para a lixeira?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir', style: 'destructive', onPress: () => {
          const folderToMove = selectedFolder;
          setFolders(prev => prev.filter(f => f.id !== folderToMove.id));
          setDeletedFolders(prev => [...prev, { ...folderToMove, deleted_at: new Date().toISOString() }]);
        }
      }
    ]);
  };

  const openFolderMenu = (folder) => {
    setSelectedFolder(folder);
    setFolderMenuVisible(true);
  };

  const handleShare = () => {
    setFolderMenuVisible(false);
    Alert.alert('Compartilhar', 'Compartilhar todo o conteúdo desta pasta.');
  };

  const handleRename = () => {
    setFolderMenuVisible(false);
    Alert.alert('Renomear', 'Renomear pasta.');
  };

  const handleTogglePin = () => {
    if (!selectedFolder) return;

    // Check limit
    if (!selectedFolder.is_pinned) {
      const pinnedCount = folders.filter(f => f.is_pinned).length;
      if (pinnedCount >= 3) {
        setFolderMenuVisible(false);
        Alert.alert('Limite Atingido', 'Você só pode fixar até 3 pastas.');
        return;
      }
    }

    setFolders(prev => prev.map(f =>
      f.id === selectedFolder.id ? { ...f, is_pinned: f.is_pinned ? 0 : 1 } : f
    ));
    setFolderMenuVisible(false);
  };

  const handleDelete = () => {
    setFolderMenuVisible(false);
    if (!selectedFolder) return;

    const folderToMove = selectedFolder;
    setFolders(prev => prev.filter(f => f.id !== folderToMove.id));
    setDeletedFolders(prev => [...prev, { ...folderToMove, deleted_at: new Date().toISOString() }]);
  };

  const DrawerItem = ({ icon, label, onPress, active }) => (
    <TouchableOpacity
      style={[styles.drawerItem, active && styles.drawerItemActive]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={20} color={active ? colors.primary : colors.textTertiary} />
      <Text style={[styles.drawerItemText, active && styles.drawerItemTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const FolderItem = ({ folder, onPress, onLongPress }) => (
    <TouchableOpacity
      style={styles.folderRow}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={300}
      activeOpacity={0.6}
    >
      <View style={styles.folderRowLeft}>
        <Ionicons
          name={folder.is_pinned ? "pin" : "folder-outline"}
          size={22}
          color={folder.is_pinned ? colors.primary : colors.textTertiary}
        />
        <Text style={[styles.folderText, folder.is_pinned && styles.folderTextPinned]}>
          {folder.name}
        </Text>
      </View>
      <View style={styles.touchTargetBuffer}>
        <Ionicons name="ellipsis-horizontal" size={16} color={colors.border} />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.drawerContainer}>
    <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: spacing.md }}>
      <View style={styles.section}>
        <DrawerItem icon="home-outline" label="Home" active={true} onPress={() => props.navigation.navigate('Feed', { filter: 'home' })} />
        <DrawerItem icon="heart-outline" label="Liked" onPress={() => props.navigation.navigate('Feed', { filter: 'liked' })} />
        <DrawerItem icon="archive-outline" label="Archive" onPress={() => props.navigation.navigate('Feed', { filter: 'archived' })} />
        <DrawerItem icon="play-outline" label="Videos" onPress={() => props.navigation.navigate('Feed', { filter: 'home' })} />
        <DrawerItem icon="chatbox-outline" label="Notes" onPress={() => Alert.alert('Notes', 'Em breve.')} />
        <DrawerItem icon="pricetag-outline" label="Tags" onPress={() => props.navigation.navigate('Feed', { filter: 'tags' })} />
      </View>

      <View style={styles.separator} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>PASTAS</Text>

        {folders.filter(f => f.is_pinned).map(f => (
          <FolderItem
            key={f.id}
            folder={f}
            onPress={() => props.navigation.navigate('Feed', { filter: 'folder', folderId: f.id, folderName: f.name })}
            onLongPress={() => openFolderMenu(f)}
          />
        ))}

        {folders.filter(f => !f.is_pinned).map(f => (
          <FolderItem
            key={f.id}
            folder={f}
            onPress={() => props.navigation.navigate('Feed', { filter: 'folder', folderId: f.id, folderName: f.name })}
            onLongPress={() => openFolderMenu(f)}
          />
        ))}

        <TouchableOpacity style={styles.addFolderBtn} onPress={() => setNewFolderModalVisible(true)}>
          <Ionicons name="add" size={18} color={colors.textTertiary} />
          <Text style={styles.addFolderText}>Nova Pasta</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.separator} />

      <View style={styles.section}>
        <TouchableOpacity style={styles.trashHeader} onPress={() => props.navigation.navigate('Trash')}>
          <Ionicons name="trash-outline" size={16} color={colors.textTertiary} />
          <Text style={[styles.sectionTitle, { marginBottom: 0, marginLeft: 8 }]}>LIXEIRA</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Sheet Nativo */}
      <Modal
        visible={folderMenuVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setFolderMenuVisible(false)}
      >
        <Pressable style={styles.popoverOverlay} onPress={() => setFolderMenuVisible(false)}>
          <View style={styles.popoverMenu}>
            <View style={styles.bottomSheetDragHandle} />

            <TouchableOpacity style={styles.popoverOption} onPress={handleShare}>
              <Ionicons name="share-social-outline" size={20} color={colors.text} />
              <Text style={styles.popoverOptionText}>Compartilhar conversa</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.popoverOption} onPress={handleTogglePin}>
              <Ionicons name={selectedFolder?.is_pinned ? "pin-outline" : "pin"} size={20} color={colors.text} />
              <Text style={styles.popoverOptionText}>
                {selectedFolder?.is_pinned ? 'Desafixar' : 'Fixar no topo'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.popoverOption} onPress={handleRename}>
              <Ionicons name="pencil-outline" size={20} color={colors.text} />
              <Text style={styles.popoverOptionText}>Renomear pasta</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.popoverOption} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={20} color="#FF3B30" />
              <Text style={[styles.popoverOptionText, { color: '#FF3B30' }]}>Excluir permanentemente</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Modal de Nova Pasta */}
      <Modal
        visible={newFolderModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setNewFolderModalVisible(false)}
      >
        <Pressable style={styles.popoverOverlayCenter} onPress={() => setNewFolderModalVisible(false)}>
          <Pressable style={styles.newFolderModalContainer}>
            <Text style={styles.newFolderTitle}>Nova Pasta</Text>
            <TextInput
              style={styles.newFolderInput}
              placeholder="Ex: Inspirações"
              placeholderTextColor={colors.textTertiary}
              value={newFolderName}
              onChangeText={setNewFolderName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleCreateFolder}
            />
            <View style={styles.newFolderActions}>
              <TouchableOpacity style={styles.newFolderCancelBtn} onPress={() => setNewFolderModalVisible(false)}>
                <Text style={styles.newFolderCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.newFolderCreateBtn} onPress={handleCreateFolder}>
                <Text style={styles.newFolderCreateText}>Criar</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

    </DrawerContentScrollView>

    {/* Barra inferior: + (Add) e engrenagem (Settings) */}
    <View style={styles.bottomBar}>
      <TouchableOpacity style={styles.bottomBtn} onPress={() => setAddMenuVisible(true)}>
        <Ionicons name="add" size={26} color={colors.accent} />
      </TouchableOpacity>
      <View style={styles.bottomDivider} />
      <TouchableOpacity style={styles.bottomBtn} onPress={() => props.navigation.navigate('Settings')}>
        <Ionicons name="settings-outline" size={22} color={colors.textSecondary} />
      </TouchableOpacity>
    </View>

    <Modal visible={addMenuVisible} transparent animationType="fade" onRequestClose={() => setAddMenuVisible(false)}>
      <Pressable style={styles.addOverlay} onPress={() => setAddMenuVisible(false)}>
        <View style={styles.addMenu}>
          <TouchableOpacity style={styles.addRow} onPress={() => { setAddMenuVisible(false); props.navigation.navigate('Feed', { filter: 'home' }); }}>
            <Text style={styles.addRowText}>Add Link</Text>
            <Ionicons name="link-outline" size={20} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.addRowBorder} />
          <TouchableOpacity style={styles.addRow} onPress={() => { setAddMenuVisible(false); setNewFolderModalVisible(true); }}>
            <Text style={styles.addRowText}>Add Folder</Text>
            <Ionicons name="folder-outline" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
    </View>
  );
}

function DrawerNavigator() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: true,
        headerTintColor: colors.text,
        headerTitleAlign: 'center',
        headerStyle: { backgroundColor: colors.background, elevation: 0, shadowOpacity: 0, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
        headerTitleStyle: { fontFamily: fonts.serifBold, fontSize: 22, color: colors.text },
        drawerStyle: { width: 300, backgroundColor: colors.background },
      }}
    >
      <Drawer.Screen name="Feed" component={HomeScreen} options={{ title: 'ReadAfter' }} />
    </Drawer.Navigator>
  );
}

export default React.forwardRef(function AppNavigator(props, ref) {
  return (
    <NavigationContainer ref={ref}>
      <Stack.Navigator>
        <Stack.Screen
          name="Main"
          component={DrawerNavigator}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Detail"
          component={DetailScreen}
          options={({ route }) => ({
            title: route.params?.reel?.title || 'Detalhe',
            headerTintColor: colors.primary,
            headerBackTitle: 'Voltar',
            headerStyle: { backgroundColor: colors.background, elevation: 0, shadowOpacity: 0, borderBottomWidth: 0.5, borderBottomColor: colors.border },
            headerTitleStyle: { ...typography.h2, fontSize: 16 },
          })}
        />
        <Stack.Screen
          name="Trash"
          component={TrashScreen}
          options={{ title: 'Lixeira', headerBackTitleVisible: false }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            title: 'Settings', headerTitleAlign: 'center', headerTintColor: colors.accent,
            headerStyle: { backgroundColor: colors.background, elevation: 0, shadowOpacity: 0, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
            headerTitleStyle: { fontSize: 17, fontWeight: '600', color: colors.text },
          }}
        />
        <Stack.Screen
          name="Appearance"
          component={AppearanceScreen}
          options={{
            title: 'Appearance', headerTitleAlign: 'center', headerTintColor: colors.accent,
            headerStyle: { backgroundColor: colors.background, elevation: 0, shadowOpacity: 0, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
            headerTitleStyle: { fontSize: 17, fontWeight: '600', color: colors.text },
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
});

const styles = StyleSheet.create({
  drawerContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  drawerHeader: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 32,
  },
  drawerTitle: {
    ...typography.h1,
    color: '#111111',
    fontSize: 28,
    letterSpacing: -0.5,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999999',
    letterSpacing: 0.5,
    marginLeft: 16,
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  separator: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 8,
    marginHorizontal: 24,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 2,
  },
  drawerItemActive: {
    backgroundColor: '#F8F8F8',
  },
  drawerItemText: {
    fontSize: 16,
    fontWeight: '400',
    color: '#444444',
    marginLeft: 16,
  },
  drawerItemTextActive: {
    color: '#111111',
    fontWeight: '600',
  },
  folderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: 16,
    marginBottom: 2,
    borderRadius: 12,
  },
  folderRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  folderText: {
    marginLeft: 16,
    fontSize: 16,
    color: '#444444',
    fontWeight: '400',
    flexShrink: 1,
  },
  folderTextPinned: {
    color: '#111111',
    fontWeight: '500',
  },
  touchTargetBuffer: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addFolderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  addFolderText: {
    fontSize: 15,
    color: '#888888',
    fontWeight: '400',
    marginLeft: 16,
  },
  trashHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E3E3E6',
    height: 64,
  },
  bottomBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%' },
  bottomDivider: { width: StyleSheet.hairlineWidth, height: '60%', backgroundColor: '#E3E3E6' },
  addOverlay: { flex: 1, justifyContent: 'flex-end' },
  addMenu: {
    position: 'absolute', left: 16, bottom: 72, width: 260,
    backgroundColor: '#FFFFFF', borderRadius: 12, paddingVertical: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 8,
  },
  addRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, height: 52 },
  addRowBorder: { height: StyleSheet.hairlineWidth, backgroundColor: '#E3E3E6' },
  addRowText: { fontSize: 17, color: '#1C1C1E' },

  popoverOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'flex-end',
  },
  popoverOverlayCenter: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  popoverMenu: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 48,
    paddingTop: 12,
  },
  bottomSheetDragHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 24,
  },
  popoverOption: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: 24,
  },
  popoverOptionText: {
    fontSize: 16,
    fontWeight: '400',
    color: '#111111',
    marginLeft: 16,
  },
  newFolderModalContainer: {
    backgroundColor: '#FFFFFF',
    width: 300,
    borderRadius: 20,
    padding: 24,
  },
  newFolderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111111',
    marginBottom: 20,
    textAlign: 'center',
  },
  newFolderInput: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    fontSize: 16,
    color: '#111111',
    marginBottom: 24,
  },
  newFolderActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  newFolderCancelBtn: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginRight: 8,
  },
  newFolderCancelText: {
    color: '#666666',
    fontSize: 15,
    fontWeight: '500',
  },
  newFolderCreateBtn: {
    backgroundColor: '#111111',
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderRadius: 22,
  },
  newFolderCreateText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});