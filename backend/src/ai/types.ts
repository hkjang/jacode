/**
 * Chat Message interface
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Chat Options
 */
export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stream?: boolean;
  stop?: string[];
}

/**
 * Chat Response
 */
export interface ChatResponse {
  id: string;
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: 'stop' | 'length' | 'error';
}

/**
 * Chat Stream Chunk
 */
export interface ChatStreamChunk {
  id: string;
  content: string;
  done: boolean;
}

/**
 * AI Provider Type
 */
export type AIProviderType = 'ollama' | 'vllm';

/**
 * Cached Model Settings
 */
export interface CachedModelSettings {
  model: string;
  provider: AIProviderType;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  contextLength?: number;
  cachedAt: number;
}
