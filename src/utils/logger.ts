/**
 * Centralized Logger Service for Frontend
 * 
 * Format: <timestamp> [<emoji><ACTION>] <log text> <data>
 * Levels: Info, Debug, Warning, Error
 */

export enum LogLevel {
  INFO = 'INFO',
  DEBUG = 'DEBUG',
  WARNING = 'WARNING',
  ERROR = 'ERROR'
}

export enum LogAction {
  // Navigation Actions
  NAV_TO_SCREEN = 'NAV_TO_SCREEN',
  NAV_BACK = 'NAV_BACK',
  NAV_REDIRECT = 'NAV_REDIRECT',

  // Room Actions
  ROOM_CREATE = 'ROOM_CREATE',
  ROOM_JOIN = 'ROOM_JOIN',
  ROOM_LEAVE = 'ROOM_LEAVE',
  ROOM_UPDATE = 'ROOM_UPDATE',
  ROOM_STATE_SYNC = 'ROOM_STATE_SYNC',

  // Socket Actions
  SOCKET_CONNECT = 'SOCKET_CONNECT',
  SOCKET_DISCONNECT = 'SOCKET_DISCONNECT',
  SOCKET_EVENT_EMIT = 'SOCKET_EVENT_EMIT',
  SOCKET_EVENT_RECEIVE = 'SOCKET_EVENT_RECEIVE',
  SOCKET_JOIN_ROOM = 'SOCKET_JOIN_ROOM',
  SOCKET_LEAVE_ROOM = 'SOCKET_LEAVE_ROOM',

  // Voting Actions
  VOTING_START = 'VOTING_START',
  VOTING_SUBMIT = 'VOTING_SUBMIT',
  VOTING_UPDATE = 'VOTING_UPDATE',
  VOTING_COMPLETE = 'VOTING_COMPLETE',
  VOTING_SYNC = 'VOTING_SYNC',

  // Game Actions
  GAME_START = 'GAME_START',
  GAME_END = 'GAME_END',
  GAME_UPDATE = 'GAME_UPDATE',
  GAME_STATE_CHANGE = 'GAME_STATE_CHANGE',

  // UI Actions
  UI_RENDER = 'UI_RENDER',
  UI_INTERACTION = 'UI_INTERACTION',
  UI_STATE_CHANGE = 'UI_STATE_CHANGE',
  UI_ERROR = 'UI_ERROR',

  // Authentication Actions
  AUTH_LOGIN = 'AUTH_LOGIN',
  AUTH_LOGOUT = 'AUTH_LOGOUT',
  AUTH_VERIFY = 'AUTH_VERIFY',
  AUTH_TOKEN_REFRESH = 'AUTH_TOKEN_REFRESH',

  // API Actions
  API_REQUEST = 'API_REQUEST',
  API_RESPONSE = 'API_RESPONSE',
  API_ERROR = 'API_ERROR',

  // Store Actions
  STORE_UPDATE = 'STORE_UPDATE',
  STORE_CLEAR = 'STORE_CLEAR',
  STORE_SYNC = 'STORE_SYNC',

  // Debug Actions
  DEBUG_TEST = 'DEBUG_TEST',
  DEBUG_PING = 'DEBUG_PING',
  DEBUG_CLEANUP = 'DEBUG_CLEANUP'
}

