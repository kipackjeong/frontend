/**
 * Navigation type definitions for React Navigation
 */

import type { NavigationProp, RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { CurrentRoom } from '../store/slices/roomSlice';

// Define the app's navigation stack
export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  HomeScreen: undefined;
  RoomLobby: {
    roomId: string;
    roomCode?: string;
  };
  VotingScreen: {
    roomId: string;
    votingSession: any;
  };
  PreGameBoardScreen: {
    roomId: string;
    winnerConsonant: string;
    roomData?: CurrentRoom; // Optional room data to prevent state loss during navigation
  };
  BoardCreationScreen: undefined;
  GameScreen: undefined;
  ResultScreen: undefined;
};

// Navigation prop types for each screen
export type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;
export type SignupScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Signup'>;
export type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'HomeScreen'>;
export type RoomLobbyScreenNavigationProp = StackNavigationProp<RootStackParamList, 'RoomLobby'>;
export type VotingScreenNavigationProp = StackNavigationProp<RootStackParamList, 'VotingScreen'>;
export type PreGameBoardScreenNavigationProp = StackNavigationProp<RootStackParamList, 'PreGameBoardScreen'>;
export type BoardCreationScreenNavigationProp = StackNavigationProp<RootStackParamList, 'BoardCreationScreen'>;
export type GameScreenNavigationProp = StackNavigationProp<RootStackParamList, 'GameScreen'>;
export type ResultScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ResultScreen'>;

// Route prop types for each screen
export type LoginScreenRouteProp = RouteProp<RootStackParamList, 'Login'>;
export type SignupScreenRouteProp = RouteProp<RootStackParamList, 'Signup'>;
export type HomeScreenRouteProp = RouteProp<RootStackParamList, 'HomeScreen'>;
export type RoomLobbyScreenRouteProp = RouteProp<RootStackParamList, 'RoomLobby'>;
export type VotingScreenRouteProp = RouteProp<RootStackParamList, 'VotingScreen'>;
export type PreGameBoardScreenRouteProp = RouteProp<RootStackParamList, 'PreGameBoardScreen'>;
export type BoardCreationScreenRouteProp = RouteProp<RootStackParamList, 'BoardCreationScreen'>;
export type GameScreenRouteProp = RouteProp<RootStackParamList, 'GameScreen'>;
export type ResultScreenRouteProp = RouteProp<RootStackParamList, 'ResultScreen'>;

// Declare global navigation types for React Navigation
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList { }
  }
}
