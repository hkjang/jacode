import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { AIService } from '../../ai/ai.service';
import { ContextCollectorService } from '../../ai/services/context-collector.service';
import { QUEUE_NAMES } from '../constants';
import { CodeGenerationJob } from '../queue.service';
import { AgentGateway } from '../../agent/agent.gateway';
import { Inject, forwardRef } from '@nestjs/common';

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
    private readonly contextCollector: ContextCollectorService,
    @Inject(forwardRef(() => AgentGateway))
    private readonly agentGateway: AgentGateway,
  ) {
    super();
  }

  async process(job: Job<CodeGenerationJob>): Promise<any> {
    const { taskId, prompt, context, language } = job.data;

    try {
      // Update task status to executing
      // Update task status to executing
      await this.updateTaskStatus(taskId, 'EXECUTING', 0, 'Starting code generation...');
      this.agentGateway.notifyTaskProgress({ id: taskId, userId: job.data.userId || '', projectId: job.data.projectId || '', progress: 0, currentStep: 'Starting code generation...' });

      // Check for cancellation
      if (await this.isCancelled(job)) {
        await this.updateTaskStatus(taskId, 'CANCELLED');
        return { cancelled: true };
      }

      // Update progress
      await job.updateProgress(10);
      await this.updateTaskStatus(taskId, 'EXECUTING', 10, 'Analyzing requirements...');
      this.agentGateway.notifyTaskProgress({ id: taskId, userId: job.data.userId || '', projectId: job.data.projectId || '', progress: 10, currentStep: 'Analyzing requirements...' });

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

      // Generate code
      await job.updateProgress(30);
      await this.updateTaskStatus(taskId, 'EXECUTING', 30, 'Generating code...');
      this.agentGateway.notifyTaskProgress({ id: taskId, userId: job.data.userId || '', projectId: job.data.projectId || '', progress: 30, currentStep: 'Generating code...' });

      const result = await this.aiService.generateCode(prompt, enrichedContext, language);

      // Check for cancellation again
      if (await this.isCancelled(job)) {
        await this.updateTaskStatus(taskId, 'CANCELLED');
        return { cancelled: true };
      }

      await job.updateProgress(80);
      await this.updateTaskStatus(taskId, 'EXECUTING', 80, 'Creating artifact...');
      this.agentGateway.notifyTaskProgress({ id: taskId, userId: job.data.userId || '', projectId: job.data.projectId || '', progress: 80, currentStep: 'Creating artifact...' });

      // Determine file path
      let filePath = (context as any)?.filePath;
      if (!filePath) {
        // Try to find file path in prompt or explanation
        const pathMatch = result.explanation?.match(/File: ([^\s]+)/) || prompt.match(/File: ([^\s]+)/);
        if (pathMatch) {
          filePath = pathMatch[1];
        } else {
          // Fallback
          const ext = language === 'typescript' ? 'ts' : language === 'javascript' ? 'js' : 'txt';
          filePath = `generated/code-${Date.now()}.${ext}`;
        }
      }

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
            filePath, // Add filePath to metadata
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
      await this.updateTaskStatus(
        taskId,
        'WAITING_APPROVAL',
        100,
        'Waiting for approval',
      );
      
      // Notify completion (waiting approval)
      const updatedTask = await this.prisma.agentTask.findUnique({ where: { id: taskId } });
      if (updatedTask) {
        this.agentGateway.notifyTaskUpdated(updatedTask);
      }

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

