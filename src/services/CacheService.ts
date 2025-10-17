import { Logger } from "../utils/Logger.ts";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export class CacheService {
  private static cache = new Map<string, CacheEntry<unknown>>();
  private static readonly DEFAULT_TTL_MS = 5 * 60 * 1000;

  private static formatAge(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    const parts: string[] = [];

    if (days > 0) {
      parts.push(`${days} ${days === 1 ? "day" : "days"}`);
    }
    if (hours % 24 > 0) {
      parts.push(`${hours % 24} ${hours % 24 === 1 ? "hour" : "hours"}`);
    }
    if (minutes % 60 > 0) {
      parts.push(
        `${minutes % 60} ${minutes % 60 === 1 ? "minute" : "minutes"}`,
      );
    }
    if (seconds % 60 > 0 || parts.length === 0) {
      parts.push(
        `${seconds % 60} ${seconds % 60 === 1 ? "second" : "seconds"}`,
      );
    }

    return parts.join(", ");
  }

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
        `Cache expired for key: ${key} (age: ${this.formatAge(age)})`,
      );
      return null;
    }

    Logger.info(
      "CACHE",
      `Cache hit for key: ${key} (age: ${this.formatAge(age)})`,
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
