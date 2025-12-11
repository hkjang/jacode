import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { AggregationPeriod } from '@prisma/client';

// Model cost per 1K tokens (configurable)
const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  'llama3': { input: 0.0, output: 0.0 }, // Self-hosted, no cost
  'codellama': { input: 0.0, output: 0.0 },
  'mistral': { input: 0.0, output: 0.0 },
  'gpt-4': { input: 0.03, output: 0.06 },
  'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
  'claude-3-opus': { input: 0.015, output: 0.075 },
  'claude-3-sonnet': { input: 0.003, output: 0.015 },
  'default': { input: 0.0, output: 0.0 },
};

@Injectable()
export class UsageAggregationService {
  private readonly logger = new Logger(UsageAggregationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Daily aggregation - runs every day at midnight
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async aggregateDailyUsage() {
    this.logger.log('Starting daily usage aggregation...');
    
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      
      const endOfYesterday = new Date(yesterday);
      endOfYesterday.setHours(23, 59, 59, 999);

      await this.aggregateForPeriod(
        AggregationPeriod.DAILY,
        yesterday,
        endOfYesterday,
      );
      
      this.logger.log('Daily usage aggregation completed');
    } catch (error) {
      this.logger.error('Daily aggregation failed:', error);
    }
  }

  /**
   * Monthly aggregation - runs on the 1st of each month at 1 AM
   */
  @Cron('0 1 1 * *')
  async aggregateMonthlyUsage() {
    this.logger.log('Starting monthly usage aggregation...');
    
    try {
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

      await this.aggregateForPeriod(
        AggregationPeriod.MONTHLY,
        lastMonth,
        lastMonthEnd,
      );
      
      this.logger.log('Monthly usage aggregation completed');
    } catch (error) {
      this.logger.error('Monthly aggregation failed:', error);
    }
  }

  /**
   * Aggregate usage for a specific period
   */
  async aggregateForPeriod(
    period: AggregationPeriod,
    periodStart: Date,
    periodEnd: Date,
  ) {
    // Get all users with usage in this period
    const userUsage = await this.prisma.usageLog.groupBy({
      by: ['userId', 'modelName'],
      where: {
        createdAt: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
      _sum: {
        totalTokens: true,
        promptTokens: true,
        completionTokens: true,
      },
      _count: true,
    });

    // Group by userId
    const userAggregations = new Map<string, {
      totalTokens: number;
      promptTokens: number;
      completionTokens: number;
      requestCount: number;
      estimatedCostUsd: number;
      modelBreakdown: Record<string, { tokens: number; cost: number }>;
    }>();

    for (const usage of userUsage) {
      const userId = usage.userId;
      const modelName = usage.modelName;
      
      if (!userAggregations.has(userId)) {
        userAggregations.set(userId, {
          totalTokens: 0,
          promptTokens: 0,
          completionTokens: 0,
          requestCount: 0,
          estimatedCostUsd: 0,
          modelBreakdown: {},
        });
      }

      const agg = userAggregations.get(userId)!;
      const tokens = usage._sum.totalTokens || 0;
      const promptTokens = usage._sum.promptTokens || 0;
      const completionTokens = usage._sum.completionTokens || 0;
      
      // Calculate cost
      const modelCost = MODEL_COSTS[modelName] || MODEL_COSTS['default'];
      const cost = (promptTokens / 1000 * modelCost.input) + 
                   (completionTokens / 1000 * modelCost.output);

      agg.totalTokens += tokens;
      agg.promptTokens += promptTokens;
      agg.completionTokens += completionTokens;
      agg.requestCount += usage._count;
      agg.estimatedCostUsd += cost;
      agg.modelBreakdown[modelName] = {
        tokens,
        cost,
      };
    }

    // Upsert aggregations
    for (const [userId, data] of userAggregations) {
      await this.prisma.usageAggregation.upsert({
        where: {
          userId_period_periodStart: {
            userId,
            period,
            periodStart,
          },
        },
        create: {
          userId,
          period,
          periodStart,
          periodEnd,
          totalTokens: data.totalTokens,
          promptTokens: data.promptTokens,
          completionTokens: data.completionTokens,
          requestCount: data.requestCount,
          estimatedCostUsd: data.estimatedCostUsd,
          modelBreakdown: data.modelBreakdown,
        },
        update: {
          totalTokens: data.totalTokens,
          promptTokens: data.promptTokens,
          completionTokens: data.completionTokens,
          requestCount: data.requestCount,
          estimatedCostUsd: data.estimatedCostUsd,
          modelBreakdown: data.modelBreakdown,
        },
      });
    }

    this.logger.log(`Aggregated usage for ${userAggregations.size} users for period ${period}`);
  }

  /**
   * Get aggregated usage for a user
   */
  async getUserAggregation(userId: string, period: AggregationPeriod, date: Date) {
    const periodStart = this.getPeriodStart(period, date);
    
    return this.prisma.usageAggregation.findUnique({
      where: {
        userId_period_periodStart: {
          userId,
          period,
          periodStart,
        },
      },
    });
  }

  /**
   * Get aggregated usage for a team
   */
  async getTeamAggregation(teamId: string, period: AggregationPeriod, date: Date) {
    const periodStart = this.getPeriodStart(period, date);
    
    return this.prisma.usageAggregation.findUnique({
      where: {
        teamId_period_periodStart: {
          teamId,
          period,
          periodStart,
        },
      },
    });
  }

  /**
   * Get period start date based on period type
   */
  private getPeriodStart(period: AggregationPeriod, date: Date): Date {
    const start = new Date(date);
    
    switch (period) {
      case AggregationPeriod.DAILY:
        start.setHours(0, 0, 0, 0);
        break;
      case AggregationPeriod.WEEKLY:
        const day = start.getDay();
        start.setDate(start.getDate() - day);
        start.setHours(0, 0, 0, 0);
        break;
      case AggregationPeriod.MONTHLY:
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        break;
    }
    
    return start;
  }

  /**
   * Get usage trend for a user
   */
  async getUserUsageTrend(userId: string, period: AggregationPeriod, count = 7) {
    const now = new Date();
    const results = [];

    for (let i = 0; i < count; i++) {
      const date = new Date(now);
      
      switch (period) {
        case AggregationPeriod.DAILY:
          date.setDate(date.getDate() - i);
          break;
        case AggregationPeriod.WEEKLY:
          date.setDate(date.getDate() - (i * 7));
          break;
        case AggregationPeriod.MONTHLY:
          date.setMonth(date.getMonth() - i);
          break;
      }

      const agg = await this.getUserAggregation(userId, period, date);
      results.push({
        periodStart: this.getPeriodStart(period, date),
        totalTokens: agg?.totalTokens || 0,
        estimatedCostUsd: agg?.estimatedCostUsd || 0,
        requestCount: agg?.requestCount || 0,
      });
    }

    return results.reverse();
  }
}
