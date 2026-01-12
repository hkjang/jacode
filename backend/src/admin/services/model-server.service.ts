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

  async findByType(type: ServerType) {
    return this.prisma.modelServer.findMany({
      where: { type },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findActive() {
    return this.prisma.modelServer.findMany({
      where: { isActive: true },
      orderBy: { routingWeight: 'desc' },
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

  // ==================== Bulk Operations ====================

  async bulkCreate(servers: Array<{
    name: string;
    type: ServerType;
    url: string;
    settings?: object;
  }>) {
    const results = await Promise.all(
      servers.map(server => this.create(server))
    );
    return { created: results.length, servers: results };
  }

  async bulkDelete(ids: string[]) {
    const result = await this.prisma.modelServer.deleteMany({
      where: { id: { in: ids } },
    });
    return { deleted: result.count };
  }

  async bulkToggle(ids: string[], isActive: boolean) {
    const result = await this.prisma.modelServer.updateMany({
      where: { id: { in: ids } },
      data: { isActive },
    });
    return { updated: result.count, isActive };
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
        ? `${server.url}/v1/models`
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

  async testConnection(url: string, type: ServerType): Promise<{ success: boolean; message: string; latency?: number }> {
    const startTime = Date.now();
    
    try {
      const endpoint = type === ServerType.VLLM 
        ? `${url}/v1/models`
        : `${url}/api/tags`;

      const response = await fetch(endpoint, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      const latency = Date.now() - startTime;

      if (response.ok) {
        return { success: true, message: 'Connection successful', latency };
      } else {
        return { success: false, message: `Server returned ${response.status}`, latency };
      }
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection failed' };
    }
  }

  // ==================== Ollama Model Management ====================

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

  async pullOllamaModel(serverId: string, modelName: string) {
    const server = await this.prisma.modelServer.findUnique({
      where: { id: serverId },
    });

    if (!server || server.type !== ServerType.OLLAMA) {
      throw new Error('Invalid Ollama server');
    }

    try {
      const response = await fetch(`${server.url}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName }),
      });

      if (!response.ok) {
        throw new Error('Failed to pull model');
      }

      // Log action
      await this.prisma.systemLog.create({
        data: {
          level: 'INFO',
          category: 'model_management',
          message: `Pulling model ${modelName} on server ${server.name}`,
          context: { serverId, modelName },
        },
      });

      return { success: true, message: `Started pulling ${modelName}` };
    } catch (error: any) {
      this.logger.error(`Failed to pull model: ${error}`);
      throw error;
    }
  }

  async deleteOllamaModel(serverId: string, modelName: string) {
    const server = await this.prisma.modelServer.findUnique({
      where: { id: serverId },
    });

    if (!server || server.type !== ServerType.OLLAMA) {
      throw new Error('Invalid Ollama server');
    }

    try {
      const response = await fetch(`${server.url}/api/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete model');
      }

      // Log action
      await this.prisma.systemLog.create({
        data: {
          level: 'WARN',
          category: 'model_management',
          message: `Deleted model ${modelName} from server ${server.name}`,
          context: { serverId, modelName },
        },
      });

      return { success: true, message: `Deleted ${modelName}` };
    } catch (error: any) {
      this.logger.error(`Failed to delete model: ${error}`);
      throw error;
    }
  }

  async getOllamaModelInfo(serverId: string, modelName: string) {
    const server = await this.prisma.modelServer.findUnique({
      where: { id: serverId },
    });

    if (!server || server.type !== ServerType.OLLAMA) {
      throw new Error('Invalid Ollama server');
    }

    try {
      const response = await fetch(`${server.url}/api/show`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName }),
      });

      if (!response.ok) {
        throw new Error('Failed to get model info');
      }

      return response.json();
    } catch (error: any) {
      this.logger.error(`Failed to get model info: ${error}`);
      throw error;
    }
  }

  // ==================== Statistics ====================

  async getServerStatistics(serverId: string) {
    const server = await this.prisma.modelServer.findUnique({
      where: { id: serverId },
    });

    if (!server) {
      throw new Error('Server not found');
    }

    // Get execution stats
    const executions = await this.prisma.promptExecution.findMany({
      where: {
        provider: server.type.toLowerCase(),
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      },
    });

    const totalExecutions = executions.length;
    const successfulExecutions = executions.filter(e => e.success).length;
    const avgExecutionTime = executions.length > 0
      ? executions.reduce((sum, e) => sum + e.executionTimeMs, 0) / executions.length
      : 0;
    const avgConfidence = executions.length > 0
      ? executions.reduce((sum, e) => sum + (e.confidenceScore || 0), 0) / executions.length
      : 0;

    return {
      server,
      statistics: {
        totalExecutions,
        successfulExecutions,
        successRate: totalExecutions > 0 ? successfulExecutions / totalExecutions : 0,
        avgExecutionTime: Math.round(avgExecutionTime),
        avgConfidence,
        lastHealthCheck: server.lastHealthCheck,
        status: server.status,
      },
    };
  }

  async getGlobalStatistics() {
    const servers = await this.prisma.modelServer.findMany();

    const online = servers.filter(s => s.status === ServerStatus.ONLINE).length;
    const offline = servers.filter(s => s.status === ServerStatus.OFFLINE).length;
    const degraded = servers.filter(s => s.status === ServerStatus.DEGRADED).length;

    const executions = await this.prisma.promptExecution.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    });

    return {
      totalServers: servers.length,
      activeServers: servers.filter(s => s.isActive).length,
      statusSummary: { online, offline, degraded },
      executionsLast24h: executions,
      serversByType: {
        ollama: servers.filter(s => s.type === ServerType.OLLAMA).length,
        vllm: servers.filter(s => s.type === ServerType.VLLM).length,
      },
    };
  }

  // ==================== Duplicate & Clone ====================

  async duplicate(id: string) {
    const server = await this.prisma.modelServer.findUnique({
      where: { id },
    });

    if (!server) {
      throw new Error('Server not found');
    }

    const { id: _, createdAt, updatedAt, ...data } = server as any;

    return this.prisma.modelServer.create({
      data: {
        ...data,
        name: `${data.name} (Copy)`,
        isActive: false,
      },
    });
  }

  // ==================== OpenAI Compatible API Test ====================

  async testChatCompletion(serverId: string, prompt?: string): Promise<{
    success: boolean;
    message: string;
    response?: string;
    latency?: number;
    model?: string;
  }> {
    const server = await this.prisma.modelServer.findUnique({
      where: { id: serverId },
    });

    if (!server) {
      throw new Error('Server not found');
    }

    const testPrompt = prompt || 'Hello, respond with a single word: working';
    const startTime = Date.now();

    try {
      // Get default model from server settings or use a default
      const settings = (server.settings as any) || {};
      let model = settings.defaultModel || settings.model;

      // If no model specified, try to get the first available model
      if (!model) {
        try {
          const modelsResponse = await fetch(`${server.url}/v1/models`, {
            signal: AbortSignal.timeout(5000),
          });
          if (modelsResponse.ok) {
            const modelsData = await modelsResponse.json();
            model = modelsData.data?.[0]?.id || 'default';
          }
        } catch {
          model = 'default';
        }
      }

      const response = await fetch(`${server.url}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: testPrompt }],
          max_tokens: 50,
          temperature: 0.1,
        }),
        signal: AbortSignal.timeout(30000),
      });

      const latency = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          message: `API error: ${response.status} - ${errorText.substring(0, 200)}`,
          latency,
        };
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';

      await this.prisma.systemLog.create({
        data: {
          level: 'INFO',
          category: 'api_test',
          message: `OpenAI API test on ${server.name}: ${content.substring(0, 50)}`,
          context: { serverId, model, latency },
        },
      });

      return {
        success: true,
        message: 'API test successful',
        response: content,
        latency,
        model,
      };
    } catch (error: any) {
      const latency = Date.now() - startTime;
      this.logger.error(`Chat completion test failed: ${error.message}`);
      return {
        success: false,
        message: error.message || 'Connection failed',
        latency,
      };
    }
  }

  // ==================== vLLM Model Management ====================

  async scanVLLMModels(serverId: string) {
    const server = await this.prisma.modelServer.findUnique({
      where: { id: serverId },
    });

    if (!server || server.type !== ServerType.VLLM) {
      throw new Error('Invalid vLLM server');
    }

    try {
      const response = await fetch(`${server.url}/v1/models`, {
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch models');
      }

      const data = await response.json();
      const models = (data.data || []).map((m: any) => ({
        name: m.id,
        id: m.id,
        owned_by: m.owned_by || 'vllm',
        created: m.created,
      }));

      return models;
    } catch (error) {
      this.logger.error(`Failed to scan vLLM models: ${error}`);
      throw error;
    }
  }

  async scanModels(serverId: string) {
    const server = await this.prisma.modelServer.findUnique({
      where: { id: serverId },
    });

    if (!server) {
      throw new Error('Server not found');
    }

    if (server.type === ServerType.OLLAMA) {
      return this.scanOllamaModels(serverId);
    } else if (server.type === ServerType.VLLM) {
      return this.scanVLLMModels(serverId);
    } else {
      throw new Error(`Unsupported server type: ${server.type}`);
    }
  }
}

