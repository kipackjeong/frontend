/**
 * Socket.IO client service for real-time game communication
 */

import { io, Socket } from 'socket.io-client';
import { useStore } from '../store';
import { SocketEvents, Room, ChoseongPair, BingoLine } from '../types';
import logger from '../utils/logger';
import { API_CONFIG, SOCKET_CONFIG } from '../constants/config';
import { navigate } from './navigation';
import { safeStoreUpdate } from '../utils/socketHelpers';
import { simulateServerEvents } from '../utils/mockHelpers';
import { toCurrentRoom } from '../utils/roomAdapter';

class SocketService {
  private socket: Socket | null = null;
  private connectionState: 'disconnected' | 'connecting' | 'connected' | 'error' = 'disconnected';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = SOCKET_CONFIG.MAX_RECONNECT_ATTEMPTS;
  private serverUrl: string;
  private prevPlayerCountByRoom: Record<string, number> = {};

  constructor(serverUrl: string = API_CONFIG.SOCKET_URL) {
    this.serverUrl = serverUrl;
  }

  // Select a word during in-game turn (pre-submit highlight)
  selectWord(roomId: string, word: string, userId: string, callback?: (res: any) => void): void {
    if (!this.isConnected()) {
      console.warn('⚠️ Socket not connected');
      return;
    }
    const data = { roomId, word, userId };
    if (callback) {
      this.socket?.emit('game:word_selected', data, callback);
    } else {
      this.socket?.emit('game:word_selected', data);
    }
  }

  // Request server to start game after pregame (all ready or timer expired)
  requestGameStart(roomId: string, payload: { reason: 'all_ready' | 'timer_expired'; confirmedOrder: string[] }, callback?: (res: any) => void): void {
    if (!this.isConnected()) {
      console.warn('⚠️ Socket not connected');
      return;
    }
    const data = { roomId, ...payload };
    if (callback) {
      this.socket?.emit('pregame:request_game_start', data, callback);
    } else {
      this.socket?.emit('pregame:request_game_start', data);
    }
  }

  // Submit a word during in-game turn
  submitWord(roomId: string, word: string, userId: string, cellId?: string, callback?: (res: any) => void): void {
    if (!this.isConnected()) {
      console.warn('⚠️ Socket not connected');
      return;
    }
    const data = { roomId, word, userId, cellId };
    if (callback) {
      this.socket?.emit('game:submit_word', data, callback);
    } else {
      this.socket?.emit('game:submit_word', data);
    }
  }

  // Request next turn (dev/host fallback)
  requestNextTurn(roomId: string, nextPlayerId: string, reason: 'timeout' | 'manual' = 'timeout', callback?: (res: any) => void): void {
    if (!this.isConnected()) {
      console.warn('⚠️ Socket not connected');
      return;
    }
    const data = { roomId, nextPlayerId, reason };
    if (callback) {
      this.socket?.emit('game:request_next_turn', data, callback);
    } else {
      this.socket?.emit('game:request_next_turn', data);
    }
  }

