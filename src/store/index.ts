/**
 * Main Zustand store configuration
 * Combines all slices and provides typed store interface
 */

import { create } from 'zustand';
import { subscribeWithSelector, persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createUserSlice, UserSlice } from './slices/userSlice';
import { createGameSlice, GameSlice } from './slices/gameSlice';
import { createBoardSlice, BoardSlice } from './slices/boardSlice';
import { createTurnSlice, TurnSlice } from './slices/turnSlice';
import { createRoomSlice, RoomSlice } from './slices/roomSlice';
import { createPregameSlice, PregameSlice } from './slices/pregameSlice';

// Combined store interface
export interface AppStore extends UserSlice, GameSlice, BoardSlice, TurnSlice, RoomSlice, PregameSlice { }

// Create the main store with middleware
export const useStore = create<AppStore>()(
  subscribeWithSelector(
    persist(
      (set, get, api) => ({
        ...createUserSlice(set, get, api),
        ...createGameSlice(set, get, api),
        ...createBoardSlice(set, get, api),
        ...createTurnSlice(set, get, api),
        ...createRoomSlice(set, get, api),
        ...createPregameSlice(set, get, api),
      }),
      {
        name: 'choseong-bingo-store', // AsyncStorage key
        storage: createJSONStorage(() => AsyncStorage),
        partialize: (state) => ({
          // Only persist user data and current room session
          user: state.user,
          currentRoom: state.currentRoom, // Persist room session
          // Don't persist real-time game state, boards, or timers
        }),
      }
    )
  )
);

// Typed selectors for common store selections
export const useUser = () => useStore((state) => state.user);
export const useIsAuthenticated = () => useStore((state) => !!state.user?.isAuthenticated);
export const useCurrentRoom = () => useStore((state) => state.currentRoom);
export const useGameStatus = () => useStore((state) => state.room?.status);
export const useCurrentBoard = () => useStore((state) => state.currentPlayerBoard);
export const useCurrentTurn = () => useStore((state) => state.currentTurn);
export const useGameTimer = () => useStore((state) => state.timer);

// Room selectors
export const useIsInRoom = () => useStore((state) => state.isInRoom());
export const useIsRoomHost = () => useStore((state) => state.isRoomHost());

// Pregame selectors
export const usePregamePlayers = () => useStore((state) => state.pregamePlayers);
export const usePregameRoomId = () => useStore((state) => state.pregameRoomId);

// Action selectors for better component usage
export const useAuthActions = () => useStore((state) => ({
  login: state.login,
  register: state.register,
  logout: state.logout,
  checkAuthStatus: state.checkAuthStatus,
}));

export const useGameActions = () => useStore((state) => ({
  createRoom: state.createRoom,
  joinRoom: state.joinRoom,
  leaveRoom: state.leaveRoom,
  startGame: state.startGame,
  setPlayerReady: state.setPlayerReady,
  voteForChoseong: state.voteForChoseong,
}));

export const useBoardActions = () => useStore((state) => ({
  createBoard: state.createBoard,
  updateCell: state.updateCell,
  markCell: state.markCell,
  validateBoard: state.validateBoard,
  resetBoard: state.resetBoard,
}));

export const useTurnActions = () => useStore((state) => ({
  initializeTurns: state.initializeTurns,
  startTurn: state.startTurn,
  nextTurn: state.nextTurn,
  callWord: state.callWord,
  skipTurn: state.skipTurn,
}));

export const usePregameActions = () => useStore((state) => ({
  initPregame: state.initPregame,
  setPregamePlayers: state.setPregamePlayers,
  upsertPregamePlayer: state.upsertPregamePlayer,
  updatePlayerProgress: state.updatePlayerProgress,
  updatePlayerReady: state.updatePlayerReady,
  syncFromRoomPlayers: state.syncFromRoomPlayers,
  clearPregame: state.clearPregame,
}));

// Store debugging helpers (for development only)
export const useStoreDevtools = () => {
  if (__DEV__) {
    return {
      getState: useStore.getState,
      setState: useStore.setState,
      subscribe: useStore.subscribe,
      // Helper to log current state
      logState: () => console.log('🔍 Store State:', useStore.getState()),
      // Helper to reset store (except persisted data)
      resetNonPersistedState: () => {
        const { user } = useStore.getState();
        useStore.setState({
          room: null,
          availableRooms: [],
          choseongPairs: [],
          selectedChoseongPair: null,
          boards: [],
          currentPlayerBoard: null,
          completedLines: [],
          currentTurn: null,
          turnOrder: [],
          turnHistory: [],
          timer: null,
          isLoading: false,
          error: null,
          user, // Keep user data
        });
        console.log('🔄 Non-persisted state reset');
      },
    };
  }
  return null;
};

// Development helpers
if (__DEV__) {
  // Subscribe to store changes for debugging
  useStore.subscribe(
    (state) => ({
      room: state.room,
      user: state.user,
      currentTurn: state.currentTurn,
    }),
    (current, previous) => {
      // console.log('🔄 Store changed:', {
      //   previous,
      //   current,
      // });
    }
  );
}

export default useStore;
