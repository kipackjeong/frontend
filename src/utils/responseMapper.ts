/**
 * Response mapper utility using camelcase-keys library
 * Converts snake_case API responses to camelCase for frontend consistency
 */

import camelcaseKeys from 'camelcase-keys';

/**
 * Generic function to convert object keys from snake_case to camelCase
 * Uses the battle-tested camelcase-keys library for robust conversion
 * 
 * @param obj - Object to convert (can be any type)
 * @returns Object with camelCase keys
 */
export function mapResponseToCamelCase<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Use camelcase-keys with deep conversion for nested objects
  return camelcaseKeys(obj as any, {
    deep: true,
    stopPaths: [
      // Preserve certain paths that should stay snake_case if needed
      // Example: 'metadata.raw_data'
    ]
  }) as T;
}

/**
 * Type-safe mapper specifically for API responses
 * Ensures backend snake_case is converted to frontend camelCase
 */
export function mapApiResponse<TOutput = any>(response: any): TOutput {
  return mapResponseToCamelCase(response) as TOutput;
}

/**
 * Enhanced API response mapper with error handling and fallback
 */
export function safeMapApiResponse<TOutput = any>(
  response: any,
  fallback?: TOutput
): TOutput {
  try {
    return mapApiResponse<TOutput>(response);
  } catch (error) {
    console.warn('Failed to map API response to camelCase:', error);
    return fallback || ({} as TOutput);
  }
}

/**
 * Batch map multiple responses
 */
export function mapApiResponseArray<TOutput = any>(
  responses: any[]
): TOutput[] {
  if (!Array.isArray(responses)) {
    console.warn('Expected array for batch mapping');
    return [];
  }

  return responses.map(response => mapApiResponse<TOutput>(response));
}

export default mapResponseToCamelCase;
