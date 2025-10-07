/**
 * Room state management slice
 * Handles current room state, membership, and session management
 */

import { StateCreator } from 'zustand';
import { Player } from '../../types';

export interface CurrentRoom {
  id: string;
  name: string;
  code: string;
  creator_id: string;
  max_players: number;
  status: 'waiting' | 'playing' | 'finished';
  players: Player[];
  joinedAt: number; // timestamp
}

export interface RoomSlice {
  // Current room state
  currentRoom: CurrentRoom | null;

  // Actions
  setCurrentRoom: (room: CurrentRoom) => void;
  clearCurrentRoom: () => void;
  updateCurrentRoom: (room: CurrentRoom) => void;
  updatePlayers: (players: Player[]) => void;

  // Computed getters
  isInRoom: () => boolean;
  isRoomHost: () => boolean;
  getCurrentRoomId: () => string | null;
}

export const createRoomSlice: StateCreator<
  RoomSlice,
  [],
  [],
  RoomSlice
> = (set, get) => ({
  // Initial state
  currentRoom: null,

  // Actions
  setCurrentRoom: (room: CurrentRoom) => {
    set({
      currentRoom: {
        ...room,
        joinedAt: Date.now()
      }
    });
  },

  clearCurrentRoom: () => {
    // Also clear pregame state if available
    const maybeClearPregame = (get() as any).clearPregame;
    if (typeof maybeClearPregame === 'function') {
      try { maybeClearPregame(); } catch {}
    }
    set({ currentRoom: null });
  },

  updateCurrentRoom: (room: CurrentRoom) => {
    set((state) => ({
      currentRoom: state.currentRoom ? {
        ...state.currentRoom,
        ...room,
        joinedAt: state.currentRoom.joinedAt // Preserve join timestamp
      } : room
    }));
  },

  updatePlayers: (players: Player[]) => {
    set((state) => ({
      currentRoom: state.currentRoom ? {
        ...state.currentRoom,
        players
      } : null
    }));
  },

  // Computed getters
  isInRoom: () => {
    return get().currentRoom !== null;
  },

  isRoomHost: () => {
    const { currentRoom } = get();
    if (!currentRoom) return false;

    // Assuming we have access to user from the combined store
    // This will be available when integrated with the main store
    const user = (get() as any).user;
    return currentRoom.creator_id === user?.id;
  },

  getCurrentRoomId: () => {
    return get().currentRoom?.id || null;
  },
});
