import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ConfigBackupService {
  private readonly logger = new Logger(ConfigBackupService.name);

  constructor(private readonly prisma: PrismaService) {}

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
    const [systemSettings, promptTemplates, modelServers, routingPolicies] = await Promise.all([
      this.prisma.systemSetting.findMany(),
      this.prisma.promptTemplate.findMany({ include: { versions: true } }),
      this.prisma.modelServer.findMany(),
      this.prisma.modelRoutingPolicy.findMany(),
    ]);

    return this.prisma.configBackup.create({
      data: {
        category: 'full_backup',
        snapshot: {
          systemSettings,
          promptTemplates,
          modelServers,
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
   * Restore from backup
   */
  async restoreBackup(backupId: string) {
    const backup = await this.prisma.configBackup.findUnique({
      where: { id: backupId },
    });

    if (!backup) {
      throw new Error('Backup not found');
    }

    const snapshot = backup.snapshot as any;

    switch (backup.category) {
      case 'system_settings':
        return this.restoreSystemSettings(snapshot.settings);
      case 'prompt_templates':
        return this.restorePromptTemplates(snapshot.templates);
      case 'model_servers':
        return this.restoreModelServers(snapshot.servers);
      case 'full_backup':
        return this.restoreFullBackup(snapshot);
      default:
        throw new Error(`Unknown backup category: ${backup.category}`);
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
    // Delete existing settings
    await this.prisma.systemSetting.deleteMany({});

    // Restore from backup
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
    // Note: This is a simplified restore. In production, you'd want to handle conflicts
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
        // Update existing
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
        // Create new
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

  private async restoreFullBackup(snapshot: any) {
    await this.restoreSystemSettings(snapshot.systemSettings || []);
    await this.restorePromptTemplates(snapshot.promptTemplates || []);
    await this.restoreModelServers(snapshot.modelServers || []);
    
    this.logger.log('Full backup restored successfully');
  }
}
