import { Module, Global, OnModuleInit } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { McpHostService } from './services/mcp-host.service';
import { ToolRegistryService } from './services/tool-registry.service';
import { PermissionService } from './services/permission.service';
import { FileSystemTool } from './tools/filesystem.tool';
import { GitTool } from './tools/git.tool';
import { CodeSearchTool } from './tools/code-search.tool';
import { MetadataTool } from './tools/metadata.tool';
import { McpController } from './controllers/mcp.controller';
import { CircuitBreakerService } from '../ai/services/circuit-breaker.service';

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [McpController],
  providers: [
    McpHostService,
    ToolRegistryService,
    PermissionService,
    FileSystemTool,
    GitTool,
    CodeSearchTool,
    MetadataTool,
    CircuitBreakerService,
  ],
  exports: [
    McpHostService,
    ToolRegistryService,
  ],
})
export class McpModule implements OnModuleInit {
  constructor(
    private readonly registry: ToolRegistryService,
    private readonly fsTool: FileSystemTool,
    private readonly gitTool: GitTool,
    private readonly searchTool: CodeSearchTool,
    private readonly metadataTool: MetadataTool,
  ) {}

  onModuleInit() {
    this.registry.registerTool(this.fsTool);
    this.registry.registerTool(this.gitTool);
    this.registry.registerTool(this.searchTool);
    this.registry.registerTool(this.metadataTool);
  }
}
