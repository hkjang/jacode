import { Module, forwardRef } from '@nestjs/common';
import { AgentService } from './agent.service';
import { AgentController } from './agent.controller';
import { AgentGateway } from './agent.gateway';
import { AIModule } from '../ai/ai.module';
import { QueueModule } from '../queue/queue.module';
import { ArtifactModule } from '../artifact/artifact.module';

// New services
import { ToolRegistryService } from './services/tool-registry.service';
import { MemoryManagerService } from './services/memory-manager.service';
import { AgentLoopService } from './services/agent-loop.service';

// Tools
import { FileSystemTool } from './tools/file-system.tool';
import { CodeAnalysisTool } from './tools/code-analysis.tool';
import { CodeGeneratorTool } from './tools/code-generator.tool';

@Module({
  imports: [
    forwardRef(() => AIModule), 
    QueueModule, 
    ArtifactModule
  ],
  providers: [
    AgentService, 
    AgentGateway,
    // Core agent services
    ToolRegistryService,
    MemoryManagerService,
    AgentLoopService,
  ],
  controllers: [AgentController],
  exports: [
    AgentService, 
    AgentGateway, 
    ToolRegistryService, 
    MemoryManagerService, 
    AgentLoopService
  ],
})
export class AgentModule {}
