import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OllamaProvider } from './providers/ollama.provider';
import { VLLMProvider } from './providers/vllm.provider';
import { ChatMessage, ChatOptions, ChatResponse, ChatStreamChunk } from './types';

export type AIProviderType = 'ollama' | 'vllm';

@Injectable()
export class AIService {
  private activeProvider: AIProviderType;

  constructor(
    private readonly configService: ConfigService,
    private readonly ollamaProvider: OllamaProvider,
    private readonly vllmProvider: VLLMProvider,
  ) {
    this.activeProvider = this.configService.get<AIProviderType>('AI_PROVIDER', 'ollama');
  }

  /**
   * Get the active AI provider
   */
  private getProvider() {
    return this.activeProvider === 'ollama' ? this.ollamaProvider : this.vllmProvider;
  }

  /**
   * Set the active AI provider
   */
  setProvider(provider: AIProviderType) {
    this.activeProvider = provider;
  }

  /**
   * Get current provider info
   */
  getProviderInfo() {
    return {
      provider: this.activeProvider,
      ...this.getProvider().getInfo(),
    };
  }

  /**
   * Chat completion
   */
  async chat(messages: ChatMessage[], options?: Partial<ChatOptions>): Promise<ChatResponse> {
    return this.getProvider().chat(messages, options);
  }

  /**
   * Streaming chat completion
   */
  async *chatStream(
    messages: ChatMessage[],
    options?: Partial<ChatOptions>,
  ): AsyncGenerator<ChatStreamChunk> {
    yield* this.getProvider().chatStream(messages, options);
  }

  /**
   * Generate code based on prompt
   */
  async generateCode(
    prompt: string,
    context?: string,
    language?: string,
  ): Promise<{ code: string; explanation?: string }> {
    const systemPrompt = `You are an expert software developer. Generate clean, well-documented code.
${language ? `Language: ${language}` : ''}
${context ? `Context:\n${context}` : ''}

Respond with the code only, wrapped in a code block. Add brief comments explaining key parts.`;

    const response = await this.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ]);

    const code = this.extractCodeFromResponse(response.content);
    const explanation = this.extractExplanation(response.content);

    return { code, explanation };
  }

  /**
   * Modify existing code based on instructions
   */
  async modifyCode(
    code: string,
    instructions: string,
    language?: string,
  ): Promise<{ code: string; explanation?: string }> {
    const systemPrompt = `You are an expert software developer. Modify the provided code according to the instructions.
${language ? `Language: ${language}` : ''}

Respond with the complete modified code wrapped in a code block, followed by a brief explanation of the changes.`;

    const response = await this.chat([
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Original code:\n\`\`\`${language || ''}\n${code}\n\`\`\`\n\nInstructions: ${instructions}`,
      },
    ]);

    const modifiedCode = this.extractCodeFromResponse(response.content);
    const explanation = this.extractExplanation(response.content);

    return { code: modifiedCode, explanation };
  }

  /**
   * Review code and provide feedback
   */
  async reviewCode(code: string, language?: string): Promise<string> {
    const systemPrompt = `You are an expert code reviewer. Analyze the provided code and give constructive feedback on:
1. Code quality and readability
2. Potential bugs or issues
3. Performance considerations
4. Security concerns
5. Best practices and suggestions

Be specific and provide examples where applicable.`;

    const response = await this.chat([
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Review this code:\n\`\`\`${language || ''}\n${code}\n\`\`\``,
      },
    ]);

    return response.content;
  }

  /**
   * Generate tests for code
   */
  async generateTests(
    code: string,
    language?: string,
    testFramework?: string,
  ): Promise<{ tests: string; explanation?: string }> {
    const systemPrompt = `You are an expert in testing. Generate comprehensive unit tests for the provided code.
${language ? `Language: ${language}` : ''}
${testFramework ? `Test Framework: ${testFramework}` : ''}

Include tests for:
- Normal cases
- Edge cases
- Error handling

Respond with the test code wrapped in a code block.`;

    const response = await this.chat([
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Generate tests for:\n\`\`\`${language || ''}\n${code}\n\`\`\``,
      },
    ]);

    const tests = this.extractCodeFromResponse(response.content);
    const explanation = this.extractExplanation(response.content);

    return { tests, explanation };
  }

  /**
   * Create implementation plan from requirements
   */
  async createPlan(requirements: string, context?: string): Promise<string> {
    const systemPrompt = `You are a senior software architect. Create a detailed implementation plan for the given requirements.

The plan should include:
1. Overview and goals
2. Technical approach
3. Step-by-step implementation tasks
4. File structure changes
5. Potential challenges and mitigations
6. Testing strategy

Format the response in Markdown.`;

    const response = await this.chat([
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Requirements:\n${requirements}${context ? `\n\nProject Context:\n${context}` : ''}`,
      },
    ]);

    return response.content;
  }

  /**
   * List available models
   */
  async listModels(): Promise<{ models: string[]; default: string }> {
    return this.getProvider().listModels();
  }

  /**
   * Extract code from markdown response
   */
  private extractCodeFromResponse(response: string): string {
    const codeBlockRegex = /```[\w]*\n([\s\S]*?)```/g;
    const matches = [...response.matchAll(codeBlockRegex)];

    if (matches.length > 0) {
      return matches.map((m) => m[1].trim()).join('\n\n');
    }

    return response.trim();
  }

  /**
   * Extract explanation (text outside code blocks)
   */
  private extractExplanation(response: string): string | undefined {
    const withoutCode = response.replace(/```[\w]*\n[\s\S]*?```/g, '').trim();
    return withoutCode || undefined;
  }
}
