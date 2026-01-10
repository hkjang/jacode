import { Injectable, Logger } from '@nestjs/common';
import { AIService } from '../ai.service';
import { PrismaService } from '../../prisma/prisma.service';

export interface BatchRequest {
  id: string;
  prompt: string;
  language: string;
  context?: string;
}

export interface BatchResult {
  id: string;
  success: boolean;
  code?: string;
  error?: string;
  executionTime: number;
}

@Injectable()
export class BatchProcessingService {
  private readonly logger = new Logger(BatchProcessingService.name);

  constructor(
    private readonly aiService: AIService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Process multiple code generation requests in parallel
   */
  async processBatch(
    requests: BatchRequest[],
    maxConcurrency: number = 3
  ): Promise<BatchResult[]> {
    this.logger.log(`Processing batch of ${requests.length} requests with concurrency ${maxConcurrency}`);

    const results: BatchResult[] = [];
    const chunks = this.chunkArray(requests, maxConcurrency);

    for (const chunk of chunks) {
      const chunkResults = await Promise.all(
        chunk.map(req => this.processOne(req))
      );
      results.push(...chunkResults);
    }

    const successCount = results.filter(r => r.success).length;
    this.logger.log(`Batch complete: ${successCount}/${requests.length} successful`);

    return results;
  }

  /**
   * Process single request
   */
  private async processOne(request: BatchRequest): Promise<BatchResult> {
    const startTime = Date.now();

    try {
      const result = await this.aiService.generateCode(
        request.prompt,
        request.context,
        request.language
      );

      return {
        id: request.id,
        success: true,
        code: result.code,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error(`Batch request ${request.id} failed`, error);
      
      return {
        id: request.id,
        success: false,
        error: error.message,
        executionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Split array into chunks
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Create batch job (async processing)
   */
  async createBatchJob(
    projectId: string,
    requests: BatchRequest[]
  ): Promise<{ jobId: string }> {
    // In a real implementation, this would create a BullMQ job
    const jobId = `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    this.logger.log(`Created batch job ${jobId} with ${requests.length} requests`);

    // Process in background (simulated)
    this.processBatch(requests).then(results => {
      this.logger.log(`Batch job ${jobId} completed`);
      // Store results or trigger callback
    });

    return { jobId };
  }

  /**
   * Get batch job status
   */
  async getBatchJobStatus(jobId: string) {
    // Mock implementation
    return {
      jobId,
      status: 'processing',
      progress: 0.5,
      totalRequests: 10,
      completedRequests: 5,
    };
  }
}
