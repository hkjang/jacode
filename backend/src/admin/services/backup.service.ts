import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface BackupData {
  version: string;
  createdAt: string;
  settings: any[];
  prompts: any[];
  features: any[];
  servers: any[];
}

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Export all admin configuration as JSON
  async exportBackup(): Promise<BackupData> {
    const [settings, prompts, features, servers] = await Promise.all([
      this.prisma.systemSetting.findMany(),
      this.prisma.promptTemplate.findMany({
        include: {
          versions: {
            orderBy: { version: 'desc' },
            take: 5, // Include last 5 versions
          },
        },
      }),
      this.prisma.featureToggle.findMany(),
      this.prisma.modelServer.findMany(),
    ]);

    return {
      version: '1.0',
      createdAt: new Date().toISOString(),
      settings,
      prompts,
      features,
      servers,
    };
  }

  // Import backup data
  async importBackup(data: BackupData, options: { overwrite?: boolean } = {}) {
    const results = {
      settings: { created: 0, updated: 0, skipped: 0 },
      prompts: { created: 0, updated: 0, skipped: 0 },
      features: { created: 0, updated: 0, skipped: 0 },
      servers: { created: 0, updated: 0, skipped: 0 },
    };

    // Import settings
    for (const setting of data.settings || []) {
      try {
        const existing = await this.prisma.systemSetting.findUnique({
          where: { key: setting.key },
        });

        if (existing) {
          if (options.overwrite) {
            await this.prisma.systemSetting.update({
              where: { key: setting.key },
              data: { value: setting.value, description: setting.description },
            });
            results.settings.updated++;
          } else {
            results.settings.skipped++;
          }
        } else {
          await this.prisma.systemSetting.create({
            data: {
              key: setting.key,
              value: setting.value,
              description: setting.description,
              category: setting.category,
            },
          });
          results.settings.created++;
        }
      } catch (error) {
        this.logger.warn(`Failed to import setting ${setting.key}: ${error}`);
      }
    }

    // Import feature toggles
    for (const feature of data.features || []) {
      try {
        const existing = await this.prisma.featureToggle.findUnique({
          where: { key: feature.key },
        });

        if (existing) {
          if (options.overwrite) {
            await this.prisma.featureToggle.update({
              where: { key: feature.key },
              data: {
                isEnabled: feature.isEnabled ?? feature.enabled,
                description: feature.description,
                settings: feature.settings || feature.config || {},
              },
            });
            results.features.updated++;
          } else {
            results.features.skipped++;
          }
        } else {
          await this.prisma.featureToggle.create({
            data: {
              key: feature.key,
              name: feature.name || feature.key,
              isEnabled: feature.isEnabled ?? feature.enabled ?? true,
              description: feature.description,
              settings: feature.settings || feature.config || {},
            },
          });
          results.features.created++;
        }
      } catch (error) {
        this.logger.warn(`Failed to import feature ${feature.key}: ${error}`);
      }
    }

    // Import prompt templates (by name - unique field)
    for (const prompt of data.prompts || []) {
      try {
        const existing = await this.prisma.promptTemplate.findUnique({
          where: { name: prompt.name },
        });

        if (existing) {
          if (options.overwrite) {
            await this.prisma.promptTemplate.update({
              where: { name: prompt.name },
              data: {
                content: prompt.content,
                description: prompt.description,
              },
            });
            results.prompts.updated++;
          } else {
            results.prompts.skipped++;
          }
        } else {
          await this.prisma.promptTemplate.create({
            data: {
              name: prompt.name,
              type: prompt.type,
              content: prompt.content,
              description: prompt.description,
              variables: prompt.variables || [],
              isActive: prompt.isActive ?? true,
            },
          });
          results.prompts.created++;
        }
      } catch (error) {
        this.logger.warn(`Failed to import prompt ${prompt.name}: ${error}`);
      }
    }

    // Import model servers
    for (const server of data.servers || []) {
      try {
        const existing = await this.prisma.modelServer.findFirst({
          where: { url: server.url },
        });

        if (existing) {
          if (options.overwrite) {
            await this.prisma.modelServer.update({
              where: { id: existing.id },
              data: {
                name: server.name,
                type: server.type,
                maxTokens: server.maxTokens,
                device: server.device,
              },
            });
            results.servers.updated++;
          } else {
            results.servers.skipped++;
          }
        } else {
          await this.prisma.modelServer.create({
            data: {
              name: server.name,
              type: server.type,
              url: server.url,
              maxTokens: server.maxTokens,
              device: server.device,
              isActive: false, // Disable by default for safety
            },
          });
          results.servers.created++;
        }
      } catch (error) {
        this.logger.warn(`Failed to import server ${server.name}: ${error}`);
      }
    }

    this.logger.log(`Backup import completed: ${JSON.stringify(results)}`);
    return results;
  }

  // Validate backup data structure
  validateBackup(data: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.version) errors.push('Missing version field');
    if (!data.createdAt) errors.push('Missing createdAt field');
    if (!Array.isArray(data.settings)) errors.push('settings must be an array');
    if (!Array.isArray(data.prompts)) errors.push('prompts must be an array');
    if (!Array.isArray(data.features)) errors.push('features must be an array');

    return { valid: errors.length === 0, errors };
  }
}
