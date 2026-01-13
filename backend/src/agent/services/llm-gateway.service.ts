import { Injectable, Logger } from '@nestjs/common';
import { AIService } from '../../ai/ai.service';

/**
 * AST Summary for LLM consumption
 */
export interface ASTSummary {
  files: FileSummary[];
  symbols: SymbolSummary[];
  dependencies: DependencySummary[];
}

export interface FileSummary {
  path: string;
  language: string;
  lineCount: number;
  symbols: string[];
}

export interface SymbolSummary {
  name: string;
  type: string;
  filePath: string;
  signature?: string;
  location: { start: number; end: number };
}

export interface DependencySummary {
  source: string;
  target: string;
  type: 'imports' | 'extends' | 'implements' | 'calls';
}

/**
 * Change plan output from LLM
 */
export interface ChangePlan {
  targetSymbol: string;
  targetFile?: string;
  action: 'create' | 'modify' | 'delete';
  rationale: string;
  steps: ChangeStep[];
  confidence: number;
}

export interface ChangeStep {
  order: number;
  description: string;
  type: 'insert' | 'replace' | 'delete' | 'move';
  location?: {
    file: string;
    afterSymbol?: string;
    beforeSymbol?: string;
    withinSymbol?: string;
    line?: number;
  };
  content?: string;
}

/**
 * LLM Gateway input
 */
export interface LLMGatewayInput {
  goal: string;
  projectRoot?: string;
  astSummary?: ASTSummary;
  context?: {
    existingCode?: string;
    relatedSymbols?: string[];
    constraints?: string[];
  };
}

/**
 * System prompt for change planning
 */
const CHANGE_PLANNING_SYSTEM_PROMPT = `You are an expert code architect assistant. Your role is to analyze code structure and create precise change plans.

IMPORTANT RULES:
1. NEVER generate actual code. Only create structured change plans.
2. Always identify the exact symbol (function, class, method) to modify.
3. Use precise locations (after/before/within specific symbols).
4. Provide clear rationale for each change.
5. Break complex changes into small, atomic steps.
6. Consider dependencies and side effects.

OUTPUT FORMAT:
You must output a valid JSON object with this schema:
{
  "targetSymbol": "string - name of the symbol to modify/create",
  "targetFile": "string - file path if creating new file",
  "action": "create" | "modify" | "delete",
  "rationale": "string - explanation of why this change is needed",
  "confidence": number between 0 and 1,
  "steps": [
    {
      "order": number,
      "description": "string - what this step does",
      "type": "insert" | "replace" | "delete" | "move",
      "location": {
        "file": "string",
        "afterSymbol": "optional - insert after this symbol",
        "beforeSymbol": "optional - insert before this symbol",
        "withinSymbol": "optional - modify within this symbol",
        "line": "optional - specific line number"
      },
      "content": "string - description of content to insert/replace (not actual code)"
    }
  ]
}`;

/**
 * LLM Gateway Service
 * 
 * Bridges the gap between AST analysis and LLM reasoning.
 * LLM is used ONLY for reasoning and planning, never for direct code generation.
 */
@Injectable()
export class LLMGatewayService {
  private readonly logger = new Logger(LLMGatewayService.name);

  constructor(private readonly aiService: AIService) {}

