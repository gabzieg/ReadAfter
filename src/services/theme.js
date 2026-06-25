export const colors = {
  primary:    '#000000', // P&B - Westwing style
  primaryDark:'#000000',
  background: '#FFFFFF', // Pure white
  card:       '#FFFFFF',
  text:       '#000000', // Pure black
  textSecondary: '#555555',
  textTertiary:  '#999999',
  border:     '#F2F2F2',
  success:    '#000000',
  tag:        '#F8F8F8',
  overlay:    'rgba(255,255,255,0.85)', // White frosted glass style overlay instead of dark
};

export const spacing = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48
};

export const radius = {
  sm: 4, md: 8, lg: 12, xl: 16, full: 999, // Less rounded, more editorial/modern
};

export const typography = {
  h1:   { fontSize: 24, fontWeight: '300', color: colors.text, letterSpacing: -0.5 }, // Thin, editorial look
  h2:   { fontSize: 18, fontWeight: '400', color: colors.text },
  body: { fontSize: 14, color: colors.textSecondary, lineHeight: 22, fontWeight: '300' },
  small:{ fontSize: 12, color: colors.textTertiary, fontWeight: '300' },
  label:{ fontSize: 10, fontWeight: '500', color: colors.textSecondary,
          textTransform: 'uppercase', letterSpacing: 1.5 },
};

export const shadows = {
  soft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  }
};
