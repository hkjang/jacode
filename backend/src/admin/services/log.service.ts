import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LogLevel } from '@prisma/client';

@Injectable()
export class LogService {
  private readonly logger = new Logger(LogService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ==================== System Logs ====================

  async logSystem(data: {
    level: LogLevel;
    category: string;
    message: string;
    stackTrace?: string;
    context?: object;
  }) {
    return this.prisma.systemLog.create({
      data: {
        ...data,
        context: data.context || {},
      },
    });
  }

  async getSystemLogs(filters: {
    level?: LogLevel;
    category?: string;
    startDate?: Date;
    endDate?: Date;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { level, category, startDate, endDate, search, page = 1, limit = 50 } = filters;

    const where: any = {};
    if (level) where.level = level;
    if (category) where.category = category;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }
    if (search) {
      where.message = { contains: search, mode: 'insensitive' };
    }

    const [logs, total] = await Promise.all([
      this.prisma.systemLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.systemLog.count({ where }),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getLogStats(startDate: Date, endDate: Date) {
    const stats = await this.prisma.systemLog.groupBy({
      by: ['level', 'category'],
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      _count: true,
    });

    const byLevel = stats.reduce((acc, s) => {
      acc[s.level] = (acc[s.level] || 0) + s._count;
      return acc;
    }, {} as Record<string, number>);

    const byCategory = stats.reduce((acc, s) => {
      acc[s.category] = (acc[s.category] || 0) + s._count;
      return acc;
    }, {} as Record<string, number>);

    return { byLevel, byCategory };
  }

  // ==================== Activity Logs ====================

  async logActivity(userId: string, data: {
    action: string;
    resource?: string;
    resourceId?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: object;
  }) {
    return this.prisma.activityLog.create({
      data: {
        userId,
        ...data,
        metadata: data.metadata || {},
      },
    });
  }

  async getActivityLogs(filters: {
    userId?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const { userId, action, startDate, endDate, page = 1, limit = 50 } = filters;

    const where: any = {};
    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [logs, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.activityLog.count({ where }),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // ==================== Usage Logs ====================

  async logUsage(userId: string, data: {
    modelName: string;
    provider: string;
    feature: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    responseTimeMs: number;
    success: boolean;
    errorMessage?: string;
  }) {
    return this.prisma.usageLog.create({
      data: {
        userId,
        ...data,
      },
    });
  }

  async getUsageLogs(filters: {
    userId?: string;
    modelName?: string;
    feature?: string;
    startDate?: Date;
    endDate?: Date;
    success?: boolean;
    page?: number;
    limit?: number;
  }) {
    const { userId, modelName, feature, startDate, endDate, success, page = 1, limit = 50 } = filters;

    const where: any = {};
    if (userId) where.userId = userId;
    if (modelName) where.modelName = modelName;
    if (feature) where.feature = feature;
    if (success !== undefined) where.success = success;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [logs, total] = await Promise.all([
      this.prisma.usageLog.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.usageLog.count({ where }),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // ==================== Cleanup ====================

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

    this.logger.log(`Cleaned up old logs: ${system.count} system, ${activity.count} activity, ${usage.count} usage`);

    return {
      systemLogs: system.count,
      activityLogs: activity.count,
      usageLogs: usage.count,
    };
  }
}
