import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SettingsHistoryService {
  private readonly logger = new Logger(SettingsHistoryService.name);

  constructor(private readonly prisma: PrismaService) {}

  async logChange(
    key: string,
    category: string,
    oldValue: any,
    newValue: any,
    changedBy: { id: string; email: string; name: string },
    reason?: string,
  ) {
    try {
      return await this.prisma.settingsHistory.create({
        data: {
          key,
          category,
          oldValue,
          newValue,
          changedById: changedBy.id,
          changedByEmail: changedBy.email,
          changedByName: changedBy.name,
          reason,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to log settings change: ${error}`);
    }
  }

  async getHistory(filters: {
    key?: string;
    category?: string;
    changedById?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const { key, category, changedById, startDate, endDate, page = 1, limit = 50 } = filters;

    const where: any = {};
    if (key) where.key = key;
    if (category) where.category = category;
    if (changedById) where.changedById = changedById;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [history, total] = await Promise.all([
      this.prisma.settingsHistory.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.settingsHistory.count({ where }),
    ]);

    return {
      history,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getKeyHistory(key: string) {
    return this.prisma.settingsHistory.findMany({
      where: { key },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  async rollback(historyId: string) {
    const history = await this.prisma.settingsHistory.findUnique({
      where: { id: historyId },
    });

    if (!history) {
      throw new Error('History entry not found');
    }

    // Update the setting to old value
    await this.prisma.systemSetting.update({
      where: { key: history.key },
      data: { value: history.oldValue },
    });

    return history;
  }
}
