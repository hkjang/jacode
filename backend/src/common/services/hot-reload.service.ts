import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

export interface PolicyUpdate {
  type: 'routing' | 'style' | 'feature';
  changes: any;
  appliedAt: Date;
}

@Injectable()
export class HotReloadService implements OnModuleInit {
  private readonly logger = new Logger(HotReloadService.name);
  private policyCache = new Map<string, any>();
  private watchers = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    // Start watching for policy changes
    if (this.config.get('ENABLE_HOT_RELOAD', 'true') === 'true') {
      this.startWatching();
    }
  }

  /**
   * Start watching for policy changes
   */
  private startWatching() {
    // Watch routing policies
    this.watchPolicies('routing', 5000); // Every 5 seconds
    
    // Watch code style presets
    this.watchPolicies('style', 10000); // Every 10 seconds
    
    // Watch feature toggles
    this.watchPolicies('feature', 5000);

    this.logger.log('Hot reload watching started');
  }

  /**
   * Watch specific policy type
   */
  private watchPolicies(type: PolicyUpdate['type'], interval: number) {
    const watcher = setInterval(async () => {
      try {
        await this.checkForUpdates(type);
      } catch (error) {
        this.logger.error(`Failed to check ${type} updates`, error);
      }
    }, interval);

    this.watchers.set(type, watcher);
  }

  /**
   * Check for policy updates
   */
  private async checkForUpdates(type: PolicyUpdate['type']) {
    let currentData: any[];
    let cacheKey: string;

    switch (type) {
      case 'routing':
        currentData = await this.prisma.modelRoutingPolicy.findMany({
          where: { isActive: true },
        });
        cacheKey = 'routing_policies';
        break;
      
      case 'style':
        currentData = await this.prisma.codeStylePreset.findMany({
          where: { isGlobal: true },
        });
        cacheKey = 'style_presets';
        break;
      
      case 'feature':
        currentData = await this.prisma.featureToggle.findMany();
        cacheKey = 'feature_toggles';
        break;
      
      default:
        return;
    }

    const cached = this.policyCache.get(cacheKey);
    const currentHash = this.hashData(currentData);

    if (!cached || cached !== currentHash) {
      this.logger.log(`🔄 ${type} policy updated - reloading without downtime`);
      
      // Update cache
      this.policyCache.set(cacheKey, currentHash);

      // Trigger reload event
      await this.onPolicyUpdate({
        type,
        changes: currentData,
        appliedAt: new Date(),
      });
    }
  }

  /**
   * Handle policy update
   */
  private async onPolicyUpdate(update: PolicyUpdate) {
    // Log to audit trail
    await this.prisma.systemLog.create({
      data: {
        level: 'INFO',
        category: 'hot_reload',
        message: `${update.type} policy hot-reloaded`,
        context: {
          type: update.type,
          changeCount: Array.isArray(update.changes) ? update.changes.length : 1,
          appliedAt: update.appliedAt,
        },
      },
    });

    // Policy is already reloaded automatically via Prisma query
    // Services will get fresh data on next request
    this.logger.log(`✅ ${update.type} policy applied without restart`);
  }

  /**
   * Hash data for comparison
   */
  private hashData(data: any): string {
    return JSON.stringify(data).split('').reduce((hash, char) => {
      return ((hash << 5) - hash) + char.charCodeAt(0);
    }, 0).toString();
  }

  /**
   * Get current policies (with cache)
   */
  async getPolicy<T>(
    type: 'routing' | 'style' | 'feature',
    forceRefresh = false
  ): Promise<T[]> {
    // This method provides cached access to policies
    // But in practice, Prisma queries are fast enough
    // that we can just query directly

    switch (type) {
      case 'routing':
        return this.prisma.modelRoutingPolicy.findMany({
          where: { isActive: true },
        }) as Promise<T[]>;
      
      case 'style':
        return this.prisma.codeStylePreset.findMany({
          where: { isGlobal: true },
        }) as Promise<T[]>;
      
      case 'feature':
        return this.prisma.featureToggle.findMany() as Promise<T[]>;
      
      default:
        return [] as T[];
    }
  }

  /**
   * Force reload all policies
   */
  async forceReload() {
    this.logger.log('🔄 Force reloading all policies');
    
    await this.checkForUpdates('routing');
    await this.checkForUpdates('style');
    await this.checkForUpdates('feature');

    return { success: true, message: 'All policies reloaded' };
  }

  /**
   * Stop watching (cleanup)
   */
  onModuleDestroy() {
    this.watchers.forEach(watcher => clearInterval(watcher));
    this.logger.log('Hot reload watchers stopped');
  }
}
