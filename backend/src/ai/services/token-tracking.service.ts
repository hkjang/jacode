import { Injectable, Logger } from '@nestjs/common';

/**
 * Token usage for a single request
 */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
  model: string;
  timestamp: Date;
}

/**
 * Aggregated usage stats
 */
export interface UsageStats {
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalTokens: number;
  totalCost: number;
  requestCount: number;
  averageTokensPerRequest: number;
  byModel: Record<string, {
    tokenCount: number;
    requestCount: number;
    cost: number;
  }>;
}

/**
 * Token Tracking Service
 * 
 * Tracks token usage and estimated costs for LLM calls.
 */
@Injectable()
export class TokenTrackingService {
  private readonly logger = new Logger(TokenTrackingService.name);
  
  // In-memory usage history (in production, use database)
  private usageHistory: TokenUsage[] = [];
  
  // Cost per 1K tokens by model (configurable)
  private costPerKToken: Record<string, { prompt: number; completion: number }> = {
    'gpt-4': { prompt: 0.03, completion: 0.06 },
    'gpt-4-turbo': { prompt: 0.01, completion: 0.03 },
    'gpt-3.5-turbo': { prompt: 0.0005, completion: 0.0015 },
    'claude-3-opus': { prompt: 0.015, completion: 0.075 },
    'claude-3-sonnet': { prompt: 0.003, completion: 0.015 },
    'claude-3-haiku': { prompt: 0.00025, completion: 0.00125 },
    'llama-3': { prompt: 0, completion: 0 }, // Local
    'codestral': { prompt: 0, completion: 0 }, // Local vLLM
  };

  /**
   * Set custom cost per 1K tokens for a model
   */
  setModelCost(model: string, promptCost: number, completionCost: number): void {
    this.costPerKToken[model] = { prompt: promptCost, completion: completionCost };
  }

  /**
   * Track token usage for a request
   */
  trackUsage(
    model: string,
    promptTokens: number,
    completionTokens: number
  ): TokenUsage {
    const totalTokens = promptTokens + completionTokens;
    const estimatedCost = this.calculateCost(model, promptTokens, completionTokens);

    const usage: TokenUsage = {
      promptTokens,
      completionTokens,
      totalTokens,
      estimatedCost,
      model,
      timestamp: new Date(),
    };

    this.usageHistory.push(usage);
    
    // Keep only last 1000 entries in memory
    if (this.usageHistory.length > 1000) {
      this.usageHistory = this.usageHistory.slice(-1000);
    }

    this.logger.debug(
      `Token usage: ${totalTokens} tokens (${promptTokens} prompt, ${completionTokens} completion) ` +
      `Cost: $${estimatedCost.toFixed(4)} Model: ${model}`
    );

    return usage;
  }

  /**
   * Calculate cost for tokens
   */
  calculateCost(model: string, promptTokens: number, completionTokens: number): number {
    const costs = this.costPerKToken[model] || { prompt: 0, completion: 0 };
    
    const promptCost = (promptTokens / 1000) * costs.prompt;
    const completionCost = (completionTokens / 1000) * costs.completion;
    
    return promptCost + completionCost;
  }

  /**
   * Get usage statistics for a time period
   */
  getStats(since?: Date): UsageStats {
    let history = this.usageHistory;
    
    if (since) {
      history = history.filter(u => u.timestamp >= since);
    }

    const stats: UsageStats = {
      totalPromptTokens: 0,
      totalCompletionTokens: 0,
      totalTokens: 0,
      totalCost: 0,
      requestCount: history.length,
      averageTokensPerRequest: 0,
      byModel: {},
    };

    for (const usage of history) {
      stats.totalPromptTokens += usage.promptTokens;
      stats.totalCompletionTokens += usage.completionTokens;
      stats.totalTokens += usage.totalTokens;
      stats.totalCost += usage.estimatedCost;

      if (!stats.byModel[usage.model]) {
        stats.byModel[usage.model] = { tokenCount: 0, requestCount: 0, cost: 0 };
      }
      stats.byModel[usage.model].tokenCount += usage.totalTokens;
      stats.byModel[usage.model].requestCount += 1;
      stats.byModel[usage.model].cost += usage.estimatedCost;
    }

    stats.averageTokensPerRequest = stats.requestCount > 0 
      ? stats.totalTokens / stats.requestCount 
      : 0;

    return stats;
  }

  /**
   * Get recent usage history
   */
  getRecentUsage(limit: number = 50): TokenUsage[] {
    return this.usageHistory.slice(-limit);
  }

  /**
   * Estimate tokens for a string (rough approximation)
   */
  estimateTokens(text: string): number {
    // Rough approximation: ~4 characters per token for English
    return Math.ceil(text.length / 4);
  }

  /**
   * Check if usage is within budget
   */
  isWithinBudget(budget: { maxTokens?: number; maxCost?: number }, period?: Date): boolean {
    const stats = this.getStats(period);
    
    if (budget.maxTokens && stats.totalTokens > budget.maxTokens) {
      this.logger.warn(`Token budget exceeded: ${stats.totalTokens} > ${budget.maxTokens}`);
      return false;
    }
    
    if (budget.maxCost && stats.totalCost > budget.maxCost) {
      this.logger.warn(`Cost budget exceeded: $${stats.totalCost.toFixed(2)} > $${budget.maxCost}`);
      return false;
    }
    
    return true;
  }

  /**
   * Clear usage history
   */
  clearHistory(): void {
    this.usageHistory = [];
    this.logger.log('Usage history cleared');
  }

  /**
   * Get summary for logging
   */
  getSummary(): string {
    const stats = this.getStats();
    return [
      `Total Requests: ${stats.requestCount}`,
      `Total Tokens: ${stats.totalTokens.toLocaleString()}`,
      `Total Cost: $${stats.totalCost.toFixed(4)}`,
      `Avg Tokens/Request: ${Math.round(stats.averageTokensPerRequest)}`,
    ].join(' | ');
  }
}
