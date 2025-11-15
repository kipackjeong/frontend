import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useStore } from './src/store';
import { LoginScreen, SignupScreen } from './src/screens/auth';
import { HomeScreen, RoomLobby } from './src/screens/lobby';
import { VotingScreen, PreGameBoardScreen, InGameBoardScreen, ResultScreen } from './src/screens/game';
import { navigationRef } from './src/services/navigation';
import LeaderboardsScreen from './src/screens/gamification/LeaderboardsScreen';
import AchievementsScreen from './src/screens/gamification/AchievementsScreen';
import { socketService, playfabService } from './src/services';
import { apiService } from './src/services/api';
import type { RootStackParamList } from './src/types/navigation';


// Create Stack Navigator
const Stack = createStackNavigator<RootStackParamList>();

// Main authenticated app navigation

export default function App() {
  const { user, initializeAuth } = useStore();
  const isAuthenticated = useStore(state => state.isAuthenticated());

  // Track connection state to prevent multiple connection attempts
  const connectionAttemptRef = useRef<boolean>(false);
  const lastUserIdRef = useRef<string | null>(null);

  // Initialize authentication state on mount
  useEffect(() => {
    const initialize = async () => {
      // Initialize auth state from persisted storage
      await initializeAuth();
    };

    initialize();
  }, []); // Only run once on mount

  // Handle socket connection based on auth state  
  useEffect(() => {
    const connectSocket = async () => {
      if (isAuthenticated && user) {
        // Prevent multiple connection attempts for the same user
        if (connectionAttemptRef.current && lastUserIdRef.current === user.id) {
          console.log('⏳ Connection already in progress for user:', user.username);
          return;
        }

        // Check if socket is already connected to avoid reconnection
        if (socketService.isConnected()) {
          console.log('✅ Socket already connected for user:', user.username);
          return;
        }

        connectionAttemptRef.current = true;
        lastUserIdRef.current = user.id;

        try {
          console.log('🔗 Attempting socket connection for user:', user.username);
          // Get the actual JWT access token from apiService
          const accessToken = apiService.getAccessToken();
          await socketService.connect(user.id, accessToken || undefined);
          console.log('✅ Socket connected successfully for user:', user.username);
        } catch (error) {
          console.error('❌ Socket connection failed:', error);
        } finally {
          connectionAttemptRef.current = false;
        }
      } else if (!isAuthenticated) {
        // Reset connection tracking
        connectionAttemptRef.current = false;
        lastUserIdRef.current = null;

        // Disconnect socket if user is not authenticated
        if (socketService.isConnected()) {
          socketService.disconnect();
          console.log('🔌 Socket disconnected - user not authenticated');
        }
      }
    };

    connectSocket();
  }, [isAuthenticated, user?.id]); // Only depend on authentication state and user ID

  // Cleanup socket on unmount
  useEffect(() => {
    return () => {
      socketService.disconnect();
    };
  }, []);

  // Handle PlayFab login based on auth state
  useEffect(() => {
    const loginPlayFab = async () => {
      if (isAuthenticated && user) {
        if (!playfabService.isConfigured()) {
          return; // Skip if no TitleId configured
        }
        if (playfabService.hasSession()) {
          return; // Already logged in
        }
        try {
          await playfabService.loginWithCustomId(user.id);
        } catch (e) {
          // Silently ignore; UI screens will surface state
        }
      }
    };

    loginPlayFab();
  }, [isAuthenticated, user?.id]);



  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: '#FFFFFF' },
          gestureEnabled: false
        }}
      >
        {isAuthenticated ? (
          // Authenticated screens
          <>
            <Stack.Screen
              name="HomeScreen"
              component={HomeScreen}
              options={{ title: '\ucd08\uc131\ube59\uace0' }}
            />
            <Stack.Screen
              name="LeaderboardsScreen"
              component={LeaderboardsScreen}
              options={{ title: 'Leaderboards' }}
            />
            <Stack.Screen
              name="AchievementsScreen"
              component={AchievementsScreen}
              options={{ title: 'Achievements' }}
            />
            <Stack.Screen
              name="RoomLobby"
              component={RoomLobby}
              options={{ title: '대기실' }}
            />
            <Stack.Screen
              name="VotingScreen"
              component={VotingScreen}
              options={{ title: '\ud22c\ud45c' }}
            />
            <Stack.Screen
              name="PreGameBoardScreen"
              component={PreGameBoardScreen}
              options={{ title: '\ubcf4\ub4dc \ub9cc\ub4e4\uae30' }}
            />
            <Stack.Screen
              name="InGameBoardScreen"
              component={InGameBoardScreen}
              options={{ title: '게임 진행' }}
            />
            <Stack.Screen
              name="ResultScreen"
              component={ResultScreen}
              options={{ title: '결과' }}
            />
          </>
        ) : (
          // Authentication screens
          <>
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ title: '로그인' }}
            />
            <Stack.Screen
              name="Signup"
              component={SignupScreen}
              options={{ title: '회원가입' }}
            />
          </>
        )}
      </Stack.Navigator>



      <StatusBar style="auto" />
    </NavigationContainer>
  );
}
