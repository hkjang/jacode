import { Controller, Get, Put, Post, Body, Param, UseGuards } from '@nestjs/common';
import { QuotaManagementService } from '../../common/services/quota-management.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

export class UpdateQuotaDto {
  dailyLimit?: number;
  monthlyLimit?: number;
}

export class ResetQuotaDto {
  userId: string;
  type: 'daily' | 'monthly' | 'both';
}

@Controller('admin/quotas')
@UseGuards(JwtAuthGuard)
export class QuotaController {
  constructor(private readonly quotaService: QuotaManagementService) {}

  /**
   * Get user quota
   */
  @Get('user/:userId')
  async getUserQuota(@Param('userId') userId: string) {
    return this.quotaService.getUserQuota(userId);
  }

  /**
   * Update user quota limits
   */
  @Put('user/:userId')
  async updateQuota(
    @Param('userId') userId: string,
    @Body() dto: UpdateQuotaDto
  ) {
    return this.quotaService.updateUserQuota(userId, dto);
  }

  /**
   * Reset user quota
   */
  @Post('reset')
  async resetQuota(@Body() dto: ResetQuotaDto) {
    return this.quotaService.resetUserQuota(dto.userId, dto.type);
  }

  /**
   * Get top consumers
   */
  @Get('top/:limit')
  async getTopConsumers(@Param('limit') limit: string) {
    return this.quotaService.getTopConsumers(parseInt(limit, 10));
  }

  /**
   * Get quota summary for multiple users
   */
  @Post('summary')
  async getQuotaSummary(@Body() body: { userIds: string[] }) {
    return this.quotaService.getQuotaSummary(body.userIds);
  }

  /**
   * Bulk update quotas
   */
  @Put('bulk')
  async bulkUpdate(@Body() body: { updates: { userId: string; quota: UpdateQuotaDto }[] }) {
    const results = await Promise.all(
      body.updates.map(u => this.quotaService.updateUserQuota(u.userId, u.quota))
    );
    return { updated: results.length, results };
  }
}
