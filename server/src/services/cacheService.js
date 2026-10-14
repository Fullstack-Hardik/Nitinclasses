/**
 * In-Memory Application Cache for Nitin Sir Classes
 * Provides TTL-based caching and pattern-based invalidation
 * for read-heavy operations (e.g. dashboard stats, settings, seat overviews).
 */

class MemoryCache {
  constructor() {
    this.cache = new Map();
  }

  /**
   * Set cache item with Time-To-Live in milliseconds
   * @param {string} key
   * @param {any} value
   * @param {number} ttlMs Default 30,000ms (30 seconds)
   */
  set(key, value, ttlMs = 30000) {
    const expiresAt = Date.now() + ttlMs;
    this.cache.set(key, { value, expiresAt });
  }

  /**
   * Get cached item if not expired
   * @param {string} key
   * @returns {any|null}
   */
  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Delete specific key
   * @param {string} key
   */
  del(key) {
    this.cache.delete(key);
  }

  /**
   * Invalidate all keys matching a prefix or pattern
   * e.g. invalidate('dashboard') or invalidate('settings')
   * @param {string} prefix
   */
  invalidate(prefix) {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.cache.clear();
  }
}

// Singleton cache instance
const cache = new MemoryCache();

module.exports = cache;