const ACTION_EMOJIS: Record<LogAction, string> = {
  // Navigation Actions
  [LogAction.NAV_TO_SCREEN]: '📱',
  [LogAction.NAV_BACK]: '⬅️',
  [LogAction.NAV_REDIRECT]: '↗️',

  // Room Actions
  [LogAction.ROOM_CREATE]: '🏗️',
  [LogAction.ROOM_JOIN]: '🚪',
  [LogAction.ROOM_LEAVE]: '🚶',
  [LogAction.ROOM_UPDATE]: '🔄',
  [LogAction.ROOM_STATE_SYNC]: '🔄',

  // Socket Actions
  [LogAction.SOCKET_CONNECT]: '🔌',
  [LogAction.SOCKET_DISCONNECT]: '🔌',
  [LogAction.SOCKET_EVENT_EMIT]: '📤',
  [LogAction.SOCKET_EVENT_RECEIVE]: '📥',
  [LogAction.SOCKET_JOIN_ROOM]: '🏠',
  [LogAction.SOCKET_LEAVE_ROOM]: '🏃',

  // Voting Actions
  [LogAction.VOTING_START]: '🗳️',
  [LogAction.VOTING_SUBMIT]: '✅',
  [LogAction.VOTING_UPDATE]: '📊',
  [LogAction.VOTING_COMPLETE]: '🏁',
  [LogAction.VOTING_SYNC]: '🔄',

  // Game Actions
  [LogAction.GAME_START]: '🎮',
  [LogAction.GAME_END]: '🏆',
  [LogAction.GAME_UPDATE]: '🎯',
  [LogAction.GAME_STATE_CHANGE]: '🎲',

  // UI Actions
  [LogAction.UI_RENDER]: '🎨',
  [LogAction.UI_INTERACTION]: '👆',
  [LogAction.UI_STATE_CHANGE]: '🔄',
  [LogAction.UI_ERROR]: '🎨',

  // Authentication Actions
  [LogAction.AUTH_LOGIN]: '🔐',
  [LogAction.AUTH_LOGOUT]: '🚪',
  [LogAction.AUTH_VERIFY]: '✅',
  [LogAction.AUTH_TOKEN_REFRESH]: '🔄',

  // API Actions
  [LogAction.API_REQUEST]: '📨',
  [LogAction.API_RESPONSE]: '📤',
  [LogAction.API_ERROR]: '🚨',

  // Store Actions
  [LogAction.STORE_UPDATE]: '🗃️',
  [LogAction.STORE_CLEAR]: '🗑️',
  [LogAction.STORE_SYNC]: '🔄',

  // Debug Actions
  [LogAction.DEBUG_TEST]: '🧪',
  [LogAction.DEBUG_PING]: '🏓',
  [LogAction.DEBUG_CLEANUP]: '🧹'
};

class Logger {
  private isDevelopment(): boolean {
    return __DEV__ || process.env.NODE_ENV === 'development';
  }

  private formatTimestamp(): string {
    return new Date().toLocaleTimeString();
  }

  private formatMessage(level: LogLevel, action: LogAction | null, message: string, data?: any): string {
    const timestamp = this.formatTimestamp();

    let actionLabel = '';
    if (action) {
      const emoji = level === LogLevel.DEBUG ? ACTION_EMOJIS[action] : '';
      actionLabel = `${emoji}${action}`;
    }

    const levelEmoji = this.getLevelEmoji(level);
    const label = actionLabel ? `[${levelEmoji}${actionLabel}]` : `[${levelEmoji}${level}]`;

    let formattedMessage = `${timestamp} ${label} ${message}`;

    if (data !== undefined) {
      const dataStr = typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data);
      formattedMessage += ` ${dataStr}`;
    }

    return formattedMessage;
  }

  private getLevelEmoji(level: LogLevel): string {
    switch (level) {
      case LogLevel.INFO:
        return '';
      case LogLevel.DEBUG:
        return '';
      case LogLevel.WARNING:
        return '⚠️';
      case LogLevel.ERROR:
        return '❌';
      default:
        return '';
    }
  }

  info(message: string, data?: any): void {
    console.log(this.formatMessage(LogLevel.INFO, null, message, data));
  }

  debug(message: string, data?: any): void {
    if (this.isDevelopment()) {
      console.log(this.formatMessage(LogLevel.DEBUG, null, message, data));
    }
  }

  warning(message: string, data?: any): void {
    console.warn(this.formatMessage(LogLevel.WARNING, null, message, data));
  }

  error(message: string, data?: any): void {
    console.error(this.formatMessage(LogLevel.ERROR, null, message, data));
  }

  // Convenience methods for common actions
  navigation(message: string, data?: any): void {
    this.debug(message, data);
  }
}

// Export singleton instance
export const logger = new Logger();
export default logger;
