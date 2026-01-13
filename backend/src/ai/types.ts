/**
 * Chat Message interface
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string; // For role: 'tool'
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
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
  tools?: any[]; // Tool definitions (JSON Schema)
  effort?: number; // vLLM effort parameter (0.0-1.0)
}

/**
 * Chat Response
 */
export interface ChatResponse {
  id: string;
  content: string | null;
  model: string;
  tool_calls?: ToolCall[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: 'stop' | 'length' | 'error' | 'tool_calls';
}

/**
 * Chat Stream Chunk
 */
export interface ChatStreamChunk {
  id: string;
  content: string;
  done: boolean;
  model?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
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
