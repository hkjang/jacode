import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ChangePlan, ChangeStep, LLMGatewayService } from './llm-gateway.service';

/**
 * Resolved change plan with concrete AST locations
 */
export interface ResolvedPlan {
  id: string;
  originalPlan: ChangePlan;
  resolvedSteps: ResolvedStep[];
  status: 'pending' | 'validated' | 'invalid';
  validationErrors?: string[];
}

export interface ResolvedStep {
  order: number;
  description: string;
  type: 'insert' | 'replace' | 'delete';
  filePath: string;
  location: {
    startLine: number;
    endLine: number;
    startIndex: number;
    endIndex: number;
  };
  originalContent?: string;
  newContent: string;
}

/**
 * Target resolution result
 */
export interface TargetResolution {
  found: boolean;
  filePath?: string;
  location?: {
    startLine: number;
    endLine: number;
    startIndex: number;
    endIndex: number;
  };
  symbolName?: string;
  error?: string;
}

/**
 * Change Planner Service
 * 
 * Resolves abstract change plans into concrete AST-based operations.
 */
@Injectable()
export class ChangePlannerService {
  private readonly logger = new Logger(ChangePlannerService.name);
  private planCounter = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly llmGateway: LLMGatewayService,
  ) {}

  /**
   * Resolve an abstract change plan into concrete steps
   */
  async resolvePlan(
    plan: ChangePlan,
    projectFiles: Map<string, string>,
  ): Promise<ResolvedPlan> {
    const id = `plan_${++this.planCounter}_${Date.now()}`;
    this.logger.debug(`Resolving plan ${id}: ${plan.action} on ${plan.targetSymbol}`);

    const resolvedSteps: ResolvedStep[] = [];
    const errors: string[] = [];

    for (const step of plan.steps) {
      try {
        const resolved = await this.resolveStep(step, projectFiles);
        resolvedSteps.push(resolved);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`Step ${step.order}: ${message}`);
        this.logger.warn(`Failed to resolve step ${step.order}: ${message}`);
      }
    }

    return {
      id,
      originalPlan: plan,
      resolvedSteps,
      status: errors.length === 0 ? 'validated' : 'invalid',
      validationErrors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Resolve a single step
   */
  private async resolveStep(
    step: ChangeStep,
    projectFiles: Map<string, string>,
  ): Promise<ResolvedStep> {
    if (!step.location?.file) {
      throw new Error('Step missing file location');
    }

    const filePath = step.location.file;
    const content = projectFiles.get(filePath);

    // Resolve location
    let location: ResolvedStep['location'];
    
    if (step.location.line) {
      // Direct line reference
      location = this.resolveLineLocation(step.location.line, content || '');
    } else if (step.location.afterSymbol && content) {
      location = this.resolveAfterSymbol(step.location.afterSymbol, content);
    } else if (step.location.beforeSymbol && content) {
      location = this.resolveBeforeSymbol(step.location.beforeSymbol, content);
    } else if (step.location.withinSymbol && content) {
      location = this.resolveWithinSymbol(step.location.withinSymbol, content);
    } else {
      // Default: end of file
      const lines = (content || '').split('\n');
      const lastLine = lines.length;
      const endIndex = (content || '').length;
      location = {
        startLine: lastLine,
        endLine: lastLine,
        startIndex: endIndex,
        endIndex: endIndex,
      };
    }

    // Get original content for the location
    let originalContent: string | undefined;
    if (step.type === 'replace' || step.type === 'delete') {
      originalContent = content?.slice(location.startIndex, location.endIndex);
    }

    return {
      order: step.order,
      description: step.description,
      type: step.type === 'move' ? 'replace' : step.type,
      filePath,
      location,
      originalContent,
      newContent: step.content || '',
    };
  }

  /**
   * Resolve location by line number
   */
  private resolveLineLocation(line: number, content: string): ResolvedStep['location'] {
    const lines = content.split('\n');
    const targetLine = Math.min(Math.max(1, line), lines.length);
    
    let startIndex = 0;
    for (let i = 0; i < targetLine - 1; i++) {
      startIndex += lines[i].length + 1; // +1 for newline
    }
    
    const lineContent = lines[targetLine - 1] || '';
    const endIndex = startIndex + lineContent.length;

    return {
      startLine: targetLine,
      endLine: targetLine,
      startIndex,
      endIndex,
    };
  }

  /**
   * Find position after a symbol
   */
  private resolveAfterSymbol(symbolName: string, content: string): ResolvedStep['location'] {
    const pattern = new RegExp(
      `(function|class|interface|const|let|var)\\s+${this.escapeRegex(symbolName)}[^}]*}`,
      'gm'
    );
    
    const match = pattern.exec(content);
    if (!match) {
      throw new Error(`Symbol not found: ${symbolName}`);
    }

    const endIndex = match.index + match[0].length;
    const linesBefore = content.slice(0, endIndex).split('\n');
    const endLine = linesBefore.length;

    return {
      startLine: endLine + 1,
      endLine: endLine + 1,
      startIndex: endIndex,
      endIndex: endIndex,
    };
  }

  /**
   * Find position before a symbol
   */
  private resolveBeforeSymbol(symbolName: string, content: string): ResolvedStep['location'] {
    const pattern = new RegExp(
      `(function|class|interface|const|let|var)\\s+${this.escapeRegex(symbolName)}`,
      'gm'
    );
    
    const match = pattern.exec(content);
    if (!match) {
      throw new Error(`Symbol not found: ${symbolName}`);
    }

    const startIndex = match.index;
    const linesBefore = content.slice(0, startIndex).split('\n');
    const startLine = linesBefore.length;

    return {
      startLine,
      endLine: startLine,
      startIndex,
      endIndex: startIndex,
    };
  }

  /**
   * Find location within a symbol (for modification)
   */
  private resolveWithinSymbol(symbolName: string, content: string): ResolvedStep['location'] {
    const pattern = new RegExp(
      `(function|class|interface|const|let|var)\\s+${this.escapeRegex(symbolName)}[^}]*}`,
      'gms'
    );
    
    const match = pattern.exec(content);
    if (!match) {
      throw new Error(`Symbol not found: ${symbolName}`);
    }

    const startIndex = match.index;
    const endIndex = startIndex + match[0].length;
    
    const linesBefore = content.slice(0, startIndex).split('\n');
    const startLine = linesBefore.length;
    
    const linesWithin = match[0].split('\n').length;
    const endLine = startLine + linesWithin - 1;

    return {
      startLine,
      endLine,
      startIndex,
      endIndex,
    };
  }

  /**
   * Validate a resolved plan
   */
  validatePlan(plan: ResolvedPlan): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    // Check for overlapping changes
    const sortedSteps = [...plan.resolvedSteps].sort(
      (a, b) => a.location.startIndex - b.location.startIndex
    );

    for (let i = 0; i < sortedSteps.length - 1; i++) {
      const current = sortedSteps[i];
      const next = sortedSteps[i + 1];

      if (current.filePath === next.filePath &&
          current.location.endIndex > next.location.startIndex) {
        errors.push(
          `Overlapping changes: step ${current.order} and step ${next.order}`
        );
      }
    }

    // Check for invalid locations
    for (const step of plan.resolvedSteps) {
      if (step.location.startLine < 1) {
        errors.push(`Step ${step.order}: Invalid start line`);
      }
      if (step.location.startIndex < 0) {
        errors.push(`Step ${step.order}: Invalid start index`);
      }
      if (step.type !== 'delete' && !step.newContent) {
        errors.push(`Step ${step.order}: Missing new content for ${step.type}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Calculate the score for a candidate file/symbol match
   */
  scoreCandidate(
    plan: ChangePlan,
    candidate: { filePath: string; symbolName: string; exported: boolean }
  ): number {
    let score = 0;

    // Exact name match
    if (candidate.symbolName === plan.targetSymbol) {
      score += 100;
    }

    // Partial name match
    if (candidate.symbolName.toLowerCase().includes(plan.targetSymbol.toLowerCase())) {
      score += 50;
    }

    // File path hint in target file
    if (plan.targetFile && candidate.filePath.includes(plan.targetFile)) {
      score += 30;
    }

    // Prefer exported symbols
    if (candidate.exported) {
      score += 10;
    }

    return score;
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
