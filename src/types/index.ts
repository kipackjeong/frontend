/**
 * Core type definitions for Choseong Bingo application
 */

// User Types
export interface User {
  id: string;
  email: string;
  username: string;
  isAuthenticated: boolean;
  createdAt?: Date;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface RegisterData extends AuthCredentials {
  username: string;
}

// Game Types
export type GameStatus = 'lobby' | 'voting' | 'creating' | 'playing' | 'finished';
export type LanguageMode = 'korean' | 'english';

export interface Player {
  id: string;
  username: string;
  isHost: boolean;
  isReady: boolean;
  avatarUrl?: string;
  boardCompleted: boolean;
}

export interface Room {
  id: string;
  code: string;
  hostId: string;
  players: Player[];
  status: GameStatus;
  languageMode: LanguageMode;
  maxPlayers: number;
  createdAt: Date;
}

export interface ChoseongPair {
  id: string;
  korean: string; // e.g., "ㄱㄴ"
  english: string; // e.g., "GN"
  votes: number;
  votedBy: string[];
}

// Board Types
export interface BingoCell {
  id: string;
  word: string;
  isMarked: boolean;
  isValid: boolean;
  coordinates: [number, number]; // [row, col]
}

export interface BingoBoard {
  id: string;
  playerId: string;
  cells: BingoCell[][];
  completedLines: number[];
  isComplete: boolean;
}

export interface BingoLine {
  type: 'row' | 'column' | 'diagonal';
  index: number;
  cells: [number, number][];
}

// Turn Types
export interface GameTurn {
  playerId: string;
  timeRemaining: number;
  maxTime: number;
  isActive: boolean;
}

export interface GameTimer {
  totalTime: number;
  remainingTime: number;
  isActive: boolean;
  phase: 'voting' | 'creating' | 'turn';
}

// Socket Events
export interface SocketEvents {
  // Client -> Server
  'join-room': { roomCode: string; userId: string };
  'leave-room': { roomId: string; userId: string };
  'start-game': { roomId: string };
  'vote-choseong': { roomId: string; choseongId: string; userId: string };
  'submit-board': { roomId: string; board: BingoBoard };
  'call-word': { roomId: string; word: string; userId: string };
  
  // Server -> Client
  'room-updated': Room;
  'game-started': { choseongPairs: ChoseongPair[] };
  'voting-complete': { selectedPair: ChoseongPair };
  'board-phase-started': { timeLimit: number };
  'game-phase-started': { turnOrder: string[] };
  'turn-changed': { currentPlayerId: string; timeRemaining: number };
  'word-called': { word: string; playerId: string; affectedCells: any };
  'bingo-achieved': { playerId: string; lines: BingoLine[] };
  'game-ended': { winnerId: string; rankings: Player[] };
  'error': { message: string };
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Component Props Types
export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'text';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
}

export interface InputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  multiline?: boolean;
  maxLength?: number;
}

export interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outline';
  padding?: 'none' | 'small' | 'medium' | 'large';
  onPress?: () => void;
}
