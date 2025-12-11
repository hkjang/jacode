import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CostAlertService, CreateCostAlertDto, UpdateCostAlertDto } from '../services/cost-alert.service';
import { UsageAggregationService } from '../services/usage-aggregation.service';
import { AggregationPeriod } from '@prisma/client';

@ApiTags('admin/cost')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('api/admin/cost')
export class CostAlertController {
  constructor(
    private readonly costAlertService: CostAlertService,
    private readonly usageAggregationService: UsageAggregationService,
  ) {}

  // ==================== Cost Alerts ====================

  @Get('alerts')
  @ApiOperation({ summary: 'Get all cost alerts' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'teamId', required: false })
  async getAlerts(
    @Query('userId') userId?: string,
    @Query('teamId') teamId?: string,
  ) {
    return this.costAlertService.getAlerts(userId, teamId);
  }

  @Get('alerts/:id')
  @ApiOperation({ summary: 'Get a specific cost alert' })
  @ApiParam({ name: 'id', type: String })
  async getAlert(@Param('id') id: string) {
    return this.costAlertService.getAlert(id);
  }

  @Post('alerts')
  @ApiOperation({ summary: 'Create a new cost alert' })
  async createAlert(@Body() dto: CreateCostAlertDto) {
    return this.costAlertService.createAlert(dto);
  }

  @Put('alerts/:id')
  @ApiOperation({ summary: 'Update a cost alert' })
  @ApiParam({ name: 'id', type: String })
  async updateAlert(@Param('id') id: string, @Body() dto: UpdateCostAlertDto) {
    return this.costAlertService.updateAlert(id, dto);
  }

  @Delete('alerts/:id')
  @ApiOperation({ summary: 'Delete a cost alert' })
  @ApiParam({ name: 'id', type: String })
  async deleteAlert(@Param('id') id: string) {
    return this.costAlertService.deleteAlert(id);
  }

  @Put('alerts/:id/toggle')
  @ApiOperation({ summary: 'Toggle alert enabled/disabled' })
  @ApiParam({ name: 'id', type: String })
  async toggleAlert(
    @Param('id') id: string,
    @Body('isEnabled') isEnabled: boolean,
  ) {
    return this.costAlertService.toggleAlert(id, isEnabled);
  }

  // ==================== Usage Aggregations ====================

  @Get('aggregations/user/:userId')
  @ApiOperation({ summary: 'Get aggregated usage for a user' })
  @ApiParam({ name: 'userId', type: String })
  @ApiQuery({ name: 'period', enum: AggregationPeriod })
  async getUserAggregation(
    @Param('userId') userId: string,
    @Query('period') period: AggregationPeriod,
  ) {
    return this.usageAggregationService.getUserAggregation(userId, period, new Date());
  }

  @Get('aggregations/team/:teamId')
  @ApiOperation({ summary: 'Get aggregated usage for a team' })
  @ApiParam({ name: 'teamId', type: String })
  @ApiQuery({ name: 'period', enum: AggregationPeriod })
  async getTeamAggregation(
    @Param('teamId') teamId: string,
    @Query('period') period: AggregationPeriod,
  ) {
    return this.usageAggregationService.getTeamAggregation(teamId, period, new Date());
  }

  @Get('aggregations/trend/:userId')
  @ApiOperation({ summary: 'Get usage trend for a user' })
  @ApiParam({ name: 'userId', type: String })
  @ApiQuery({ name: 'period', enum: AggregationPeriod })
  @ApiQuery({ name: 'count', required: false, type: Number })
  async getUserTrend(
    @Param('userId') userId: string,
    @Query('period') period: AggregationPeriod,
    @Query('count') count?: number,
  ) {
    return this.usageAggregationService.getUserUsageTrend(userId, period, count || 7);
  }

  @Post('aggregations/run')
  @ApiOperation({ summary: 'Manually trigger aggregation for a period' })
  async runAggregation(
    @Body('period') period: AggregationPeriod,
    @Body('startDate') startDate: string,
    @Body('endDate') endDate: string,
  ) {
    await this.usageAggregationService.aggregateForPeriod(
      period,
      new Date(startDate),
      new Date(endDate),
    );
    return { success: true, message: 'Aggregation completed' };
  }
}
