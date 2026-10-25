import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../services/theme';

function Group({ title, footer, children }) {
  return (
    <View style={styles.group}>
      {title ? <Text style={styles.groupTitle}>{title}</Text> : null}
      <View style={styles.card}>{children}</View>
      {footer ? <Text style={styles.groupFooter}>{footer}</Text> : null}
    </View>
  );
}

function Row({ label, value, danger, last, onPress, right }) {
  return (
    <TouchableOpacity activeOpacity={0.6} onPress={onPress} style={[styles.row, !last && styles.rowBorder]}>
      <Text style={[styles.rowLabel, danger && { color: colors.danger }]}>{label}</Text>
      <View style={styles.rowRight}>
        {value ? <Text style={styles.rowValue}>{value}</Text> : null}
        {right || (onPress ? <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} /> : null)}
      </View>
    </TouchableOpacity>
  );
}

export function SettingsScreen({ navigation }) {
  const soon = (t) => Alert.alert(t, 'Em breve.');
  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingVertical: spacing.md }}>
      <Group title="GENERAL">
        <Row label="Appearance" onPress={() => navigation.navigate('Appearance')} />
        <Row label="Behavior" onPress={() => soon('Behavior')} />
        <Row label="Syncing" onPress={() => soon('Syncing')} />
        <Row label="Logged-In Sites" last onPress={() => soon('Logged-In Sites')} />
      </Group>

      <Group title="gbrustolinz@outlook.com">
        <Row label="Premium" value="Inactive" onPress={() => soon('Premium')} />
        <Row label="Profile" value="Public" onPress={() => soon('Profile')} />
        <Row label="Sign out" last onPress={() => soon('Sign out')} />
      </Group>

      <Group>
        <Row label="How to Save" onPress={() => soon('How to Save')} />
        <Row label="Send Feedback" onPress={() => soon('Send Feedback')} />
        <Row label="About" last onPress={() => soon('About')} />
      </Group>

      <Text style={styles.version}>ReadAfter 1.0.0{'\n'}Thank you for using ReadAfter.</Text>
    </ScrollView>
  );
}

const SWATCHES = ['#FFFFFF', '#F3ECD9', '#6E6E6E', '#1C1C1E'];

export function AppearanceScreen() {
  const [theme, setTheme] = useState('#FFFFFF');
  const [thumbs, setThumbs] = useState(true);
  const [autoDark, setAutoDark] = useState(true);
  const [trueBlack, setTrueBlack] = useState(true);
  const [dimImages, setDimImages] = useState(true);

  const sw = (val, set) => (
    <Switch value={val} onValueChange={set} trackColor={{ true: colors.toggle, false: '#E3E3E6' }} />
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingVertical: spacing.md }}>
      <Group>
        <View style={[styles.row, styles.rowBorder, { justifyContent: 'flex-start', gap: 12 }]}>
          {SWATCHES.map(c => (
            <TouchableOpacity key={c} onPress={() => setTheme(c)}
              style={[styles.swatch, { backgroundColor: c }, theme === c && styles.swatchActive]} />
          ))}
        </View>
        <Row label="App Icon" right={<View style={styles.iconChip}><Text style={styles.iconChipText}>I</Text></View>} onPress={() => Alert.alert('App Icon', 'Em breve.')} />
        <Row label="Image Thumbnails" last right={sw(thumbs, setThumbs)} />
      </Group>

      <Group title="DARK MODE" footer="Quando o Modo Escuro Automático está ativo, o app ajusta o tema conforme o sistema.">
        <Row label="Automatic Dark Mode" right={sw(autoDark, setAutoDark)} />
        <Row label="True Black" right={sw(trueBlack, setTrueBlack)} />
        <Row label="Dim Images" last right={sw(dimImages, setDimImages)} />
      </Group>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.grouped },
  group: { marginBottom: spacing.lg },
  groupTitle: { ...typography.label, marginLeft: spacing.md + 4, marginBottom: 8 },
  groupFooter: { fontSize: 13, color: colors.textTertiary, marginHorizontal: spacing.md + 4, marginTop: 8, lineHeight: 18 },
  card: { backgroundColor: colors.card, marginHorizontal: spacing.md, borderRadius: radius.lg, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, minHeight: 52 },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  rowLabel: { fontSize: 17, color: colors.text },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowValue: { fontSize: 17, color: colors.textTertiary },
  version: { fontSize: 13, color: colors.textTertiary, marginHorizontal: spacing.md + 4, lineHeight: 18 },
  swatch: { width: 56, height: 34, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border },
  swatchActive: { borderWidth: 2, borderColor: colors.accent },
  iconChip: { width: 30, height: 30, borderRadius: 7, backgroundColor: colors.tag, alignItems: 'center', justifyContent: 'center' },
  iconChipText: { fontFamily: typography.wordmark.fontFamily, fontSize: 18, color: colors.text },
});
