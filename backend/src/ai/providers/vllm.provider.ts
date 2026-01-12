import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { ChatMessage, ChatOptions, ChatResponse, ChatStreamChunk } from '../types';

@Injectable()
export class VLLMProvider implements OnModuleInit {
  private readonly logger = new Logger(VLLMProvider.name);
  private fallbackBaseUrl: string;
  private defaultModel: string;
  private isAvailable = false;
  private cachedServerUrl: string | null = null;
  private cacheTime: number = 0;
  private readonly CACHE_TTL_MS = 30000; // 30 seconds cache

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.fallbackBaseUrl = this.configService.get('VLLM_BASE_URL', 'http://localhost:8000');
    this.defaultModel = this.configService.get('VLLM_MODEL', 'codellama/CodeLlama-13b-Instruct-hf');
  }

  async onModuleInit() {
    await this.checkAvailability();
  }

  /**
   * Get the active vLLM server URL from database, with caching
   */
  private async getActiveServerUrl(): Promise<string> {
    const now = Date.now();
    
    // Return cached URL if still valid
    if (this.cachedServerUrl && (now - this.cacheTime) < this.CACHE_TTL_MS) {
      return this.cachedServerUrl;
    }

    try {
      // Find an active vLLM server from the database
      const server = await this.prisma.modelServer.findFirst({
        where: {
          type: 'VLLM',
          isActive: true,
          status: 'ONLINE',
        },
        orderBy: { routingWeight: 'desc' },
      });

      if (server?.url) {
        this.cachedServerUrl = server.url;
        this.cacheTime = now;
        this.logger.debug(`Using vLLM server from DB: ${server.url}`);
        return server.url;
      }

      // Fallback: try any active vLLM server regardless of status
      const anyServer = await this.prisma.modelServer.findFirst({
        where: {
          type: 'VLLM',
          isActive: true,
        },
        orderBy: { routingWeight: 'desc' },
      });

      if (anyServer?.url) {
        this.cachedServerUrl = anyServer.url;
        this.cacheTime = now;
        this.logger.debug(`Using fallback vLLM server from DB: ${anyServer.url}`);
        return anyServer.url;
      }
    } catch (error) {
      this.logger.warn(`Failed to get vLLM server from DB: ${error}`);
    }

    // Final fallback: use environment variable
    this.logger.debug(`Using fallback vLLM URL from env: ${this.fallbackBaseUrl}`);
    return this.fallbackBaseUrl;
  }

  private async checkAvailability() {
    try {
      const baseUrl = await this.getActiveServerUrl();
      const response = await fetch(`${baseUrl}/v1/models`);
      this.isAvailable = response.ok;
      if (this.isAvailable) {
        this.logger.log(`✅ vLLM is available at ${baseUrl}`);
      }
    } catch (error) {
      this.logger.warn(`⚠️ vLLM is not available: ${error}`);
      this.isAvailable = false;
    }
  }

  async getInfo() {
    return {
      name: 'vLLM',
      baseUrl: await this.getActiveServerUrl(),
      defaultModel: this.defaultModel,
      isAvailable: this.isAvailable,
    };
  }

  async chat(messages: ChatMessage[], options?: Partial<ChatOptions>): Promise<ChatResponse> {
    const model = options?.model || this.defaultModel;
    const baseUrl = await this.getActiveServerUrl();

    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
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
    const baseUrl = await this.getActiveServerUrl();

    // Use AbortController for timeout (5 min max for long generations)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 300000);

    try {
      const response = await fetch(`${baseUrl}/v1/chat/completions`, {
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
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        throw new Error(`vLLM API error (${response.status}): ${response.statusText}${errorBody ? ` - ${errorBody.substring(0, 200)}` : ''}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body from vLLM server');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let lastUsage: any = undefined;

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          // Emit final chunk with usage if available
          if (lastUsage) {
            yield {
              id: `vllm-final-${Date.now()}`,
              content: '',
              done: true,
              usage: lastUsage,
            };
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') {
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const choice = parsed.choices?.[0];
              const delta = choice?.delta?.content || '';
              const finishReason = choice?.finish_reason;
              
              // Capture usage from any chunk (vLLM sends it at the end)
              if (parsed.usage) {
                lastUsage = {
                  promptTokens: parsed.usage.prompt_tokens,
                  completionTokens: parsed.usage.completion_tokens,
                  totalTokens: parsed.usage.total_tokens,
                };
              }

              // Only yield if there's content or it's the finish signal
              if (delta || finishReason) {
                yield {
                  id: parsed.id || `vllm-${Date.now()}`,
                  content: delta,
                  done: finishReason === 'stop' || finishReason === 'length',
                  model: model,
                  usage: parsed.usage ? lastUsage : undefined,
                };
              }
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

  async listModels(): Promise<{ models: string[]; default: string }> {
    try {
      const baseUrl = await this.getActiveServerUrl();
      const response = await fetch(`${baseUrl}/v1/models`);
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
