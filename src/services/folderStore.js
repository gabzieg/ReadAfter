import AsyncStorage from '@react-native-async-storage/async-storage';

const FOLDERS_KEY = '@ReelSnap:folders';
const TRASH_KEY = '@ReelSnap:trashFolders';
const TRASH_REELS_KEY = '@ReelSnap:trashReels';

// Inicializando com dados padrão caso o app seja aberto pela primeira vez
const DEFAULT_FOLDERS = [
  { id: '1', name: 'Receitas', is_pinned: 1 },
  { id: '2', name: 'Viagens', is_pinned: 0 },
];

export async function loadFolders() {
  try {
    const data = await AsyncStorage.getItem(FOLDERS_KEY);
    if (data) return JSON.parse(data);
    
    // Salva os defaults se for o primeiro acesso
    await saveFolders(DEFAULT_FOLDERS);
    return DEFAULT_FOLDERS;
  } catch (error) {
    console.error('Erro ao carregar pastas', error);
    return DEFAULT_FOLDERS;
  }
}

export async function saveFolders(folders) {
  try {
    await AsyncStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
  } catch (error) {
    console.error('Erro ao salvar pastas', error);
  }
}

export async function loadDeletedFolders() {
  try {
    const data = await AsyncStorage.getItem(TRASH_KEY);
    if (data) return JSON.parse(data);
    return [];
  } catch (error) {
    console.error('Erro ao carregar lixeira', error);
    return [];
  }
}

export async function saveDeletedFolders(deletedFolders) {
  try {
    // Filtrar para remover pastas com mais de 30 dias na lixeira (Opcional avançado)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const validTrash = deletedFolders.filter(f => {
      if (!f.deleted_at) return true;
      return new Date(f.deleted_at) > thirtyDaysAgo;
    });

    await AsyncStorage.setItem(TRASH_KEY, JSON.stringify(validTrash));
  } catch (error) {
    console.error('Erro ao salvar lixeira de pastas', error);
  }
}

export async function loadDeletedReels() {
  try {
    const data = await AsyncStorage.getItem(TRASH_REELS_KEY);
    if (data) return JSON.parse(data);
    return [];
  } catch (error) {
    console.error('Erro ao carregar lixeira de reels', error);
    return [];
  }
}

export async function saveDeletedReels(deletedReels) {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const validTrash = deletedReels.filter(r => {
      if (!r.deleted_at) return true;
      return new Date(r.deleted_at) > thirtyDaysAgo;
    });

    await AsyncStorage.setItem(TRASH_REELS_KEY, JSON.stringify(validTrash));
  } catch (error) {
    console.error('Erro ao salvar lixeira de reels', error);
  }
}
