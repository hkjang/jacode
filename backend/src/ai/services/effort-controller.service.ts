import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Complexity levels for task analysis
 */
export type Complexity = 'low' | 'medium' | 'high' | 'very_high';

/**
 * Effort modes for vLLM
 */
export type EffortMode = 'fast' | 'balanced' | 'thinking';

/**
 * Effort configuration for different modes
 */
export interface EffortConfig {
  mode: EffortMode;
  effort: number;
  maxTokens: number;
  temperature: number;
  description: string;
}

/**
 * Complexity analysis result
 */
export interface ComplexityAnalysis {
  complexity: Complexity;
  score: number;
  factors: {
    promptLength: number;
    fileCount: number;
    hasMultipleSteps: boolean;
    requiresReasoning: boolean;
    isCodeGeneration: boolean;
  };
  recommendedMode: EffortMode;
}

/**
 * Effort Controller Service
 * 
 * Dynamically adjusts vLLM effort parameter based on task complexity.
 * - Fast Mode: Low effort (0.1-0.3), quick responses, lower cost
 * - Balanced Mode: Medium effort (0.4-0.6), general tasks
 * - Thinking Mode: High effort (0.7-1.0), deep reasoning, complex tasks
 */
@Injectable()
export class EffortControllerService {
  private readonly logger = new Logger(EffortControllerService.name);

  // Effort configurations for each mode
  private readonly modeConfigs: Record<EffortMode, EffortConfig> = {
    fast: {
      mode: 'fast',
      effort: 0.2,
      maxTokens: 1024,
      temperature: 0.3,
      description: 'Quick responses for simple queries',
    },
    balanced: {
      mode: 'balanced',
      effort: 0.5,
      maxTokens: 2048,
      temperature: 0.5,
      description: 'Balanced reasoning for general tasks',
    },
    thinking: {
      mode: 'thinking',
      effort: 0.9,
      maxTokens: 8192,
      temperature: 0.7,
      description: 'Deep reasoning for complex tasks',
    },
  };

