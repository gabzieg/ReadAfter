import React, { useEffect, useRef } from 'react';
import {
  View, Text, Modal, ActivityIndicator,
  StyleSheet, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../services/theme';

const STEPS = [
  { key: 'meta',       label: 'Acessando o Reel',               icon: 'link-outline' },
  { key: 'audio',      label: 'Baixando áudio temporário',       icon: 'musical-notes-outline' },
  { key: 'whisper',    label: 'Transcrevendo com Whisper',       icon: 'mic-outline' },
  { key: 'vision',     label: 'Analisando imagens (Claude)',     icon: 'eye-outline' },
  { key: 'summary',    label: 'Gerando resumo com Claude',       icon: 'sparkles-outline' },
  { key: 'saving',     label: 'Salvando resultado',              icon: 'bookmark-outline' },
];

function stepIndex(currentStep) {
  if (!currentStep) return -1;
  const lower = currentStep.toLowerCase();
  if (lower.includes('acessa'))   return 0;
  if (lower.includes('áudio') || lower.includes('baixand')) return 1;
  if (lower.includes('whisper') || lower.includes('transcri')) return 2;
  if (lower.includes('imagem') || lower.includes('vision') || lower.includes('frame')) return 3;
  if (lower.includes('resumo') || lower.includes('claude')) return 4;
  if (lower.includes('salv') || lower.includes('conclu')) return 5;
  return -1;
}

export default function ProcessingModal({ visible, currentStep }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const active = stepIndex(currentStep);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: visible ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  return (
    <Modal transparent visible={visible} animationType="none">
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <View style={styles.card}>
          <ActivityIndicator size="large" color={colors.primary} style={{ marginBottom: spacing.md }} />
          <Text style={styles.title}>Processando Reel...</Text>
          <Text style={[typography.body, { textAlign: 'center', marginBottom: spacing.lg }]}>
            {currentStep || 'Iniciando...'}
          </Text>

          <View style={styles.steps}>
            {STEPS.map((s, i) => {
              const done   = i < active;
              const active_ = i === active;
              return (
                <View key={s.key} style={styles.stepRow}>
                  <View style={[
                    styles.stepIcon,
                    done   && styles.stepDone,
                    active_ && styles.stepActive,
                  ]}>
                    <Ionicons
                      name={done ? 'checkmark' : s.icon}
                      size={14}
                      color={done || active_ ? 'white' : colors.textTertiary}
                    />
                  </View>
                  <Text style={[
                    styles.stepLabel,
                    done   && { color: colors.success },
                    active_ && { color: colors.primary, fontWeight: '600' },
                  ]}>
                    {s.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.lg,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 12,
  },
  title: { ...typography.h2, marginBottom: 4 },
  steps: { width: '100%', gap: 10 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepIcon: {
    width: 26, height: 26,
    borderRadius: 13,
    backgroundColor: colors.tag,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDone:   { backgroundColor: colors.success },
  stepActive: { backgroundColor: colors.primary },
  stepLabel:  { ...typography.body, fontSize: 13, color: colors.textSecondary },
});
