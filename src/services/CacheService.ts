import { Logger } from "../utils/Logger.ts";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export class CacheService {
  private static cache = new Map<string, CacheEntry<unknown>>();
  private static readonly DEFAULT_TTL_MS = 5 * 60 * 1000;

  static get<T>(key: string, ttlMs: number = this.DEFAULT_TTL_MS): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      return null;
    }

    const now = Date.now();
    const age = now - entry.timestamp;

    if (age > ttlMs) {
      this.cache.delete(key);
      Logger.info(
        "CACHE",
        `Cache expired for key: ${key} (age: ${Math.round(age / 1000)}s)`,
      );
      return null;
    }

    Logger.info(
      "CACHE",
      `Cache hit for key: ${key} (age: ${Math.round(age / 1000)}s)`,
    );
    return entry.data;
  }

  static set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
    Logger.info("CACHE", `Cached data for key: ${key}`);
  }
}
