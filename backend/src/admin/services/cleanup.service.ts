import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { AgentStatus } from '@prisma/client';

@Injectable()
export class CleanupService implements OnModuleInit {
  private readonly logger = new Logger(CleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    this.logger.log('Cleanup service initialized');
  }

  // Run daily at 3 AM
  @Cron('0 3 * * *')
  async performDailyCleanup() {
    this.logger.log('Starting daily cleanup...');

    const results = {
      oldTasks: await this.cleanupOldTasks(),
      oldLogs: await this.cleanupOldLogs(),
    };

    this.logger.log(`Daily cleanup completed: ${JSON.stringify(results)}`);

    // Log to system
    await this.prisma.systemLog.create({
      data: {
        level: 'INFO',
        category: 'cleanup',
        message: 'Daily cleanup completed',
        context: results,
      },
    });
  }

  // Clean up tasks older than 30 days (COMPLETED only)
  async cleanupOldTasks(daysToKeep: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    // Only delete COMPLETED tasks - protect EXECUTING and PENDING
    const result = await this.prisma.agentTask.deleteMany({
      where: {
        status: AgentStatus.COMPLETED,
        completedAt: { lt: cutoffDate },
      },
    });

    this.logger.log(`Cleaned up ${result.count} old completed tasks`);
    return result.count;
  }

  // Clean up logs older than retention period
  async cleanupOldLogs(daysToKeep: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const [system, activity, usage] = await Promise.all([
      this.prisma.systemLog.deleteMany({
        where: { createdAt: { lt: cutoffDate } },
      }),
      this.prisma.activityLog.deleteMany({
        where: { createdAt: { lt: cutoffDate } },
      }),
      this.prisma.usageLog.deleteMany({
        where: { createdAt: { lt: cutoffDate } },
      }),
    ]);

    const total = system.count + activity.count + usage.count;
    this.logger.log(`Cleaned up ${total} old logs (system: ${system.count}, activity: ${activity.count}, usage: ${usage.count})`);

    return {
      system: system.count,
      activity: activity.count,
      usage: usage.count,
      total,
    };
  }

  // Reset team usage counters (run monthly)
  @Cron('0 0 1 * *') // First day of each month
  async resetTeamUsage() {
    const result = await this.prisma.team.updateMany({
      data: { currentUsage: 0 },
    });

    this.logger.log(`Reset usage for ${result.count} teams`);

    await this.prisma.systemLog.create({
      data: {
        level: 'INFO',
        category: 'cleanup',
        message: `Monthly team usage reset: ${result.count} teams`,
        context: { teamsReset: result.count },
      },
    });
  }
}

