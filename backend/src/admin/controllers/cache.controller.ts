import { Controller, Get, Delete, Post, Body, Param, UseGuards } from '@nestjs/common';
import { CachingService } from '../../common/services/caching.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('admin/cache')
@UseGuards(JwtAuthGuard)
export class CacheController {
  constructor(private readonly cachingService: CachingService) {}

  /**
   * Get cache statistics
   */
  @Get('stats')
  getStats() {
    return this.cachingService.getStats();
  }

  /**
   * Clear all cache
   */
  @Delete('all')
  clearAll() {
    this.cachingService.clearAll();
    return { message: 'All cache cleared' };
  }

  /**
   * Clear cache by pattern
   */
  @Delete('pattern')
  clearPattern(@Body() body: { pattern: string }) {
    const count = this.cachingService.clearPattern(body.pattern);
    return { message: `Cleared ${count} entries`, count };
  }

  /**
   * Delete specific cache key
   */
  @Delete('key/:key')
  deleteKey(@Param('key') key: string) {
    const deleted = this.cachingService.delete(key);
    return { deleted };
  }

  /**
   * Warm up cache (preload common queries)
   */
  @Post('warmup')
  async warmup() {
    // Implementation would preload common data
    return { message: 'Cache warmup initiated' };
  }
}
