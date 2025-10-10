/**
 * Turn slice for Zustand store
 * Manages turn-based gameplay and timers
 */

import { StateCreator } from 'zustand';
import { GameTurn, GameTimer } from '../../types';
import { socketService } from '../../services/socket';
import { apiService } from '../../services/api';

export interface TurnSlice {
  // State
  currentTurn: GameTurn | null;
  turnOrder: string[];
  turnHistory: string[];
  timer: GameTimer | null;
  isMyTurn: boolean;
  canCallWord: boolean;
  
  // Actions
  initializeTurns: (playerIds: string[]) => void;
  startTurn: (playerId: string, timeLimit?: number) => void;
  nextTurn: () => void;
  endTurn: () => void;
  callWord: (word: string, playerId: string) => void;
  startTimer: (phase: 'voting' | 'creating' | 'turn', totalTime: number) => void;
  updateTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  setCanCallWord: (can: boolean) => void;
  skipTurn: (playerId: string) => void;
}

export const createTurnSlice: StateCreator<TurnSlice> = (set, get, api) => {
  let timerInterval: NodeJS.Timeout | null = null;

  return {
    // Initial State
    currentTurn: null,
    turnOrder: [],
    turnHistory: [],
    timer: null,
    isMyTurn: false,
    canCallWord: true,

    // Actions
    initializeTurns: (playerIds: string[]) => {
      // Deterministic order provided by server (e.g., confirmed order)
      const order = [...playerIds];
      set({
        turnOrder: order,
        turnHistory: [],
        currentTurn: null,
      });
      console.log('✅ Turn order initialized (deterministic):', order);
    },

    startTurn: (playerId: string, timeLimit: number = 10) => {
      const { turnOrder } = get();
      
      // Be tolerant in dev: if the player isn't in order yet, append it
      let order = turnOrder;
      if (!order.includes(playerId)) {
        order = [...order, playerId];
        set({ turnOrder: order });
        console.warn('⚠️ Player not in turnOrder, appending:', playerId);
      }
      
      const newTurn: GameTurn = {
        playerId,
        timeRemaining: timeLimit,
        maxTime: timeLimit,
        isActive: true,
      };
      
      set({
        currentTurn: newTurn,
        isMyTurn: false, // Will be updated based on current user
        canCallWord: true,
      });
      
      // Start turn timer
      get().startTimer('turn', timeLimit);
      
      console.log('✅ Turn started for player:', playerId);
    },

    nextTurn: () => {
      const { turnOrder, currentTurn, turnHistory } = get();
      
      if (!currentTurn || turnOrder.length === 0) return;
      
      // Add current turn to history
      const updatedHistory = [...turnHistory, currentTurn.playerId];
      
      // Find next player
      const currentIndex = turnOrder.findIndex(id => id === currentTurn.playerId);
      const nextIndex = (currentIndex + 1) % turnOrder.length;
      const nextPlayerId = turnOrder[nextIndex];
      
      // Update turn history
      set({ turnHistory: updatedHistory });
      
      // Start next turn
      get().startTurn(nextPlayerId);
      
      console.log('✅ Turn advanced to player:', nextPlayerId);
    },

    endTurn: () => {
      const { currentTurn } = get();
      
      if (currentTurn) {
        set({
          currentTurn: { ...currentTurn, isActive: false },
          canCallWord: false,
        });
        
        get().resetTimer();
        console.log('✅ Turn ended for player:', currentTurn.playerId);
      }
    },

    callWord: (word: string, playerId: string) => {
      const { currentTurn, canCallWord } = get();
      
      if (!currentTurn || !canCallWord) {
        console.warn('⚠️ Cannot call word at this time');
        return;
      }
      
      if (currentTurn.playerId !== playerId) {
        console.warn('⚠️ Not your turn to call a word');
        return;
      }
      
      console.log('✅ Word called:', word, 'by player:', playerId);
      
      // In a real game, this would trigger board updates and bingo checks
      // For now, just log the action
      
      // Automatically advance to next turn after word is called
      setTimeout(() => {
        get().nextTurn();
      }, 2000);
    },

    startTimer: (phase: 'voting' | 'creating' | 'turn', totalTime: number) => {
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }

      const timer: GameTimer = {
        totalTime,
        remainingTime: totalTime,
        isActive: true,
        phase,
      };
      set({ timer });

      timerInterval = setInterval(() => {
        const { timer: currentTimer } = get();
        if (!currentTimer || !currentTimer.isActive) {
          if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
          return;
        }
        const newRemainingTime = currentTimer.remainingTime - 1;
        if (newRemainingTime <= 0) {
          // Update both timer and current turn's remaining time
          const currTurn = get().currentTurn;
          set({
            timer: { ...currentTimer, remainingTime: 0, isActive: false },
            currentTurn: phase === 'turn' && currTurn ? { ...currTurn, timeRemaining: 0 } : currTurn,
          });
          if (phase === 'turn') {
            try {
              const state: any = get();
              const roomId = state.currentRoom?.id || state.room?.id;
              const order: string[] = Array.isArray(state.turnOrder) ? state.turnOrder : [];
              const curr: string | undefined = state.currentTurn?.playerId;
              if (roomId && curr && order.length >= 2) {
                const idx = Math.max(0, order.indexOf(curr));
                const nextId = order[(idx + 1) % order.length];
                const isHost = typeof state.isRoomHost === 'function' ? state.isRoomHost() : (state.currentRoom?.creator_id === state.user?.id);
                if (isHost) {
                  try { socketService.requestNextTurn(roomId, nextId, 'timeout'); } catch {}
                }
                setTimeout(() => {
                  const now = get().currentTurn?.playerId;
                  if (now === curr) {
                    get().startTurn(nextId);
                  }
                }, 350);
              }
            } catch (e) {
              console.warn('Turn timeout handling failed:', e);
            }
          }
          if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
          return;
        }
        // Tick: update timer and, for turn phase, also currentTurn remaining time
        const currTurnTick = get().currentTurn;
        set({
          timer: { ...currentTimer, remainingTime: newRemainingTime },
          currentTurn: phase === 'turn' && currTurnTick ? { ...currTurnTick, timeRemaining: newRemainingTime } : currTurnTick,
        });
      }, 1000);
    },

    updateTimer: () => {
      const t = get().timer;
      if (!t) return;
      set({ timer: { ...t, remainingTime: Math.max(0, t.remainingTime - 1) } });
    },

    pauseTimer: () => {
      const t = get().timer;
      if (!t) return;
      set({ timer: { ...t, isActive: false } });
      if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    },

    resetTimer: () => {
      const t = get().timer;
      if (!t) return;
      set({ timer: { ...t, remainingTime: t.totalTime, isActive: false } });
      if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    },
    setCanCallWord: (can: boolean) => {
      set({ canCallWord: can });
    },

    skipTurn: (playerId: string) => {
      const { currentTurn } = get();
      if (!currentTurn || currentTurn.playerId !== playerId) {
        console.warn('⚠️ Cannot skip turn - not your turn');
        return;
      }
      
      console.log('⏭️ Turn skipped by player:', playerId);
      get().nextTurn();
    },
  };
};
