import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AIService } from './ai.service';
import { AIController } from './ai.controller';
import { OllamaProvider } from './providers/ollama.provider';
import { VLLMProvider } from './providers/vllm.provider';
import { ProviderRegistryService } from './services/provider-registry.service';
import { PromptVersioningService } from './services/prompt-versioning.service';
import { ConfigBackupService } from './services/config-backup.service';
import { ContextCollectorService } from './services/context-collector.service';
import { PromptChainService } from './services/prompt-chain.service';
import { CodeStyleService } from './services/code-style.service';
import { CircuitBreakerService } from './services/circuit-breaker.service';
import { ModelRouterService } from './services/model-router.service';
import { AutoRefactoringAgent } from './services/auto-refactoring.service';
import { MultiFileEditorService } from './services/multi-file-editor.service';

@Module({
  imports: [PrismaModule],
  providers: [
    AIService,
    OllamaProvider,
    VLLMProvider,
    ProviderRegistryService,
    PromptVersioningService,
    ConfigBackupService,
    ContextCollectorService,
    PromptChainService,
    CodeStyleService,
    CircuitBreakerService,
    ModelRouterService,
    AutoRefactoringAgent,
    MultiFileEditorService,
  ],
  controllers: [AIController],
  exports: [
    AIService,
    ProviderRegistryService,
    PromptVersioningService,
    ConfigBackupService,
    ContextCollectorService,
    PromptChainService,
    CodeStyleService,
    CircuitBreakerService,
    ModelRouterService,
    AutoRefactoringAgent,
    MultiFileEditorService,
  ],
})
export class AIModule {}
