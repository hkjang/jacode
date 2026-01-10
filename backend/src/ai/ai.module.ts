import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AIService } from './ai.service';
import { AIController } from './ai.controller';
import { OllamaProvider } from './providers/ollama.provider';
import { VLLMProvider } from './providers/vllm.provider';
import { ProviderRegistryService } from './services/provider-registry.service';
import { PromptVersioningService } from './services/prompt-versioning.service';
import { ConfigBackupService } from './services/config-backup.service';

@Module({
  imports: [PrismaModule],
  providers: [
    AIService,
    OllamaProvider,
    VLLMProvider,
    ProviderRegistryService,
    PromptVersioningService,
    ConfigBackupService,
  ],
  controllers: [AIController],
  exports: [
    AIService,
    ProviderRegistryService,
    PromptVersioningService,
    ConfigBackupService,
  ],
})
export class AIModule {}
