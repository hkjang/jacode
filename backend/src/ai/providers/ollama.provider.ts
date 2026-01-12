import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatMessage, ChatOptions, ChatResponse, ChatStreamChunk } from '../types';

interface OllamaGenerateResponse {
  model: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  eval_count?: number;
  prompt_eval_count?: number;
}

@Injectable()
export class OllamaProvider implements OnModuleInit {
  private baseUrl: string;
  private defaultModel: string;
  private isAvailable = false;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get('OLLAMA_BASE_URL', 'http://localhost:11434');
    this.defaultModel = this.configService.get('OLLAMA_MODEL', 'llama3.1:8b');
  }

  async onModuleInit() {
    await this.checkAvailability();
  }

  private async checkAvailability() {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      this.isAvailable = response.ok;
      if (this.isAvailable) {
        console.log('✅ Ollama is available');
      }
    } catch {
      console.warn('⚠️ Ollama is not available');
      this.isAvailable = false;
    }
  }

  getInfo() {
    return {
      name: 'Ollama',
      baseUrl: this.baseUrl,
      defaultModel: this.defaultModel,
      isAvailable: this.isAvailable,
    };
  }

  async chat(messages: ChatMessage[], options?: Partial<ChatOptions>): Promise<ChatResponse> {
    const model = options?.model || this.defaultModel;

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        tools: options?.tools, // Pass tools if present
        options: {
          temperature: options?.temperature ?? 0.7,
          num_predict: options?.maxTokens ?? 4096,
          top_p: options?.topP ?? 0.9,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json();

    // Map Ollama tool calls to standard format
    const toolCalls = data.message?.tool_calls?.map((tc: any) => ({
       id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
       type: 'function',
       function: {
         name: tc.function.name,
         arguments: JSON.stringify(tc.function.arguments),
       }
    }));

    return {
      id: `ollama-${Date.now()}`,
      content: data.message?.content || null,
      model,
      tool_calls: toolCalls,
      usage: {
        promptTokens: data.prompt_eval_count || 0,
        completionTokens: data.eval_count || 0,
        totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
      },
      finishReason: toolCalls?.length > 0 ? 'tool_calls' : 'stop',
    };
  }

  async *chatStream(
    messages: ChatMessage[],
    options?: Partial<ChatOptions>,
  ): AsyncGenerator<ChatStreamChunk> {
    const model = options?.model || this.defaultModel;

    // Use AbortController for timeout (5 min max for long generations)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 300000);

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages,
          stream: true,
          options: {
            temperature: options?.temperature ?? 0.7,
            num_predict: options?.maxTokens ?? 4096,
            top_p: options?.topP ?? 0.9,
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        throw new Error(`Ollama API error for model "${model}" (${response.status}): ${response.statusText}${errorBody ? ` - ${errorBody.substring(0, 200)}` : ''}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body from Ollama server');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let chunkCount = 0;

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line);
              chunkCount++;
              
              const chunk: ChatStreamChunk = {
                id: `ollama-${chunkCount}-${Date.now()}`,
                content: data.message?.content || '',
                done: data.done || false,
                model: model,
              };
              
              // Capture metrics on the final chunk
              if (data.done) {
                chunk.usage = {
                  promptTokens: data.prompt_eval_count || 0,
                  completionTokens: data.eval_count || 0,
                  totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
                };
              }
              
              yield chunk;
              
              if (data.done) return;
            } catch (e) {
              // Skip invalid JSON lines
            }
          }
        }
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  async generate(prompt: string, options?: Partial<ChatOptions>): Promise<string> {
    const model = options?.model || this.defaultModel;

    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        options: {
          temperature: options?.temperature ?? 0.7,
          num_predict: options?.maxTokens ?? 4096,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data: OllamaGenerateResponse = await response.json();
    return data.response;
  }

  async listModels(): Promise<{ models: string[]; default: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) {
        return { models: [], default: this.defaultModel };
      }

      const data = await response.json();
      const models = data.models?.map((m: any) => m.name) || [];

      return {
        models,
        default: this.defaultModel,
      };
    } catch {
      return { models: [], default: this.defaultModel };
    }
  }
}
