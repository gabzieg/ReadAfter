import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors, radius, spacing } from '../services/theme';

export default function ReelSkeleton() {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [opacity]);

  return (
    <Animated.View style={[styles.card, { opacity }]}>
      <View style={styles.thumb} />
      <View style={styles.body}>
        <View style={styles.titleLine} />
        <View style={styles.titleLineShort} />
        <View style={styles.summaryLine} />
        <View style={styles.summaryLine} />
        <View style={styles.tagsRow}>
          <View style={styles.tag} />
          <View style={styles.tag} />
          <View style={styles.tag} />
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumb: {
    height: 160,
    backgroundColor: colors.border,
  },
  body: {
    padding: spacing.md,
    gap: 8,
  },
  titleLine: {
    height: 16,
    backgroundColor: colors.border,
    borderRadius: 4,
    width: '90%',
  },
  titleLineShort: {
    height: 16,
    backgroundColor: colors.border,
    borderRadius: 4,
    width: '60%',
    marginBottom: 8,
  },
  summaryLine: {
    height: 12,
    backgroundColor: colors.border,
    borderRadius: 4,
    width: '100%',
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  tag: {
    width: 50,
    height: 20,
    backgroundColor: colors.border,
    borderRadius: radius.full,
  },
});
