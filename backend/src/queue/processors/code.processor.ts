import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { AIService } from '../../ai/ai.service';
import { QUEUE_NAMES } from '../constants';
import { CodeGenerationJob } from '../queue.service';

// Use string literals for Prisma enums
type AgentStatusType = 'PENDING' | 'PLANNING' | 'EXECUTING' | 'WAITING_APPROVAL' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
type ArtifactTypeType = 'PLAN' | 'CODE' | 'DIFF' | 'TEST_RESULT' | 'LOG' | 'SCREENSHOT' | 'REVIEW' | 'DOCUMENTATION';
type ArtifactStatusType = 'DRAFT' | 'APPROVED' | 'REJECTED' | 'APPLIED';

@Injectable()
@Processor(QUEUE_NAMES.CODE_GENERATION)
export class CodeProcessor extends WorkerHost {
  private readonly logger = new Logger(CodeProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AIService,
  ) {
    super();
  }

  async process(job: Job<CodeGenerationJob>): Promise<any> {
    const { taskId, prompt, context, language } = job.data;

    try {
      // Update task status to executing
      await this.updateTaskStatus(taskId, 'EXECUTING', 0, 'Starting code generation...');

      // Check for cancellation
      if (await this.isCancelled(job)) {
        await this.updateTaskStatus(taskId, 'CANCELLED');
        return { cancelled: true };
      }

      // Update progress
      await job.updateProgress(10);
      await this.updateTaskStatus(taskId, 'EXECUTING', 10, 'Analyzing requirements...');

      // Generate code
      await job.updateProgress(30);
      await this.updateTaskStatus(taskId, 'EXECUTING', 30, 'Generating code...');

      const result = await this.aiService.generateCode(prompt, context, language);

      // Check for cancellation again
      if (await this.isCancelled(job)) {
        await this.updateTaskStatus(taskId, 'CANCELLED');
        return { cancelled: true };
      }

      await job.updateProgress(80);
      await this.updateTaskStatus(taskId, 'EXECUTING', 80, 'Creating artifact...');

      // Create artifact
      const artifact = await this.prisma.artifact.create({
        data: {
          type: 'CODE' as ArtifactTypeType,
          title: `Generated Code`,
          content: result.code,
          metadata: {
            language,
            explanation: result.explanation,
            prompt,
          },
          status: 'DRAFT' as ArtifactStatusType,
          agentTaskId: taskId,
        },
      });

      // Update task to waiting approval
      await job.updateProgress(100);
      await this.updateTaskStatus(
        taskId,
        'WAITING_APPROVAL',
        100,
        'Waiting for approval',
      );

      this.logger.log(`Code generation completed for task ${taskId}`);

      return {
        success: true,
        artifactId: artifact.id,
        code: result.code,
      };
    } catch (error) {
      this.logger.error(`Code generation failed for task ${taskId}`, error);
      await this.updateTaskStatus(taskId, 'FAILED', undefined, undefined, (error as Error).message);
      throw error;
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Job ${job.id} failed: ${error.message}`);
  }

  private async updateTaskStatus(
    taskId: string,
    status: AgentStatusType,
    progress?: number,
    currentStep?: string,
    error?: string,
  ) {
    await this.prisma.agentTask.update({
      where: { id: taskId },
      data: {
        status,
        ...(progress !== undefined && { progress }),
        ...(currentStep && { currentStep }),
        ...(error && { error }),
        ...(status === 'EXECUTING' && !error && { startedAt: new Date() }),
        ...(status === 'COMPLETED' && { completedAt: new Date() }),
        ...(status === 'FAILED' && { completedAt: new Date() }),
      },
    });
  }

  private async isCancelled(job: Job): Promise<boolean> {
    // Check if job data has cancellation flag
    return (job.data as any)?.cancelled === true;
  }
}

