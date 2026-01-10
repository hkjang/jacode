import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { BatchProcessingService } from '../../ai/services/batch-processing.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

export class ProcessBatchDto {
  requests: Array<{
    id: string;
    prompt: string;
    language: string;
    context?: string;
  }>;
  maxConcurrency?: number;
}

export class CreateBatchJobDto {
  projectId: string;
  requests: any[];
}

@Controller('api/admin/batch-processing')
@UseGuards(JwtAuthGuard)
export class BatchProcessingController {
  constructor(private readonly batchService: BatchProcessingService) {}

  /**
   * Process batch synchronously
   */
  @Post('process')
  async process(@Body() dto: ProcessBatchDto) {
    return this.batchService.processBatch(
      dto.requests,
      dto.maxConcurrency || 3
    );
  }

  /**
   * Create async batch job
   */
  @Post('jobs')
  async createJob(@Body() dto: CreateBatchJobDto) {
    return this.batchService.createBatchJob(dto.projectId, dto.requests);
  }

  /**
   * Get batch job status
   */
  @Get('jobs/:jobId')
  async getJobStatus(@Param('jobId') jobId: string) {
    return this.batchService.getBatchJobStatus(jobId);
  }
}
