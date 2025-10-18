/**
 * App configuration constants
 */

import { NativeModules } from 'react-native';

// Resolve the development host for React Native (Expo/Metro)
// This lets iOS Simulator/Device point to your machine automatically.
const resolveDevHost = (): string => {
  try {
    const scriptURL: string = (NativeModules as any)?.SourceCode?.scriptURL ?? '';
    // Example: http://192.168.1.10:19000/index.bundle?platform=ios&dev=true
    const match = scriptURL.match(/https?:\/\/([^:]+):\d+/);
    if (match?.[1]) return match[1];
  } catch { }
  return 'localhost';
};

const DEV_HOST = resolveDevHost();
const DEV_BASE = `http://${DEV_HOST}:3001`;

const PROD_API = (process.env as any)?.EXPO_PUBLIC_API_URL || 'https://chosung-bingo-backend.salmonwave-d39f32dc.westus2.azurecontainerapps.io';
const PROD_SOCKET = (process.env as any)?.EXPO_PUBLIC_SOCKET_URL || PROD_API;

export const API_CONFIG = {
  BASE_URL: __DEV__ ? DEV_BASE : PROD_API,
  SOCKET_URL: __DEV__ ? DEV_BASE : PROD_SOCKET,
  TIMEOUT: 10000,
} as const

export const API_BASE_URL = API_CONFIG.BASE_URL

export const GAME_CONFIG = {
  MAX_PLAYERS: 8,
  MIN_PLAYERS: 2,
  BOARD_SIZE: 5,
  BINGO_WIN_COUNT: 5,
} as const

export const LANGUAGES = {
  KOREAN: 'korean',
  ENGLISH: 'english',
} as const

export const STORAGE_KEYS = {
  USER_PROFILE: '@choseong_bingo_user',
  LANGUAGE_PREFERENCE: '@choseong_bingo_language',
  GAME_HISTORY: '@choseong_bingo_history',
} as const;

export const TIMER_CONFIG = {
  VOTING_TIME: 30,
  BOARD_CREATION_TIME: 180,
  TURN_TIME: 30,
  GRACE_PERIOD: 5,
} as const;

export const UI_CONFIG = {
  ANIMATION_DURATION: 300,
  TOAST_DURATION: 3000,
  DEBOUNCE_DELAY: 300,
  COLORS: {
    PRIMARY: '#4CAF50',
    SECONDARY: '#FF9800',
    SUCCESS: '#4CAF50',
    ERROR: '#F44336',
    WARNING: '#FF9800',
    INFO: '#2196F3',
    BACKGROUND: '#FFFFFF',
    SURFACE: '#F5F5F5',
    TEXT_PRIMARY: '#212121',
    TEXT_SECONDARY: '#757575',
    BORDER: '#E0E0E0',
  },
  GRADIENTS: {
    INVITE_BUTTON: ['#8b4513', '#228b22'] as string[], // Brown to green gradient for invite/share buttons
  },
  SPACING: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  TYPOGRAPHY: {
    h1: {
      fontSize: 32,
      fontWeight: 'bold' as const,
      lineHeight: 40,
    },
    h2: {
      fontSize: 24,
      fontWeight: 'bold' as const,
      lineHeight: 32,
    },
    h3: {
      fontSize: 20,
      fontWeight: '600' as const,
      lineHeight: 28,
    },
    body: {
      fontSize: 16,
      fontWeight: 'normal' as const,
      lineHeight: 24,
    },
    caption: {
      fontSize: 14,
      fontWeight: 'normal' as const,
      lineHeight: 20,
    },
    small: {
      fontSize: 12,
      fontWeight: 'normal' as const,
      lineHeight: 16,
    },
  },
  FONTS: {
    REGULAR: 'System',
    BOLD: 'System',
    SIZES: {
      XS: 12,
      SM: 14,
      MD: 16,
      LG: 18,
      XL: 24,
      XXL: 32,
    },
  },
} as const;

export const DEV_CONFIG = {
  ENABLE_MOCK_DATA: __DEV__,
  ENABLE_DEBUG_LOGS: __DEV__,
  MOCK_DELAY: 1000,
  QUICK_FILL_ENABLED: __DEV__,
} as const;

export const SOCKET_CONFIG = {
  MAX_RECONNECT_ATTEMPTS: 5,
  RECONNECTION_DELAY: 1000,
  CONNECTION_TIMEOUT: 10000,
  RECONNECTION_ATTEMPTS: 5,
} as const;

export const KOREAN_DICT_CONFIG = {
  API_BASE_URL: 'https://krdict.korean.go.kr/api/search',
  API_KEY: '248B977427652B517DEB6EE0B6549E7C',
  DEVELOPMENT_MODE: false,
} as const;
