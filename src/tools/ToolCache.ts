/**
 * Cache entry with metadata
 */
interface CacheEntry<T> {
  value: T;
  timestamp: number;
  expiresAt?: number;
  hits: number;
}

/**
 * Cache strategy
 */
export enum CacheStrategy {
  LRU = 'lru', // Least Recently Used
  LFU = 'lfu', // Least Frequently Used
  FIFO = 'fifo', // First In First Out
  TTL = 'ttl' // Time To Live
}

/**
 * Tool Cache for caching function call results
 * Supports multiple eviction strategies and TTL
 */
export class ToolCache<T = any> {
  private cache: Map<string, CacheEntry<T>>;
  private maxSize: number;
  private defaultTTL?: number;
  private strategy: CacheStrategy;

  constructor(options?: {
    maxSize?: number;
    defaultTTL?: number; // in milliseconds
    strategy?: CacheStrategy;
  }) {
    this.cache = new Map();
    this.maxSize = options?.maxSize || 100;
    this.defaultTTL = options?.defaultTTL;
    this.strategy = options?.strategy || CacheStrategy.LRU;
  }

  /**
   * Generate cache key from function name and arguments
   */
  private generateKey(functionName: string, args: any[]): string {
    return `${functionName}:${JSON.stringify(args)}`;
  }

  /**
   * Check if entry is expired
   */
  private isExpired(entry: CacheEntry<T>): boolean {
    if (!entry.expiresAt) return false;
    return Date.now() > entry.expiresAt;
  }

  /**
   * Evict entries based on strategy
   */
  private evict(): void {
    if (this.cache.size < this.maxSize) return;

    let keyToEvict: string | undefined;

    switch (this.strategy) {
      case CacheStrategy.LRU:
        // Remove least recently used (oldest timestamp)
        let oldestTime = Infinity;
        for (const [key, entry] of this.cache.entries()) {
          if (entry.timestamp < oldestTime) {
            oldestTime = entry.timestamp;
            keyToEvict = key;
          }
        }
        break;

      case CacheStrategy.LFU:
        // Remove least frequently used (lowest hits)
        let lowestHits = Infinity;
        for (const [key, entry] of this.cache.entries()) {
          if (entry.hits < lowestHits) {
            lowestHits = entry.hits;
            keyToEvict = key;
          }
        }
        break;

      case CacheStrategy.FIFO:
        // Remove first entry
        keyToEvict = this.cache.keys().next().value;
        break;

      case CacheStrategy.TTL:
        // Remove any expired entry, or oldest if none expired
        for (const [key, entry] of this.cache.entries()) {
          if (this.isExpired(entry)) {
            keyToEvict = key;
            break;
          }
        }
        if (!keyToEvict) {
          keyToEvict = this.cache.keys().next().value;
        }
        break;
    }

    if (keyToEvict) {
      this.cache.delete(keyToEvict);
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanExpired(): void {
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cached value
   */
  get(functionName: string, args: any[]): T | undefined {
    const key = this.generateKey(functionName, args);
    const entry = this.cache.get(key);

    if (!entry) return undefined;

    if (this.isExpired(entry)) {
      this.cache.delete(key);
      return undefined;
    }

    // Update metadata
    entry.hits++;
    entry.timestamp = Date.now();

    return entry.value;
  }

  /**
   * Set cached value
   */
  set(functionName: string, args: any[], value: T, ttl?: number): void {
    this.cleanExpired();
    this.evict();

    const key = this.generateKey(functionName, args);
    const now = Date.now();
    const effectiveTTL = ttl ?? this.defaultTTL;

    this.cache.set(key, {
      value,
      timestamp: now,
      expiresAt: effectiveTTL ? now + effectiveTTL : undefined,
      hits: 0
    });
  }

  /**
   * Check if key exists in cache
   */
  has(functionName: string, args: any[]): boolean {
    const key = this.generateKey(functionName, args);
    const entry = this.cache.get(key);
    
    if (!entry) return false;
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Invalidate specific cache entry
   */
  invalidate(functionName: string, args: any[]): boolean {
    const key = this.generateKey(functionName, args);
    return this.cache.delete(key);
  }

  /**
   * Invalidate all entries for a function
   */
  invalidateFunction(functionName: string): number {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${functionName}:`)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate?: number;
  } {
    let totalHits = 0;
    let entryCount = 0;

    for (const entry of this.cache.values()) {
      totalHits += entry.hits;
      entryCount++;
    }

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: entryCount > 0 ? totalHits / entryCount : undefined
    };
  }

  /**
   * Wrap a function with caching
   */
  wrap<TArgs extends any[], TResult>(
    functionName: string,
    fn: (...args: TArgs) => Promise<TResult>,
    ttl?: number
  ): (...args: TArgs) => Promise<TResult> {
    return async (...args: TArgs): Promise<TResult> => {
      // Check cache first
      const cached = this.get(functionName, args);
      if (cached !== undefined) {
        return cached as TResult;
      }

      // Execute function
      const result = await fn(...args);

      // Cache result
      this.set(functionName, args, result as any, ttl);

      return result;
    };
  }
}

/**
 * Global tool cache instance
 */
export const globalToolCache = new ToolCache({
  maxSize: 200,
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  strategy: CacheStrategy.LRU
});

/**
 * Decorator for caching function results
 */
export function Cached(ttl?: number) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheKey = `${target.constructor.name}.${propertyKey}`;
      const cached = globalToolCache.get(cacheKey, args);
      
      if (cached !== undefined) {
        return cached;
      }

      const result = await originalMethod.apply(this, args);
      globalToolCache.set(cacheKey, args, result, ttl);
      
      return result;
    };

    return descriptor;
  };
}
