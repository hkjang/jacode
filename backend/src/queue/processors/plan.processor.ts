import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { AIService } from '../../ai/ai.service';
import { ContextCollectorService } from '../../ai/services/context-collector.service';
import { QUEUE_NAMES } from '../constants';
import { PlanGenerationJob } from '../queue.service';
import { AgentGateway } from '../../agent/agent.gateway';
import { Inject, forwardRef } from '@nestjs/common';

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
    private readonly contextCollector: ContextCollectorService,
    @Inject(forwardRef(() => AgentGateway))
    private readonly agentGateway: AgentGateway,
  ) {
    super();
  }

  async process(job: Job<PlanGenerationJob>): Promise<any> {
    const { taskId, requirements, context } = job.data;

    try {
      // Update task status
      // Update task status
      await this.updateTaskStatus(taskId, 'PLANNING', 0, 'Analyzing requirements...');
      this.agentGateway.notifyTaskProgress({ id: taskId, userId: job.data.userId || '', projectId: job.data.projectId || '', progress: 0, currentStep: 'Analyzing requirements...' });

      await job.updateProgress(20);

      // Generate plan
      // Generate plan
      await this.updateTaskStatus(taskId, 'PLANNING', 20, 'Creating implementation plan...');
      this.agentGateway.notifyTaskProgress({ id: taskId, userId: job.data.userId || '', projectId: job.data.projectId || '', progress: 20, currentStep: 'Creating implementation plan...' });

      // Enrich context with project structure
      let enrichedContext = context || '';
      if (job.data.projectId) {
        try {
          const projectStructure = await this.contextCollector.getProjectStructure(job.data.projectId);
          if (projectStructure) {
            enrichedContext += `\n\nProject Context:\nTechnologies: ${projectStructure.technologies.join(', ')}\nStructure: ${projectStructure.directories.slice(0, 10).join(', ')}`;
          }
        } catch (error) {
          this.logger.warn(`Failed to get project structure: ${error.message}`);
        }
      }

      const plan = await this.aiService.createPlan(requirements, enrichedContext);

      await job.updateProgress(80);
      await job.updateProgress(80);
      await this.updateTaskStatus(taskId, 'PLANNING', 80, 'Saving plan...');
      this.agentGateway.notifyTaskProgress({ id: taskId, userId: job.data.userId || '', projectId: job.data.projectId || '', progress: 80, currentStep: 'Saving plan...' });

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
      // Notify artifact created
      if (job.data.userId && job.data.projectId) {
        this.agentGateway.notifyArtifactCreated(artifact, job.data.userId, job.data.projectId);
      }

      // Update task to waiting approval
      await job.updateProgress(100);
      await this.updateTaskStatus(taskId, 'WAITING_APPROVAL', 100, 'Plan ready for review');
      
      // Notify completion (waiting approval)
      const updatedTask = await this.prisma.agentTask.findUnique({ where: { id: taskId } });
      if (updatedTask) {
        this.agentGateway.notifyTaskUpdated(updatedTask);
      }

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

