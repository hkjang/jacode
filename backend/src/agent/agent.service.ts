import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
import { AgentGateway } from './agent.gateway';
import { CreateAgentTaskDto } from './dto/create-agent-task.dto';
import { AgentStatus, AgentType } from '@prisma/client';
import { QUEUE_NAMES } from '../queue/constants';
import { ArtifactService } from '../artifact/artifact.service';
import { ArtifactType } from '@prisma/client';

@Injectable()
export class AgentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
    private readonly agentGateway: AgentGateway,
    private readonly artifactService: ArtifactService,
  ) {}

  /**
   * Create a new agent task
   */
  async createTask(userId: string, dto: CreateAgentTaskDto) {
    // Create task in database
    const task = await this.prisma.agentTask.create({
      data: {
        type: dto.type as AgentType,
        prompt: dto.prompt,
        context: dto.context || {},
        priority: dto.priority || 1,
        groupId: dto.groupId,
        projectId: dto.projectId,
        userId,
        status: AgentStatus.PENDING,
      },
    });

    // Queue the task based on type
    await this.queueTask(task);

    // Notify connected clients
    this.agentGateway.notifyTaskCreated(task);

    return task;
  }

  /**
   * Get all tasks for a project
   */
  async getTasksByProject(projectId: string, userId: string) {
    return this.prisma.agentTask.findMany({
      where: { projectId, userId },
      include: {
        artifacts: {
          select: { id: true, type: true, title: true, status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a single task
   */
  async getTask(id: string, userId: string) {
    const task = await this.prisma.agentTask.findFirst({
      where: { id, userId },
      include: {
        artifacts: true,
        project: {
          select: { id: true, name: true },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return task;
  }

  /**
   * Get tasks by status
   */
  async getTasksByStatus(userId: string, statuses: AgentStatus[]) {
    return this.prisma.agentTask.findMany({
      where: {
        userId,
        status: { in: statuses },
      },
      include: {
        project: { select: { id: true, name: true } },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });
  }

  /**
   * Cancel a task
   */
  async cancelTask(id: string, userId: string) {
    const task = await this.getTask(id, userId);

    if (task.status === AgentStatus.COMPLETED || task.status === AgentStatus.CANCELLED) {
      throw new Error('Cannot cancel completed or already cancelled task');
    }

    // Cancel in queue
    const queueName = this.getQueueName(task.type);
    await this.queueService.cancelJob(queueName, id);

    // Update database
    const updated = await this.prisma.agentTask.update({
      where: { id },
      data: { status: AgentStatus.CANCELLED },
    });

    // Notify clients
    this.agentGateway.notifyTaskUpdated(updated);

    return updated;
  }

  /**
   * Retry a failed task
   */
  async retryTask(id: string, userId: string) {
    const task = await this.getTask(id, userId);

    if (task.status !== AgentStatus.FAILED && task.status !== AgentStatus.CANCELLED) {
      throw new Error('Can only retry failed or cancelled tasks');
    }

    // Reset task status
    const updated = await this.prisma.agentTask.update({
      where: { id },
      data: {
        status: AgentStatus.PENDING,
        error: null,
        progress: 0,
        currentStep: null,
      },
    });

    // Re-queue the task
    await this.queueTask(updated);

    // Notify clients
    this.agentGateway.notifyTaskUpdated(updated);

    return updated;
  }

  /**
   * Update task priority
   */
  async updatePriority(id: string, userId: string, priority: number) {
    const task = await this.getTask(id, userId);

    const updated = await this.prisma.agentTask.update({
      where: { id },
      data: { priority },
    });

    return updated;
  }

  /**
   * Approve a task's artifacts and apply changes
   */
  async approveTask(id: string, userId: string) {
    const task = await this.getTask(id, userId);

    if (task.status !== AgentStatus.WAITING_APPROVAL) {
      throw new Error('Task is not waiting for approval');
    }

    // Apply all code/diff artifacts
    const artifacts = await this.prisma.artifact.findMany({
      where: { 
        agentTaskId: id,
        type: { in: [ArtifactType.CODE, ArtifactType.DIFF] }
      },
    });

    for (const artifact of artifacts) {
      try {
        await this.artifactService.applyCodeArtifact(artifact.id);
      } catch (error) {
        console.error(`Failed to apply artifact ${artifact.id}:`, error);
        // We throw here to stop the approval process if application fails
        throw new Error(`Failed to apply artifact ${artifact.id}: ${error.message}`);
      }
    }

    // Update all artifacts to approved
    await this.prisma.artifact.updateMany({
      where: { agentTaskId: id },
      data: { status: 'APPROVED' },
    });

    // Update task status
    const updated = await this.prisma.agentTask.update({
      where: { id },
      data: {
        status: AgentStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    // Notify clients
    this.agentGateway.notifyTaskCompleted(updated);

    return updated;
  }

  /**
   * Reject a task's artifacts
   */
  async rejectTask(id: string, userId: string, reason?: string) {
    const task = await this.getTask(id, userId);

    if (task.status !== AgentStatus.WAITING_APPROVAL) {
      throw new Error('Task is not waiting for approval');
    }

    // Update all artifacts to rejected
    await this.prisma.artifact.updateMany({
      where: { agentTaskId: id },
      data: { status: 'REJECTED' },
    });

    // Update task status
    const updated = await this.prisma.agentTask.update({
      where: { id },
      data: {
        status: AgentStatus.FAILED,
        error: reason || 'Rejected by user',
        completedAt: new Date(),
      },
    });

    // Notify clients
    this.agentGateway.notifyTaskFailed(updated);

    return updated;
  }

  /**
   * Get task group summary
   */
  async getTaskGroups(userId: string) {
    const groups = await this.prisma.agentTask.groupBy({
      by: ['groupId', 'status'],
      where: {
        userId,
        groupId: { not: null },
      },
      _count: true,
    });

    return groups;
  }

  /**
   * Queue task based on type
   */
  private async queueTask(task: any) {
    const jobData = {
      taskId: task.id,
      projectId: task.projectId,
      userId: task.userId,
      prompt: task.prompt,
      context: task.context,
    };

    switch (task.type) {
      case AgentType.CODE_GENERATION:
      case AgentType.CODE_MODIFICATION:
      case AgentType.BUG_FIX:
      case AgentType.REFACTORING:
        await this.queueService.addCodeGenerationJob(
          { ...jobData, language: task.context?.language },
          task.priority,
        );
        break;

      default:
        await this.queueService.addPlanGenerationJob(
          { ...jobData, requirements: task.prompt },
          task.priority,
        );
    }
  }

  /**
   * Get queue name for task type
   */
  private getQueueName(type: AgentType): string {
    switch (type) {
      case AgentType.CODE_GENERATION:
      case AgentType.CODE_MODIFICATION:
      case AgentType.BUG_FIX:
      case AgentType.REFACTORING:
        return QUEUE_NAMES.CODE_GENERATION;
      default:
        return QUEUE_NAMES.PLAN_GENERATION;
    }
  }
}
