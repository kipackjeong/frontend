/**
 * Mock utilities for development and testing
 */

import { useStore } from '../store';

/**
 * Mock server events for development/testing
 * Simulates server-side game state transitions
 */
export function simulateServerEvents(): void {
  if (!__DEV__) return;

  console.log('🧪 Starting mock server event simulation');
  // Simulate game start
  setTimeout(() => {
    useStore.getState().setGameStatus('voting');
  }, 5000);
}
