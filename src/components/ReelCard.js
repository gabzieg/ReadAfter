import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../services/theme';

export default function ReelCard({ reel, onPress, onDelete }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {/* Thumbnail */}
      <View style={styles.thumb}>
        {reel.thumbnail
          ? <Image source={{ uri: reel.thumbnail }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          : <View style={styles.thumbPlaceholder} />
        }
        <View style={styles.thumbOverlay}>
          <View style={styles.playBtn}>
            <Ionicons name="play" size={18} color={colors.primary} style={{ marginLeft: 2 }} />
          </View>
        </View>
        <View style={styles.metaRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(reel.author || 'U').substring(0, 2).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.authorName} numberOfLines={1}>{reel.author}</Text>
        </View>
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{reel.duration}</Text>
        </View>
      </View>

      {/* Body */}
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>{reel.title}</Text>
        <Text style={styles.summary} numberOfLines={2}>{reel.summary}</Text>

        {/* Tags */}
        <View style={styles.tagsRow}>
          {(reel.tags || []).slice(0, 3).map((t, i) => (
            <View key={i} style={styles.tag}>
              <Text style={styles.tagText}>{t}</Text>
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="time-outline" size={12} color={colors.textTertiary} />
            <Text style={typography.small}>{reel.saved_at
              ? new Date(reel.saved_at).toLocaleDateString('pt-BR')
              : 'agora'}</Text>
          </View>
          <TouchableOpacity onPress={onDelete} hitSlop={8}>
            <Ionicons name="trash-outline" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  thumb: {
    height: 150,
    backgroundColor: '#1a1a2e',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1a1a2e',
  },
  thumbOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playBtn: {
    width: 44, height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  metaRow: {
    position: 'absolute',
    bottom: 10, left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  avatar: {
    width: 24, height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'white',
  },
  avatarText: { color: 'white', fontSize: 9, fontWeight: '700' },
  authorName: { color: 'white', fontSize: 11, fontWeight: '500' },
  durationBadge: {
    position: 'absolute',
    top: 8, right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  durationText: { color: 'white', fontSize: 10 },
  body: { padding: spacing.md },
  title: { ...typography.h2, marginBottom: 4 },
  summary: { ...typography.body, fontSize: 13, marginBottom: spacing.sm },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.sm },
  tag: {
    backgroundColor: colors.tag,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: { fontSize: 11, color: colors.textSecondary },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
});
