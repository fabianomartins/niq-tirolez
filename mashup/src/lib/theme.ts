'use client';

import { createTheme } from '@mui/material/styles';

/**
 * Identidade visual Tirolez aplicada ao cockpit.
 *
 * A paleta de status é normativa e vale em toda a plataforma:
 *   verde    >= 100%   meta atingida
 *   azul     95 - 99%  faixa premiada (paga 70%)
 *   amarelo  90 - 94%  risco (paga 50%)
 *   vermelho <  90%    sem premiação
 *
 * O azul existe porque a faixa 95-99% é premiada e pintá-la de amarelo faria
 * o distribuidor achar que está perdendo dinheiro quando não está.
 */

export const STATUS_COLORS = {
  meta: '#1B7A3E',
  premiada: '#0F6FB5',
  risco: '#E8A317',
  abaixo: '#C0392B',
  neutro: '#949CA4',
} as const;

export const STATUS_BG = {
  meta: '#E7F4EC',
  premiada: '#E4F0F9',
  risco: '#FDF3E0',
  abaixo: '#FBEAE8',
  neutro: '#F1F3F5',
} as const;

export const TIROLEZ = {
  verde: '#1B7A3E',
  verdeEscuro: '#0F4F27',
  verdeClaro: '#4CA96B',
  creme: '#F7F5EF',
  carvao: '#1F2933',
  cinza: '#5C6874',
} as const;

const theme = createTheme({
  cssVariables: true,
  palette: {
    mode: 'light',
    primary: {
      main: TIROLEZ.verde,
      dark: TIROLEZ.verdeEscuro,
      light: TIROLEZ.verdeClaro,
      contrastText: '#FFFFFF',
    },
    secondary: { main: '#8A6D3B' },
    success: { main: STATUS_COLORS.meta },
    info: { main: STATUS_COLORS.premiada },
    warning: { main: STATUS_COLORS.risco },
    error: { main: STATUS_COLORS.abaixo },
    background: { default: '#F5F6F7', paper: '#FFFFFF' },
    text: { primary: TIROLEZ.carvao, secondary: TIROLEZ.cinza },
    divider: '#E2E6EA',
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: 'var(--font-ui), "Segoe UI", system-ui, -apple-system, sans-serif',
    h1: { fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.01em' },
    h2: { fontSize: '1.35rem', fontWeight: 700, letterSpacing: '-0.01em' },
    h3: { fontSize: '1.1rem', fontWeight: 600 },
    subtitle2: { fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase', fontSize: '0.72rem' },
    body2: { fontSize: '0.875rem' },
    caption: { fontSize: '0.75rem' },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
      defaultProps: { elevation: 0 },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: '1px solid #E2E6EA',
          boxShadow: '0 1px 2px rgba(31, 41, 51, 0.04)',
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { textTransform: 'none', fontWeight: 600 } },
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 600 } },
    },
    MuiTooltip: {
      defaultProps: { arrow: true },
    },
  },
});

export default theme;
