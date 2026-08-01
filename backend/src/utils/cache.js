'use strict';

/**
 * Minimal in-memory TTL cache. Generic and dependency-free so it can be
 * reused for any short-lived cached value (Spotify playback snapshots,
 * access tokens, etc.) without those modules needing to know about caching
 * internals themselves.
 */
export class TTLCache {
  constructor({ ttlMs = 10_000 } = {}) {
    this.defaultTtlMs = ttlMs;
    this.store = new Map();
  }

  /**
   * @param {string} key
   * @param {*} value
   * @param {number} [ttlMs] — overrides the cache's default TTL for this entry
   */
  set(key, value, ttlMs = this.defaultTtlMs) {
    this.store.set(key, { value, expiresAt: Date.now() + Math.max(0, ttlMs) });
  }

  /** @returns {*} cached value, or `undefined` if missing/expired */
  get(key) {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() >= entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  has(key) {
    return this.get(key) !== undefined;
  }

  delete(key) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }
}
