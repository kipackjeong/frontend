/**
 * Socket service helper utilities
 */

/**
 * Safely executes a store update callback with error handling
 * @param callback Function to execute with store state
 * @param errorMessage Optional custom error message
 */
export function safeStoreUpdate(
  callback: () => void,
  errorMessage: string = 'Store update failed'
): void {
  try {
    callback();
  } catch (error) {
    console.warn(errorMessage, error);
  }
}

/**
 * Safely gets a value from an object with type safety
 * @param obj Object to get value from
 * @param key Key to access
 * @param defaultValue Default value if key doesn't exist
 */
export function safeGet<T>(obj: any, key: string, defaultValue: T): T {
  try {
    return obj?.[key] ?? defaultValue;
  } catch {
    return defaultValue;
  }
}
