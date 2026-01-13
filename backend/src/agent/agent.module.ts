import { Module, forwardRef } from '@nestjs/common';
import { AgentService } from './agent.service';
import { AgentController } from './agent.controller';
import { AgentGateway } from './agent.gateway';
import { AIModule } from '../ai/ai.module';
import { QueueModule } from '../queue/queue.module';
import { ArtifactModule } from '../artifact/artifact.module';
import { PrismaModule } from '../prisma/prisma.module';

// Core agent services
import { ToolRegistryService } from './services/tool-registry.service';
import { MemoryManagerService } from './services/memory-manager.service';
import { AgentLoopService } from './services/agent-loop.service';

// AST-based services
import { RepoScannerService } from './services/repo-scanner.service';
import { LLMGatewayService } from './services/llm-gateway.service';
import { ChangePlannerService } from './services/change-planner.service';
import { ASTExecutorService } from './services/ast-executor.service';
import { ValidationService } from './services/validation.service';

// Phase 2 services
import { SandboxService } from './services/sandbox.service';
import { FileIndexerService } from './services/file-indexer.service';
import { RAGService } from './services/rag.service';

// Phase 3+ services
import { FileOperationsService } from './services/file-operations.service';
import { ArtifactService } from './services/artifact.service';
import { ASTSkeletonService } from './services/ast-skeleton.service';

// Advanced services
import { CodeDiffService } from './services/code-diff.service';
import { SessionManagerService } from './services/session-manager.service';
import { AgentOrchestratorService } from './services/agent-orchestrator.service';
import { GitService } from './services/git.service';

// Tools
import { FileSystemTool } from './tools/file-system.tool';
import { CodeAnalysisTool } from './tools/code-analysis.tool';
import { CodeGeneratorTool } from './tools/code-generator.tool';

@Module({
  imports: [
    forwardRef(() => AIModule), 
    QueueModule, 
    ArtifactModule,
    PrismaModule,
  ],
  providers: [
    AgentService, 
    AgentGateway,
    // Core agent services
    ToolRegistryService,
    MemoryManagerService,
    AgentLoopService,
    // AST-based services
    RepoScannerService,
    LLMGatewayService,
    ChangePlannerService,
    ASTExecutorService,
    ValidationService,
    // Phase 2 services
    SandboxService,
    FileIndexerService,
    RAGService,
    // Phase 3+ services
    FileOperationsService,
    ArtifactService,
    ASTSkeletonService,
    // Advanced services
    CodeDiffService,
    SessionManagerService,
    AgentOrchestratorService,
    GitService,
  ],
  controllers: [AgentController],
  exports: [
    AgentService, 
    AgentGateway, 
    ToolRegistryService, 
    MemoryManagerService, 
    AgentLoopService,
    RepoScannerService,
    LLMGatewayService,
    ChangePlannerService,
    ASTExecutorService,
    ValidationService,
    SandboxService,
    FileIndexerService,
    RAGService,
    FileOperationsService,
    ArtifactService,
    ASTSkeletonService,
    CodeDiffService,
    SessionManagerService,
    AgentOrchestratorService,
    GitService,
  ],
})
export class AgentModule {}
