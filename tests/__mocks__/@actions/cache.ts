/**
 * Mock implementation of @actions/cache
 * Used for testing GitHub Actions cache functionality
 */

// Mock state storage
const mockCacheState = new Map<string, string>();

export const saveCache = jest.fn(async (paths: string[], key: string, options?: any): Promise<number> => {
  mockCacheState.set(key, JSON.stringify(paths));
  return Date.now(); // Return cache ID
});

export const restoreCache = jest.fn(async (paths: string[], primaryKey: string, restoreKeys?: string[], options?: any): Promise<string | undefined> => {
  if (mockCacheState.has(primaryKey)) {
    return primaryKey; // Cache hit
  }
  
  // Check restore keys
  if (restoreKeys) {
    for (const key of restoreKeys) {
      if (mockCacheState.has(key)) {
        return key;
      }
    }
  }
  
  return undefined; // Cache miss
});

export const isFeatureAvailable = jest.fn((): boolean => {
  return true; // Cache feature is available in tests
});

/**
 * Reset all mocks and clear mock state
 */
export function resetMocks() {
  saveCache.mockClear();
  restoreCache.mockClear();
  isFeatureAvailable.mockClear();
  mockCacheState.clear();
}

/**
 * Manually set a cache entry (for testing cache hits)
 */
export function setCacheEntry(key: string, paths: string[]): void {
  mockCacheState.set(key, JSON.stringify(paths));
}

/**
 * Get cache state (for testing assertions)
 */
export function getCacheState(): Map<string, string> {
  return new Map(mockCacheState);
}

export default {
  saveCache,
  restoreCache,
  isFeatureAvailable,
};
