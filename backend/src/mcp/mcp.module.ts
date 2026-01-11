import { Module, Global, OnModuleInit } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { McpHostService } from './services/mcp-host.service';
import { ToolRegistryService } from './services/tool-registry.service';
import { PermissionService } from './services/permission.service';
import { FileSystemTool } from './tools/filesystem.tool';
import { GitTool } from './tools/git.tool';
import { CodeSearchTool } from './tools/code-search.tool';
import { MetadataTool } from './tools/metadata.tool';
import { WebFetchTool } from './tools/web-fetch.tool';
import { ShellTool } from './tools/shell.tool';
import { MemoryTool } from './tools/memory.tool';
import { BraveSearchTool } from './tools/brave-search.tool';
import { MathTool } from './tools/math.tool';
import { DateTimeTool } from './tools/datetime.tool';
import { JsonTool } from './tools/json.tool';
import { CryptoTool } from './tools/crypto.tool';
import { TextTool } from './tools/text.tool';
import { SystemInfoTool } from './tools/system-info.tool';
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
    // Core tools
    FileSystemTool,
    GitTool,
    CodeSearchTool,
    MetadataTool,
    // Network tools
    WebFetchTool,
    ShellTool,
    MemoryTool,
    BraveSearchTool,
    // Offline utility tools
    MathTool,
    DateTimeTool,
    JsonTool,
    CryptoTool,
    TextTool,
    SystemInfoTool,
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
    // Core
    private readonly fsTool: FileSystemTool,
    private readonly gitTool: GitTool,
    private readonly searchTool: CodeSearchTool,
    private readonly metadataTool: MetadataTool,
    // Network
    private readonly webFetchTool: WebFetchTool,
    private readonly shellTool: ShellTool,
    private readonly memoryTool: MemoryTool,
    private readonly braveSearchTool: BraveSearchTool,
    // Offline utilities
    private readonly mathTool: MathTool,
    private readonly dateTimeTool: DateTimeTool,
    private readonly jsonTool: JsonTool,
    private readonly cryptoTool: CryptoTool,
    private readonly textTool: TextTool,
    private readonly systemInfoTool: SystemInfoTool,
  ) {}

  onModuleInit() {
    // Core tools
    this.registry.registerTool(this.fsTool);
    this.registry.registerTool(this.gitTool);
    this.registry.registerTool(this.searchTool);
    this.registry.registerTool(this.metadataTool);
    
    // Network tools
    this.registry.registerTool(this.webFetchTool);
    this.registry.registerTool(this.shellTool);
    this.registry.registerTool(this.memoryTool);
    this.registry.registerTool(this.braveSearchTool);

    // Offline utility tools
    this.registry.registerTool(this.mathTool);
    this.registry.registerTool(this.dateTimeTool);
    this.registry.registerTool(this.jsonTool);
    this.registry.registerTool(this.cryptoTool);
    this.registry.registerTool(this.textTool);
    this.registry.registerTool(this.systemInfoTool);
  }
}
