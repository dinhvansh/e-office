/**
 * Environment variable helpers
 * These functions provide runtime validation without breaking build
 */

/**
 * Get API base URL (with /api/v1)
 * @throws Error if NEXT_PUBLIC_API_BASE_URL is not set (only in browser)
 */
export function getApiBaseUrl(): string {
  // During build/SSR, return empty string
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_API_BASE_URL || '';
  }
  
  // In browser, validate and throw error if not set
  if (!process.env.NEXT_PUBLIC_API_BASE_URL) {
    throw new Error('NEXT_PUBLIC_API_BASE_URL environment variable is required');
  }
  
  return process.env.NEXT_PUBLIC_API_BASE_URL;
}

/**
 * Get API URL (alternative format, with /api/v1)
 * @throws Error if NEXT_PUBLIC_API_URL is not set (only in browser)
 */
export function getApiUrl(): string {
  // During build/SSR, return empty string
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || '';
  }
  
  // In browser, validate and throw error if not set
  if (!process.env.NEXT_PUBLIC_API_URL) {
    throw new Error('NEXT_PUBLIC_API_URL environment variable is required');
  }
  
  return process.env.NEXT_PUBLIC_API_URL;
}

/**
 * Get public API base URL (without /api/v1, for public routes)
 * @throws Error if NEXT_PUBLIC_API_BASE_URL is not set (only in browser)
 */
export function getPublicApiBaseUrl(): string {
  const baseUrl = getApiBaseUrl();
  return baseUrl.replace('/api/v1', '');
}
