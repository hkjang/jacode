import { Injectable, Logger } from '@nestjs/common';
import { AIService } from '../ai.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ContextCollectorService, CodeContext } from './context-collector.service';

export interface ChainInput {
  userPrompt: string;
  projectId: string;
  filePath: string;
  language: string;
  stylePresetId?: string;
}

export interface DesignResult {
  approach: string;
  steps: string[];
  considerations: string[];
  estimatedComplexity: 'low' | 'medium' | 'high';
}

export interface GenerateResult {
  code: string;
  explanation: string;
}

export interface ValidationResult {
  isValid: boolean;
  issues: {
    severity: 'error' | 'warning' | 'info';
    message: string;
    line?: number;
  }[];
  suggestions: string[];
}

export interface ChainResult {
  code: string;
  design: DesignResult;
  validation: ValidationResult;
  confidenceScore: number;
  executionId: string;
}

@Injectable()
export class PromptChainService {
  private readonly logger = new Logger(PromptChainService.name);

  constructor(
    private readonly aiService: AIService,
    private readonly contextCollector: ContextCollectorService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Execute multi-stage prompt chain
   */
  async executeChain(input: ChainInput): Promise<ChainResult> {
    const startTime = Date.now();
    this.logger.log(`Starting prompt chain for: ${input.userPrompt.substring(0, 50)}...`);

    // Collect context
    const context = await this.contextCollector.collectContext(
      input.projectId,
      input.filePath
    );

    // Load style preset if specified
    const stylePreset = input.stylePresetId
      ? await this.prisma.codeStylePreset.findUnique({
          where: { id: input.stylePresetId },
        })
      : null;

    // Stage 1: Design
    this.logger.debug('Stage 1: Design');
    const designResult = await this.designStage(input, context);

    // Stage 2: Generate
    this.logger.debug('Stage 2: Generate');
    const generateResult = await this.generateStage(input, context, designResult, stylePreset);

    // Stage 3: Validate
    this.logger.debug('Stage 3: Validate');
    const validationResult = await this.validateStage(generateResult.code, input, context);

    // Calculate confidence score
    const confidenceScore = this.calculateConfidence(designResult, validationResult);

    const executionTime = Date.now() - startTime;

    // Record execution
    const execution = await this.recordExecution({
      prompt: input.userPrompt,
      response: generateResult.code,
      confidenceScore,
      executionTime,
      success: validationResult.isValid,
      qualityMetrics: {
        designComplexity: designResult.estimatedComplexity,
        issueCount: validationResult.issues.length,
        hasErrors: validationResult.issues.some(i => i.severity === 'error'),
      },
    });

    this.logger.log(`Prompt chain completed in ${executionTime}ms with confidence ${confidenceScore.toFixed(2)}`);

    return {
      code: generateResult.code,
      design: designResult,
      validation: validationResult,
      confidenceScore,
      executionId: execution.id,
    };
  }

  /**
   * Stage 1: Design - Create implementation plan
   */
  private async designStage(input: ChainInput, context: CodeContext): Promise<DesignResult> {
    const systemPrompt = `You are a senior software architect. Analyze the user's request and create a high-level design plan.

Project Context:
${context.projectStructure ? `- Technologies: ${context.projectStructure.technologies.join(', ')}` : ''}
${context.currentFile ? `- Current file: ${context.currentFile.path} (${context.currentFile.language})` : ''}
${context.relatedFiles.length > 0 ? `- Related files: ${context.relatedFiles.map(f => f.path).join(', ')}` : ''}

Provide your response in JSON format:
{
  "approach": "brief description of the approach",
  "steps": ["step 1", "step 2", ...],
  "considerations": ["consideration 1", "consideration 2", ...],
  "estimatedComplexity": "low|medium|high"
}`;

    const response = await this.aiService.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: input.userPrompt },
    ]);

    try {
      const design = JSON.parse(this.extractJSON(response.content));
      return design as DesignResult;
    } catch (error) {
      this.logger.warn('Failed to parse design response, using fallback');
      return {
        approach: 'Direct implementation',
        steps: ['Implement the requested feature'],
        considerations: ['Ensure code quality'],
        estimatedComplexity: 'medium',
      };
    }
  }

  /**
   * Stage 2: Generate - Create actual code
   */
  private async generateStage(
    input: ChainInput,
    context: CodeContext,
    design: DesignResult,
    stylePreset: any
  ): Promise<GenerateResult> {
    const systemPrompt = `You are an expert ${input.language} developer. Generate clean, well-documented code based on the design plan.

Design Plan:
- Approach: ${design.approach}
- Steps: ${design.steps.join(', ')}

Context:
${context.currentFile ? `Current file content (for reference):\n\`\`\`${context.currentFile.language}\n${context.currentFile.content.substring(0, 1000)}\n\`\`\`\n` : ''}

