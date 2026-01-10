import { Controller, Get, Post, Delete, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

// In-memory cache for demo
const memoryCache = new Map<string, { value: any; expiresAt: number }>();

@Controller('api/admin/cache')
@UseGuards(JwtAuthGuard)
export class CacheController {
  /**
   * Get cache statistics
   */
  @Get('stats')
  async getStats() {
    const now = Date.now();
    let activeCount = 0;
    let expiredCount = 0;
    
    memoryCache.forEach((item) => {
      if (item.expiresAt > now) {
        activeCount++;
      } else {
        expiredCount++;
      }
    });

    return {
      totalEntries: memoryCache.size,
      activeEntries: activeCount,
      expiredEntries: expiredCount,
      memoryUsage: process.memoryUsage().heapUsed,
    };
  }

  /**
   * Get all cache keys
   */
  @Get('keys')
  async getKeys() {
    return Array.from(memoryCache.keys());
  }

  /**
   * Clear all cache
   */
  @Post('clear')
  async clearAll() {
    const count = memoryCache.size;
    memoryCache.clear();
    return { cleared: count, success: true };
  }

  /**
   * Clear cache by pattern
   */
  @Post('clear/:pattern')
  async clearByPattern(@Param('pattern') pattern: string) {
    let count = 0;
    const regex = new RegExp(pattern.replace('*', '.*'));
    
    memoryCache.forEach((_, key) => {
      if (regex.test(key)) {
        memoryCache.delete(key);
        count++;
      }
    });

    return { pattern, cleared: count, success: true };
  }

  /**
   * Get cache entry
   */
  @Get('entry/:key')
  async getEntry(@Param('key') key: string) {
    const entry = memoryCache.get(key);
    if (!entry) {
      return { found: false };
    }
    return {
      found: true,
      key,
      value: entry.value,
      expiresAt: new Date(entry.expiresAt).toISOString(),
      expired: entry.expiresAt < Date.now(),
    };
  }

  /**
   * Delete cache entry
   */
  @Delete('entry/:key')
  async deleteEntry(@Param('key') key: string) {
    const existed = memoryCache.has(key);
    memoryCache.delete(key);
    return { key, deleted: existed };
  }
}
