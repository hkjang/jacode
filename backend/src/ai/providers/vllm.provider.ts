import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatMessage, ChatOptions, ChatResponse, ChatStreamChunk } from '../types';

@Injectable()
export class VLLMProvider implements OnModuleInit {
  private baseUrl: string;
  private defaultModel: string;
  private isAvailable = false;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get('VLLM_BASE_URL', 'http://localhost:8000');
    this.defaultModel = this.configService.get('VLLM_MODEL', 'codellama/CodeLlama-13b-Instruct-hf');
  }

  async onModuleInit() {
    await this.checkAvailability();
  }

  private async checkAvailability() {
    try {
      const response = await fetch(`${this.baseUrl}/v1/models`);
      this.isAvailable = response.ok;
      if (this.isAvailable) {
        console.log('✅ vLLM is available');
      }
    } catch {
      console.warn('⚠️ vLLM is not available');
      this.isAvailable = false;
    }
  }

  getInfo() {
    return {
      name: 'vLLM',
      baseUrl: this.baseUrl,
      defaultModel: this.defaultModel,
      isAvailable: this.isAvailable,
    };
  }

  async chat(messages: ChatMessage[], options?: Partial<ChatOptions>): Promise<ChatResponse> {
    const model = options?.model || this.defaultModel;

    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 4096,
        top_p: options?.topP ?? 0.9,
        stop: options?.stop,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`vLLM API error: ${response.statusText}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    return {
      id: data.id || `vllm-${Date.now()}`,
      content: choice?.message?.content || '',
      model,
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
      finishReason: choice?.finish_reason || 'stop',
    };
  }

  async *chatStream(
    messages: ChatMessage[],
    options?: Partial<ChatOptions>,
  ): AsyncGenerator<ChatStreamChunk> {
    const model = options?.model || this.defaultModel;

    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 4096,
        top_p: options?.topP ?? 0.9,
        stop: options?.stop,
        stream: true,
        stream_options: { include_usage: true },
      }),
    });

    if (!response.ok) {
      throw new Error(`vLLM API error: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            return;
          }

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content || '';
            const usage = parsed.usage ? {
              promptTokens: parsed.usage.prompt_tokens,
              completionTokens: parsed.usage.completion_tokens,
              totalTokens: parsed.usage.total_tokens,
            } : undefined;

            yield {
              id: parsed.id || `vllm-${Date.now()}`,
              content: delta,
              done: false, // In vLLM/OpenAI, usage usually comes with a final chunk or separate chunk
              usage,
            };
            
            // If we got usage, it's usually the end, but let's loop until [DONE]
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }
  }

  async listModels(): Promise<{ models: string[]; default: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/models`);
      if (!response.ok) {
        return { models: [], default: this.defaultModel };
      }

      const data = await response.json();
      const models = data.data?.map((m: any) => m.id) || [];

      return {
        models,
        default: this.defaultModel,
      };
    } catch {
      return { models: [], default: this.defaultModel };
    }
  }
}
