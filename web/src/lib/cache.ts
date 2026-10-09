/**
 * Cache abstraction. In-memory implementation for local dev / single-process
 * VPS deployment — safe because the Node process stays alive between
 * requests (this is not a serverless deployment). When Redis (Upstash) is
 * introduced per the infra plan, swap the exported `cache` for a Redis-backed
 * implementation of the same interface; nothing else changes.
 */
export interface CacheStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  /** Drops everything. Used for webhook-driven invalidation of the whole store. */
  clear(): Promise<void>;
}

class MemoryCache implements CacheStore {
  private store = new Map<string, { value: string; expiresAt: number }>();

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  async clear(): Promise<void> {
    this.store.clear();
  }
}

export const cache: CacheStore = new MemoryCache();
