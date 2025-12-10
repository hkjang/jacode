import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Job } from 'bullmq';
import { QUEUE_NAMES } from './constants';

export interface CodeGenerationJob {
  taskId: string;
  projectId: string;
  prompt: string;
  context?: string;
  language?: string;
  files?: string[];
}

export interface PlanGenerationJob {
  taskId: string;
  projectId: string;
  requirements: string;
  context?: string;
}

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue(QUEUE_NAMES.CODE_GENERATION)
    private readonly codeGenerationQueue: Queue<CodeGenerationJob>,
    @InjectQueue(QUEUE_NAMES.PLAN_GENERATION)
    private readonly planGenerationQueue: Queue<PlanGenerationJob>,
  ) {}

  /**
   * Add code generation job
   */
  async addCodeGenerationJob(
    data: CodeGenerationJob,
    priority: number = 1,
  ): Promise<Job<CodeGenerationJob>> {
    return this.codeGenerationQueue.add('generate', data, {
      priority,
      jobId: data.taskId,
    });
  }

  /**
   * Add plan generation job
   */
  async addPlanGenerationJob(
    data: PlanGenerationJob,
    priority: number = 1,
  ): Promise<Job<PlanGenerationJob>> {
    return this.planGenerationQueue.add('generate', data, {
      priority,
      jobId: data.taskId,
    });
  }

  /**
   * Get job status
   */
  async getJobStatus(queueName: string, jobId: string) {
    const queue = this.getQueue(queueName);
    const job = await queue?.getJob(jobId);

    if (!job) {
      return null;
    }

    const state = await job.getState();
    const progress = job.progress;

    return {
      id: job.id,
      state,
      progress,
      data: job.data,
      returnvalue: job.returnvalue,
      failedReason: job.failedReason,
      timestamp: job.timestamp,
      finishedOn: job.finishedOn,
    };
  }

  /**
   * Cancel a job
   */
  async cancelJob(queueName: string, jobId: string): Promise<boolean> {
    const queue = this.getQueue(queueName);
    const job = await queue?.getJob(jobId);

    if (!job) {
      return false;
    }

    const state = await job.getState();
    if (state === 'active') {
      // Can't cancel active job directly, need to signal worker
      await job.updateData({ ...job.data, cancelled: true });
      return true;
    }

    await job.remove();
    return true;
  }

  /**
   * Get queue stats
   */
  async getQueueStats(queueName: string) {
    const queue = this.getQueue(queueName);
    if (!queue) return null;

    const [waiting, active, completed, failed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
    ]);

    return { waiting, active, completed, failed };
  }

  /**
   * Get all queue stats
   */
  async getAllQueueStats() {
    const stats: Record<string, any> = {};

    for (const name of Object.values(QUEUE_NAMES)) {
      stats[name] = await this.getQueueStats(name);
    }

    return stats;
  }

  private getQueue(name: string): Queue | null {
    switch (name) {
      case QUEUE_NAMES.CODE_GENERATION:
        return this.codeGenerationQueue;
      case QUEUE_NAMES.PLAN_GENERATION:
        return this.planGenerationQueue;
      default:
        return null;
    }
  }
}
