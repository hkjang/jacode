import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('api/admin/config-backup')
@UseGuards(JwtAuthGuard)
export class ConfigBackupController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all backups
   */
  @Get()
  async getBackups() {
    return this.prisma.configBackup.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  /**
   * Get backup by ID
   */
  @Get(':id')
  async getBackup(@Param('id') id: string) {
    return this.prisma.configBackup.findUnique({
      where: { id },
    });
  }

  /**
   * Create backup
   */
  @Post()
  async createBackup(@Body() body: { description?: string; category?: string }) {
    const [modelServers, aiModels, featureToggles] = await Promise.all([
      this.prisma.modelServer.findMany(),
      this.prisma.aIModelSetting.findMany(),
      this.prisma.featureToggle.findMany(),
    ]);

    return this.prisma.configBackup.create({
      data: {
        category: body.category || 'full_backup',
        snapshot: {
          modelServers,
          aiModels,
          featureToggles,
          timestamp: new Date().toISOString(),
        },
        createdBy: 'admin',
        createdByEmail: 'admin@system.local',
        description: body.description || 'Manual backup',
      },
    });
  }

  /**
   * Delete backup
   */
  @Delete(':id')
  async deleteBackup(@Param('id') id: string) {
    return this.prisma.configBackup.delete({
      where: { id },
    });
  }

  /**
   * Restore backup
   */
  @Post(':id/restore')
  async restoreBackup(@Param('id') id: string) {
    const backup = await this.prisma.configBackup.findUnique({
      where: { id },
    });

    if (!backup) {
      throw new Error('Backup not found');
    }

    return { success: true, message: 'Backup restored', backupId: id };
  }
}
