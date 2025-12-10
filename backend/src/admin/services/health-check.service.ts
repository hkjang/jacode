import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { ServerStatus, ServerType } from '@prisma/client';

@Injectable()
export class HealthCheckService {
  private readonly logger = new Logger(HealthCheckService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Run health check every 30 seconds
  @Cron(CronExpression.EVERY_30_SECONDS)
  async performHealthChecks() {
    const servers = await this.prisma.modelServer.findMany({
      where: { isActive: true },
    });

    for (const server of servers) {
      await this.checkServerHealth(server.id, server.type, server.url);
    }
  }

  async checkServerHealth(
    serverId: string,
    type: ServerType,
    url: string,
  ): Promise<{ status: ServerStatus; latency: number; details?: any }> {
    const startTime = Date.now();
    let status: ServerStatus = ServerStatus.UNKNOWN;
    let details: any = null;

    try {
      const endpoint = type === ServerType.VLLM 
        ? `${url}/health`
        : `${url}/api/tags`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(endpoint, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.ok) {
        status = ServerStatus.ONLINE;
        if (type === ServerType.OLLAMA) {
          const data = await response.json();
          details = {
            modelCount: data.models?.length || 0,
            models: data.models?.map((m: any) => m.name) || [],
          };
        }
      } else {
        status = ServerStatus.DEGRADED;
        details = { statusCode: response.status };
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        this.logger.warn(`Health check timeout for server ${serverId}`);
        status = ServerStatus.DEGRADED;
        details = { error: 'timeout' };
      } else {
        this.logger.warn(`Health check failed for server ${serverId}: ${error.message}`);
        status = ServerStatus.OFFLINE;
        details = { error: error.message };
      }
    }

    const latency = Date.now() - startTime;

    // Get previous status
    const server = await this.prisma.modelServer.findUnique({
      where: { id: serverId },
    });

    // Log status change
    if (server && server.status !== status) {
      this.logger.log(`Server ${serverId} status changed: ${server.status} -> ${status}`);
      
      // Log to system logs
      await this.prisma.systemLog.create({
        data: {
          level: status === ServerStatus.OFFLINE ? 'ERROR' : 'INFO',
          category: 'health_check',
          message: `Model server status changed from ${server.status} to ${status}`,
          context: { serverId, type, url, latency, details },
        },
      });
    }

    // Update server status
    await this.prisma.modelServer.update({
      where: { id: serverId },
      data: {
        status,
        lastHealthCheck: new Date(),
        settings: {
          ...(server?.settings as object || {}),
          lastLatency: latency,
          lastDetails: details,
        },
      },
    });

    return { status, latency, details };
  }

  // Get health summary for all servers
  async getHealthSummary() {
    const servers = await this.prisma.modelServer.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        lastHealthCheck: true,
        isActive: true,
        settings: true,
      },
    });

    const online = servers.filter(s => s.status === ServerStatus.ONLINE).length;
    const offline = servers.filter(s => s.status === ServerStatus.OFFLINE).length;
    const degraded = servers.filter(s => s.status === ServerStatus.DEGRADED).length;

    return {
      total: servers.length,
      online,
      offline,
      degraded,
      servers: servers.map(s => ({
        ...s,
        latency: (s.settings as any)?.lastLatency || null,
      })),
    };
  }
}
