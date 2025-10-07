/**
 * Turn slice for Zustand store
 * Manages turn-based gameplay and timers
 */

import { StateCreator } from 'zustand';
import { GameTurn, GameTimer } from '../../types';

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
      
      if (!turnOrder.includes(playerId)) {
        console.error('❌ Invalid player for turn:', playerId);
        return;
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
      // Clear existing timer
      if (timerInterval) {
        clearInterval(timerInterval);
      }
      
      const timer: GameTimer = {
        totalTime,
        remainingTime: totalTime,
        isActive: true,
        phase,
      };
      
      set({ timer });
      
      // Start countdown
      timerInterval = setInterval(() => {
        const { timer: currentTimer } = get();
        
        if (!currentTimer || !currentTimer.isActive) {
          if (timerInterval) clearInterval(timerInterval);
          return;
        }
        
        const newRemainingTime = currentTimer.remainingTime - 1;
        
        if (newRemainingTime <= 0) {
          // Time's up
          set({
            timer: { ...currentTimer, remainingTime: 0, isActive: false },
          });
          
          if (timerInterval) clearInterval(timerInterval);
          
          // Handle timeout based on phase
          switch (phase) {
            case 'turn':
              console.log('⏰ Turn time expired - advancing to next player');
              get().nextTurn();
              break;
            case 'voting':
              console.log('⏰ Voting time expired');
              break;
            case 'creating':
              console.log('⏰ Board creation time expired');
              break;
          }
        } else {
          // Update remaining time
          set({
            timer: { ...currentTimer, remainingTime: newRemainingTime },
          });
          
          // Update current turn time if it's a turn timer
          if (phase === 'turn') {
            const { currentTurn } = get();
            if (currentTurn) {
              set({
                currentTurn: { ...currentTurn, timeRemaining: newRemainingTime },
              });
            }
          }
        }
      }, 1000);
      
      console.log(`✅ Timer started for ${phase}:`, totalTime, 'seconds');
    },

    updateTimer: () => {
      // This method can be called to sync timer with server time
      // For now, it's handled by the interval in startTimer
    },

    pauseTimer: () => {
      const { timer } = get();
      if (!timer) return;
      
      set({
        timer: { ...timer, isActive: false },
      });
      
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
      
      console.log('⏸️ Timer paused');
    },

    resetTimer: () => {
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
      
      set({ timer: null });
      console.log('🔄 Timer reset');
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
