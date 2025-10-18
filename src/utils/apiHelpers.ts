/**
 * API helper utilities for handling responses and errors
 */

import { ApiResponse } from '../services/api';

/**
 * Handles fetch response and converts to JSON
 * @param response Fetch response object
 * @returns Parsed JSON data
 */
export async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json();
  return data;
}

/**
 * Creates a standardized error response
 * @param error Error object or message
 * @returns Standardized ApiResponse with error
 */
export function createErrorResponse<T>(error: unknown): ApiResponse<T> {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
  return {
    success: false,
    error: errorMessage,
  };
}

/**
 * Validates if response is successful
 * @param response API response object
 * @returns True if response indicates success
 */
export function isSuccessResponse<T>(response: ApiResponse<T>): response is ApiResponse<T> & { success: true; data: T } {
  return response.success === true && response.data !== undefined;
}
