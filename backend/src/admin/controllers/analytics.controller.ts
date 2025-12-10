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
import { AnalyticsService } from '../services/analytics.service';

@ApiTags('admin/analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('api/admin/analytics')
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get dashboard overview' })
  getOverview() {
    return this.service.getDashboardOverview();
  }

  @Get('users/:userId')
  @ApiOperation({ summary: 'Get user usage stats' })
  getUserStats(
    @Query('userId') userId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.service.getUserUsageStats(
      userId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('models')
  @ApiOperation({ summary: 'Get model usage stats' })
  getModelStats(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.service.getModelUsageStats(
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('features')
  @ApiOperation({ summary: 'Get feature usage stats' })
  getFeatureStats(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.service.getFeatureUsageStats(
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('daily')
  @ApiOperation({ summary: 'Get daily stats' })
  getDailyStats(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.service.getDailyStats(
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('teams/:teamId')
  @ApiOperation({ summary: 'Get team usage stats' })
  getTeamStats(
    @Query('teamId') teamId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.service.getTeamUsageStats(
      teamId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('errors')
  @ApiOperation({ summary: 'Get error stats' })
  getErrorStats(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.service.getErrorStats(
      new Date(startDate),
      new Date(endDate),
    );
  }
}
