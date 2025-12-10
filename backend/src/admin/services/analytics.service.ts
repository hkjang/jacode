import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ==================== Usage Statistics ====================

  async getUserUsageStats(userId: string, startDate: Date, endDate: Date) {
    const logs = await this.prisma.usageLog.groupBy({
      by: ['modelName'],
      where: {
        userId,
        createdAt: { gte: startDate, lte: endDate },
      },
      _sum: {
        totalTokens: true,
        promptTokens: true,
        completionTokens: true,
      },
      _count: true,
      _avg: {
        responseTimeMs: true,
      },
    });

    return logs;
  }

  async getModelUsageStats(startDate: Date, endDate: Date) {
    const logs = await this.prisma.usageLog.groupBy({
      by: ['modelName', 'provider'],
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      _sum: {
        totalTokens: true,
      },
      _count: true,
      _avg: {
        responseTimeMs: true,
      },
    });

    return logs;
  }

  async getFeatureUsageStats(startDate: Date, endDate: Date) {
    const logs = await this.prisma.usageLog.groupBy({
      by: ['feature'],
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      _sum: {
        totalTokens: true,
      },
      _count: true,
    });

    return logs.sort((a, b) => b._count - a._count);
  }

  // ==================== Daily Statistics ====================

  async getDailyStats(startDate: Date, endDate: Date) {
    const logs = await this.prisma.$queryRaw<Array<{
      date: Date;
      total_tokens: bigint;
      request_count: bigint;
      avg_response_time: number;
    }>>`
      SELECT 
        DATE(created_at) as date,
        SUM(total_tokens) as total_tokens,
        COUNT(*) as request_count,
        AVG(response_time_ms) as avg_response_time
      FROM usage_logs
      WHERE created_at >= ${startDate} AND created_at <= ${endDate}
      GROUP BY DATE(created_at)
      ORDER BY date
    `;

    return logs.map(row => ({
      date: row.date,
      totalTokens: Number(row.total_tokens),
      requestCount: Number(row.request_count),
      avgResponseTime: Math.round(row.avg_response_time),
    }));
  }

  // ==================== Team Statistics ====================

  async getTeamUsageStats(teamId: string, startDate: Date, endDate: Date) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          select: { id: true },
        },
      },
    });

    if (!team) return null;

    const userIds = team.members.map(m => m.id);

    const stats = await this.prisma.usageLog.aggregate({
      where: {
        userId: { in: userIds },
        createdAt: { gte: startDate, lte: endDate },
      },
      _sum: {
        totalTokens: true,
      },
      _count: true,
    });

    return {
      teamId,
      teamName: team.name,
      usageLimit: team.usageLimit,
      currentUsage: team.currentUsage,
      periodUsage: stats._sum.totalTokens || 0,
      requestCount: stats._count,
    };
  }

  // ==================== Error Statistics ====================

  async getErrorStats(startDate: Date, endDate: Date) {
    const [totalRequests, failedRequests] = await Promise.all([
      this.prisma.usageLog.count({
        where: { createdAt: { gte: startDate, lte: endDate } },
      }),
      this.prisma.usageLog.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          success: false,
        },
      }),
    ]);

    const errorsByModel = await this.prisma.usageLog.groupBy({
      by: ['modelName'],
      where: {
        createdAt: { gte: startDate, lte: endDate },
        success: false,
      },
      _count: true,
    });

    return {
      totalRequests,
      failedRequests,
      successRate: totalRequests > 0
        ? ((totalRequests - failedRequests) / totalRequests * 100).toFixed(2)
        : '100.00',
      errorsByModel,
    };
  }

  // ==================== Overview Dashboard ====================

  async getDashboardOverview() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [todayStats, weekStats, monthStats, topFeatures, topModels] = await Promise.all([
      this.prisma.usageLog.aggregate({
        where: { createdAt: { gte: todayStart } },
        _sum: { totalTokens: true },
        _count: true,
      }),
      this.prisma.usageLog.aggregate({
        where: { createdAt: { gte: weekAgo } },
        _sum: { totalTokens: true },
        _count: true,
      }),
      this.prisma.usageLog.aggregate({
        where: { createdAt: { gte: monthAgo } },
        _sum: { totalTokens: true },
        _count: true,
      }),
      this.getFeatureUsageStats(monthAgo, now),
      this.getModelUsageStats(monthAgo, now),
    ]);

    return {
      today: {
        tokens: todayStats._sum.totalTokens || 0,
        requests: todayStats._count,
      },
      week: {
        tokens: weekStats._sum.totalTokens || 0,
        requests: weekStats._count,
      },
      month: {
        tokens: monthStats._sum.totalTokens || 0,
        requests: monthStats._count,
      },
      topFeatures: topFeatures.slice(0, 5),
      topModels: topModels.slice(0, 5),
    };
  }
}
