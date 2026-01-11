import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { AuditLogService } from '../services/audit-log.service';
import { SettingsHistoryService } from '../services/settings-history.service';

@ApiTags('admin/audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('api/admin/audit')
export class AuditController {
  constructor(
    private readonly auditService: AuditLogService,
    private readonly historyService: SettingsHistoryService,
  ) {}

  @Get('logs')
  @ApiOperation({ summary: 'Get admin audit logs' })
  getAuditLogs(
    @Query('adminId') adminId?: string,
    @Query('action') action?: string,
    @Query('resource') resource?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditService.getAuditLogs({
      adminId,
      action,
      resource,
      search,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  });

  @Get('logs/resource')
  @ApiOperation({ summary: 'Get audit logs for a specific resource' })
  getResourceLogs(
    @Query('resource') resource: string,
    @Query('resourceId') resourceId: string,
  ) {
    return this.auditService.getLogsByResource(resource, resourceId);
  }

  @Get('logs/activity')
  @ApiOperation({ summary: 'Get admin activity summary' })
  getAdminActivity(
    @Query('adminId') adminId: string,
    @Query('days') days?: string,
  ) {
    return this.auditService.getAdminActivity(adminId, days ? parseInt(days) : 30);
  }

  @Get('settings-history')
  @ApiOperation({ summary: 'Get settings change history' })
  getSettingsHistory(
    @Query('key') key?: string,
    @Query('category') category?: string,
    @Query('changedById') changedById?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.historyService.getHistory({
      key,
      category,
      changedById,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('settings-history/key')
  @ApiOperation({ summary: 'Get history for a specific setting' })
  getKeyHistory(@Query('key') key: string) {
    return this.historyService.getKeyHistory(key);
  }
}
