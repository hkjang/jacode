import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('api/admin/ai-providers')
@UseGuards(JwtAuthGuard)
export class AIProviderController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all registered providers
   */
  @Get()
  async getAllProviders() {
    // Return mock provider data based on model servers
    const servers = await this.prisma.modelServer.findMany({
      where: { isActive: true },
    });

    return servers.map(s => ({
      id: s.id,
      name: s.name,
      type: s.type,
      status: s.status,
      url: s.url,
    }));
  }

  /**
   * Get provider by ID
   */
  @Get(':id')
  async getProvider(@Param('id') id: string) {
    return this.prisma.modelServer.findUnique({
      where: { id },
    });
  }

  /**
   * Get provider metrics
   */
  @Get(':id/metrics')
  async getProviderMetrics(@Param('id') id: string) {
    const server = await this.prisma.modelServer.findUnique({
      where: { id },
    });

    return {
      id,
      name: server?.name,
      status: server?.status,
      lastHealthCheck: server?.lastHealthCheck,
      totalRequests: 0,
      successRate: 100,
    };
  }

  /**
   * Health check
   */
  @Get(':id/health')
  async healthCheck(@Param('id') id: string) {
    const server = await this.prisma.modelServer.findUnique({
      where: { id },
    });

    return {
      providerId: id,
      healthy: server?.status === 'ONLINE',
      lastCheck: new Date().toISOString(),
    };
  }

  /**
   * Unregister provider (set inactive)
   */
  @Delete(':id')
  async unregisterProvider(@Param('id') id: string) {
    return this.prisma.modelServer.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
