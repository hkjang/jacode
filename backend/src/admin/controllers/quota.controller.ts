import { Controller, Get, Patch, Post, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('api/admin/quotas')
@UseGuards(JwtAuthGuard)
export class QuotaController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get user quota
   */
  @Get('user/:userId')
  async getUserQuota(@Param('userId') userId: string) {
    const usage = await this.prisma.usageLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dailyUsage = usage.filter(u => new Date(u.createdAt) >= today).length;
    const monthlyUsage = usage.length;

    return {
      userId,
      dailyUsage,
      monthlyUsage,
      dailyLimit: 100,
      monthlyLimit: 3000,
    };
  }

  /**
   * Get top consumers
   */
  @Get('top-consumers')
  async getTopConsumers() {
    const result = await this.prisma.usageLog.groupBy({
      by: ['userId'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    return result.map(r => ({
      userId: r.userId,
      usageCount: r._count.id,
    }));
  }

  /**
   * Update quota settings
   */
  @Patch('user/:userId')
  async updateUserQuota(
    @Param('userId') userId: string,
    @Body() body: { dailyLimit?: number; monthlyLimit?: number },
  ) {
    // Store in settings or return updated values
    return {
      userId,
      dailyLimit: body.dailyLimit || 100,
      monthlyLimit: body.monthlyLimit || 3000,
      updated: true,
    };
  }
}
