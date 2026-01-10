import { Controller, Get, Post, Delete, Body, Param, UseGuards, Query } from '@nestjs/common';
import { ConfigBackupService } from '../../ai/services/config-backup.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

export class CreateBackupDto {
  type: 'system' | 'prompts' | 'servers' | 'full';
  description?: string;
}

@Controller('admin/config-backup')
@UseGuards(JwtAuthGuard)
export class ConfigBackupController {
  constructor(private readonly backupService: ConfigBackupService) {}

  /**
   * Get all backups
   */
  @Get()
  async getAll(@Query('type') type?: string) {
    return this.backupService.listBackups(type as any);
  }

  /**
   * Get backup by ID
   */
  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.backupService.getBackup(id);
  }

  /**
   * Create backup
   */
  @Post()
  async create(@Body() dto: CreateBackupDto) {
    switch (dto.type) {
      case 'system':
        return this.backupService.backupSystemSettings(dto.description);
      case 'prompts':
        return this.backupService.backupPromptTemplates(dto.description);
      case 'servers':
        return this.backupService.backupModelServers(dto.description);
      case 'full':
        return this.backupService.createFullBackup(dto.description);
      default:
        throw new Error('Invalid backup type');
    }
  }

  /**
   * Create full backup
   */
  @Post('full')
  async createFullBackup(@Body() body: { description?: string }) {
    return this.backupService.createFullBackup(body.description);
  }

  /**
   * Restore backup
   */
  @Post(':id/restore')
  async restore(@Param('id') id: string) {
    return this.backupService.restoreBackup(id);
  }

  /**
   * Delete backup
   */
  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.backupService.deleteBackup(id);
  }

  /**
   * Export backup as JSON
   */
  @Get(':id/export')
  async export(@Param('id') id: string) {
    return this.backupService.exportBackup(id);
  }

  /**
   * Import backup from JSON
   */
  @Post('import')
  async import(@Body() body: { data: any; description?: string }) {
    return this.backupService.importBackup(body.data, body.description);
  }

  /**
   * Cleanup old backups
   */
  @Delete('cleanup')
  async cleanup(@Body() body: { retentionDays?: number }) {
    return this.backupService.cleanupOldBackups(body.retentionDays || 30);
  }
}