  /**
   * Connect to the Socket.IO server
   */
  async connect(userId: string, token?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if already connected
      if (this.socket?.connected) {
        console.log('✅ Socket already connected:', this.socket.id);
        resolve();
        return;
      }

      // Check if connection is already in progress
      if (this.connectionState === 'connecting') {
        console.log('⏳ Connection already in progress...');
        // Wait for the existing connection attempt
        const checkConnection = () => {
          if (this.connectionState === 'connected') {
            resolve();
          } else if (this.connectionState === 'error') {
            reject(new Error('Connection failed'));
          } else {
            setTimeout(checkConnection, 100);
          }
        };
        checkConnection();
        return;
      }

      // Clean up any existing socket before creating new one
      if (this.socket) {
        this.socket.removeAllListeners();
        this.socket.disconnect();
        this.socket = null;
      }

      this.connectionState = 'connecting';
      console.log('🔗 Connecting to Socket.IO server...', this.serverUrl);

      this.socket = io(this.serverUrl, {
        auth: {
          userId,
          token,
        },
        transports: ['polling', 'websocket'],
        timeout: SOCKET_CONFIG.CONNECTION_TIMEOUT,
        forceNew: false,  // ❌ CRITICAL FIX: Don't force new connections
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: SOCKET_CONFIG.RECONNECTION_ATTEMPTS,
        reconnectionDelay: SOCKET_CONFIG.RECONNECTION_DELAY,
      });

      this.setupEventListeners();

      this.socket.on('connect', () => {
        this.connectionState = 'connected';
        this.reconnectAttempts = 0;
        console.log('✅ Socket.IO connected:', this.socket?.id);
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        this.connectionState = 'error';
        console.error('❌ Socket.IO connection error:', error);
        reject(error);
      });
    });
  }

  /**
   * Disconnect from socket server
   */
  disconnect(): void {
    if (this.socket) {
      console.log('🔌 Disconnecting from Socket.IO server...');
      this.socket.removeAllListeners(); // Remove all event listeners
      this.socket.disconnect();
      this.socket = null;
      this.connectionState = 'disconnected';
      this.reconnectAttempts = 0; // Reset reconnect attempts
    }
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): string {
    return this.connectionState;
  }

  /**
   * Check if socket is connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Setup all socket event listeners
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('disconnect', (reason) => {
      this.connectionState = 'disconnected';
      console.log('🔌 Socket.IO disconnected:', reason);

      if (reason === 'io server disconnect') {
        // Server initiated disconnect - don't reconnect
        return;
      }

      this.handleReconnection();
    });

    this.socket.on('reconnect', (attemptNumber) => {
      this.connectionState = 'connected';
      this.reconnectAttempts = 0;
      console.log('🔄 Socket.IO reconnected after', attemptNumber, 'attempts');
    });

    // Game event listeners
    this.setupGameEventListeners();
  }

  /**
   * Setup game-specific event listeners
   */
  private setupGameEventListeners(): void {
    if (!this.socket) return;

    this.setupRoomEventListeners();
    this.setupGamePhaseListeners();
    this.setupTurnEventListeners();
    this.setupWordEventListeners();
    this.setupRankingEventListeners();
    this.setupErrorEventListeners();
  }

  /**
   * Setup room-related event listeners
   */
  private setupRoomEventListeners(): void {
    if (!this.socket) return;

    const storeGetter = useStore.getState;

    // Legacy/compat: simple room-updated event from older flows
    this.socket.on('room-updated', (room: Room) => {
      console.log('📡 Room updated:', room);
      try {
        const s = storeGetter();
        // Update legacy slice for backward compatibility
        s.updateRoom?.(room as any);
      } catch {}
    });

    // Centralized handler to normalize room payloads and enforce <2 players rule during active phases
    const applyRoomUpdate = (raw: any, cause?: string) => {
      try {
        const s = storeGetter();
        const userId = (s as any).user?.id;
        const updated = raw?.updatedRoom ?? raw?.room ?? raw;
        const current = toCurrentRoom(updated, userId);
        // Update the centralized CurrentRoom store
        (s as any).setCurrentRoom?.(current);

        // Enforce <2 players rule only if pregame/ingame active
        const playerCount = Array.isArray(current.players) ? current.players.length : 0;
        const status = String((current as any)?.status || '');
        const isPreGame = !!(s as any).pregameRoomId || status === 'voting' || status === 'creating';
        const isInGame = status === 'playing';
        const isWaiting = status === 'waiting';
        const prevCount = this.prevPlayerCountByRoom[current.id] ?? playerCount;
        if (playerCount < 2 && (isPreGame || isInGame)) {
          safeStoreUpdate(() => {
            try { (s as any).resetTimer?.(); } catch {}
            try { (s as any).clearPregame?.(); } catch {}
            try { (s as any).setGameStatus?.('finished'); } catch {}
          }, 'Failed to reset state on <2 players');
          // Navigate remaining user back to lobby for this room
          try { navigate('RoomLobby', { roomId: current.id, roomCode: current.code } as any); } catch {}
        } else if (playerCount < 2 && isWaiting) {
          // In Lobby with only one player left: auto-leave the room and return Home
          // Only trigger if we transitioned from >=2 to <2 players
          if (prevCount >= 2) {
            try { this.emit('room:leave', current.id); } catch {}
            safeStoreUpdate(() => {
              try { (s as any).resetTimer?.(); } catch {}
              try { (s as any).clearPregame?.(); } catch {}
              try { (s as any).clearCurrentRoom?.(); } catch {}
            }, 'Failed to clear state on waiting <2 players');
            try { navigate('HomeScreen'); } catch {}
          }
        }
        // Update previous count snapshot for this room
        this.prevPlayerCountByRoom[current.id] = playerCount;
      } catch (e) {
        console.warn('⚠️ Failed to apply room update:', e);
      }
    };

    // Enhanced room lifecycle events
    this.socket.on('room:player_joined', (data: any) => applyRoomUpdate(data, 'player_joined'));
    this.socket.on('room:player_left', (data: any) => applyRoomUpdate(data, 'player_left'));
    this.socket.on('room:player_ready_changed', (data: any) => applyRoomUpdate(data, 'ready_changed'));
    this.socket.on('room:updated', (data: any) => applyRoomUpdate(data, 'updated'));
    this.socket.on('room:closed', (data: any) => {
      const s = storeGetter();
      console.log('🏠 Room closed (central handler):', data);
      safeStoreUpdate(() => {
        try { (s as any).clearPregame?.(); } catch {}
        try { (s as any).clearCurrentRoom?.(); } catch {}
        try { (s as any).resetTimer?.(); } catch {}
      }, 'Failed to clear state on room:closed');
      try { navigate('HomeScreen'); } catch {}
    });
  }

  /**
   * Setup game phase event listeners
   */
  private setupGamePhaseListeners(): void {
    if (!this.socket) return;

    const store = useStore.getState();

    this.socket.on('game-started', (data: { choseongPairs: ChoseongPair[] }) => {
      console.log('🎮 Game started:', data);
      store.setGameStatus('voting');
      // Update choseong pairs in store
    });

    this.socket.on('voting-complete', (data: { selectedPair: ChoseongPair }) => {
      console.log('🗳️ Voting complete:', data.selectedPair);
      store.setGameStatus('creating');
    });

    this.socket.on('board-phase-started', (data: { timeLimit: number }) => {
      console.log('📝 Board creation phase started:', data.timeLimit);
      store.startTimer('creating', data.timeLimit);
    });

    this.socket.on('game-phase-started', (data: { turnOrder: string[]; boards?: Record<string, string[][]>; turnDuration?: number }) => {
      console.log('🎲 Game phase started:', data.turnOrder);
      // 🔎 Diagnostics: verify board payload
      safeStoreUpdate(() => {
        const userId = (useStore.getState() as any).user?.id;
        const keys = Object.keys(data.boards || {});
        const myWords = userId && data.boards?.[userId]
          ? data.boards[userId].flat().filter(w => (w || '').trim().length > 0).length
          : 0;
        console.log('🧩 [DEBUG] Boards keys:', keys);
        console.log('🧩 [DEBUG] My board words:', myWords);
      }, '🧩 [DEBUG] Boards diagnostics error');

      store.setGameStatus('playing');
      // Reset any previous selection
      safeStoreUpdate(() => { (store as any).setCurrentWord?.(''); });
      // Reset server-authoritative ranking for new game
      safeStoreUpdate(() => { (store as any).resetRanking?.(); });
      // Freeze boards if provided by server
      if (data.boards && typeof (store as any).setInGameBoards === 'function') {
        (store as any).setInGameBoards(data.boards);
      }
      // Initialize deterministic order; the server will emit 'game:turn_started' next.
      // We deliberately do NOT start the first turn here to avoid duplicate timers.
      store.initializeTurns(data.turnOrder);
    });

    this.socket.on('bingo-achieved', (data: { playerId: string; lines: BingoLine[] }) => {
      console.log('🎉 Bingo achieved by:', data.playerId, 'Lines:', data.lines);
      // Handle bingo achievement
    });

    this.socket.on('game-ended', (data: { winnerId: string; rankings: any[] }) => {
      console.log('🏆 Game ended. Winner:', data.winnerId);
      store.setGameStatus('finished');
    });
  }

  /**
   * Setup turn-related event listeners
   */
  private setupTurnEventListeners(): void {
    if (!this.socket) return;

    const store = useStore.getState();

    this.socket.on('turn-changed', (data: { currentPlayerId: string; timeRemaining: number }) => {
      console.log('🔄 Turn changed to:', data.currentPlayerId);
      safeStoreUpdate(() => {
        const state = useStore.getState() as any;
        let order: string[] = Array.isArray(state.turnOrder) ? state.turnOrder : [];
        const players = state.currentRoom?.players || state.room?.players || [];
        let ids: string[] = Array.isArray(players) ? players.map((p: any) => p.id) : [];
        ids = Array.from(new Set(ids));
        const needInit = ids.length >= 2 && (order.length < 2 || ids.some((id) => !order.includes(id)));
        if (needInit) {
          if (!ids.includes(data.currentPlayerId)) ids.unshift(data.currentPlayerId);
          const idx = ids.indexOf(data.currentPlayerId);
          if (idx > 0) {
            ids = [...ids.slice(idx), ...ids.slice(0, idx)];
          }
          store.initializeTurns(ids);
        }
        (store as any).setCurrentWord?.('');
      });
      store.startTurn(data.currentPlayerId, data.timeRemaining);
    });

    // New game lifecycle events (server authoritative)
    this.socket.on('game:turn_started', (data: { playerId: string; remainingTime: number }) => {
      console.log('▶️ Turn started for:', data.playerId);
      safeStoreUpdate(() => {
        const state = useStore.getState() as any;
        let order: string[] = Array.isArray(state.turnOrder) ? state.turnOrder : [];
        const players = state.currentRoom?.players || state.room?.players || [];
        let ids: string[] = Array.isArray(players) ? players.map((p: any) => p.id) : [];
        ids = Array.from(new Set(ids));
        const needInit = ids.length >= 2 && (order.length < 2 || ids.some((id) => !order.includes(id)));
        if (needInit) {
          if (!ids.includes(data.playerId)) ids.unshift(data.playerId);
          const idx = ids.indexOf(data.playerId);
          if (idx > 0) {
            ids = [...ids.slice(idx), ...ids.slice(0, idx)];
          }
          store.initializeTurns(ids);
        }
        // Clear any previous selection on new turn start
        (store as any).setCurrentWord?.('');
      }, 'Turn init check failed');
      store.startTurn(data.playerId, data.remainingTime);
    });
  }

  /**
   * Setup word-related event listeners
   */
  private setupWordEventListeners(): void {
    if (!this.socket) return;

    const store = useStore.getState();

    // Cross-device selection highlight
    this.socket.on('game:word_selected', (data: { word: string; playerId: string }) => {
      console.log('🔵 Word selected (highlight):', data.word, 'by', data.playerId);
      safeStoreUpdate(() => { (store as any).setCurrentWord?.(data.word); });
    });

    this.socket.on('game:word_submitted', (data: { word: string; playerId: string }) => {
      console.log('📢 Word submitted:', data.word, 'by', data.playerId);
      // Mark word across all boards and set as current word for UI
      store.markCell('', data.word);
      store.setCurrentWord(data.word);
    });

    this.socket.on('word-called', (data: { word: string; playerId: string; affectedCells: any }) => {
      console.log('📢 Word called:', data.word, 'by', data.playerId);
      store.markCell('', data.word); // Mark cells with the called word
      store.setCurrentWord(data.word);
    });
  }

  /**
   * Setup ranking and scoring event listeners
   */
  private setupRankingEventListeners(): void {
    if (!this.socket) return;

    const store = useStore.getState();

    // Per-user line counts broadcast from server
    this.socket.on('game:line_counts', (data: { counts: Record<string, number> }) => {
      safeStoreUpdate(() => {
        console.log('🟨 [SOCKET] game:line_counts received:', data.counts);
        (store as any).setLineCountsByPlayerId?.(data.counts || {});
      }, 'Failed to apply line counts');
    });

    // Server-authoritative ranking updates
    this.socket.on('game:ranking_update', (data: { finishOrder: string[]; ranksByPlayerId: Record<string, number> }) => {
      safeStoreUpdate(() => {
        console.log('🏁 [SOCKET] game:ranking_update received:', data);
        (store as any).setRanking?.(Array.isArray(data.finishOrder) ? data.finishOrder : [], data.ranksByPlayerId || {});
      }, 'Failed to apply ranking update');
    });

    // Game finished: stop timers, set status, and navigate to results
    this.socket.on('game:finished', (data: { winnerId: string; finalScores: Array<{ playerId: string; score: number }> }) => {
      safeStoreUpdate(() => {
        console.log('🏁 [SOCKET] game:finished received:', data);
        (store as any).resetTimer?.();
        (store as any).setGameStatus?.('finished');
        navigate('ResultScreen');
      }, 'Failed to process game finished');
    });
  }

  /**
   * Setup error event listeners
   */
  private setupErrorEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('error', (data: { message: string }) => {
      console.error('🚨 Server error:', data.message);
    });
  }

  /**
   * Handle automatic reconnection
   */
  private handleReconnection(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.pow(2, this.reconnectAttempts) * 1000; // Exponential backoff

    console.log(`🔄 Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);

    setTimeout(() => {
      if (this.socket && !this.socket.connected) {
        this.socket.connect();
      }
    }, delay);
  }

  // Game action methods
  /**
   * Join a room
   */
  joinRoom(roomCode: string, userId: string): void {
    if (!this.isConnected()) {
      console.warn('⚠️ Socket not connected');
      return;
    }

    console.log('📨 Joining room:', roomCode);
    this.socket?.emit('join-room', { roomCode, userId });
  }

  /**
   * Leave a room
   */
  leaveRoom(roomId: string, userId: string): void {
    if (!this.isConnected()) {
      console.warn('⚠️ Socket not connected');
      return;
    }

    console.log('📤 Leaving room:', roomId);
    this.socket?.emit('leave-room', { roomId, userId });
  }

  /**
   * Start game
   */
  startGame(roomId: string): void {
    if (!this.isConnected()) {
      console.warn('⚠️ Socket not connected');
      return;
    }

    console.log('🚀 Starting game:', roomId);
    this.socket?.emit('start-game', { roomId });
  }

  /**
   * Vote for choseong pair
   */
  voteForChoseong(roomId: string, choseongId: string, userId: string): void {
    if (!this.isConnected()) {
      console.warn('⚠️ Socket not connected');
      return;
    }

    console.log('🗳️ Voting for choseong:', choseongId);
    this.socket?.emit('vote-choseong', { roomId, choseongId, userId });
  }

  /**
   * Submit board
   */
  submitBoard(roomId: string, board: any): void {
    if (!this.isConnected()) {
      console.warn('⚠️ Socket not connected');
      return;
    }

    console.log('📝 Submitting board');
    this.socket?.emit('submit-board', { roomId, board });
  }

  /**
   * Call a word
   */
  callWord(roomId: string, word: string, userId: string): void {
    if (!this.isConnected()) {
      console.warn('⚠️ Socket not connected');
      return;
    }

    console.log('📢 Calling word:', word);
    this.socket?.emit('call-word', { roomId, word, userId });
  }

  /**
   * Generic emit method for custom events
   */
  emit(event: string, data?: any, callback?: (response: any) => void): void {
    if (!this.isConnected()) {
      console.warn('⚠️ Socket not connected');
      return;
    }
    logger.debug(`📍 emit ${event} with data: \n${data}`);
    if (callback) {
      this.socket?.emit(event, data, callback);
    } else {
      this.socket?.emit(event, data);
    }
  }

  /**
   * Generic on method for listening to events
   */
  on(event: string, callback: (...args: any[]) => void): void {
    if (!this.socket) {
      console.warn('⚠️ Socket not initialized');
      return;
    }

    // 🔍 DEBUG: Log all event registrations, especially voting events
    if (event.includes('voting')) {
      console.log('📋 [SOCKET SERVICE] Registering voting event listener:', event, 'Socket connected:', this.socket.connected);
    }

    this.socket.on(event, callback);

    // 🧪 TEST: Add a wrapper to see if events are actually received at socket level
    if (event.includes('voting')) {
      const debugWrapper = (...args: any[]) => {
        console.log('🎯 [SOCKET LEVEL] Raw voting event received:', event, args);
        callback(...args);
      };

      // Remove the original and add the debug wrapper
      this.socket.off(event, callback);
      this.socket.on(event, debugWrapper);
    }
  }

  /**
   * Generic off method for removing event listeners
   */
  off(event: string, callback?: (...args: any[]) => void): void {
    if (!this.socket) {
      console.warn('⚠️ Socket not initialized');
      return;
    }
    this.socket.off(event, callback);
  }

  // PreGame methods
  /**
   * Join PreGame phase for a room
   */
  joinPreGame(roomId: string, consonant: string): void {
    if (!this.isConnected()) {
      console.warn('⚠️ Socket not connected');
      return;
    }

    console.log('🎯 Joining PreGame phase:', roomId, consonant);
    this.socket?.emit('pregame:join', { roomId, consonant });
  }

  /**
   * Update player progress in PreGame (cells completed)
   */
  updatePreGameProgress(roomId: string, cellsCompleted: number, boardData?: any): void {
    if (!this.isConnected()) {
      console.warn('⚠️ Socket not connected');
      return;
    }

    console.log('📊 Updating PreGame progress:', cellsCompleted, '/25 cells');
    this.socket?.emit('pregame:update_progress', { roomId, cellsCompleted, boardData });
  }

  /**
   * Leave PreGame phase
   */
  leavePreGame(roomId: string): void {
    if (!this.isConnected()) {
      console.warn('⚠️ Socket not connected');
      return;
    }

    console.log('🚪 Leaving PreGame phase:', roomId);
    this.socket?.emit('pregame:leave', { roomId });
  }

  /**
   * Mock server events for development/testing
   * @deprecated Use simulateServerEvents from utils/mockHelpers instead
   */
  simulateServerEvents(): void {
    simulateServerEvents();
  }

  // 🎯 PREGAME BOARD STATUS METHODS

  /**
   * Update pregame board status (optimized to reduce socket calls)
   */
  updatePregameBoardStatus(
    roomId: string,
    playerId: string,
    cellsCompleted: number,
    totalCells: number = 25,
    isComplete: boolean = false,
    boardData?: any
  ): Promise<{ success: boolean; message?: string }> {
    return new Promise((resolve) => {
      if (!this.socket || !this.isConnected()) {
        resolve({ success: false, message: 'Socket not connected' });
        return;
      }

      this.socket.emit('pregame:board_update', {
        roomId,
        playerId,
        cellsCompleted,
        totalCells,
        isComplete,
        boardData
      }, (response: any) => {
        resolve(response || { success: true });
      });
    });
  }

  /**
   * Set pregame ready status
   */
  setPreGameReady(
    roomId: string,
    isReady: boolean,
    boardData?: {
      board: any[][];
      completedCells: number;
      timestamp: string;
      playerId: string;
      consonant: string;
    }
  ): Promise<{ success: boolean; message?: string }> {
    return new Promise((resolve) => {
      if (!this.socket || !this.isConnected()) {
        resolve({ success: false, message: 'Socket not connected' });
        return;
      }

      this.socket.emit('pregame:set_ready', {
        roomId,
        isReady,
        boardData
      }, (response: any) => {
        resolve(response || { success: true });
      });
    });
  }

  /**
   * Request current pregame status of all players
   */
  requestPregameStatus(roomId: string): Promise<{ success: boolean; message?: string }> {
    return new Promise((resolve) => {
      if (!this.socket || !this.isConnected()) {
        resolve({ success: false, message: 'Socket not connected' });
        return;
      }

      this.socket.emit('pregame:request_status', roomId, (response: any) => {
        resolve(response || { success: true });
      });
    });
  }

  /**
   * Share current pregame board status
   */
  sharePregameStatus(
    roomId: string,
    playerId: string,
    cellsCompleted: number,
    totalCells: number,
    isReady: boolean,
    isComplete: boolean
  ): Promise<{ success: boolean; message?: string }> {
    return new Promise((resolve) => {
      if (!this.socket || !this.isConnected()) {
        resolve({ success: false, message: 'Socket not connected' });
        return;
      }

      this.socket.emit('pregame:share_status', {
        roomId,
        playerId,
        cellsCompleted,
        totalCells,
        isReady,
        isComplete
      }, (response: any) => {
        resolve(response || { success: true });
      });
    });
  }
}

// Create singleton instance
export const socketService = new SocketService();

export default socketService;
