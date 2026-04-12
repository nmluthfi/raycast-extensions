/**
 * Caching utilities backed by Raycast's built-in Cache API.
 *
 * TTLs are tuned per data type — expensive operations (insider scans)
 * get longer TTLs, while volatile data (positions) gets shorter ones.
 */

import { Cache } from "@raycast/api";

const cache = new Cache();

/** TTL presets in milliseconds, aligned with PRD NFR-2 caching requirements. */
export const CacheTTL = {
  /** Market search results — 5 minutes. */
  MARKET_SEARCH: 5 * 60 * 1000,
  /** Wallet labels — 1 hour (labels are stable). */
  WALLET_LABELS: 60 * 60 * 1000,
  /** Insider scan results — 15 minutes (expensive, doesn't change rapidly). */
  INSIDER_SCAN: 15 * 60 * 1000,
  /** Wallet positions — 2 minutes (positions change with trades). */
  WALLET_POSITIONS: 2 * 60 * 1000,
  /** Wallet clusters — 1 hour (cluster relationships are stable). */
  WALLET_CLUSTERS: 60 * 60 * 1000,
} as const;

/** Internal structure wrapping cached data with an expiry timestamp. */
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

/**
 * Retrieves a cached value by key. Returns undefined if not cached or expired.
 * Expired entries are automatically evicted on read.
 */
export function getCached<T>(key: string): T | undefined {
  const raw = cache.get(key);
  if (!raw) return undefined;

  try {
    const entry = JSON.parse(raw) as CacheEntry<T>;

    if (Date.now() > entry.expiresAt) {
      // Expired — evict and return miss
      cache.remove(key);
      return undefined;
    }

    return entry.data;
  } catch {
    // Corrupted entry — evict
    cache.remove(key);
    return undefined;
  }
}

/**
 * Stores a value in the cache with the specified TTL.
 */
export function setCache<T>(key: string, data: T, ttlMs: number): void {
  const entry: CacheEntry<T> = {
    data,
    expiresAt: Date.now() + ttlMs,
  };
  cache.set(key, JSON.stringify(entry));
}

/**
 * Generates a deterministic cache key from a tool name and its parameters.
 * Ensures consistent keys regardless of object property order.
 */
export function makeCacheKey(
  tool: string,
  params: Record<string, unknown>,
): string {
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${k}=${String(params[k])}`)
    .join("&");
  return `nansen:${tool}:${sorted}`;
}
