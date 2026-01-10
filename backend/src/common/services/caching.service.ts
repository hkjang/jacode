import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  hits: number;
}

@Injectable()
export class CachingService {
  private readonly logger = new Logger(CachingService.name);
  private cache = new Map<string, CacheEntry<any>>();
  private readonly defaultTTL: number;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(private readonly config: ConfigService) {
    this.defaultTTL = parseInt(config.get('CACHE_TTL', '300000')); // 5 minutes
    this.startCleanup();
  }

  /**
   * Get cached value
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Update hit count
    entry.hits++;

    return entry.value as T;
  }

  /**
   * Set cache value
   */
  set<T>(key: string, value: T, ttlMs?: number): void {
    const ttl = ttlMs || this.defaultTTL;

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl,
      hits: 0,
    });
  }

  /**
   * Get or set (lazy loading)
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlMs?: number
  ): Promise<T> {
    const cached = this.get<T>(key);

    if (cached !== null) {
      this.logger.debug(`Cache hit: ${key}`);
      return cached;
    }

    this.logger.debug(`Cache miss: ${key}`);
    const value = await factory();
    this.set(key, value, ttlMs);

    return value;
  }

  /**
   * Delete cached value
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear cache by pattern
   */
  clearPattern(pattern: string): number {
    const regex = new RegExp(pattern);
    let count = 0;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }

    this.logger.log(`Cleared ${count} cache entries matching: ${pattern}`);
    return count;
  }

  /**
   * Clear all cache
   */
  clearAll(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.logger.log(`Cleared all ${size} cache entries`);
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const entries = Array.from(this.cache.entries());
    
    return {
      totalEntries: entries.length,
      totalHits: entries.reduce((sum, [_, entry]) => sum + entry.hits, 0),
      averageHits: entries.length > 0
        ? entries.reduce((sum, [_, entry]) => sum + entry.hits, 0) / entries.length
        : 0,
      memoryUsage: this.estimateMemoryUsage(),
    };
  }

  /**
   * Start periodic cleanup
   */
  private startCleanup() {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // Every minute
  }

  /**
   * Cleanup expired entries
   */
  private cleanup() {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      this.logger.debug(`Cleaned up ${removed} expired cache entries`);
    }
  }

  /**
   * Estimate memory usage
   */
  private estimateMemoryUsage(): string {
    const bytes = JSON.stringify(Array.from(this.cache.entries())).length;
    
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  /**
   * Cleanup on destroy
   */
  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}
