/**
 * API response caching utility to reduce redundant network requests
 * and improve application responsiveness
 */

// Cache storage for API responses
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class ApiCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private defaultTTL: number = 5 * 60 * 1000; // 5 minutes in milliseconds

  /**
   * Gets a cached response if available and not expired
   * 
   * @param key Cache key (usually API endpoint URL)
   * @returns Cached data or null if not found or expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    // Check if entry has expired
    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  /**
   * Sets data in the cache with optional TTL (time to live)
   * 
   * @param key Cache key (usually API endpoint URL)
   * @param data Data to cache
   * @param ttl Optional TTL in milliseconds (defaults to 5 minutes)
   */
  set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    const timestamp = Date.now();
    const expiresAt = timestamp + ttl;
    
    this.cache.set(key, {
      data,
      timestamp,
      expiresAt
    });
  }

  /**
   * Deletes an entry from the cache
   * 
   * @param key Cache key to delete
   * @returns true if deleted, false if not found
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clears all entries from the cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clears all expired entries from the cache
   * 
   * @returns Number of entries removed
   */
  clearExpired(): number {
    const now = Date.now();
    let count = 0;
    
    // Using Array.from to avoid iteration issues with Map.entries() in some environments
    Array.from(this.cache.entries()).forEach(([key, entry]) => {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        count++;
      }
    });
    
    return count;
  }

  /**
   * Updates the default TTL for new cache entries
   * 
   * @param ttl New default TTL in milliseconds
   */
  setDefaultTTL(ttl: number): void {
    this.defaultTTL = ttl;
  }

  /**
   * Gets the size of the cache (number of entries)
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Returns all cache keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Returns data on all cache entries for debugging
   */
  debug(): Record<string, { age: string, expiresIn: string, size: string }> {
    const now = Date.now();
    const result: Record<string, { age: string, expiresIn: string, size: string }> = {};
    
    // Using Array.from to avoid iteration issues with Map.entries() in some environments
    Array.from(this.cache.entries()).forEach(([key, entry]) => {
      const age = now - entry.timestamp;
      const expiresIn = Math.max(0, entry.expiresAt - now);
      const size = JSON.stringify(entry.data).length;
      
      result[key] = {
        age: formatTime(age),
        expiresIn: formatTime(expiresIn),
        size: formatSize(size)
      };
    });
    
    return result;
  }
}

// Helpers for formatting times and sizes
function formatTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  return `${Math.round(ms / 60000)}m`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(2)}KB`;
  return `${(bytes / 1048576).toFixed(2)}MB`;
}

// Create singleton instance
export const apiCache = new ApiCache();

/**
 * Wrapper for fetch that uses caching
 * 
 * @param url URL to fetch
 * @param options Fetch options
 * @param cacheOptions Caching options
 * @returns Promise with response data
 */
export async function cachedFetch<T>(
  url: string,
  options: RequestInit = {},
  cacheOptions: {
    ttl?: number;
    bypassCache?: boolean;
    cacheKey?: string;
  } = {}
): Promise<T> {
  const {
    ttl,
    bypassCache = false,
    cacheKey = `${url}-${JSON.stringify(options)}`
  } = cacheOptions;

  // Only use cache for GET requests
  const useCache = options.method === undefined || options.method === 'GET';
  
  // Check cache first if applicable
  if (useCache && !bypassCache) {
    const cachedData = apiCache.get<T>(cacheKey);
    if (cachedData !== null) {
      return cachedData;
    }
  }
  
  // Fetch from network
  const response = await fetch(url, options);
  
  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }
  
  const data = await response.json();
  
  // Cache the response for GET requests
  if (useCache) {
    apiCache.set<T>(cacheKey, data, ttl);
  }
  
  return data;
}