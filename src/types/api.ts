/**
 * Type definitions for API requests and responses
 */

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  details?: string[];
}

/**
 * User profile data
 */
export interface User {
  id: string;
  email: string;
  username: string;
  isAuthenticated?: boolean;
  createdAt: string;
  updatedAt: string;
  profilePicture?: string;
  preferences?: UserPreferences;
  stats?: UserStats;
}

/**
 * User preferences
 */
export interface UserPreferences {
  language: 'en' | 'ko';
  soundEnabled: boolean;
  notificationsEnabled: boolean;
}

/**
 * User statistics
 */
export interface UserStats {
  gamesPlayed: number;
  gamesWon: number;
  totalScore: number;
  winRate: number;
}

/**
 * Authentication response
 */
export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

/**
 * Login credentials
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Registration data
 */
export interface RegisterData {
  email: string;
  username: string;
  password: string;
  language?: 'en' | 'ko';
}

/**
 * Room data
 */
export interface Room {
  id: string;
  code: string;
  name: string;
  hostId: string;
  maxPlayers: number;
  players: Player[];
  status: 'waiting' | 'voting' | 'creating' | 'playing' | 'finished';
  createdAt: string;
  updatedAt: string;
}

/**
 * Player data
 */
export interface Player {
  id: string;
  username: string;
  isHost: boolean;
  isReady: boolean;
  profilePicture?: string;
}

/**
 * Room creation data
 */
export interface CreateRoomData {
  name: string;
  max_players?: number; // Using snake_case to match backend
}

/**
 * Token refresh response
 */
export interface TokenRefreshResponse {
  token: string;
  refreshToken: string;
}
