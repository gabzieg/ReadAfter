// Design tokens estilo Instapaper (serif editorial + acentos iOS)

export const fonts = {
  serif:        'Lora_400Regular',
  serifMedium:  'Lora_500Medium',
  serifSemiBold:'Lora_600SemiBold',
  serifBold:    'Lora_700Bold',
};

export const colors = {
  primary:       '#1C1C1E', // near-black (títulos)
  primaryDark:   '#000000',
  accent:        '#007AFF', // azul iOS (voltar, Done, botões)
  background:    '#FFFFFF',
  card:          '#FFFFFF',
  grouped:       '#F2F2F7', // fundo de listas agrupadas (Settings)
  text:          '#1C1C1E',
  textSecondary: '#6B6B70', // fonte/meta
  textTertiary:  '#A0A0A5',
  border:        '#E3E3E6', // hairline
  tag:           '#EFEFF0', // search pill
  toggle:        '#34C759',
  danger:        '#FF3B30',
  success:       '#34C759',
  overlay:       'rgba(0,0,0,0.4)',
};

// Paleta escura (True Black) — usada quando dark mode entrar
export const darkColors = {
  ...colors,
  background:    '#000000',
  card:          '#0A0A0A',
  grouped:       '#000000',
  text:          '#F2F2F5',
  textSecondary: '#98989F',
  textTertiary:  '#6B6B70',
  border:        '#1C1C1E',
  tag:           '#1C1C1E',
};

export const spacing = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48,
};

export const radius = {
  sm: 6, md: 8, lg: 10, xl: 16, full: 999,
};

export const typography = {
  // Wordmark / títulos grandes — serif
  wordmark: { fontFamily: fonts.serifBold, fontSize: 22, color: colors.text },
  h1:  { fontFamily: fonts.serif, fontSize: 26, color: colors.text, letterSpacing: -0.3 },
  h2:  { fontFamily: fonts.serifMedium, fontSize: 18, color: colors.text },
  // Título de artigo na lista — serif
  cardTitle: { fontFamily: fonts.serifMedium, fontSize: 20, lineHeight: 27, color: colors.text },
  // Corpo/excerpt — serif
  body:  { fontFamily: fonts.serif, fontSize: 15, lineHeight: 23, color: colors.textSecondary },
  excerpt: { fontFamily: fonts.serif, fontSize: 15, lineHeight: 22, color: colors.textSecondary },
  // Meta e labels — sans do sistema
  meta:  { fontSize: 13, color: colors.textSecondary },
  small: { fontSize: 12, color: colors.textTertiary },
  label: { fontSize: 12, fontWeight: '500', color: colors.textTertiary,
           textTransform: 'uppercase', letterSpacing: 0.6 },
};

export const shadows = {
  soft:   { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  medium: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 3 },
};
