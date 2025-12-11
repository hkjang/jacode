import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { AggregationPeriod, CostAlertType } from '@prisma/client';
import { UsageAggregationService } from './usage-aggregation.service';

export interface CreateCostAlertDto {
  userId?: string;
  teamId?: string;
  name: string;
  type: CostAlertType;
  threshold: number;
  period: AggregationPeriod;
  notificationChannels?: string[];
}

export interface UpdateCostAlertDto {
  name?: string;
  type?: CostAlertType;
  threshold?: number;
  period?: AggregationPeriod;
  isEnabled?: boolean;
  notificationChannels?: string[];
}

@Injectable()
export class CostAlertService {
  private readonly logger = new Logger(CostAlertService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly usageAggregationService: UsageAggregationService,
  ) {}

  /**
   * Check alerts periodically - every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async checkAlerts() {
    this.logger.log('Checking cost alerts...');

    try {
      const activeAlerts = await this.prisma.costAlert.findMany({
        where: { isEnabled: true },
      });

      for (const alert of activeAlerts) {
        await this.evaluateAlert(alert);
      }

      this.logger.log(`Checked ${activeAlerts.length} cost alerts`);
    } catch (error) {
      this.logger.error('Alert check failed:', error);
    }
  }

  /**
   * Evaluate a single alert
   */
  private async evaluateAlert(alert: any) {
    const now = new Date();
    const currentValue = await this.getCurrentValue(alert);
    const threshold = Number(alert.threshold);

    if (currentValue >= threshold) {
      // Check if already triggered recently (within same period)
      if (alert.lastTriggeredAt) {
        const lastTriggered = new Date(alert.lastTriggeredAt);
        if (this.isSamePeriod(lastTriggered, now, alert.period)) {
          return; // Already triggered in this period
        }
      }

      await this.triggerAlert(alert, currentValue, threshold);
    }
  }

  /**
   * Get current value for alert comparison
   */
  private async getCurrentValue(alert: any): Promise<number> {
    const now = new Date();
    
    let aggregation;
    if (alert.userId) {
      aggregation = await this.usageAggregationService.getUserAggregation(
        alert.userId,
        alert.period,
        now,
      );
    } else if (alert.teamId) {
      aggregation = await this.usageAggregationService.getTeamAggregation(
        alert.teamId,
        alert.period,
        now,
      );
    }

    if (!aggregation) {
      // Calculate from raw logs if no aggregation exists yet
      return this.calculateLiveValue(alert);
    }

    switch (alert.type) {
      case CostAlertType.TOKEN_LIMIT:
        return aggregation.totalTokens;
      case CostAlertType.COST_LIMIT:
        return Number(aggregation.estimatedCostUsd);
      case CostAlertType.RATE_LIMIT:
        return aggregation.requestCount;
      default:
        return 0;
    }
  }

  /**
   * Calculate live value from usage logs when no aggregation exists
   */
  private async calculateLiveValue(alert: any): Promise<number> {
    const now = new Date();
    const periodStart = this.getPeriodStart(alert.period, now);

    const where: any = {
      createdAt: { gte: periodStart },
    };

    if (alert.userId) {
      where.userId = alert.userId;
    } else if (alert.teamId) {
      // Get users in team
      const team = await this.prisma.team.findUnique({
        where: { id: alert.teamId },
        include: { members: { select: { id: true } } },
      });
      
      if (team) {
        where.userId = { in: team.members.map(m => m.id) };
      }
    }

    const agg = await this.prisma.usageLog.aggregate({
      where,
      _sum: {
        totalTokens: true,
      },
      _count: true,
    });

    switch (alert.type) {
      case CostAlertType.TOKEN_LIMIT:
        return agg._sum.totalTokens || 0;
      case CostAlertType.RATE_LIMIT:
        return agg._count;
      default:
        return 0;
    }
  }

  /**
   * Trigger alert notification
   */
  private async triggerAlert(alert: any, currentValue: number, threshold: number) {
    this.logger.warn(
      `Alert triggered: ${alert.name} - Current: ${currentValue}, Threshold: ${threshold}`,
    );

    // Update last triggered time
    await this.prisma.costAlert.update({
      where: { id: alert.id },
      data: { lastTriggeredAt: new Date() },
    });

    // Send notifications based on channels
    for (const channel of alert.notificationChannels) {
      await this.sendNotification(channel, alert, currentValue, threshold);
    }

    // Log the alert
    await this.prisma.systemLog.create({
      data: {
        level: 'WARN',
        category: 'cost_alert',
        message: `Cost alert triggered: ${alert.name}`,
        context: {
          alertId: alert.id,
          alertName: alert.name,
          type: alert.type,
          currentValue,
          threshold,
          userId: alert.userId,
          teamId: alert.teamId,
        },
      },
    });
  }

  /**
   * Send notification via specific channel
   */
  private async sendNotification(
    channel: string,
    alert: any,
    currentValue: number,
    threshold: number,
  ) {
    switch (channel) {
      case 'email':
        // TODO: Implement email notification
        this.logger.log(`Email notification would be sent for alert: ${alert.name}`);
        break;
      case 'inapp':
        // TODO: Implement in-app notification (could use WebSocket)
        this.logger.log(`In-app notification would be sent for alert: ${alert.name}`);
        break;
      case 'slack':
        // TODO: Implement Slack notification
        this.logger.log(`Slack notification would be sent for alert: ${alert.name}`);
        break;
      default:
        this.logger.warn(`Unknown notification channel: ${channel}`);
    }
  }

  /**
   * Check if two dates are in the same period
   */
  private isSamePeriod(date1: Date, date2: Date, period: AggregationPeriod): boolean {
    switch (period) {
      case AggregationPeriod.DAILY:
        return date1.toDateString() === date2.toDateString();
      case AggregationPeriod.WEEKLY:
        const week1 = this.getWeekNumber(date1);
        const week2 = this.getWeekNumber(date2);
        return week1 === week2 && date1.getFullYear() === date2.getFullYear();
      case AggregationPeriod.MONTHLY:
        return (
          date1.getMonth() === date2.getMonth() &&
          date1.getFullYear() === date2.getFullYear()
        );
      default:
        return false;
    }
  }

  private getWeekNumber(date: Date): number {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }

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

  // ==================== CRUD Operations ====================

  async createAlert(dto: CreateCostAlertDto) {
    return this.prisma.costAlert.create({
      data: {
        userId: dto.userId,
        teamId: dto.teamId,
        name: dto.name,
        type: dto.type,
        threshold: dto.threshold,
        period: dto.period,
        notificationChannels: dto.notificationChannels || ['email', 'inapp'],
      },
    });
  }

  async getAlerts(userId?: string, teamId?: string) {
    return this.prisma.costAlert.findMany({
      where: {
        OR: [
          { userId: userId || undefined },
          { teamId: teamId || undefined },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAlert(id: string) {
    return this.prisma.costAlert.findUnique({ where: { id } });
  }

  async updateAlert(id: string, dto: UpdateCostAlertDto) {
    return this.prisma.costAlert.update({
      where: { id },
      data: dto,
    });
  }

  async deleteAlert(id: string) {
    return this.prisma.costAlert.delete({ where: { id } });
  }

  async toggleAlert(id: string, isEnabled: boolean) {
    return this.prisma.costAlert.update({
      where: { id },
      data: { isEnabled },
    });
  }
}
