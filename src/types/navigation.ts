/**
 * Navigation type definitions for React Navigation
 */

import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';

// Define the app's navigation stack
export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  LobbyScreen: undefined;
  RoomScreen: undefined;
  CreateRoom: undefined;
  VotingScreen: undefined;
  BoardCreationScreen: undefined;
  GameScreen: undefined;
  ResultScreen: undefined;
};

// Navigation prop types for each screen
export type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;
export type SignupScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Signup'>;
export type LobbyScreenNavigationProp = StackNavigationProp<RootStackParamList, 'LobbyScreen'>;
export type RoomScreenNavigationProp = StackNavigationProp<RootStackParamList, 'RoomScreen'>;
export type CreateRoomNavigationProp = StackNavigationProp<RootStackParamList, 'CreateRoom'>;
export type VotingScreenNavigationProp = StackNavigationProp<RootStackParamList, 'VotingScreen'>;
export type BoardCreationScreenNavigationProp = StackNavigationProp<RootStackParamList, 'BoardCreationScreen'>;
export type GameScreenNavigationProp = StackNavigationProp<RootStackParamList, 'GameScreen'>;
export type ResultScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ResultScreen'>;

// Route prop types for each screen
export type LoginScreenRouteProp = RouteProp<RootStackParamList, 'Login'>;
export type SignupScreenRouteProp = RouteProp<RootStackParamList, 'Signup'>;
export type LobbyScreenRouteProp = RouteProp<RootStackParamList, 'LobbyScreen'>;
export type RoomScreenRouteProp = RouteProp<RootStackParamList, 'RoomScreen'>;
export type CreateRoomRouteProp = RouteProp<RootStackParamList, 'CreateRoom'>;
export type VotingScreenRouteProp = RouteProp<RootStackParamList, 'VotingScreen'>;
export type BoardCreationScreenRouteProp = RouteProp<RootStackParamList, 'BoardCreationScreen'>;
export type GameScreenRouteProp = RouteProp<RootStackParamList, 'GameScreen'>;
export type ResultScreenRouteProp = RouteProp<RootStackParamList, 'ResultScreen'>;

// Declare global navigation types for React Navigation
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList { }
  }
}
