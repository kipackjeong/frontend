/**
 * Socket.IO client service for real-time game communication
 */

import { io, Socket } from 'socket.io-client';
import { useStore } from '../store';
import { SocketEvents, Room, ChoseongPair, BingoLine } from '../types';

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
    this.socket.on(event, callback);
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

  /**
   * Mock server events for development/testing
   */
  simulateServerEvents(): void {
    if (!__DEV__) return;

    console.log('🧪 Starting mock server event simulation');

    // Simulate room updates
    setTimeout(() => {
      const mockRoom: Room = {
        id: 'mock-room',
        code: 'MOCK01',
        hostId: 'user-1',
        players: [
          { id: 'user-1', username: 'Player1', isHost: true, isReady: true, boardCompleted: false },
          { id: 'user-2', username: 'Player2', isHost: false, isReady: true, boardCompleted: false },
        ],
        status: 'lobby',
        languageMode: 'korean',
        maxPlayers: 6,
        createdAt: new Date(),
      };

      console.log('🎭 Mock: Simulating room update');
      useStore.getState().updateRoom(mockRoom);
    }, 2000);

    // Simulate game start
    setTimeout(() => {
      console.log('🎭 Mock: Simulating game start');
      const mockChoseongPairs: ChoseongPair[] = [
        { id: 'pair-1', korean: 'ㄱㄴ', english: 'GN', votes: 0, votedBy: [] },
        { id: 'pair-2', korean: 'ㄷㅁ', english: 'DM', votes: 1, votedBy: ['user-1'] },
      ];
      
      useStore.getState().setGameStatus('voting');
    }, 5000);
  }
}

// Create singleton instance
export const socketService = new SocketService();

export default socketService;
