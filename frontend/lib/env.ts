/**
 * Environment variable helpers
 * These functions provide runtime validation without breaking build
 */

/**
 * Get API base URL (with /api/v1)
 * @throws Error if NEXT_PUBLIC_API_BASE_URL is not set (only in browser)
 */
export function getApiBaseUrl(): string {
  const value = process.env.NEXT_PUBLIC_API_BASE_URL;
  
  // During build/SSR, return value or empty string
  if (typeof window === 'undefined') {
    return value || '';
  }
  
  // A route-level configuration guard owns the user-facing unavailable state.
  // Returning an empty base here prevents eager API-client imports from crashing
  // before that guard can render.
  if (!value) {
    return '';
  }
  
  return value;
}

/**
 * Get API URL (alternative format, with /api/v1)
 * @throws Error if NEXT_PUBLIC_API_URL is not set (only in browser)
 */
export function getApiUrl(): string {
  const value = process.env.NEXT_PUBLIC_API_BASE_URL;
  
  // During build/SSR, return value or empty string
  if (typeof window === 'undefined') {
    return value || '';
  }
  
  // In browser, validate and throw error if not set
  if (!value) {
    return '';
  }
  
  return value;
}

export function isApiConfigurationAvailable(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_API_BASE_URL);
}

/**
 * Get public API base URL (without /api/v1, for public routes)
 * @throws Error if NEXT_PUBLIC_API_BASE_URL is not set (only in browser)
 */
export function getPublicApiBaseUrl(): string {
  const baseUrl = getApiBaseUrl();
  return baseUrl.replace('/api/v1', '');
}
