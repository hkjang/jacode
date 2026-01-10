import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { MonitoringService } from '../services/monitoring.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('admin/monitoring')
@UseGuards(JwtAuthGuard)
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  /**
   * Get real-time system metrics
   */
  @Get('metrics')
  async getMetrics() {
    return this.monitoringService.getSystemMetrics();
  }

  /**
   * Get usage metrics over time
   */
  @Get('usage')
  async getUsage(@Query('period') period: 'hour' | 'day' | 'week' | 'month' = 'day') {
    return this.monitoringService.getUsageMetrics(period);
  }

  /**
   * Get model performance report
   */
  @Get('models/performance')
  async getModelPerformance() {
    return this.monitoringService.getModelPerformanceReport();
  }

  /**
   * Get active alerts
   */
  @Get('alerts')
  async getAlerts() {
    return this.monitoringService.getAlerts();
  }
}