  // Keywords indicating complex reasoning requirements
  private readonly complexityKeywords = {
    high: [
      'analyze', 'design', 'architect', 'refactor', 'optimize',
      'implement', 'create', 'build', 'complex', 'multi-step',
      'algorithm', 'performance', 'security', 'debug', 'fix bug',
    ],
    medium: [
      'modify', 'update', 'change', 'add', 'remove', 'explain',
      'describe', 'compare', 'review', 'improve',
    ],
    low: [
      'format', 'rename', 'simple', 'quick', 'what is', 'list',
      'show', 'get', 'find', 'search',
    ],
  };

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Analyze task complexity and determine optimal effort mode
   */
  analyzeComplexity(
    prompt: string,
    options?: {
      fileCount?: number;
      codeLength?: number;
      taskType?: string;
    }
  ): ComplexityAnalysis {
    const promptLower = prompt.toLowerCase();
    let score = 0;

    // Factor 1: Prompt length (longer prompts often mean more complex tasks)
    const promptLength = prompt.length;
    if (promptLength > 2000) score += 30;
    else if (promptLength > 500) score += 15;
    else score += 5;

    // Factor 2: File count (more files = more complexity)
    const fileCount = options?.fileCount || 0;
    if (fileCount > 10) score += 25;
    else if (fileCount > 3) score += 15;
    else if (fileCount > 0) score += 5;

    // Factor 3: Code length (more code to process)
    const codeLength = options?.codeLength || 0;
    if (codeLength > 5000) score += 20;
    else if (codeLength > 1000) score += 10;

    // Factor 4: Complexity keywords
    let hasHighKeyword = false;
    let hasMediumKeyword = false;
    
    for (const keyword of this.complexityKeywords.high) {
      if (promptLower.includes(keyword)) {
        score += 15;
        hasHighKeyword = true;
        break;
      }
    }
    
    if (!hasHighKeyword) {
      for (const keyword of this.complexityKeywords.medium) {
        if (promptLower.includes(keyword)) {
          score += 8;
          hasMediumKeyword = true;
          break;
        }
      }
    }

    // Factor 5: Multi-step indicators
    const hasMultipleSteps = 
      promptLower.includes('and then') ||
      promptLower.includes('after that') ||
      promptLower.includes('step by step') ||
      promptLower.includes('first,') ||
      /\d+\.\s/.test(prompt); // numbered lists
    
    if (hasMultipleSteps) score += 15;

    // Factor 6: Reasoning requirements
    const requiresReasoning = 
      promptLower.includes('why') ||
      promptLower.includes('how') ||
      promptLower.includes('explain') ||
      promptLower.includes('reason') ||
      promptLower.includes('think');
    
    if (requiresReasoning) score += 10;

    // Factor 7: Code generation
    const isCodeGeneration = 
      promptLower.includes('generate') ||
      promptLower.includes('create') ||
      promptLower.includes('implement') ||
      promptLower.includes('write code') ||
      options?.taskType === 'code';
    
    if (isCodeGeneration) score += 10;

    // Determine complexity level
    let complexity: Complexity;
    let recommendedMode: EffortMode;

    if (score >= 70) {
      complexity = 'very_high';
      recommendedMode = 'thinking';
    } else if (score >= 45) {
      complexity = 'high';
      recommendedMode = 'thinking';
    } else if (score >= 25) {
      complexity = 'medium';
      recommendedMode = 'balanced';
    } else {
      complexity = 'low';
      recommendedMode = 'fast';
    }

    const analysis: ComplexityAnalysis = {
      complexity,
      score,
      factors: {
        promptLength,
        fileCount,
        hasMultipleSteps,
        requiresReasoning,
        isCodeGeneration,
      },
      recommendedMode,
    };

    this.logger.debug(
      `Complexity analysis: ${complexity} (score: ${score}), mode: ${recommendedMode}`
    );

    return analysis;
  }

  /**
   * Get effort configuration for a mode
   */
  getEffortConfig(mode: EffortMode): EffortConfig {
    return this.modeConfigs[mode];
  }

  /**
   * Get effort parameter for vLLM
   */
  getEffortParameter(mode: EffortMode): number {
    return this.modeConfigs[mode].effort;
  }

  /**
   * Get recommended chat options based on complexity analysis
   */
  getRecommendedOptions(analysis: ComplexityAnalysis): {
    effort: number;
    maxTokens: number;
    temperature: number;
  } {
    const config = this.modeConfigs[analysis.recommendedMode];
    return {
      effort: config.effort,
      maxTokens: config.maxTokens,
      temperature: config.temperature,
    };
  }

  /**
   * Auto-select mode based on prompt and context
   */
  autoSelectMode(
    prompt: string,
    options?: {
      fileCount?: number;
      codeLength?: number;
      taskType?: string;
      forceMode?: EffortMode;
    }
  ): { mode: EffortMode; config: EffortConfig; analysis: ComplexityAnalysis } {
    // Allow force override
    if (options?.forceMode) {
      return {
        mode: options.forceMode,
        config: this.modeConfigs[options.forceMode],
        analysis: this.analyzeComplexity(prompt, options),
      };
    }

    const analysis = this.analyzeComplexity(prompt, options);
    const mode = analysis.recommendedMode;

    return {
      mode,
      config: this.modeConfigs[mode],
      analysis,
    };
  }

  /**
   * Log effort usage for analytics
   */
  async logUsage(
    mode: EffortMode,
    taskType: string,
    success: boolean,
    responseTimeMs: number
  ): Promise<void> {
    try {
      // Could log to analytics table in future
      this.logger.log(
        `Effort usage: mode=${mode}, task=${taskType}, success=${success}, time=${responseTimeMs}ms`
      );
    } catch (error) {
      this.logger.warn('Failed to log effort usage', error);
    }
  }
}
