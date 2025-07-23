/**
 * Socket.IO service for real-time communication
 */
import { io, Socket } from 'socket.io-client'
import { API_CONFIG } from '../constants/config'

class SocketService {
  private socket: Socket | null = null
  private connected = false

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = io(API_CONFIG.SOCKET_URL, {
        transports: ['polling', 'websocket'],
        timeout: API_CONFIG.TIMEOUT,
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      })

      this.socket.on('connect', () => {
        console.log('✅ Socket.IO connected to backend')
        this.connected = true
        resolve()
      })

      this.socket.on('disconnect', () => {
        console.log('❌ Socket.IO disconnected')
        this.connected = false
      })

      this.socket.on('connect_error', (error) => {
        console.error('❌ Socket.IO connection error:', error)
        this.connected = false
        reject(error)
      })

      // Test connection timeout
      setTimeout(() => {
        if (!this.connected) {
          reject(new Error('Socket connection timeout'))
        }
      }, API_CONFIG.TIMEOUT)
    })
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.connected = false
    }
  }

  isConnected(): boolean {
    return this.connected && this.socket?.connected === true
  }

  emit(event: string, data?: any): void {
    if (this.socket && this.connected) {
      this.socket.emit(event, data)
    } else {
      console.warn('Socket not connected, cannot emit:', event)
    }
  }

  on(event: string, callback: (data: any) => void): void {
    if (this.socket) {
      this.socket.on(event, callback)
    }
  }

  off(event: string, callback?: (data: any) => void): void {
    if (this.socket) {
      this.socket.off(event, callback)
    }
  }
}

export const socketService = new SocketService()
export default socketService
