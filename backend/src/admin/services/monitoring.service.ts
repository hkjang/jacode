import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CircuitBreakerService } from '../../ai/services/circuit-breaker.service';

export interface MonitoringMetrics {
  timestamp: Date;
  modelServers: {
    total: number;
    online: number;
    offline: number;
    degraded: number;
  };
  promptExecutions: {
    total: number;
    successful: number;
    failed: number;
    averageConfidence: number;
    averageExecutionTime: number;
  };
  circuitBreakers: {
    closed: number;
    open: number;
    halfOpen: number;
  };
  recentErrors: any[];
}

export interface UsageMetrics {
  period: 'hour' | 'day' | 'week' | 'month';
  data: {
    timestamp: Date;
    totalExecutions: number;
    totalTokens: number;
    estimatedCost: number;
    averageConfidence: number;
  }[];
}

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly circuitBreaker: CircuitBreakerService,
  ) {}

  /**
   * Get real-time system metrics
   */
  async getSystemMetrics(): Promise<MonitoringMetrics> {
    const now = new Date();

    // Model server status
    const servers = await this.prisma.modelServer.findMany({
      where: { isActive: true },
    });

    const modelServers = {
      total: servers.length,
      online: servers.filter(s => s.status === 'ONLINE').length,
      offline: servers.filter(s => s.status === 'OFFLINE').length,
      degraded: servers.filter(s => s.status === 'DEGRADED').length,
    };

    // Prompt executions (last hour)
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const executions = await this.prisma.promptExecution.findMany({
      where: {
        createdAt: { gte: oneHourAgo },
      },
    });

    const promptExecutions = {
      total: executions.length,
      successful: executions.filter(e => e.success).length,
      failed: executions.filter(e => !e.success).length,
      averageConfidence: executions.length > 0
        ? executions.reduce((sum, e) => sum + (e.confidenceScore || 0), 0) / executions.length
        : 0,
      averageExecutionTime: executions.length > 0
        ? executions.reduce((sum, e) => sum + e.executionTimeMs, 0) / executions.length
        : 0,
    };

    // Circuit breaker states
    const circuitStates = this.circuitBreaker.getAllStates();
    const circuitBreakers = {
      closed: Array.from(circuitStates.values()).filter(s => s.state === 'CLOSED').length,
      open: Array.from(circuitStates.values()).filter(s => s.state === 'OPEN').length,
      halfOpen: Array.from(circuitStates.values()).filter(s => s.state === 'HALF_OPEN').length,
    };

    // Recent errors
    const recentErrors = await this.prisma.systemLog.findMany({
      where: {
        level: 'ERROR',
        createdAt: { gte: oneHourAgo },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return {
      timestamp: now,
      modelServers,
      promptExecutions,
      circuitBreakers,
      recentErrors,
    };
  }

  /**
   * Get usage metrics over time
   */
  async getUsageMetrics(period: UsageMetrics['period']): Promise<UsageMetrics> {
    const now = new Date();
    let startDate: Date;
    let groupBy: 'hour' | 'day';

    switch (period) {
      case 'hour':
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        groupBy = 'hour';
        break;
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        groupBy = 'hour';
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        groupBy = 'day';
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        groupBy = 'day';
        break;
    }

    // Get all executions in period
    const executions = await this.prisma.promptExecution.findMany({
      where: {
        createdAt: { gte: startDate },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by time period
    const grouped = new Map<string, typeof executions>();
    
    executions.forEach(exec => {
      const key = groupBy === 'hour'
        ? exec.createdAt.toISOString().substring(0, 13) // YYYY-MM-DDTHH
        : exec.createdAt.toISOString().substring(0, 10); // YYYY-MM-DD

      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(exec);
    });

    // Calculate metrics for each group
    const data = Array.from(grouped.entries()).map(([key, execs]) => {
      const totalTokens = execs.reduce((sum, e) => {
        const metrics = e.qualityMetrics as any;
        return sum + (metrics?.tokenUsage?.total || 0);
      }, 0);

      return {
        timestamp: new Date(key),
        totalExecutions: execs.length,
        totalTokens,
        estimatedCost: totalTokens * 0.00001, // $0.01 per 1k tokens
        averageConfidence: execs.reduce((sum, e) => sum + (e.confidenceScore || 0), 0) / execs.length,
      };
    });

    return { period, data };
  }

  /**
   * Get model performance report
   */
  async getModelPerformanceReport() {
    const executions = await this.prisma.promptExecution.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      },
    });

    // Group by model
    const byModel = new Map<string, typeof executions>();
    
    executions.forEach(exec => {
      const key = `${exec.provider}:${exec.modelName}`;
      if (!byModel.has(key)) {
        byModel.set(key, []);
      }
      byModel.get(key)!.push(exec);
    });

    // Calculate stats per model
    const report = Array.from(byModel.entries()).map(([model, execs]) => {
      const [provider, modelName] = model.split(':');
      
      return {
        provider,
        modelName,
        totalExecutions: execs.length,
        successRate: execs.filter(e => e.success).length / execs.length,
        averageConfidence: execs.reduce((sum, e) => sum + (e.confidenceScore || 0), 0) / execs.length,
        averageExecutionTime: execs.reduce((sum, e) => sum + e.executionTimeMs, 0) / execs.length,
        errorCount: execs.filter(e => !e.success).length,
      };
    });

    // Sort by total executions
    return report.sort((a, b) => b.totalExecutions - a.totalExecutions);
  }

  /**
   * Get alerts based on thresholds
   */
  async getAlerts() {
    const alerts: {
      level: 'info' | 'warning' | 'critical';
      message: string;
      timestamp: Date;
      details?: any;
    }[] = [];

    // Check offline servers
    const offlineServers = await this.prisma.modelServer.findMany({
      where: {
        isActive: true,
        status: 'OFFLINE',
      },
    });

    if (offlineServers.length > 0) {
      alerts.push({
        level: 'critical',
        message: `${offlineServers.length} model server(s) offline`,
        timestamp: new Date(),
        details: offlineServers.map(s => s.name),
      });
    }

    // Check circuit breakers
    const openCircuits = Array.from(this.circuitBreaker.getAllStates().entries())
      .filter(([_, state]) => state.state === 'OPEN');

    if (openCircuits.length > 0) {
      alerts.push({
        level: 'warning',
        message: `${openCircuits.length} circuit breaker(s) open`,
        timestamp: new Date(),
        details: openCircuits.map(([id]) => id),
      });
    }

    // Check recent error rate
    const recentErrors = await this.prisma.systemLog.count({
      where: {
        level: 'ERROR',
        createdAt: {
          gte: new Date(Date.now() - 60 * 60 * 1000), // Last hour
        },
      },
    });

    if (recentErrors > 10) {
      alerts.push({
        level: 'warning',
        message: `High error rate: ${recentErrors} errors in last hour`,
        timestamp: new Date(),
      });
    }

    return alerts;
  }
}
