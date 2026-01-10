import { CircuitBreakerService } from './services/circuit-breaker.service';

@Injectable()
export class AIService {
  private activeProvider: AIProviderType;
  private readonly logger = new Logger(AIService.name);

  private modelRouter?: any; // Lazy loaded to avoid circular dependency
  
  // Model settings cache (TTL: 60 seconds)
  private modelSettingsCache: CachedModelSettings | null = null;
  private readonly CACHE_TTL_MS = 60000;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly ollamaProvider: OllamaProvider,
    private readonly vllmProvider: VLLMProvider,
    private readonly circuitBreaker: CircuitBreakerService,
  ) {
    this.activeProvider = this.configService.get<AIProviderType>('AI_PROVIDER', 'ollama');
  }

  /**
   * Get model router (lazy loaded)
   */
  private async getModelRouter() {
    if (!this.modelRouter) {
      const { ModelRouterService } = await import('./services/model-router.service');
      // Use the injected circuit breaker instance
      this.modelRouter = new ModelRouterService(this.prisma, this.circuitBreaker);
    }
    return this.modelRouter;
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
   * Chat completion with optional intelligent routing
   */
  async chat(
    messages: ChatMessage[],
    options?: Partial<ChatOptions> & {
      useRouter?: boolean;
      promptType?: any;
      complexity?: 'low' | 'medium' | 'high';
    }
  ): Promise<ChatResponse> {
    // Use model router if enabled
    // Circuit Breaker Check
    const resourceId = options?.model || this.activeProvider === 'ollama' ? 'ollama-primary' : 'vllm-backup'; // Simple resource mapping
    
    if (this.circuitBreaker.isOpen(resourceId)) {
      this.logger.warn(`Circuit is OPEN for ${resourceId}, rejecting request`);
      throw new Error(`Service Unavailable: ${resourceId} is currently down (Circuit Open)`);
    }

    // Use model router if enabled
    let selectedProvider = this.getProvider();
    
    if (options?.useRouter) {
      try {
        const router = await this.getModelRouter();
        const selection = await router.selectModel({
          promptType: options.promptType || 'code',
          promptContent: messages[messages.length - 1]?.content || '',
          complexity: options.complexity,
        });

        this.logger.log(`Router selected: ${selection.serverName} (${selection.reason})`);
        
        // TODO: Actually switch provider based on selection.provider
        // For now we just log it, but in full implementation we would get the correct provider instance
        // selectedProvider = this.getProviderByName(selection.provider);
      } catch (error) {
        this.logger.warn('Model routing failed, using default provider', error);
      }
    }

    // Get default model settings from DB if no model specified
    const finalOptions = { ...options };
    if (!finalOptions?.model) {
      const defaultSettings = await this.getDefaultModelSettings();
      if (defaultSettings) {
        finalOptions.model = defaultSettings.model;
        if (defaultSettings.provider === 'vllm') {
          this.activeProvider = 'vllm';
          selectedProvider = this.vllmProvider;
        } else {
          this.activeProvider = 'ollama';
          selectedProvider = this.ollamaProvider;
        }
        // Apply settings from DB
        if (defaultSettings.temperature) finalOptions.temperature = defaultSettings.temperature;
        if (defaultSettings.maxTokens) finalOptions.maxTokens = defaultSettings.maxTokens;
        if (defaultSettings.topP) finalOptions.topP = defaultSettings.topP;
      }
    }

    try {
      const result = await selectedProvider.chat(messages, finalOptions);
      this.circuitBreaker.recordSuccess(resourceId);
      return result;
    } catch (error) {
      this.circuitBreaker.recordFailure(resourceId);
      throw error;
    }
  }

  /**
   * Get default model settings from database (with caching)
   */
  private async getDefaultModelSettings(): Promise<CachedModelSettings | null> {
    // Check cache first
    const now = Date.now();
    if (this.modelSettingsCache && (now - this.modelSettingsCache.cachedAt) < this.CACHE_TTL_MS) {
      return this.modelSettingsCache;
    }

    try {
      const defaultModel = await this.prisma.aIModelSetting.findFirst({
        where: { isDefault: true, isActive: true },
      });
      
      if (defaultModel) {
        const settings = defaultModel.settings as any;
        this.modelSettingsCache = {
          model: defaultModel.model,
          provider: defaultModel.provider as AIProviderType,
          temperature: settings?.temperature,
          maxTokens: settings?.maxTokens,
          topP: settings?.topP,
          contextLength: settings?.contextLength,
          cachedAt: now,
        };
        this.logger.log(`Using default model: ${defaultModel.name} (${defaultModel.model})`);
        return this.modelSettingsCache;
      }

      // Fallback: get any active model
      const anyActiveModel = await this.prisma.aIModelSetting.findFirst({
        where: { isActive: true },
      });
      
      if (anyActiveModel) {
        const settings = anyActiveModel.settings as any;
        this.modelSettingsCache = {
          model: anyActiveModel.model,
          provider: anyActiveModel.provider as AIProviderType,
          temperature: settings?.temperature,
          maxTokens: settings?.maxTokens,
          topP: settings?.topP,
          contextLength: settings?.contextLength,
          cachedAt: now,
        };
        return this.modelSettingsCache;
      }

      return null;
    } catch (error) {
      this.logger.warn('Failed to get default model settings:', error);
      return null;
    }
  }

  /**
   * Clear model settings cache (call after admin updates model)
   */
  clearModelSettingsCache() {
    this.modelSettingsCache = null;
    this.logger.log('Model settings cache cleared');
  }

  /**
   * Log AI usage for analytics
   */
  private async logUsage(userId: string, modelName: string, provider: string, feature: string, tokens: number, success: boolean, responseTimeMs: number, errorMessage?: string) {
    try {
      await this.prisma.usageLog.create({
        data: {
          userId,
          modelName,
          provider,
          feature,
          totalTokens: tokens,
          promptTokens: 0,
          completionTokens: tokens,
          responseTimeMs,
          success,
          errorMessage,
        },
      });
    } catch (error) {
      this.logger.warn('Failed to log usage:', error);
    }
  }

  /**
   * Get configured model options
   */
  async getConfiguredOptions(options?: Partial<ChatOptions>): Promise<Partial<ChatOptions>> {
    const finalOptions = { ...options };
    
    if (!finalOptions?.model) {
      const defaultSettings = await this.getDefaultModelSettings();
      if (defaultSettings) {
        finalOptions.model = defaultSettings.model;
        this.activeProvider = defaultSettings.provider;
        if (defaultSettings.temperature) finalOptions.temperature = defaultSettings.temperature;
        if (defaultSettings.maxTokens) finalOptions.maxTokens = defaultSettings.maxTokens;
        if (defaultSettings.topP) finalOptions.topP = defaultSettings.topP;
      }
    }

    return finalOptions;
  }

  /**
   * Streaming chat completion
   */
  async *chatStream(
    messages: ChatMessage[],
    options?: Partial<ChatOptions>,
  ): AsyncGenerator<ChatStreamChunk> {
    const configuredOptions = await this.getConfiguredOptions(options);
    yield* this.getProvider().chatStream(messages, configuredOptions);
  }

  /**
   * Generate code based on prompt
   * Enhanced with multi-stage prompt chain
   */
  async generateCode(
    prompt: string,
    context?: string,
    language?: string,
    options?: {
      projectId?: string;
      filePath?: string;
      stylePresetId?: string;
      useChain?: boolean; // Default true
      seed?: number; // For reproducible results
    }
  ): Promise<{ 
    code: string; 
    explanation?: string;
    confidenceScore?: number;
    design?: any;
    validation?: any;
  }> {
    // Use new prompt chain if project context is available
    if (options?.useChain !== false && options?.projectId && options?.filePath) {
      try {
        const { PromptChainService } = await import('./services/prompt-chain.service');
        const { ContextCollectorService } = await import('./services/context-collector.service');
        
        const promptChain = new PromptChainService(
          this,
          new ContextCollectorService(this.prisma),
          this.prisma
        );

        const result = await promptChain.executeChain({
          userPrompt: prompt,
          projectId: options.projectId,
          filePath: options.filePath,
          language: language || 'typescript',
          stylePresetId: options.stylePresetId,
        });

        return {
          code: result.code,
          explanation: result.design.approach,
          confidenceScore: result.confidenceScore,
          design: result.design,
          validation: result.validation,
        };
      } catch (error) {
        this.logger.warn('Prompt chain failed, falling back to legacy generation', error);
        // Fall through to legacy implementation
      }
    }

    // Legacy implementation (for backward compatibility)
    const systemPrompt = `You are an expert software developer. Generate clean, well-documented code.
${language ? `Language: ${language}` : ''}
${context ? `Context:\n${context}` : ''}

Respond with the code only, wrapped in a code block. Add brief comments explaining key parts.`;

    const chatOptions: any = {};
    
    // Add seed for reproducibility if provided
    if (options?.seed !== undefined) {
      chatOptions.seed = options.seed;
      this.logger.log(`Using seed ${options.seed} for reproducible generation`);
    }

    const response = await this.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ], chatOptions);

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
