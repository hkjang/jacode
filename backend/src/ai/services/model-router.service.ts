import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CircuitBreakerService, CircuitState } from './circuit-breaker.service';

export type PromptType = 'code' | 'refactor' | 'explain' | 'review' | 'fix' | 'test';

export interface ModelSelection {
  serverId: string;
  serverName: string;
  modelName: string;
  provider: string;
  reason: string;
  estimatedCost?: number;
}

export interface RoutingRequest {
  promptType: PromptType;
  promptContent: string;
  complexity?: 'low' | 'medium' | 'high';
  maxCost?: number;
  preferredProvider?: string;
}

@Injectable()
export class ModelRouterService {
  private readonly logger = new Logger(ModelRouterService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly circuitBreaker: CircuitBreakerService,
  ) {}

  /**
   * Select optimal model based on routing rules
   */
  async selectModel(request: RoutingRequest): Promise<ModelSelection> {
    const startTime = Date.now();

    // 1. Classify prompt if not provided
    const promptType = request.promptType || this.classifyPrompt(request.promptContent);
    const complexity = request.complexity || this.estimateComplexity(request.promptContent);

    this.logger.debug(`Routing: type=${promptType}, complexity=${complexity}`);

    // 2. Load active routing policy
    const policy = await this.loadRoutingPolicy();

    // 3. Get available healthy servers
    const servers = await this.getHealthyServers();

    if (servers.length === 0) {
      throw new Error('No healthy model servers available');
    }

    // 4. Apply routing rules
    const candidates = this.applyRoutingRules(servers, policy, {
      promptType,
      complexity,
      maxCost: request.maxCost,
      preferredProvider: request.preferredProvider,
    });

    if (candidates.length === 0) {
      throw new Error('No suitable model servers found for this request');
    }

    // 5. Select best candidate
    const selected = this.selectBestCandidate(candidates, policy);

    const selectionTime = Date.now() - startTime;
    this.logger.log(
      `Selected: ${selected.serverName} (${selected.provider}) in ${selectionTime}ms - ${selected.reason}`
    );

    return selected;
  }

  /**
   * Classify prompt type using heuristics
   */
  private classifyPrompt(prompt: string): PromptType {
    const lowerPrompt = prompt.toLowerCase();

    // Code generation keywords
    if (
      lowerPrompt.includes('function') ||
      lowerPrompt.includes('class') ||
      lowerPrompt.includes('implement') ||
      lowerPrompt.includes('create a')
    ) {
      return 'code';
    }

    // Refactoring keywords
    if (
      lowerPrompt.includes('refactor') ||
      lowerPrompt.includes('improve') ||
      lowerPrompt.includes('optimize') ||
      lowerPrompt.includes('clean up')
    ) {
      return 'refactor';
    }

    // Explanation keywords
    if (
      lowerPrompt.includes('explain') ||
      lowerPrompt.includes('what does') ||
      lowerPrompt.includes('how does') ||
      lowerPrompt.includes('why')
    ) {
      return 'explain';
    }

    // Review keywords
    if (
      lowerPrompt.includes('review') ||
      lowerPrompt.includes('check') ||
      lowerPrompt.includes('analyze')
    ) {
      return 'review';
    }

    // Bug fix keywords
    if (
      lowerPrompt.includes('fix') ||
      lowerPrompt.includes('bug') ||
      lowerPrompt.includes('error') ||
      lowerPrompt.includes('issue')
    ) {
      return 'fix';
    }

    // Test keywords
    if (
      lowerPrompt.includes('test') ||
      lowerPrompt.includes('unit test') ||
      lowerPrompt.includes('coverage')
    ) {
      return 'test';
    }

    // Default to code generation
    return 'code';
  }

