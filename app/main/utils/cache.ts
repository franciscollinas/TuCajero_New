/**
 * Simple in-memory cache with TTL for IPC handlers.
 * Reduces database queries for frequently accessed data.
 */

interface CacheEntry<T = unknown> {
  data: T;
  expiresAt: number;
}

export class Cache {
  private store = new Map<string, CacheEntry>();

  /**
   * Get cached data if it exists and hasn't expired.
   */
  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Cache data with a TTL in milliseconds.
   */
  set<T>(key: string, data: T, ttlMs: number): void {
    this.store.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
    });
  }

  /**
   * Remove a specific cache entry.
   */
  invalidate(key: string): void {
    this.store.delete(key);
  }

  /**
   * Clear all cache entries.
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Remove cache entries starting with a prefix.
   */
  invalidateByPrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Get or set cache. If key exists and is valid, returns cached data.
   * Otherwise, calls fn, caches the result, and returns it.
   */
  async getOrSet<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) return cached;

    const data = await fn();
    this.set(key, data, ttlMs);
    return data;
  }
}

// Singleton instance for the app
export const cache = new Cache();

// Cache TTL constants
export const CACHE_TTL = {
  INVENTORY: 5 * 60 * 1000, // 5 minutes
  CATEGORIES: 10 * 60 * 1000, // 10 minutes
  CONFIG: 2 * 60 * 1000, // 2 minutes
  DASHBOARD: 1 * 60 * 1000, // 1 minute
} as const;
