import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ErrorTracker } from '../common/logger.service';
import { PrismaService } from '../prisma/prisma.service';
import * as os from 'os';

@ApiTags('Monitoring')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/monitoring')
export class MonitoringController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  @ApiOperation({ summary: 'Health check' })
  async healthCheck() {
    const dbHealth = await this.checkDatabase();
    
    return {
      status: dbHealth ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      checks: {
        database: dbHealth,
        memory: this.getMemoryUsage(),
        uptime: process.uptime(),
      },
    };
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get application metrics' })
  async getMetrics() {
    const [projectCount, userCount, taskCount, artifactCount] = await Promise.all([
      this.prisma.project.count(),
      this.prisma.user.count(),
      this.prisma.agentTask.count(),
      this.prisma.artifact.count(),
    ]);

    const tasksByStatus = await this.prisma.agentTask.groupBy({
      by: ['status'],
      _count: { status: true },
    });

    return {
      timestamp: new Date().toISOString(),
      system: {
        platform: os.platform(),
        nodeVersion: process.version,
        uptime: process.uptime(),
        memory: this.getMemoryUsage(),
        cpu: os.loadavg(),
      },
      database: {
        projects: projectCount,
        users: userCount,
        tasks: taskCount,
        artifacts: artifactCount,
      },
      tasks: {
        byStatus: tasksByStatus.reduce((acc, curr) => {
          acc[curr.status] = curr._count.status;
          return acc;
        }, {} as Record<string, number>),
      },
    };
  }

  @Get('errors')
  @ApiOperation({ summary: 'Get error summary' })
  getErrors() {
    return {
      errors: ErrorTracker.getErrorSummary(),
      timestamp: new Date().toISOString(),
    };
  }

  @Post('errors/clear')
  @ApiOperation({ summary: 'Clear error tracker' })
  clearErrors() {
    ErrorTracker.clear();
    return { success: true };
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  private getMemoryUsage() {
    const used = process.memoryUsage();
    return {
      heapUsed: Math.round(used.heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(used.heapTotal / 1024 / 1024) + 'MB',
      rss: Math.round(used.rss / 1024 / 1024) + 'MB',
      external: Math.round(used.external / 1024 / 1024) + 'MB',
    };
  }
}
