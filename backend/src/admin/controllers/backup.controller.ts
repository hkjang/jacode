import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { BackupService, BackupData } from '../services/backup.service';

@ApiTags('admin/backup')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('api/admin/backup')
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Get('export')
  @ApiOperation({ summary: 'Export system configuration as JSON backup' })
  async exportBackup(@Res() res: Response) {
    const backup = await this.backupService.exportBackup();

    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=jacode-backup-${new Date().toISOString().split('T')[0]}.json`,
    );

    return res.status(HttpStatus.OK).json(backup);
  }

  @Post('import')
  @ApiOperation({ summary: 'Import system configuration from JSON backup' })
  async importBackup(
    @Body() data: BackupData,
    @Query('overwrite') overwrite?: string,
  ) {
    const validation = this.backupService.validateBackup(data);
    if (!validation.valid) {
      return {
        success: false,
        errors: validation.errors,
      };
    }

    const results = await this.backupService.importBackup(data, {
      overwrite: overwrite === 'true',
    });

    return {
      success: true,
      results,
    };
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validate backup data without importing' })
  validateBackup(@Body() data: any) {
    return this.backupService.validateBackup(data);
  }
}
