import { Tool, ToolResult, ToolContext, JSONSchema } from '../interfaces/tool.interface';
import { AIService } from '../../ai/ai.service';

/**
 * Code Generator Tool
 * 
 * Generates code using the AI service:
 * - Generate new code from description
 * - Modify existing code
 * - Generate tests
 * - Generate documentation
 */
export class CodeGeneratorTool implements Tool {
  name = 'code_generator';
  description = `Generate code using AI.
Use this tool when you need to:
- Generate new code from a description
- Modify or refactor existing code
- Generate unit tests
- Generate documentation or comments`;

  parameters: JSONSchema = {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        description: 'Code generation operation',
        enum: ['generate', 'modify', 'test', 'document'],
      },
      prompt: {
        type: 'string',
        description: 'Description of what to generate or how to modify',
      },
      code: {
        type: 'string',
        description: 'Existing code (for modify, test, document operations)',
      },
      language: {
        type: 'string',
        description: 'Programming language',
      },
      filePath: {
        type: 'string',
        description: 'Target file path for context',
      },
    },
    required: ['operation', 'prompt'],
  };

  constructor(private readonly aiService: AIService) {}

  async execute(args: Record<string, any>, context: ToolContext): Promise<ToolResult> {
    const { operation, prompt, code, language, filePath } = args;

    try {
      switch (operation) {
        case 'generate':
          return await this.generateCode(prompt, language, context);
        case 'modify':
          return await this.modifyCode(code, prompt, language);
        case 'test':
          return await this.generateTests(code, language);
        case 'document':
          return await this.generateDocumentation(code, language);
        default:
          return {
            success: false,
            output: '',
            error: `Unknown operation: ${operation}`,
          };
      }
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async generateCode(prompt: string, language?: string, context?: ToolContext): Promise<ToolResult> {
    const result = await this.aiService.generateCode(prompt, undefined, language, {
      projectId: context?.projectId,
      useChain: false, // Use simple generation for tool calls
    });

    return {
      success: true,
      output: result.code,
      data: {
        explanation: result.explanation,
        confidenceScore: result.confidenceScore,
      },
    };
  }

  private async modifyCode(code: string, instructions: string, language?: string): Promise<ToolResult> {
    if (!code) {
      return {
        success: false,
        output: '',
        error: 'Code is required for modify operation',
      };
    }

    const result = await this.aiService.modifyCode(code, instructions, language);

    return {
      success: true,
      output: result.code,
      data: { explanation: result.explanation },
    };
  }

  private async generateTests(code: string, language?: string): Promise<ToolResult> {
    if (!code) {
      return {
        success: false,
        output: '',
        error: 'Code is required for test generation',
      };
    }

    const result = await this.aiService.generateTests(code, language);

    return {
      success: true,
      output: result.tests,
      data: { explanation: result.explanation },
    };
  }

  private async generateDocumentation(code: string, language?: string): Promise<ToolResult> {
    if (!code) {
      return {
        success: false,
        output: '',
        error: 'Code is required for documentation generation',
      };
    }

    const systemPrompt = `You are a documentation expert. Generate comprehensive documentation for the following code.
Include:
- Overview description
- Parameter descriptions
- Return value descriptions
- Usage examples
- Important notes or warnings

Format: JSDoc/TSDoc style for JavaScript/TypeScript, docstrings for Python.`;

    const response = await this.aiService.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Generate documentation for:\n\`\`\`${language || ''}\n${code}\n\`\`\`` },
    ]);

    return {
      success: true,
      output: response.content || '',
    };
  }

  validate(args: Record<string, any>): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    if (!args.operation) {
      errors.push('operation is required');
    }

    if (!args.prompt) {
      errors.push('prompt is required');
    }

    if (['modify', 'test', 'document'].includes(args.operation) && !args.code) {
      errors.push('code is required for this operation');
    }

    return { valid: errors.length === 0, errors };
  }
}
