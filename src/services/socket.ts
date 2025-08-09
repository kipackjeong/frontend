/**
 * Socket.IO client service for real-time game communication
 */

import { io, Socket } from 'socket.io-client';
import { useStore } from '../store';
import { SocketEvents, Room, ChoseongPair, BingoLine } from '../types';
import logger from '../utils/logger';

class SocketService {
  private socket: Socket | null = null;
  private connectionState: 'disconnected' | 'connecting' | 'connected' | 'error' = 'disconnected';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private serverUrl: string;

  constructor(serverUrl: string = 'http://localhost:3001') {
    this.serverUrl = serverUrl;
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
        timeout: 10000,
        forceNew: false,  // ❌ CRITICAL FIX: Don't force new connections
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
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

    const store = useStore.getState();

    // Room events
    this.socket.on('room-updated', (room: Room) => {
      console.log('📡 Room updated:', room);
      store.updateRoom(room);
    });

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

    this.socket.on('game-phase-started', (data: { turnOrder: string[] }) => {
      console.log('🎲 Game phase started:', data.turnOrder);
      store.setGameStatus('playing');
      store.initializeTurns(data.turnOrder);
    });

    this.socket.on('turn-changed', (data: { currentPlayerId: string; timeRemaining: number }) => {
      console.log('🔄 Turn changed to:', data.currentPlayerId);
      store.startTurn(data.currentPlayerId, data.timeRemaining);
    });

    this.socket.on('word-called', (data: { word: string; playerId: string; affectedCells: any }) => {
      console.log('📢 Word called:', data.word, 'by', data.playerId);
      store.markCell('', data.word); // Mark cells with the called word
      store.setCurrentWord(data.word);
    });

    this.socket.on('bingo-achieved', (data: { playerId: string; lines: BingoLine[] }) => {
      console.log('🎉 Bingo achieved by:', data.playerId, 'Lines:', data.lines);
      // Handle bingo achievement
    });

    this.socket.on('game-ended', (data: { winnerId: string; rankings: any[] }) => {
      console.log('🏆 Game ended. Winner:', data.winnerId);
      store.setGameStatus('finished');
    });

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
   */
  simulateServerEvents(): void {
    if (!__DEV__) return;

    console.log('🧪 Starting mock server event simulation');
    // Simulate game start
    setTimeout(() => {
      useStore.getState().setGameStatus('voting');
    }, 5000);
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
