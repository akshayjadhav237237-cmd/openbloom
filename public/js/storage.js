// public/js/storage.js
// Safe client storage wrapper for localStorage with fallback in-memory store.

const memoryFallback = new Map();

function isStorageAvailable() {
  try {
    const testKey = "__ob_test__";
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

const hasLocalStorage = typeof window !== "undefined" && isStorageAvailable();

/**
 * Gets a parsed JSON value by key.
 * @param {string} key
 * @param {any} [fallback=null]
 * @returns {any}
 */
export function get(key, fallback = null) {
  try {
    if (hasLocalStorage) {
      const item = localStorage.getItem(`openbloom:${key}`);
      return item !== null ? JSON.parse(item) : fallback;
    }
    return memoryFallback.has(key) ? memoryFallback.get(key) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Saves any JSON-serializable value by key.
 * @param {string} key
 * @param {any} val
 * @returns {boolean}
 */
export function set(key, val) {
  try {
    const serialized = JSON.stringify(val);
    if (hasLocalStorage) {
      localStorage.setItem(`openbloom:${key}`, serialized);
    } else {
      memoryFallback.set(key, val);
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Removes an item by key.
 * @param {string} key
 * @returns {boolean}
 */
export function remove(key) {
  try {
    if (hasLocalStorage) {
      localStorage.removeItem(`openbloom:${key}`);
    } else {
      memoryFallback.delete(key);
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Lists all keys with an optional prefix.
 * @param {string} [prefix=""]
 * @returns {string[]}
 */
export function list(prefix = "") {
  const keys = [];
  const fullPrefix = `openbloom:${prefix}`;
  try {
    if (hasLocalStorage) {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(fullPrefix)) {
          keys.push(k.slice("openbloom:".length));
        }
      }
    } else {
      for (const k of memoryFallback.keys()) {
        if (k.startsWith(prefix)) {
          keys.push(k);
        }
      }
    }
  } catch {}
  return keys;
}
