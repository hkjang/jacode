import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Job } from 'bullmq';
import { QUEUE_NAMES } from './constants';

interface AgentResource {
  id: string;
  type: string;
  status: 'idle' | 'busy';
  currentJobId?: string;
  startedAt?: Date;
}

@Injectable()
export class AgentSchedulerService {
  private readonly logger = new Logger(AgentSchedulerService.name);
  private readonly maxConcurrentAgents: number;
  private readonly agents: Map<string, AgentResource> = new Map();

  constructor(
    private readonly configService: ConfigService,
    @InjectQueue(QUEUE_NAMES.CODE_GENERATION)
    private readonly codeQueue: Queue,
    @InjectQueue(QUEUE_NAMES.PLAN_GENERATION)
    private readonly planQueue: Queue,
  ) {
    this.maxConcurrentAgents = this.configService.get('MAX_CONCURRENT_AGENTS', 3);
    this.initializeAgents();
  }

  private initializeAgents() {
    for (let i = 0; i < this.maxConcurrentAgents; i++) {
      const id = `agent-${i + 1}`;
      this.agents.set(id, {
        id,
        type: 'general',
        status: 'idle',
      });
    }
    this.logger.log(`Initialized ${this.maxConcurrentAgents} agent slots`);
  }

  /**
   * Get all agent statuses
   */
  getAgentStatuses() {
    return Array.from(this.agents.values());
  }

  /**
   * Get available agent count
   */
  getAvailableAgentCount(): number {
    return Array.from(this.agents.values()).filter((a) => a.status === 'idle').length;
  }

  /**
   * Allocate an agent for a job
   */
  allocateAgent(jobId: string): string | null {
    for (const [id, agent] of this.agents) {
      if (agent.status === 'idle') {
        agent.status = 'busy';
        agent.currentJobId = jobId;
        agent.startedAt = new Date();
        this.logger.log(`Allocated ${id} for job ${jobId}`);
        return id;
      }
    }
    return null;
  }

  /**
   * Release an agent
   */
  releaseAgent(agentId: string) {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.status = 'idle';
      agent.currentJobId = undefined;
      agent.startedAt = undefined;
      this.logger.log(`Released ${agentId}`);
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    const [codeStats, planStats] = await Promise.all([
      this.getQueueInfo(this.codeQueue),
      this.getQueueInfo(this.planQueue),
    ]);

    return {
      codeGeneration: codeStats,
      planGeneration: planStats,
      agents: {
        total: this.maxConcurrentAgents,
        available: this.getAvailableAgentCount(),
        busy: this.maxConcurrentAgents - this.getAvailableAgentCount(),
      },
    };
  }

  private async getQueueInfo(queue: Queue) {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }

  /**
   * Update job priority
   */
  async updateJobPriority(queueName: string, jobId: string, priority: number) {
    const queue = this.getQueue(queueName);
    if (!queue) return null;

    const job = await queue.getJob(jobId);
    if (!job) return null;

    // BullMQ doesn't directly support priority change, we need to remove and re-add
    const jobData = job.data;
    const jobOpts = job.opts;
    
    await job.remove();
    
    return queue.add(job.name!, jobData, {
      ...jobOpts,
      priority,
      jobId: `${jobId}-reprioritized`,
    });
  }

  private getQueue(name: string): Queue | null {
    switch (name) {
      case QUEUE_NAMES.CODE_GENERATION:
        return this.codeQueue;
      case QUEUE_NAMES.PLAN_GENERATION:
        return this.planQueue;
      default:
        return null;
    }
  }
}
