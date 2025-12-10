import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ServerType, ServerStatus } from '@prisma/client';

@Injectable()
export class ModelServerService {
  private readonly logger = new Logger(ModelServerService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ==================== CRUD Operations ====================

  async findAll() {
    return this.prisma.modelServer.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    return this.prisma.modelServer.findUnique({
      where: { id },
    });
  }

  async create(data: {
    name: string;
    type: ServerType;
    url: string;
    maxTokens?: number;
    device?: string;
    routingWeight?: number;
    rateLimit?: number;
    settings?: object;
  }) {
    return this.prisma.modelServer.create({
      data: {
        ...data,
        settings: data.settings || {},
      },
    });
  }

  async update(id: string, data: Partial<{
    name: string;
    url: string;
    maxTokens: number;
    device: string;
    routingWeight: number;
    rateLimit: number;
    settings: object;
    isActive: boolean;
  }>) {
    return this.prisma.modelServer.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return this.prisma.modelServer.delete({
      where: { id },
    });
  }

  // ==================== Health Check ====================

  async checkHealth(id: string): Promise<{ status: ServerStatus; latency: number }> {
    const server = await this.prisma.modelServer.findUnique({
      where: { id },
    });

    if (!server) {
      throw new Error('Server not found');
    }

    const startTime = Date.now();
    let status: ServerStatus = ServerStatus.UNKNOWN;

    try {
      const endpoint = server.type === ServerType.VLLM 
        ? `${server.url}/health`
        : `${server.url}/api/tags`;

      const response = await fetch(endpoint, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        status = ServerStatus.ONLINE;
      } else {
        status = ServerStatus.DEGRADED;
      }
    } catch (error) {
      this.logger.warn(`Health check failed for ${server.name}: ${error}`);
      status = ServerStatus.OFFLINE;
    }

    const latency = Date.now() - startTime;

    await this.prisma.modelServer.update({
      where: { id },
      data: {
        status,
        lastHealthCheck: new Date(),
      },
    });

    return { status, latency };
  }

  async checkAllHealth() {
    const servers = await this.prisma.modelServer.findMany({
      where: { isActive: true },
    });

    const results = await Promise.all(
      servers.map(async (server) => {
        try {
          const result = await this.checkHealth(server.id);
          return { ...server, ...result };
        } catch (error) {
          return { ...server, status: ServerStatus.UNKNOWN, latency: -1 };
        }
      })
    );

    return results;
  }

  // ==================== Ollama Specific ====================

  async scanOllamaModels(serverId: string) {
    const server = await this.prisma.modelServer.findUnique({
      where: { id: serverId },
    });

    if (!server || server.type !== ServerType.OLLAMA) {
      throw new Error('Invalid Ollama server');
    }

    try {
      const response = await fetch(`${server.url}/api/tags`, {
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch models');
      }

      const data = await response.json();
      return data.models || [];
    } catch (error) {
      this.logger.error(`Failed to scan Ollama models: ${error}`);
      throw error;
    }
  }
}
