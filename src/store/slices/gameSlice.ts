/**
 * Game slice for Zustand store
 * Manages room state, players, and game flow
 */

import { StateCreator } from 'zustand';
import { Room, Player, ChoseongPair, GameStatus, LanguageMode } from '../../types';

export interface GameSlice {
  // State
  room: Room | null;
  availableRooms: Room[];
  choseongPairs: ChoseongPair[];
  selectedChoseongPair: ChoseongPair | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  createRoom: (hostId: string, maxPlayers?: number) => Promise<string>;
  joinRoom: (roomCode: string, playerId: string) => Promise<void>;
  leaveRoom: (playerId: string) => void;
  setPlayerReady: (playerId: string, isReady: boolean) => void;
  startGame: () => Promise<void>;
  voteForChoseong: (choseongId: string, playerId: string) => void;
  updateRoom: (room: Room) => void;
  setGameStatus: (status: GameStatus) => void;
  clearError: () => void;
  fetchAvailableRooms: () => Promise<void>;
}

// Mock data for development
const mockChoseongPairs: ChoseongPair[] = [
  { id: 'pair-1', korean: 'ㄱㄴ', english: 'GN', votes: 0, votedBy: [] },
  { id: 'pair-2', korean: 'ㄷㅁ', english: 'DM', votes: 0, votedBy: [] },
  { id: 'pair-3', korean: 'ㅂㅅ', english: 'BS', votes: 0, votedBy: [] },
  { id: 'pair-4', korean: 'ㅈㅊ', english: 'JC', votes: 0, votedBy: [] },
  { id: 'pair-5', korean: 'ㅋㅌ', english: 'KT', votes: 0, votedBy: [] },
];

const mockPlayers: Player[] = [
  { id: 'user-1', username: 'GameMaster', avatar: '👑', isHost: true, isReady: true, boardCompleted: false },
  { id: 'user-2', username: 'BingoExpert', avatar: '🎯', isHost: false, isReady: false, boardCompleted: false },
  { id: 'user-3', username: 'TestPlayer', avatar: '🧪', isHost: false, isReady: false, boardCompleted: false },
];

