import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface UserQuota {
  userId: string;
  dailyLimit: number;
  monthlyLimit: number;
  currentDailyUsage: number;
  currentMonthlyUsage: number;
  resetAt: Date;
}

@Injectable()
export class QuotaManagementService {
  private readonly logger = new Logger(QuotaManagementService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check if user has quota available
   */
  async checkQuota(userId: string): Promise<{ allowed: boolean; reason?: string }> {
    const quota = await this.getUserQuota(userId);

    if (quota.currentDailyUsage >= quota.dailyLimit) {
      return {
        allowed: false,
        reason: `Daily limit (${quota.dailyLimit}) exceeded`,
      };
    }

    if (quota.currentMonthlyUsage >= quota.monthlyLimit) {
      return {
        allowed: false,
        reason: `Monthly limit (${quota.monthlyLimit}) exceeded`,
      };
    }

    return { allowed: true };
  }

  /**
   * Consume quota for a request
   */
  async consumeQuota(userId: string, tokens: number = 1): Promise<void> {
    // Log usage in usage log table with required fields
    await this.prisma.usageLog.create({
      data: {
        userId,
        modelName: 'default',
        provider: 'ollama',
        feature: 'ai_generation',
        totalTokens: tokens,
        promptTokens: 0,
        completionTokens: tokens,
        responseTimeMs: 0,
        success: true,
      },
    });

    this.logger.log(`User ${userId} consumed ${tokens} tokens`);
  }

  /**
   * Get user quota
   */
  async getUserQuota(userId: string): Promise<UserQuota> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Get default limits (could be from user role/plan)
    const dailyLimit = 100; // 100 requests per day
    const monthlyLimit = 2000; // 2000 requests per month

    // Calculate current usage
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [dailyUsage, monthlyUsage] = await Promise.all([
      this.prisma.usageLog.count({
        where: {
          userId,
          createdAt: { gte: today },
        },
      }),
      this.prisma.usageLog.count({
        where: {
          userId,
          createdAt: { gte: monthStart },
        },
      }),
    ]);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return {
      userId,
      dailyLimit,
      monthlyLimit,
      currentDailyUsage: dailyUsage,
      currentMonthlyUsage: monthlyUsage,
      resetAt: tomorrow,
    };
  }

  /**
   * Get quota summary for multiple users
   */
  async getQuotaSummary(userIds: string[]) {
    const summaries = await Promise.all(
      userIds.map(userId => this.getUserQuota(userId))
    );

    return summaries;
  }

  /**
   * Reset daily quotas (scheduled task)
   */
  async resetDailyQuotas() {
    this.logger.log('Resetting daily quotas');
    // Daily quotas reset automatically based on timestamp
  }

  /**
   * Get top consumers
   */
  async getTopConsumers(limit: number = 10) {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const usage = await this.prisma.usageLog.groupBy({
      by: ['userId'],
      where: {
        createdAt: { gte: monthStart },
      },
      _count: true,
      orderBy: {
        _count: {
          userId: 'desc',
        },
      },
      take: limit,
    });

    return usage.map(u => ({
      userId: u.userId,
      requestCount: u._count,
    }));
  }
}
