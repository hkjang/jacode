import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { AIService } from '../../ai/ai.service';
import { QUEUE_NAMES } from '../constants';
import { PlanGenerationJob } from '../queue.service';

// Use string literals for Prisma enums
type AgentStatusType = 'PENDING' | 'PLANNING' | 'EXECUTING' | 'WAITING_APPROVAL' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
type ArtifactTypeType = 'PLAN' | 'CODE' | 'DIFF' | 'TEST_RESULT' | 'LOG' | 'SCREENSHOT' | 'REVIEW' | 'DOCUMENTATION';
type ArtifactStatusType = 'DRAFT' | 'APPROVED' | 'REJECTED' | 'APPLIED';

@Injectable()
@Processor(QUEUE_NAMES.PLAN_GENERATION)
export class PlanProcessor extends WorkerHost {
  private readonly logger = new Logger(PlanProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AIService,
  ) {
    super();
  }

  async process(job: Job<PlanGenerationJob>): Promise<any> {
    const { taskId, requirements, context } = job.data;

    try {
      // Update task status
      await this.updateTaskStatus(taskId, 'PLANNING', 0, 'Analyzing requirements...');

      await job.updateProgress(20);

      // Generate plan
      await this.updateTaskStatus(taskId, 'PLANNING', 20, 'Creating implementation plan...');

      const plan = await this.aiService.createPlan(requirements, context);

      await job.updateProgress(80);
      await this.updateTaskStatus(taskId, 'PLANNING', 80, 'Saving plan...');

      // Create plan artifact
      const artifact = await this.prisma.artifact.create({
        data: {
          type: 'PLAN' as ArtifactTypeType,
          title: 'Implementation Plan',
          content: plan,
          metadata: {
            requirements,
          },
          status: 'DRAFT' as ArtifactStatusType,
          agentTaskId: taskId,
        },
      });

      // Update task to waiting approval
      await job.updateProgress(100);
      await this.updateTaskStatus(taskId, 'WAITING_APPROVAL', 100, 'Plan ready for review');

      this.logger.log(`Plan generation completed for task ${taskId}`);

      return {
        success: true,
        artifactId: artifact.id,
        plan,
      };
    } catch (error) {
      this.logger.error(`Plan generation failed for task ${taskId}`, error);
      await this.updateTaskStatus(taskId, 'FAILED', undefined, undefined, (error as Error).message);
      throw error;
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Plan job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Plan job ${job.id} failed: ${error.message}`);
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
      },
    });
  }
}

