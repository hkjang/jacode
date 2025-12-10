import { Injectable, Logger } from '@nestjs/common';
import { Queue, Job } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';

export interface QueueStats {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
}

export interface JobInfo {
  id: string;
  name: string;
  data: any;
  status: string;
  progress: number;
  attempts: number;
  timestamp: number;
  processedOn?: number;
  finishedOn?: number;
  failedReason?: string;
}

@Injectable()
export class QueueManagementService {
  private readonly logger = new Logger(QueueManagementService.name);

  constructor(
    @InjectQueue('agent-tasks') private readonly agentQueue: Queue,
  ) {}

  // Get queue statistics
  async getQueueStats(): Promise<QueueStats> {
    const [waiting, active, completed, failed, delayed, isPaused] = await Promise.all([
      this.agentQueue.getWaitingCount(),
      this.agentQueue.getActiveCount(),
      this.agentQueue.getCompletedCount(),
      this.agentQueue.getFailedCount(),
      this.agentQueue.getDelayedCount(),
      this.agentQueue.isPaused(),
    ]);

    return {
      name: 'agent-tasks',
      waiting,
      active,
      completed,
      failed,
      delayed,
      paused: isPaused,
    };
  }

  // Get list of jobs by status
  async getJobs(status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed', limit = 50): Promise<JobInfo[]> {
    let jobs: Job[] = [];

    switch (status) {
      case 'waiting':
        jobs = await this.agentQueue.getWaiting(0, limit);
        break;
      case 'active':
        jobs = await this.agentQueue.getActive(0, limit);
        break;
      case 'completed':
        jobs = await this.agentQueue.getCompleted(0, limit);
        break;
      case 'failed':
        jobs = await this.agentQueue.getFailed(0, limit);
        break;
      case 'delayed':
        jobs = await this.agentQueue.getDelayed(0, limit);
        break;
    }

    return jobs.map(job => ({
      id: job.id || '',
      name: job.name,
      data: job.data,
      status,
      progress: typeof job.progress === 'number' ? job.progress : 0,
      attempts: job.attemptsMade,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      failedReason: job.failedReason,
    }));
  }

  // Retry a failed job
  async retryJob(jobId: string): Promise<boolean> {
    try {
      const job = await this.agentQueue.getJob(jobId);
      if (!job) {
        this.logger.warn(`Job ${jobId} not found`);
        return false;
      }

      await job.retry();
      this.logger.log(`Retried job ${jobId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to retry job ${jobId}: ${error}`);
      return false;
    }
  }

  // Remove a job (only if not active)
  async removeJob(jobId: string): Promise<boolean> {
    try {
      const job = await this.agentQueue.getJob(jobId);
      if (!job) {
        this.logger.warn(`Job ${jobId} not found`);
        return false;
      }

      // Protect running jobs
      const state = await job.getState();
      if (state === 'active') {
        this.logger.warn(`Cannot remove active job ${jobId}`);
        return false;
      }

      await job.remove();
      this.logger.log(`Removed job ${jobId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to remove job ${jobId}: ${error}`);
      return false;
    }
  }

  // Clean completed jobs older than specified age
  async cleanOldJobs(olderThanMs: number = 24 * 60 * 60 * 1000): Promise<number> {
    const cleaned = await this.agentQueue.clean(olderThanMs, 1000, 'completed');
    this.logger.log(`Cleaned ${cleaned.length} completed jobs`);
    return cleaned.length;
  }

  // Clean failed jobs
  async cleanFailedJobs(olderThanMs: number = 7 * 24 * 60 * 60 * 1000): Promise<number> {
    const cleaned = await this.agentQueue.clean(olderThanMs, 1000, 'failed');
    this.logger.log(`Cleaned ${cleaned.length} failed jobs`);
    return cleaned.length;
  }

  // Pause the queue
  async pauseQueue(): Promise<void> {
    await this.agentQueue.pause();
    this.logger.log('Queue paused');
  }

  // Resume the queue
  async resumeQueue(): Promise<void> {
    await this.agentQueue.resume();
    this.logger.log('Queue resumed');
  }

  // Retry all failed jobs
  async retryAllFailed(limit = 100): Promise<number> {
    const failedJobs = await this.agentQueue.getFailed(0, limit);
    let retried = 0;

    for (const job of failedJobs) {
      try {
        await job.retry();
        retried++;
      } catch (error) {
        this.logger.warn(`Failed to retry job ${job.id}: ${error}`);
      }
    }

    this.logger.log(`Retried ${retried} failed jobs`);
    return retried;
  }

  // Check for duplicate jobs
  async checkDuplicateJob(taskId: string): Promise<boolean> {
    const waitingJobs = await this.agentQueue.getWaiting(0, 1000);
    const activeJobs = await this.agentQueue.getActive(0, 100);

    const allJobs = [...waitingJobs, ...activeJobs];
    return allJobs.some(job => job.data?.taskId === taskId);
  }

  // Get queue health status
  async getHealthStatus(): Promise<{ healthy: boolean; issues: string[] }> {
    const issues: string[] = [];
    const stats = await this.getQueueStats();

    // Check for issues
    if (stats.failed > 10) {
      issues.push(`High number of failed jobs: ${stats.failed}`);
    }

    if (stats.waiting > 100) {
      issues.push(`High number of waiting jobs: ${stats.waiting}`);
    }

    if (stats.paused) {
      issues.push('Queue is paused');
    }

    return {
      healthy: issues.length === 0,
      issues,
    };
  }
}
