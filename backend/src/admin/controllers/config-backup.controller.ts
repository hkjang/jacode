import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ConfigBackupService } from '../../ai/services/config-backup.service';

@Controller('api/admin/config-backup')
@UseGuards(JwtAuthGuard)
export class ConfigBackupController {
  constructor(private readonly backupService: ConfigBackupService) {}

  /**
   * Get all backups
   */
  @Get()
  async getBackups() {
    return this.backupService.listBackups();
  }

  /**
   * Get backup by ID
   */
  @Get(':id')
  async getBackup(@Param('id') id: string) {
    const backup = await this.backupService.getBackup(id);
    
    if (!backup) {
      throw new Error('Backup not found');
    }
    
    return backup;
  }

  /**
   * Create backup
   */
  @Post()
  async createBackup(@Body() body: { description?: string; category?: string }) {
    // In a real app, get user from request context. For now, hardcode admin.
    const createdBy = 'admin';
    const createdByEmail = 'admin@system.local';

    if (body.category === 'system_settings') {
      return this.backupService.backupSystemSettings(createdBy, createdByEmail, body.description);
    } else if (body.category === 'prompt_templates') {
      return this.backupService.backupPromptTemplates(createdBy, createdByEmail, body.description);
    } else if (body.category === 'model_servers') {
      return this.backupService.backupModelServers(createdBy, createdByEmail, body.description);
    } else {
      return this.backupService.backupAll(createdBy, createdByEmail, body.description);
    }
  }

  /**
   * Delete backup
   */
  @Delete(':id')
  async deleteBackup(@Param('id') id: string) {
    return this.backupService.deleteBackup(id);
  }

  /**
   * Restore backup
   */
  @Post(':id/restore')
  async restoreBackup(
    @Param('id') id: string,
    @Body() options?: { components?: string[] }
  ) {
    await this.backupService.restoreBackup(id, options);
    return { success: true, message: 'Backup restore initiated' };
  }
}
