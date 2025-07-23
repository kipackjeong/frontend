/**
 * User slice for Zustand store
 * Manages authentication state and user data
 */

import { StateCreator } from 'zustand'
import { apiService, AuthResponse } from '../../services/api'

// Types
export interface User {
  id: string
  email: string
  username: string
  isAuthenticated?: boolean
  createdAt: string
  updatedAt: string
  profilePicture?: string
  preferences?: {
    language: 'en' | 'ko'
    soundEnabled: boolean
    notificationsEnabled: boolean
  }
  stats?: {
    gamesPlayed: number
    gamesWon: number
    totalScore: number
    winRate: number
  }
}

export interface AuthCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  username: string
  password: string
  language?: 'en' | 'ko'
}

export interface UserSlice {
  // State
  user: User | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (credentials: AuthCredentials) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  setUser: (user: User) => void;
  checkAuthStatus: () => Promise<void>;
  isAuthenticated: () => boolean;
  initializeAuth: () => Promise<void>;
}

// Mock user data for development
const mockUsers: User[] = [
  {
    id: 'user-1',
    email: 'player1@example.com',
    username: 'GameMaster',
    isAuthenticated: true,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'user-2',
    email: 'player2@example.com',
    username: 'BingoExpert',
    isAuthenticated: true,
    createdAt: '2024-02-01T10:00:00Z',
    updatedAt: '2024-02-01T10:00:00Z',
  },
  {
    id: 'user-3',
    email: 'test@test.com',
    username: 'TestPlayer',
    isAuthenticated: true,
    createdAt: '2024-02-10T10:00:00Z',
    updatedAt: '2024-02-10T10:00:00Z',
  },
];

export const createUserSlice: StateCreator<UserSlice> = (set, get, api) => ({
  // Initial State
  user: null,
  isLoading: false,
  error: null,

  // Actions
  login: async (credentials: AuthCredentials) => {
    set({ isLoading: true, error: null });
    
    try {
      // Call real API
      const authResponse = await apiService.login(credentials);
      
      set({
        user: { ...authResponse.user, isAuthenticated: true },
        isLoading: false,
        error: null,
      });
      
      console.log('✅ User logged in successfully:', authResponse.user.username);
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || 'Login failed',
      });
      console.error('❌ Login error:', error.message);
    }
  },

  register: async (userData: RegisterData) => {
    set({ isLoading: true, error: null });
    
    try {
      // Call real API
      const authResponse = await apiService.register(userData);
      
      set({
        user: { ...authResponse.user, isAuthenticated: true },
        isLoading: false,
        error: null,
      });
      
      console.log('✅ User registered successfully:', authResponse.user.username);
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || 'Registration failed',
      });
      console.error('❌ Registration error:', error.message);
    }
  },

  logout: async () => {
    set({ isLoading: true, error: null });
    
    try {
      await apiService.logout();
      
      set({ 
        user: null, 
        isLoading: false, 
        error: null 
      });
      
      console.log('👋 User logged out');
    } catch (error: any) {
      // Still clear local state even if API call fails
      set({
        user: null,
        isLoading: false,
        error: null,
      });
      console.warn('⚠️ Logout API failed, but cleared local state:', error.message);
    }
  },

  // Authentication status getter
  isAuthenticated: () => {
    const { user } = get();
    return user !== null && user.isAuthenticated === true;
  },

  // Initialize authentication from persistent storage
  initializeAuth: async () => {
    set({ isLoading: true, error: null });
    try {
      console.log('🔄 Initializing authentication state');
      
      // Initialize API service to load stored tokens
      await apiService.initialize();
      
      // Check if we have a valid token and get user profile
      if (apiService.hasValidToken()) {
        try {
          const storedUser = await apiService.getStoredUser();
          if (storedUser) {
            // Try to get fresh profile from API
            const profile = await apiService.getProfile();
            set({ 
              user: { ...profile, isAuthenticated: true },
              isLoading: false 
            });
            console.log('✅ Restored authenticated user:', profile.username);
            return;
          }
        } catch (error) {
          // Token might be expired, clear it
          console.warn('⚠️ Failed to restore auth, clearing tokens');
          await apiService.clearTokens();
        }
      }
      
      set({ isLoading: false });
      console.log('ℹ️ No valid authentication found');
    } catch (error: any) {
      set({ isLoading: false, error: error.message });
      console.error('❌ Failed to initialize auth:', error.message);
    }
  },

  clearError: () => {
    set({ error: null });
  },

  setUser: (user: User) => {
    set({ user });
  },

  checkAuthStatus: async () => {
    set({ isLoading: true });
    
    try {
      // Check if we have a valid token
      if (apiService.hasValidToken()) {
        const profile = await apiService.getProfile();
        set({
          user: { ...profile, isAuthenticated: true },
          isLoading: false,
        });
        console.log('✅ Auth status restored for:', profile.username);
      } else {
        set({ user: null, isLoading: false });
        console.log('ℹ️ No valid token found');
      }
    } catch (error: any) {
      set({
        user: null,
        isLoading: false,
        error: error.message || 'Auth check failed',
      });
      console.error('❌ Auth check error:', error.message);
    }
  },
});
