/**
 * Pregame slice for Zustand store
 * Tracks players' board creation progress during pregame phase
 */

import { StateCreator } from 'zustand';
import { Player, PreGamePlayer } from '../../types';

export interface PregameSlice {
  // State
  pregameRoomId: string | null;
  pregamePlayers: PreGamePlayer[];
  pregameLastUpdated: number;
  confirmedOrder: string[];

  // Actions
  initPregame: (roomId: string, players: Player[]) => void;
  setPregamePlayers: (players: PreGamePlayer[]) => void;
  upsertPregamePlayer: (player: PreGamePlayer) => void;
  updatePlayerProgress: (
    playerId: string,
    cellsCompleted: number,
    isComplete: boolean,
    updatedAt?: number
  ) => void;
  updatePlayerReady: (
    playerId: string,
    isReady: boolean,
    updatedAt?: number
  ) => void;
  syncFromRoomPlayers: (players: Player[]) => void;
  clearPregame: () => void;

  // Getters
  getPregamePlayerById: (id: string) => PreGamePlayer | undefined;
  getMyPregamePlayer: (userId: string) => PreGamePlayer | undefined;
  getReadyCount: () => number;
  getCompletedCount: () => number;
  allReady: () => boolean;
  getConfirmedOrder: () => string[];
}

