import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { QueueManagementService } from '../services/queue-management.service';

@ApiTags('admin/queue')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('api/admin/queue')
export class QueueController {
  constructor(private readonly queueService: QueueManagementService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get queue statistics' })
  getStats() {
    return this.queueService.getQueueStats();
  }

  @Get('health')
  @ApiOperation({ summary: 'Get queue health status' })
  getHealth() {
    return this.queueService.getHealthStatus();
  }

  @Get('jobs/:status')
  @ApiOperation({ summary: 'Get jobs by status' })
  getJobs(
    @Param('status') status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed',
    @Query('limit') limit?: string,
  ) {
    return this.queueService.getJobs(status, limit ? parseInt(limit) : 50);
  }

  @Post('jobs/:id/retry')
  @ApiOperation({ summary: 'Retry a failed job' })
  retryJob(@Param('id') id: string) {
    return this.queueService.retryJob(id);
  }

  @Delete('jobs/:id')
  @ApiOperation({ summary: 'Remove a job (not active jobs)' })
  removeJob(@Param('id') id: string) {
    return this.queueService.removeJob(id);
  }

  @Post('retry-all-failed')
  @ApiOperation({ summary: 'Retry all failed jobs' })
  retryAllFailed(@Query('limit') limit?: string) {
    return this.queueService.retryAllFailed(limit ? parseInt(limit) : 100);
  }

  @Post('clean/completed')
  @ApiOperation({ summary: 'Clean old completed jobs' })
  cleanCompleted(@Query('olderThanHours') hours?: string) {
    const ms = hours ? parseInt(hours) * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    return this.queueService.cleanOldJobs(ms);
  }

  @Post('clean/failed')
  @ApiOperation({ summary: 'Clean old failed jobs' })
  cleanFailed(@Query('olderThanDays') days?: string) {
    const ms = days ? parseInt(days) * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
    return this.queueService.cleanFailedJobs(ms);
  }

  @Post('pause')
  @ApiOperation({ summary: 'Pause the queue' })
  pauseQueue() {
    return this.queueService.pauseQueue();
  }

  @Post('resume')
  @ApiOperation({ summary: 'Resume the queue' })
  resumeQueue() {
    return this.queueService.resumeQueue();
  }

  @Post('test-job')
  @ApiOperation({ summary: 'Create a test job' })
  createTestJob() {
    return this.queueService.createTestJob();
  }

  @Post('bulk/retry')
  @ApiOperation({ summary: 'Bulk retry failed jobs' })
  bulkRetry(@Body() body: { ids: string[] }) {
      return this.queueService.bulkRetry(body.ids);
  }

  @Post('bulk/remove')
  @ApiOperation({ summary: 'Bulk remove jobs' })
  bulkRemove(@Body() body: { ids: string[] }) {
      return this.queueService.bulkRemove(body.ids);
  }
}
