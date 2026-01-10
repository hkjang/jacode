export interface IAIProvider {
  readonly name: string;
  readonly type: string;

  /**
   * Initialize the provider with configuration
   */
  initialize(config: ProviderConfig): Promise<void>;

  /**
   * Chat completion
   */
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse>;

  /**
   * Streaming chat completion
   */
  chatStream(
    messages: ChatMessage[],
    options?: ChatOptions
  ): AsyncGenerator<ChatStreamChunk>;

  /**
   * List available models
   */
  listModels(): Promise<{ models: string[]; default: string }>;

  /**
   * Health check
   */
  checkHealth(): Promise<boolean>;

  /**
   * Get provider metrics
   */
  getMetrics(): Promise<ProviderMetrics>;
}

export interface ProviderConfig {
  baseUrl: string;
  apiKey?: string;
  defaultModel?: string;
  timeout?: number;
  [key: string]: any;
}

export interface ProviderMetrics {
  requestCount: number;
  averageLatency: number;
  errorRate: number;
  lastUpdateTime: Date;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  seed?: number; // For reproducibility
}

export interface ChatResponse {
  id: string;
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: string;
}

export interface ChatStreamChunk {
  id: string;
  content: string;
  done: boolean;
}
