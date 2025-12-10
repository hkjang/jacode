import { Module } from '@nestjs/common';
import { AIService } from './ai.service';
import { AIController } from './ai.controller';
import { OllamaProvider } from './providers/ollama.provider';
import { VLLMProvider } from './providers/vllm.provider';

@Module({
  providers: [AIService, OllamaProvider, VLLMProvider],
  controllers: [AIController],
  exports: [AIService],
})
export class AIModule {}
