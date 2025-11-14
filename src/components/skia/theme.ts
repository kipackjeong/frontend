import { UI_CONFIG } from '../../constants/config';

export type SkiaThemeName = 'physical' | 'neon';

export const SKIA_THEME = {
  physical: {
    background: '#ffffff',
    gridLight: 'rgba(139, 69, 19, 0.35)',
    gridDark: 'rgba(0,0,0,0.08)',
    glow: 'rgba(34, 197, 94, 0.25)',
    highlightFill: 'rgba(16, 185, 129, 0.18)',
    highlightStroke: 'rgba(5, 150, 105, 0.6)',
    border: 'rgba(139,69,19,0.2)',
  },
  neon: {
    background: '#0a0b0d',
    gridLight: 'rgba(0,255,170,0.5)',
    gridDark: 'rgba(0,255,170,0.15)',
    glow: 'rgba(0,255,170,0.35)',
    highlightFill: 'rgba(0,255,170,0.18)',
    highlightStroke: 'rgba(0,255,170,0.8)',
    border: 'rgba(0,255,170,0.35)',
  },
} as const;

export const getSkiaTheme = (name: SkiaThemeName = 'physical') => SKIA_THEME[name];