export const createPregameSlice: StateCreator<PregameSlice> = (set, get) => ({
  // Initial state
  pregameRoomId: null,
  pregamePlayers: [],
  pregameLastUpdated: 0,
  confirmedOrder: [],

  // Actions
  initPregame: (roomId: string, players: Player[]) => {
    const mapped: PreGamePlayer[] = players.map((p) => ({
      ...p,
      // Pregame always starts with clean progress
      isReady: false,
      boardCompleted: false,
      cellsCompleted: 0,
    }));

    set({
      pregameRoomId: roomId,
      pregamePlayers: mapped,
      pregameLastUpdated: Date.now(),
      confirmedOrder: [],
    });
  },

  setPregamePlayers: (players: PreGamePlayer[]) => {
    set({ pregamePlayers: players, pregameLastUpdated: Date.now() });
  },

  upsertPregamePlayer: (player: PreGamePlayer) => {
    const { pregamePlayers } = get();
    const idx = pregamePlayers.findIndex((p) => p.id === player.id);
    const next = [...pregamePlayers];

    if (idx >= 0) {
      const prev = next[idx];
      const incomingTs = player.lastUpdatedAt ?? 0;
      const prevTs = prev.lastUpdatedAt ?? 0;
      const newer = incomingTs >= prevTs;
      next[idx] = {
        ...prev,
        ...player,
        // Merge with recency and monotonic progress for counts
        cellsCompleted: Math.max(prev.cellsCompleted ?? 0, player.cellsCompleted ?? 0),
        isReady: newer && typeof player.isReady === 'boolean' ? player.isReady : prev.isReady,
        boardCompleted: newer && typeof player.boardCompleted === 'boolean' ? player.boardCompleted : prev.boardCompleted,
        lastUpdatedAt: Math.max(prev.lastUpdatedAt ?? 0, player.lastUpdatedAt ?? 0),
      };
    } else {
      next.push({ ...player, lastUpdatedAt: player.lastUpdatedAt ?? Date.now() });
    }

    set({ pregamePlayers: next, pregameLastUpdated: Date.now() });
  },

  updatePlayerProgress: (playerId: string, cellsCompleted: number, isComplete: boolean, updatedAt?: number) => {
    const ts = updatedAt ?? Date.now();
    const state = get();
    const exists = state.pregamePlayers.find((p) => p.id === playerId);
    if (!exists) {
      // Create with minimal placeholder; room sync will enrich identity
      const newcomer: PreGamePlayer = {
        id: playerId,
        username: `Player_${playerId.slice(-6)}`,
        isHost: false,
        isReady: isComplete,
        avatar: '👤',
        boardCompleted: isComplete,
        cellsCompleted: Math.max(0, cellsCompleted ?? 0),
        lastUpdatedAt: ts,
      };
      return set({ pregamePlayers: [...state.pregamePlayers, newcomer], pregameLastUpdated: Date.now() });
    }

    const next = state.pregamePlayers.map((p) => {
      if (p.id !== playerId) return p;
      if ((p.lastUpdatedAt ?? 0) > ts) return p; // Ignore stale
      return {
        ...p,
        cellsCompleted: Math.max(p.cellsCompleted ?? 0, cellsCompleted ?? 0),
        boardCompleted: !!(p.boardCompleted || isComplete),
        lastUpdatedAt: Math.max(p.lastUpdatedAt ?? 0, ts),
      };
    });
    set({ pregamePlayers: next, pregameLastUpdated: Date.now() });
  },

  updatePlayerReady: (playerId: string, isReady: boolean, updatedAt?: number) => {
    const ts = updatedAt ?? Date.now();
    const state = get();
    const exists = state.pregamePlayers.find((p) => p.id === playerId);
    if (!exists) {
      const newcomer: PreGamePlayer = {
        id: playerId,
        username: `Player_${playerId.slice(-6)}`,
        isHost: false,
        isReady: isReady,
        avatar: '👤',
        boardCompleted: false,
        cellsCompleted: 0,
        lastUpdatedAt: ts,
        readyAt: isReady ? ts : undefined,
      };
      const nextOrder = isReady ? [...state.confirmedOrder, playerId] : state.confirmedOrder;
      return set({ pregamePlayers: [...state.pregamePlayers, newcomer], pregameLastUpdated: Date.now(), confirmedOrder: nextOrder });
    }

    const next = state.pregamePlayers.map((p) => {
      if (p.id !== playerId) return p;
      if ((p.lastUpdatedAt ?? 0) > ts) return p; // Ignore stale
      const becameReady = !p.isReady && isReady;
      return {
        ...p,
        isReady: isReady,
        // boardCompleted reflects board fill status only; do not auto-tie to ready
        boardCompleted: p.boardCompleted,
        lastUpdatedAt: Math.max(p.lastUpdatedAt ?? 0, ts),
        readyAt: p.readyAt ?? (becameReady ? ts : undefined),
      };
    });
    // Update confirmed order if this is the first time the player became ready
    let newConfirmed = state.confirmedOrder;
    const wasInOrder = newConfirmed.includes(playerId);
    const target = next.find((p) => p.id === playerId)!;
    if (isReady && !wasInOrder) {
      newConfirmed = [...newConfirmed, playerId];
    }
    if (!isReady && wasInOrder) {
      // Do not remove from order; order is final and used for turn sequencing
    }
    set({ pregamePlayers: next, pregameLastUpdated: Date.now(), confirmedOrder: newConfirmed });
  },

  syncFromRoomPlayers: (players: Player[]) => {
    const current = get().pregamePlayers;
    const mapById = new Map(current.map((p) => [p.id, p] as const));

    const merged: PreGamePlayer[] = players.map((rp) => {
      const prev = mapById.get(rp.id);
      if (prev) {
        return {
          ...prev,
          username: rp.username,
          isHost: rp.isHost,
          avatar: rp.avatar,
          // Do NOT override pregame flags from room; pregame flags are driven by pregame socket events only
        };
      }
      // New entrants to pregame start clean
      return { ...rp, isReady: false, boardCompleted: false, cellsCompleted: 0 };
    });

    set({ pregamePlayers: merged, pregameLastUpdated: Date.now() });
  },

  clearPregame: () => {
    set({ pregameRoomId: null, pregamePlayers: [], pregameLastUpdated: 0, confirmedOrder: [] });
  },

  // Getters
  getPregamePlayerById: (id: string) => get().pregamePlayers.find((p) => p.id === id),
  getMyPregamePlayer: (userId: string) => get().pregamePlayers.find((p) => p.id === userId),
  getReadyCount: () => get().pregamePlayers.filter((p) => p.isReady || p.boardCompleted).length,
  getCompletedCount: () => get().pregamePlayers.filter((p) => (p.cellsCompleted ?? 0) >= 25).length,
  allReady: () => {
    const players = get().pregamePlayers;
    if (players.length === 0) return false;
    return players.every((p) => p.isReady || p.boardCompleted);
  },
  getConfirmedOrder: () => get().confirmedOrder,
});
