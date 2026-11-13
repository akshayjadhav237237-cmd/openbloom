// lib/cache.js
// High-performance caching layer with stale-while-error fallback.
// In-memory default with optional Redis REST/RESP support.

class MemoryStore {
  constructor() {
    this.store = new Map();
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    return entry;
  }

  set(key, val, ttlMs) {
    if (this.store.size > 2000) {
      // Purge oldest 100 entries to prevent memory exhaustion
      const iter = this.store.keys();
      for (let i = 0; i < 100; i++) {
        const k = iter.next().value;
        if (k) this.store.delete(k);
      }
    }
    const expiresAt = Date.now() + (ttlMs || 60000);
    this.store.set(key, { val, expiresAt, updatedAt: Date.now() });
  }

  delete(key) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }
}

const memory = new MemoryStore();

/**
 * Retrieves an item from cache if unexpired.
 * @param {string} key
 * @returns {Promise<any|null>}
 */
export async function get(key) {
  const entry = memory.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    return null; // Expired
  }
  return entry.val;
}

/**
 * Stores an item in cache with a TTL in milliseconds.
 * @param {string} key
 * @param {any} val
 * @param {number} ttlMs
 */
export async function set(key, val, ttlMs = 60000) {
  memory.set(key, val, ttlMs);
}

/**
 * Clears the cache.
 */
export function clear() {
  memory.clear();
}

/**
 * Wraps an async function with cache and stale-while-error resilience.
 * If fetchFn throws an error and a stale cached value exists, the stale value is returned.
 * @param {string} key
 * @param {number} ttlMs
 * @param {() => Promise<any>} fetchFn
 * @returns {Promise<any>}
 */
export async function wrap(key, ttlMs, fetchFn) {
  const entry = memory.get(key);
  const now = Date.now();

  // Fresh hit
  if (entry && now <= entry.expiresAt) {
    return entry.val;
  }

  try {
    const freshVal = await fetchFn();
    memory.set(key, freshVal, ttlMs);
    return freshVal;
  } catch (err) {
    // Stale-while-error: return stale cache if available
    if (entry) {
      return entry.val;
    }
    throw err;
  }
}

// Common TTL recommendations
export const TTL = {
  QUOTES: 15 * 1000,          // 15 seconds
  OPTIONS: 30 * 1000,         // 30 seconds
  CHARTS: 60 * 1000,          // 60 seconds
  MACRO_RATES: 15 * 60 * 1000,// 15 minutes
  FILINGS: 60 * 60 * 1000,    // 1 hour
  AI: 10 * 60 * 1000,         // 10 minutes
};
