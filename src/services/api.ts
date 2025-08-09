/**
 * API service for backend communication
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../constants/config';
import { mapApiResponse, safeMapApiResponse, mapApiResponseArray } from '../utils/responseMapper';

// Types
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  details?: string[];
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  username: string;
  password: string;
  language?: 'en' | 'ko';
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    username: string;
    isAuthenticated?: boolean;
    createdAt: string;
    updatedAt: string;
    profilePicture?: string;
    preferences?: {
      language: 'en' | 'ko';
      soundEnabled: boolean;
      notificationsEnabled: boolean;
    };
    stats?: {
      gamesPlayed: number;
      gamesWon: number;
      totalScore: number;
      winRate: number;
    };
  };
  token: string;
  refreshToken: string;
}

// Storage keys
const TOKEN_STORAGE_KEY = '@choseong_bingo/access_token';
const REFRESH_TOKEN_STORAGE_KEY = '@choseong_bingo/refresh_token';
const USER_STORAGE_KEY = '@choseong_bingo/user';

class ApiService {
  private baseUrl: string = API_BASE_URL;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  /**
   * Initialize API service and load stored tokens
   */
  async initialize(): Promise<void> {
    try {
      this.accessToken = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
      this.refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to load stored tokens:', error);
    }
  }

  /**
   * Set authentication tokens
   */
  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;

    try {
      await AsyncStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
      await AsyncStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
    } catch (error) {
      console.warn('Failed to store tokens:', error);
    }
  }

  /**
   * Get current access token
   */
  getAccessToken(): string | null {
    return this.accessToken;
  }

  /**
   * Clear authentication tokens
   */
  async clearTokens(): Promise<void> {
    this.accessToken = null;
    this.refreshToken = null;

    try {
      await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
      await AsyncStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
      await AsyncStorage.removeItem(USER_STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear tokens:', error);
    }
  }

  /**
   * Get stored user data
   */
  async getStoredUser(): Promise<AuthResponse['user'] | null> {
    try {
      const userData = await AsyncStorage.getItem(USER_STORAGE_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.warn('Failed to load stored user:', error);
      return null;
    }
  }

  /**
   * Store user data
   */
  async storeUser(user: AuthResponse['user']): Promise<void> {
    try {
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } catch (error) {
      console.warn('Failed to store user:', error);
    }
  }

  /**
   * Make authenticated API request
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
      };

      // Add authorization header if token exists
      if (this.accessToken) {
        headers.Authorization = `Bearer ${this.accessToken}`;
      }

      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      // Handle token refresh if access token is expired
      if (response.status === 401 && this.refreshToken) {
        try {
          await this.refreshAccessToken();
          // Retry the request with new token
          headers.Authorization = `Bearer ${this.accessToken}`;
          const retryResponse = await fetch(url, {
            ...options,
            headers,
          });
          return await retryResponse.json();
        } catch (refreshError) {
          // Refresh failed, clear tokens
          await this.clearTokens();
          throw new Error('Authentication failed. Please login again.');
        }
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  private async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${this.baseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refreshToken: this.refreshToken,
      }),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Token refresh failed');
    }

    await this.setTokens(data.data.token, data.data.refreshToken);
  }

  /**
   * Register new user
   */
  async register(userData: RegisterData): Promise<AuthResponse> {
    const response = await this.makeRequest<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Registration failed');
    }

    // Store tokens and user data
    await this.setTokens(response.data.token, response.data.refreshToken);
    await this.storeUser(response.data.user);

    return response.data;
  }

  /**
   * Login user
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await this.makeRequest<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Login failed');
    }

    // Store tokens and user data
    await this.setTokens(response.data.token, response.data.refreshToken);
    await this.storeUser(response.data.user);

    return response.data;
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    if (this.accessToken) {
      try {
        await this.makeRequest('/api/auth/logout', {
          method: 'POST',
        });
      } catch (error) {
        // Continue with logout even if API call fails
        console.warn('Logout API call failed:', error);
      }
    }

    await this.clearTokens();
  }

  /**
   * Get user profile
   */
  async getProfile(): Promise<AuthResponse['user']> {
    const response = await this.makeRequest<AuthResponse['user']>('/api/auth/profile');

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch profile');
    }

    // Update stored user data
    await this.storeUser(response.data);

    return response.data;
  }

  /**
   * Check if user is authenticated
   */
  hasValidToken(): boolean {
    return !!this.accessToken;
  }

  // Room Management Methods

  /**
   * Create a new game room
   */
  async createRoom(roomData: { name: string; max_players?: number }): Promise<any> {
    const response = await this.makeRequest('/api/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(roomData),
    });

    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to create room');
    }

    // ✅ Convert snake_case response to camelCase using camelcase-keys
    return mapApiResponse(response.data);
  }

  /**
   * Join a room by code
   */
  async joinRoom(roomCode: string): Promise<any> {
    const response = await this.makeRequest('/api/rooms/join', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code: roomCode }),
    });

    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to join room');
    }

    // ✅ Convert snake_case response to camelCase using camelcase-keys
    return mapApiResponse(response.data);
  }

  /**
   * Get room details with players
   */
  async getRoom(roomId: string): Promise<any> {
    const response = await this.makeRequest(`/api/rooms/${roomId}`);

    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to get room details');
    }

    // ✅ Convert snake_case response to camelCase using camelcase-keys
    return mapApiResponse(response.data);
  }

  /**
   * Get list of available rooms
   */
  async getAvailableRooms(): Promise<any[]> {
    const response = await this.makeRequest<any[]>('/api/rooms');

    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to get available rooms');
    }

    // ✅ Convert snake_case response array to camelCase using camelcase-keys
    return Array.isArray(response.data) ? mapApiResponseArray(response.data) : [];
  }
}

export const apiService = new ApiService();