export const createGameSlice: StateCreator<GameSlice> = (set, get, api) => ({
  // Initial State
  room: null,
  availableRooms: [],
  choseongPairs: [],
  selectedChoseongPair: null,
  isLoading: false,
  error: null,

  // Actions
  createRoom: async (hostId: string, maxPlayers: number = 6) => {
    set({ isLoading: true, error: null });
    
    try {
      // Mock API delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const roomCode = Math.random().toString(36).substr(2, 6).toUpperCase();
      const newRoom: Room = {
        id: `room-${Date.now()}`,
        code: roomCode,
        hostId,
        players: [{ ...mockPlayers[0], id: hostId, isHost: true }],
        status: 'lobby',
        languageMode: 'korean', // Auto-detect in real app
        maxPlayers,
        createdAt: new Date(),
      };
      
      set({
        room: newRoom,
        isLoading: false,
      });
      
      console.log('✅ Room created successfully:', roomCode);
      return roomCode;
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || 'Failed to create room',
      });
      console.error('❌ Create room error:', error.message);
      throw error;
    }
  },

  joinRoom: async (roomCode: string, playerId: string) => {
    set({ isLoading: true, error: null });
    
    try {
      // Mock API delay
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const { room } = get();
      
      if (!room || room.code !== roomCode) {
        // Create a mock room for demo
        const mockRoom: Room = {
          id: 'room-demo',
          code: roomCode,
          hostId: 'user-1',
          players: [
            ...mockPlayers.slice(0, 2),
            { id: playerId, username: 'NewPlayer', avatar: '👤', isHost: false, isReady: false, boardCompleted: false }
          ],
          status: 'lobby',
          languageMode: 'korean',
          maxPlayers: 6,
          createdAt: new Date(),
        };
        
        set({
          room: mockRoom,
          isLoading: false,
        });
      } else {
        // Add player to existing room
        const updatedPlayers = [
          ...room.players,
          { id: playerId, username: 'NewPlayer', avatar: '👤', isHost: false, isReady: false, boardCompleted: false }
        ];
        
        set({
          room: { ...room, players: updatedPlayers },
          isLoading: false,
        });
      }
      
      console.log('✅ Joined room successfully:', roomCode);
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || 'Failed to join room',
      });
      console.error('❌ Join room error:', error.message);
    }
  },

  leaveRoom: (playerId: string) => {
    const { room } = get();
    if (!room) return;
    
    const updatedPlayers = room.players.filter(p => p.id !== playerId);
    
    if (updatedPlayers.length === 0) {
      set({ room: null });
      console.log('✅ Room disbanded - no players remaining');
    } else {
      // If host left, assign new host
      const hasHost = updatedPlayers.some(p => p.isHost);
      if (!hasHost && updatedPlayers.length > 0) {
        updatedPlayers[0].isHost = true;
      }
      
      set({
        room: { ...room, players: updatedPlayers },
      });
      console.log('✅ Player left room:', playerId);
    }
  },

  setPlayerReady: (playerId: string, isReady: boolean) => {
    const { room } = get();
    if (!room) return;
    
    const updatedPlayers = room.players.map(p =>
      p.id === playerId ? { ...p, isReady } : p
    );
    
    set({
      room: { ...room, players: updatedPlayers },
    });
    
    console.log(`✅ Player ${isReady ? 'ready' : 'not ready'}:`, playerId);
  },

  startGame: async () => {
    const { room } = get();
    if (!room) return;
    
    set({ isLoading: true, error: null });
    
    try {
      // Mock API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check if all players are ready
      const allReady = room.players.every(p => p.isReady);
      if (!allReady) {
        throw new Error('All players must be ready to start');
      }
      
      set({
        room: { ...room, status: 'voting' },
        choseongPairs: mockChoseongPairs.map(p => ({ ...p, votes: 0, votedBy: [] })),
        isLoading: false,
      });
      
      console.log('✅ Game started - voting phase');
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || 'Failed to start game',
      });
      console.error('❌ Start game error:', error.message);
    }
  },

  voteForChoseong: (choseongId: string, playerId: string) => {
    const { choseongPairs } = get();
    
    const updatedPairs = choseongPairs.map(pair => {
      if (pair.id === choseongId) {
        const hasVoted = pair.votedBy.includes(playerId);
        if (hasVoted) return pair; // Already voted
        
        return {
          ...pair,
          votes: pair.votes + 1,
          votedBy: [...pair.votedBy, playerId],
        };
      } else {
        // Remove vote from other pairs
        return {
          ...pair,
          votes: pair.votedBy.includes(playerId) ? pair.votes - 1 : pair.votes,
          votedBy: pair.votedBy.filter(id => id !== playerId),
        };
      }
    });
    
    set({ choseongPairs: updatedPairs });
    console.log('✅ Vote cast for choseong pair:', choseongId);
  },

  updateRoom: (room: Room) => {
    set({ room });
  },

  setGameStatus: (status: GameStatus) => {
    const { room } = get();
    if (!room) return;
    
    set({ room: { ...room, status } });
  },

  clearError: () => {
    set({ error: null });
  },

  fetchAvailableRooms: async () => {
    set({ isLoading: true, error: null });
    
    try {
      // Mock API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const mockRooms: Room[] = [
        {
          id: 'room-1',
          code: 'GAME01',
          hostId: 'user-1',
          players: mockPlayers.slice(0, 2),
          status: 'lobby',
          languageMode: 'korean',
          maxPlayers: 4,
          createdAt: new Date(),
        },
        {
          id: 'room-2',
          code: 'BINGO2',
          hostId: 'user-2',
          players: mockPlayers.slice(0, 3),
          status: 'lobby',
          languageMode: 'english',
          maxPlayers: 6,
          createdAt: new Date(),
        },
      ];
      
      set({
        availableRooms: mockRooms,
        isLoading: false,
      });
      
      console.log('✅ Fetched available rooms:', mockRooms.length);
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || 'Failed to fetch rooms',
      });
      console.error('❌ Fetch rooms error:', error.message);
    }
  },
});
