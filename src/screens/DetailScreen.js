import React, { useState } from 'react';
import {
  View, Text, ScrollView, Image,
  StyleSheet, TouchableOpacity, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../services/theme';
import { assignReelToFolder } from '../services/api'; 
import { loadFolders } from '../services/folderStore';

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

export default function DetailScreen({ route }) {
  const { reel: initialReel } = route.params;
  const [reel, setReel] = useState(initialReel);
  const [folders, setFolders] = useState([]);
  const [isFolderModalVisible, setIsFolderModalVisible] = useState(false);

  React.useEffect(() => {
    loadFolders().then(setFolders);
  }, []);

  const handleAssignToFolder = async (folderId) => {
    setIsFolderModalVisible(false);
    try {
      await assignReelToFolder(reel.id, folderId);
      // Aqui poderíamos adicionar um toast/alerta de sucesso.
    } catch (e) {
      console.warn('Erro ao mover', e);
    }
  };

  const renderIllustratedArticle = (text, visualJson) => {
    if (!text) return null;
    let frames = [];
    try {
      frames = JSON.parse(visualJson || '[]');
    } catch (e) {}

    const parts = text.split(/(\[IMAGEM_\d\])/g);

    return parts.map((part, index) => {
      const match = part.match(/\[IMAGEM_(\d)\]/);
      if (match) {
        const imgIndex = parseInt(match[1], 10) - 1;
        const imgUrl = frames[imgIndex];
        if (imgUrl) {
          return (
            <Image 
              key={`img-${index}`} 
              source={{ uri: imgUrl }} 
              style={styles.articleImage} 
              resizeMode="cover" 
            />
          );
        }
        return null;
      }
      return <Text key={`txt-${index}`} style={styles.articleText}>{part}</Text>;
    });
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Thumbnail hero */}
      <View style={styles.hero}>
        {reel.thumbnail
          ? <Image source={{ uri: reel.thumbnail }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          : <View style={[StyleSheet.absoluteFill, { backgroundColor: '#F0F0F0' }]} />
        }
        <View style={styles.heroOverlay}>
          <TouchableOpacity style={styles.playBtnLarge}>
            <Ionicons name="play" size={24} color={colors.text} style={{ marginLeft: 3 }} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.headerArea}>
        <Text style={styles.titleText}>{reel.central_theme || reel.title || 'Inspiraton'}</Text>
        <Text style={styles.authorText}>by {reel.author}</Text>
        
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name={reel.is_liked ? "heart" : "heart-outline"} size={22} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name={reel.is_archived ? "archive" : "archive-outline"} size={22} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setIsFolderModalVisible(true)}>
            <Ionicons name="folder-open-outline" size={22} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="share-outline" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.content}>
        {/* Artigo Ilustrado */}
        {reel.transcript && (
          <Section title="Editorial">
            <View style={styles.articleContainer}>
              {renderIllustratedArticle(reel.transcript, reel.visual)}
            </View>
          </Section>
        )}

        {/* Passo a Passo / Checklist */}
        {reel.action_items && reel.action_items.length > 0 && (
          <Section title="Ações e Dicas">
            {reel.action_items.map((item, i) => (
              <View key={i} style={styles.ingredientRow}>
                <Ionicons name="remove" size={16} color={colors.textTertiary} />
                <Text style={styles.bodyText}>{item}</Text>
              </View>
            ))}
          </Section>
        )}

        {/* Links para Aprofundamento */}
        {reel.links && reel.links.length > 0 && (
          <Section title="Explorar">
            {reel.links.map((link, i) => (
              <TouchableOpacity key={i} style={styles.linkRow} onPress={() => {}}>
                <Text style={styles.linkText} numberOfLines={1}>{link}</Text>
                <Ionicons name="arrow-forward" size={14} color={colors.textTertiary} />
              </TouchableOpacity>
            ))}
          </Section>
        )}

        <Text style={styles.savedAt}>
          {reel.saved_at ? new Date(reel.saved_at).toLocaleDateString('pt-BR') : '—'}
        </Text>
      </View>

      {/* Modal de Escolher Pasta */}
      {isFolderModalVisible && (
        <View style={StyleSheet.absoluteFill}>
          <TouchableOpacity 
            style={styles.modalOverlay} 
            activeOpacity={1} 
            onPress={() => setIsFolderModalVisible(false)}
          />
          <View style={styles.bottomSheet}>
            <Text style={styles.bottomSheetTitle}>Salvar na Pasta</Text>
            {folders.length === 0 ? (
              <Text style={{ textAlign: 'center', color: colors.textTertiary, marginVertical: 16 }}>Nenhuma pasta criada.</Text>
            ) : (
              <ScrollView style={{ maxHeight: 300 }}>
                {folders.map(f => (
                  <TouchableOpacity 
                    key={f.id} 
                    style={styles.folderOption}
                    onPress={() => handleAssignToFolder(f.id)}
                  >
                    <Ionicons name="folder-outline" size={20} color={colors.textSecondary} />
                    <Text style={styles.folderOptionText}>{f.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  hero: {
    height: 380,
    backgroundColor: '#F5F5F5',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playBtnLarge: {
    width: 56, height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  headerArea: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  titleText: {
    ...typography.h1,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  authorText: {
    fontSize: 12,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: spacing.lg,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  iconBtn: {
    padding: spacing.xs,
  },
  
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.xl,
  },

  content: { padding: spacing.lg, paddingBottom: 60 },
  
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: { 
    ...typography.h2, 
    fontSize: 18, 
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  sectionBody: { gap: 8 },
  
  bodyText: { ...typography.body, lineHeight: 26, color: colors.text },
  
  ingredientRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 8, paddingRight: 16 },
  
  articleContainer: {
    paddingVertical: 4,
  },
  articleText: {
    ...typography.body,
    lineHeight: 28,
    color: colors.textSecondary,
    marginBottom: 16,
    textAlign: 'justify',
  },
  articleImage: {
    width: '100%',
    height: 300,
    marginVertical: 24,
    backgroundColor: '#F5F5F5',
  },
  
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  linkText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '400',
    flex: 1,
    marginRight: 16,
  },
  
  savedAt: { 
    ...typography.small, 
    textAlign: 'center', 
    marginTop: spacing.xl,
    letterSpacing: 1,
  },
  
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : spacing.lg,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  bottomSheetTitle: {
    ...typography.h2,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  folderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  folderOptionText: {
    fontSize: 15,
    color: colors.textSecondary,
    marginLeft: 12,
    fontWeight: '500',
  },
});