  /**
   * Estimate complexity based on prompt length and keywords
   */
  private estimateComplexity(prompt: string): 'low' | 'medium' | 'high' {
    const length = prompt.length;
    const lowerPrompt = prompt.toLowerCase();

    // High complexity indicators
    const highComplexityKeywords = [
      'database',
      'authentication',
      'API',
      'microservice',
      'distributed',
      'concurrent',
      'async',
      'security',
    ];

    const hasHighComplexity = highComplexityKeywords.some(keyword =>
      lowerPrompt.includes(keyword)
    );

    if (hasHighComplexity || length > 500) {
      return 'high';
    }

    if (length > 200) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Load active routing policy
   */
  private async loadRoutingPolicy(): Promise<any> {
    const policy = await this.prisma.modelRoutingPolicy.findFirst({
      where: { isActive: true },
      orderBy: { priority: 'desc' },
    });

    // Default policy if none exists
    return (
      policy?.rules || {
        costWeight: 0.3,
        performanceWeight: 0.4,
        availabilityWeight: 0.3,
        modelPreferences: {
          code: ['codellama', 'deepseek-coder'],
          explain: ['llama2', 'mistral'],
          refactor: ['codellama'],
          review: ['llama2'],
          fix: ['codellama'],
          test: ['codellama'],
        },
      }
    );
  }

  /**
   * Get healthy servers (not in circuit breaker open state)
   */
  private async getHealthyServers() {
    const allServers = await this.prisma.modelServer.findMany({
      where: {
        isActive: true,
        status: {
          in: ['ONLINE', 'DEGRADED'],
        },
      },
    });

    // Filter out servers with open circuit breakers
    return allServers.filter(server => {
      const circuitState = this.circuitBreaker.getState(server.id);
      return circuitState !== CircuitState.OPEN;
    });
  }

  /**
   * Apply routing rules to filter and score candidates
   */
  private applyRoutingRules(
    servers: any[],
    policy: any,
    criteria: {
      promptType: PromptType;
      complexity: 'low' | 'medium' | 'high';
      maxCost?: number;
      preferredProvider?: string;
    }
  ): ModelSelection[] {
    const candidates: ModelSelection[] = [];

    for (const server of servers) {
      // Check preferred provider
      if (criteria.preferredProvider && server.type !== criteria.preferredProvider) {
        continue;
      }

      // Check model preferences for prompt type
      const preferredModels = policy.modelPreferences?.[criteria.promptType] || [];
      const modelName = this.extractModelName(server);
      
      const isPreferred = preferredModels.length === 0 || 
        preferredModels.some((pm: string) => modelName.includes(pm));

      if (!isPreferred) {
        this.logger.debug(`Skipping ${server.name}: model ${modelName} not preferred for ${criteria.promptType}`);
        continue;
      }

      // Estimate cost
      const estimatedCost = this.estimateCost(server, criteria.complexity);

      // Check cost constraint
      if (criteria.maxCost && estimatedCost > criteria.maxCost) {
        continue;
      }

      candidates.push({
        serverId: server.id,
        serverName: server.name,
        modelName,
        provider: server.type,
        reason: `Suitable for ${criteria.promptType} (complexity: ${criteria.complexity})`,
        estimatedCost,
      });
    }

    return candidates;
  }

  /**
   * Select best candidate using weighted scoring
   */
  private selectBestCandidate(
    candidates: ModelSelection[],
    policy: any
  ): ModelSelection {
    if (candidates.length === 1) {
      return candidates[0];
    }

    // Score each candidate
    const scored = candidates.map(candidate => {
      const circuitMetrics = this.circuitBreaker.getMetrics(candidate.serverId);
      const failureRate = this.circuitBreaker.getFailureRate(candidate.serverId);

      // Availability score (0-1, higher is better)
      const availabilityScore = 1 - failureRate;

      // Cost score (0-1, lower cost is better)
      const maxCost = Math.max(...candidates.map(c => c.estimatedCost || 0));
      const costScore = maxCost > 0 ? 1 - (candidate.estimatedCost || 0) / maxCost : 1;

      // Performance score (based on circuit state)
      let performanceScore = 0.5;
      if (circuitMetrics.state === CircuitState.CLOSED) performanceScore = 1.0;
      else if (circuitMetrics.state === CircuitState.HALF_OPEN) performanceScore = 0.7;

      // Weighted total score
      const totalScore =
        costScore * (policy.costWeight || 0.3) +
        performanceScore * (policy.performanceWeight || 0.4) +
        availabilityScore * (policy.availabilityWeight || 0.3);

      return {
        candidate,
        score: totalScore,
        breakdown: { availabilityScore, costScore, performanceScore },
      };
    });

    //  Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    const winner = scored[0];
    winner.candidate.reason += ` (score: ${winner.score.toFixed(2)})`;

    return winner.candidate;
  }

  /**
   * Extract model name from server settings
   */
  private extractModelName(server: any): string {
    // Try to get from settings
    if (server.settings && server.settings.model) {
      return server.settings.model;
    }

    // Fallback to server name
    return server.name.toLowerCase();
  }

  /**
   * Estimate cost based on complexity
   */
  private estimateCost(server: any, complexity: 'low' | 'medium' | 'high'): number {
    const baseTokens = {
      low: 500,
      medium: 1500,
      high: 4000,
    };

    const tokens = baseTokens[complexity];
    const costPerToken = 0.00001; // $0.01 per 1000 tokens (example rate)

    return tokens * costPerToken;
  }

  /**
   * Override routing with admin policy
   */
  async overrideWithPolicy(policyId: string, request: RoutingRequest): Promise<ModelSelection> {
    const policy = await this.prisma.modelRoutingPolicy.findUnique({
      where: { id: policyId },
    });

    if (!policy) {
      throw new Error('Policy not found');
    }

    this.logger.log(`Using override policy: ${policy.name}`);

    // Use the policy rules for routing
    const servers = await this.getHealthyServers();
    const candidates = this.applyRoutingRules(servers, policy.rules, {
      promptType: request.promptType,
      complexity: request.complexity || 'medium',
      maxCost: request.maxCost,
      preferredProvider: request.preferredProvider,
    });

    if (candidates.length === 0) {
      throw new Error('No suitable servers found with override policy');
    }

    return this.selectBestCandidate(candidates, policy.rules);
  }
}