${stylePreset ? `Code Style Requirements:\n${stylePreset.conventions}\n` : ''}

Provide:
1. The complete code wrapped in a code block
2. A brief explanation of the implementation

Format your response as:
\`\`\`${input.language}
[code here]
\`\`\`

Explanation: [brief explanation]`;

    const response = await this.aiService.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: input.userPrompt },
    ]);

    const code = this.extractCode(response.content);
    const explanation = this.extractExplanation(response.content);

    return { code, explanation };
  }

  /**
   * Stage 3: Validate - AI self-review
   */
  private async validateStage(
    code: string,
    input: ChainInput,
    context: CodeContext
  ): Promise<ValidationResult> {
    const systemPrompt = `You are a code reviewer. Review the generated code for:
1. Correctness
2. Best practices
3. Potential bugs
4. Performance issues
5. Security concerns

Provide your review in JSON format:
{
  "isValid": true|false,
  "issues": [
    {
      "severity": "error|warning|info",
      "message": "description",
      "line": 5
    }
  ],
  "suggestions": ["suggestion 1", "suggestion 2"]
}`;

    const response = await this.aiService.chat([
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Review this ${input.language} code:\n\`\`\`${input.language}\n${code}\n\`\`\`\n\nOriginal request: ${input.userPrompt}`,
      },
    ]);

    try {
      const validation = JSON.parse(this.extractJSON(response.content));
      return validation as ValidationResult;
    } catch (error) {
      this.logger.warn('Failed to parse validation response, assuming valid');
      return {
        isValid: true,
        issues: [],
        suggestions: [],
      };
    }
  }

  /**
   * Calculate confidence score (0.0 - 1.0)
   */
  private calculateConfidence(design: DesignResult, validation: ValidationResult): number {
    let score = 1.0;

    // Reduce score based on complexity
    if (design.estimatedComplexity === 'high') score -= 0.2;
    else if (design.estimatedComplexity === 'medium') score -= 0.1;

    // Reduce score based on issues
    const errorCount = validation.issues.filter(i => i.severity === 'error').length;
    const warningCount = validation.issues.filter(i => i.severity === 'warning').length;

    score -= errorCount * 0.15;
    score -= warningCount * 0.05;

    // Ensure score is between 0 and 1
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Record prompt execution in database
   */
  private async recordExecution(data: {
    prompt: string;
    response: string;
    confidenceScore: number;
    executionTime: number;
    success: boolean;
    qualityMetrics: any;
  }) {
    return this.prisma.promptExecution.create({
      data: {
        promptContent: data.prompt,
        response: data.response,
        confidenceScore: data.confidenceScore,
        executionTimeMs: data.executionTime,
        success: data.success,
        qualityMetrics: data.qualityMetrics,
        modelName: 'default', // TODO: Get from AIService
        provider: 'ollama', // TODO: Get from AIService
      },
    });
  }

  /**
   * Extract JSON from response
   */
  private extractJSON(response: string): string {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    return jsonMatch ? jsonMatch[0] : '{}';
  }

  /**
   * Extract code from markdown response
   */
  private extractCode(response: string): string {
    const codeBlockRegex = /```[\w]*\n([\s\S]*?)```/;
    const match = response.match(codeBlockRegex);
    return match ? match[1].trim() : response.trim();
  }

  /**
   * Extract explanation from response
   */
  private extractExplanation(response: string): string {
    // Remove code blocks
    const withoutCode = response.replace(/```[\w]*\n[\s\S]*?```/g, '').trim();
    
    // Look for "Explanation:" section
    const explanationMatch = withoutCode.match(/Explanation:\s*([\s\S]+)/i);
    return explanationMatch ? explanationMatch[1].trim() : withoutCode;
  }
}
