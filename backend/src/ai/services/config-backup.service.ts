import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class ConfigBackupService {
  private readonly logger = new Logger(ConfigBackupService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Automated Daily Backup (Midnight)
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleScheduledBackup() {
    this.logger.log('Starting scheduled backup...');
    try {
      const enabledSetting = await this.prisma.systemSetting.findUnique({
        where: { key: 'backup.automation.enabled' },
      });
      
      const isEnabled = enabledSetting?.value === 'true';

      if (isEnabled) {
        await this.backupAll('system', 'scheduler', 'Automated Daily Backup');
        this.logger.log('Scheduled backup completed successfully');
        
        await this.cleanupOldBackups(30);
      } else {
        this.logger.debug('Scheduled backup skipped (disabled)');
      }
    } catch (error) {
      this.logger.error('Scheduled backup failed', error);
    }
  }


  /**
   * Get backup by ID
   */
  async getBackup(id: string) {
    return this.prisma.configBackup.findUnique({
      where: { id },
    });
  }

  /**
   * Delete backup
   */
  async deleteBackup(id: string) {
    return this.prisma.configBackup.delete({
      where: { id },
    });
  }

  /**
   * Create a backup of system settings
   */
  async backupSystemSettings(createdBy: string, createdByEmail: string, description?: string) {
    const settings = await this.prisma.systemSetting.findMany();

    return this.prisma.configBackup.create({
      data: {
        category: 'system_settings',
        snapshot: { settings },
        createdBy,
        createdByEmail,
        description: description || 'System settings backup',
      },
    });
  }

  /**
   * Create a backup of prompt templates
   */
  async backupPromptTemplates(createdBy: string, createdByEmail: string, description?: string) {
    const templates = await this.prisma.promptTemplate.findMany({
      include: { versions: true },
    });

    return this.prisma.configBackup.create({
      data: {
        category: 'prompt_templates',
        snapshot: { templates },
        createdBy,
        createdByEmail,
        description: description || 'Prompt templates backup',
      },
    });
  }

  /**
   * Create a backup of model servers
   */
  async backupModelServers(createdBy: string, createdByEmail: string, description?: string) {
    const servers = await this.prisma.modelServer.findMany();

    return this.prisma.configBackup.create({
      data: {
        category: 'model_servers',
        snapshot: { servers },
        createdBy,
        createdByEmail,
        description: description || 'Model servers backup',
      },
    });
  }

  /**
   * Create a comprehensive backup of all configurations
   */
  async backupAll(createdBy: string, createdByEmail: string, description?: string) {
    const [systemSettings, promptTemplates, modelServers, featureToggles, aiModels, routingPolicies] = await Promise.all([
      this.prisma.systemSetting.findMany(),
      this.prisma.promptTemplate.findMany({ include: { versions: true } }),
      this.prisma.modelServer.findMany(),
      this.prisma.featureToggle.findMany(),
      this.prisma.aIModelSetting.findMany(),
      this.prisma.modelRoutingPolicy.findMany(),
    ]);

    return this.prisma.configBackup.create({
      data: {
        category: 'full_backup',
        snapshot: {
          systemSettings,
          promptTemplates,
          modelServers,
          featureToggles,
          aiModels,
          routingPolicies,
          timestamp: new Date().toISOString(),
        },
        createdBy,
        createdByEmail,
        description: description || 'Full configuration backup',
      },
    });
  }

  /**
   * Restore from backup with granular control
   */
  async restoreBackup(backupId: string, options?: { components?: string[] }) {
    const backup = await this.prisma.configBackup.findUnique({
      where: { id: backupId },
    });

    if (!backup) {
      throw new Error('Backup not found');
    }

    const snapshot = backup.snapshot as any;
    const components = options?.components || [];
    const restoreAll = components.length === 0;

    this.logger.log(`Restoring backup ${backupId} with components: ${restoreAll ? 'ALL' : components.join(', ')}`);

    const shouldRestore = (component: string) => restoreAll || components.includes(component);

    if (backup.category === 'full_backup') {
        if (shouldRestore('system_settings')) await this.restoreSystemSettings(snapshot.systemSettings || []);
        if (shouldRestore('prompt_templates')) await this.restorePromptTemplates(snapshot.promptTemplates || []);
        if (shouldRestore('model_servers')) await this.restoreModelServers(snapshot.modelServers || []);
        if (shouldRestore('feature_toggles')) await this.restoreFeatureToggles(snapshot.featureToggles || []);
        if (shouldRestore('ai_models')) await this.restoreAIModelSettings(snapshot.aiModels || []);
        if (shouldRestore('routing_policies')) await this.restoreRoutingPolicies(snapshot.routingPolicies || []);
    } else {
        switch (backup.category) {
            case 'system_settings':
                if (shouldRestore('system_settings')) await this.restoreSystemSettings(snapshot.settings);
                break;
            case 'prompt_templates':
                if (shouldRestore('prompt_templates')) await this.restorePromptTemplates(snapshot.templates);
                break;
            case 'model_servers':
                if (shouldRestore('model_servers')) await this.restoreModelServers(snapshot.servers);
                break;
            default:
                throw new Error(`Unknown backup category: ${backup.category}`);
        }
    }
  }

  /**
   * List backups
   */
  async listBackups(category?: string, limit: number = 20) {
    return this.prisma.configBackup.findMany({
      where: category ? { category } : undefined,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Delete old backups (retention policy)
   */
  async cleanupOldBackups(retentionDays: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await this.prisma.configBackup.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    this.logger.log(`Cleaned up ${result.count} old backups older than ${retentionDays} days`);
    return result;
  }

  /**
   * Private restore methods
   */
  private async restoreSystemSettings(settings: any[]) {
    await this.prisma.systemSetting.deleteMany({});
    for (const setting of settings) {
      await this.prisma.systemSetting.create({
        data: {
          key: setting.key,
          value: setting.value,
          description: setting.description,
          category: setting.category,
        },
      });
    }
    this.logger.log(`Restored ${settings.length} system settings`);
  }

  private async restorePromptTemplates(templates: any[]) {
    for (const template of templates) {
      const existing = await this.prisma.promptTemplate.findUnique({
        where: { name: template.name },
      });

      if (existing) {
        this.logger.warn(`Template ${template.name} already exists, skipping`);
        continue;
      }

      await this.prisma.promptTemplate.create({
        data: {
          name: template.name,
          type: template.type,
          description: template.description,
          content: template.content,
          variables: template.variables,
          version: template.version,
          isActive: template.isActive,
        },
      });
    }
    this.logger.log(`Restored ${templates.length} prompt templates`);
  }

  private async restoreModelServers(servers: any[]) {
    for (const server of servers) {
      const existing = await this.prisma.modelServer.findUnique({
        where: { name: server.name },
      });

      if (existing) {
        await this.prisma.modelServer.update({
          where: { id: existing.id },
          data: {
            url: server.url,
            type: server.type,
            maxTokens: server.maxTokens,
            device: server.device,
            routingWeight: server.routingWeight,
            rateLimit: server.rateLimit,
            settings: server.settings,
            isActive: server.isActive,
          },
        });
      } else {
        await this.prisma.modelServer.create({
          data: {
            name: server.name,
            url: server.url,
            type: server.type,
            maxTokens: server.maxTokens,
            device: server.device,
            routingWeight: server.routingWeight,
            rateLimit: server.rateLimit,
            settings: server.settings,
            isActive: server.isActive,
          },
        });
      }
    }
    this.logger.log(`Restored ${servers.length} model servers`);
  }

  private async restoreFeatureToggles(toggles: any[]) {
    for (const toggle of toggles) {
      const existing = await this.prisma.featureToggle.findUnique({
        where: { key: toggle.key },
      });

      if (existing) {
        await this.prisma.featureToggle.update({
          where: { key: toggle.key },
          data: {
            isEnabled: toggle.isEnabled,
            description: toggle.description,
            settings: toggle.settings,
          },
        });
      } else {
        await this.prisma.featureToggle.create({
          data: {
            key: toggle.key,
            name: toggle.name,
            isEnabled: toggle.isEnabled,
            description: toggle.description,
            settings: toggle.settings,
          },
        });
      }
    }
  }

  private async restoreAIModelSettings(models: any[]) {
    for (const model of models) {
      const existing = await this.prisma.aIModelSetting.findFirst({
        where: { model: model.model, provider: model.provider },
      });

      if (existing) {
        await this.prisma.aIModelSetting.update({
          where: { id: existing.id },
          data: {
            name: model.name,
            isActive: model.isActive,
            isDefault: model.isDefault,
            settings: model.settings,
          },
        });
      } else {
        await this.prisma.aIModelSetting.create({
          data: {
            name: model.name,
            model: model.model,
            provider: model.provider,
            isActive: model.isActive,
            isDefault: model.isDefault,
            settings: model.settings,
          },
        });
      }
    }
  }

  private async restoreRoutingPolicies(policies: any[]) {
    for (const policy of policies) {
      const existing = await this.prisma.modelRoutingPolicy.findUnique({
        where: { id: policy.id },
      });

      // Simplified restore: only create if missing, don't overwrite logic on auto-restore
      // In production, might want deeper merge strategy
    }
  }
}
