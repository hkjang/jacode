import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole, LogLevel } from '@prisma/client';
import { LogService } from '../services/log.service';

@ApiTags('admin/logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('api/admin/logs')
export class LogController {
  constructor(private readonly service: LogService) {}

  @Get('system')
  @ApiOperation({ summary: 'Get system logs' })
  getSystemLogs(
    @Query('level') level?: LogLevel,
    @Query('category') category?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getSystemLogs({
      level,
      category,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      search,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
    });
  }

  @Get('system/stats')
  @ApiOperation({ summary: 'Get system log stats' })
  getLogStats(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.service.getLogStats(
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('activity')
  @ApiOperation({ summary: 'Get activity logs' })
  getActivityLogs(
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getActivityLogs({
      userId,
      action,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
    });
  }

  @Get('usage')
  @ApiOperation({ summary: 'Get usage logs' })
  getUsageLogs(
    @Query('userId') userId?: string,
    @Query('modelName') modelName?: string,
    @Query('feature') feature?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('success') success?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getUsageLogs({
      userId,
      modelName,
      feature,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      success: success ? success === 'true' : undefined,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
    });
  }

  @Delete('cleanup')
  @ApiOperation({ summary: 'Cleanup old logs' })
  cleanup(@Query('days') days?: string) {
    return this.service.cleanupOldLogs(days ? parseInt(days) : 30);
  }
}