  /**
   * Generate a change plan from a goal and AST context
   */
  async generateChangePlan(input: LLMGatewayInput): Promise<ChangePlan> {
    this.logger.debug(`Generating change plan for goal: ${input.goal}`);

    const userPrompt = this.buildUserPrompt(input);

    try {
      const response = await this.aiService.chat([
        { role: 'system', content: CHANGE_PLANNING_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ]);

      const plan = this.parseChangePlan(response.content || '');
      
      this.logger.debug(`Change plan generated: ${plan.action} on ${plan.targetSymbol}`);
      
      return plan;
    } catch (error) {
      this.logger.error('Failed to generate change plan', error);
      throw error;
    }
  }

  /**
   * Validate a change plan
   */
  async validatePlan(
    plan: ChangePlan,
    astSummary: ASTSummary
  ): Promise<{ valid: boolean; issues?: string[] }> {
    const issues: string[] = [];

    // Validate target symbol exists (for modify/delete)
    if (plan.action !== 'create') {
      const symbolExists = astSummary.symbols.some(
        s => s.name === plan.targetSymbol
      );
      if (!symbolExists) {
        issues.push(`Target symbol not found: ${plan.targetSymbol}`);
      }
    }

    // Validate steps
    for (const step of plan.steps) {
      if (!step.location?.file) {
        issues.push(`Step ${step.order}: Missing file location`);
      }

      if ((step.type === 'insert' || step.type === 'replace') && !step.content) {
        issues.push(`Step ${step.order}: Missing content for ${step.type} operation`);
      }
    }

    // Validate referenced symbols in locations
    for (const step of plan.steps) {
      if (step.location) {
        const referencedSymbols = [
          step.location.afterSymbol,
          step.location.beforeSymbol,
          step.location.withinSymbol,
        ].filter(Boolean);

        for (const symbol of referencedSymbols) {
          const exists = astSummary.symbols.some(s => s.name === symbol);
          if (!exists) {
            issues.push(`Step ${step.order}: Referenced symbol not found: ${symbol}`);
          }
        }
      }
    }

    return {
      valid: issues.length === 0,
      issues: issues.length > 0 ? issues : undefined,
    };
  }

  /**
   * Refine a plan with additional context
   */
  async refinePlan(
    plan: ChangePlan,
    feedback: string,
    astSummary: ASTSummary
  ): Promise<ChangePlan> {
    const refinePrompt = `
The following change plan needs refinement:
${JSON.stringify(plan, null, 2)}

Feedback:
${feedback}

Current code structure:
${this.formatASTSummary(astSummary)}

Please provide an updated change plan addressing the feedback.
`;

    const response = await this.aiService.chat([
      { role: 'system', content: CHANGE_PLANNING_SYSTEM_PROMPT },
      { role: 'user', content: refinePrompt },
    ]);

    return this.parseChangePlan(response.content || '');
  }

  /**
   * Build the user prompt from input
   */
  private buildUserPrompt(input: LLMGatewayInput): string {
    let prompt = `GOAL: ${input.goal}\n\n`;
    
    prompt += `CODE STRUCTURE:\n${this.formatASTSummary(input.astSummary)}\n\n`;

    if (input.context?.existingCode) {
      prompt += `EXISTING CODE CONTEXT:\n\`\`\`\n${input.context.existingCode}\n\`\`\`\n\n`;
    }

    if (input.context?.relatedSymbols?.length) {
      prompt += `RELATED SYMBOLS: ${input.context.relatedSymbols.join(', ')}\n\n`;
    }

    if (input.context?.constraints?.length) {
      prompt += `CONSTRAINTS:\n${input.context.constraints.map(c => `- ${c}`).join('\n')}\n\n`;
    }

    prompt += 'Create a precise change plan to accomplish the goal. Output only valid JSON.';

    return prompt;
  }

  /**
   * Format AST summary for LLM consumption
   */
  private formatASTSummary(summary: ASTSummary): string {
    const lines: string[] = [];

    lines.push('FILES:');
    for (const file of summary.files.slice(0, 20)) { // Limit to prevent token overflow
      lines.push(`  - ${file.path} (${file.language}, ${file.lineCount} lines)`);
      if (file.symbols.length > 0) {
        lines.push(`    Symbols: ${file.symbols.slice(0, 10).join(', ')}${file.symbols.length > 10 ? '...' : ''}`);
      }
    }

    lines.push('\nKEY SYMBOLS:');
    for (const symbol of summary.symbols.slice(0, 30)) {
      const sig = symbol.signature ? `: ${symbol.signature}` : '';
      lines.push(`  - ${symbol.type} ${symbol.name}${sig} (${symbol.filePath}:${symbol.location.start})`);
    }

    if (summary.dependencies.length > 0) {
      lines.push('\nDEPENDENCIES:');
      for (const dep of summary.dependencies.slice(0, 20)) {
        lines.push(`  - ${dep.source} ${dep.type} ${dep.target}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Parse change plan from LLM response
   */
  private parseChangePlan(response: string): ChangePlan {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const plan = JSON.parse(jsonMatch[0]) as ChangePlan;

      // Validate required fields
      if (!plan.targetSymbol || !plan.action || !plan.steps) {
        throw new Error('Missing required fields in change plan');
      }

      // Set defaults
      plan.confidence = plan.confidence ?? 0.5;
      plan.rationale = plan.rationale ?? '';

      // Ensure steps have required fields
      plan.steps = plan.steps.map((step, index) => ({
        order: step.order ?? index + 1,
        description: step.description ?? '',
        type: step.type ?? 'modify',
        location: step.location,
        content: step.content,
      }));

      return plan;
    } catch (error) {
      this.logger.error('Failed to parse change plan', error);
      
      // Return a fallback plan
      return {
        targetSymbol: 'unknown',
        action: 'modify',
        rationale: 'Failed to parse LLM response',
        confidence: 0,
        steps: [],
      };
    }
  }

  /**
   * Self-Healing Code Generation Loop
   * 
   * Generates code and validates syntax. If errors are found,
   * automatically retries with error context injected.
   */
  async generateWithSelfHealing(
    goal: string,
    context: {
      astSummary: ASTSummary;
      existingCode?: string;
      language?: string;
    },
    options: {
      maxRetries?: number;
      validateSyntax?: (code: string) => Promise<{ valid: boolean; errors: string[] }>;
    } = {}
  ): Promise<{
    plan: ChangePlan;
    success: boolean;
    attempts: number;
    errors?: string[];
  }> {
    const maxRetries = options.maxRetries ?? 3;
    let attempts = 0;
    let lastErrors: string[] = [];
    let currentGoal = goal;

    while (attempts < maxRetries) {
      attempts++;
      this.logger.debug(`Self-healing attempt ${attempts}/${maxRetries}`);

      try {
        // Generate change plan
        const plan = await this.generateChangePlan({
          goal: currentGoal,
          astSummary: context.astSummary,
          context: {
            existingCode: context.existingCode,
          },
        });

        // If no syntax validator provided, return the plan
        if (!options.validateSyntax) {
          return {
            plan,
            success: true,
            attempts,
          };
        }

        // Execute plan and validate syntax (if validator provided)
        // For now, we validate the plan itself (in future, could validate generated code)
        const validation = await this.validatePlan(plan, context.astSummary);

        if (validation.valid) {
          this.logger.log(`Self-healing succeeded on attempt ${attempts}`);
          return {
            plan,
            success: true,
            attempts,
          };
        }

        // Inject errors for next attempt
        lastErrors = validation.issues || [];
        currentGoal = `${goal}

[PREVIOUS ATTEMPT FAILED]
The following issues were found in the change plan:
${lastErrors.map((e, i) => `${i + 1}. ${e}`).join('\n')}

Please fix these issues and provide a corrected plan.`;

        this.logger.warn(`Self-healing: retrying due to ${lastErrors.length} issues`);

      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        lastErrors = [message];
        
        currentGoal = `${goal}

[ERROR IN PREVIOUS ATTEMPT]
${message}

Please try a different approach.`;

        this.logger.warn(`Self-healing: retrying due to error: ${message}`);
      }
    }

    // Max retries exceeded
    this.logger.error(`Self-healing failed after ${maxRetries} attempts`);
    return {
      plan: {
        targetSymbol: 'unknown',
        action: 'modify',
        rationale: 'Self-healing failed after max retries',
        confidence: 0,
        steps: [],
      },
      success: false,
      attempts,
      errors: lastErrors,
    };
  }

  /**
   * Generate code with automatic syntax validation and retry
   */
  async generateCodeWithValidation(
    prompt: string,
    language: string,
    validateFn: (code: string) => Promise<{ valid: boolean; errors: string[] }>,
    maxRetries: number = 3
  ): Promise<{ code: string; success: boolean; attempts: number; errors?: string[] }> {
    let attempts = 0;
    let lastErrors: string[] = [];
    let currentPrompt = prompt;

    while (attempts < maxRetries) {
      attempts++;

      try {
        const response = await this.aiService.chat([
          { 
            role: 'system', 
            content: `You are an expert ${language} developer. Generate clean, correct code.
If you receive error feedback, fix the issues and regenerate.
Output only the code in a code block.` 
          },
          { role: 'user', content: currentPrompt },
        ]);

        // Extract code from response
        const codeMatch = response.content?.match(/```[\w]*\n([\s\S]*?)```/);
        const code = codeMatch ? codeMatch[1].trim() : response.content?.trim() || '';

        // Validate syntax
        const validation = await validateFn(code);

        if (validation.valid) {
          return { code, success: true, attempts };
        }

        // Inject errors for retry
        lastErrors = validation.errors;
        currentPrompt = `${prompt}

[SYNTAX ERRORS IN PREVIOUS ATTEMPT]
${validation.errors.join('\n')}

Please fix these syntax errors and regenerate the code.`;

      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        lastErrors = [message];
        currentPrompt = `${prompt}

[ERROR]
${message}

Please try again.`;
      }
    }

    return {
      code: '',
      success: false,
      attempts,
      errors: lastErrors,
    };
  }
}
