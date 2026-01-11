import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ToolRegistryService } from './tool-registry.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AIService } from '../../ai/ai.service';
import { FileSystemTool } from '../tools/file-system.tool';
import { CodeAnalysisTool } from '../tools/code-analysis.tool';
import { CodeGeneratorTool } from '../tools/code-generator.tool';

/**
 * Tool Initializer
 * 
 * Registers all built-in tools when the module starts.
 * Called after module initialization.
 */
@Injectable()
export class ToolInitializer implements OnModuleInit {
  private readonly logger = new Logger(ToolInitializer.name);

  constructor(
    private readonly toolRegistry: ToolRegistryService,
    private readonly prisma: PrismaService,
    private readonly aiService: AIService,
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing agent tools...');

    // Register built-in tools
    const tools = [
      new FileSystemTool(this.prisma),
      new CodeAnalysisTool(this.prisma),
      new CodeGeneratorTool(this.aiService),
    ];

    this.toolRegistry.registerAll(tools);

    // Sync tools to database for admin management
    await this.syncToolsToDatabase(tools);

    this.logger.log(`Registered ${tools.length} agent tools`);
  }

  /**
   * Sync registered tools to AgentTool table for admin configuration
   */
  private async syncToolsToDatabase(tools: any[]) {
    for (const tool of tools) {
      try {
        await this.prisma.agentTool.upsert({
          where: { name: tool.name },
          update: {
            description: tool.description,
          },
          create: {
            name: tool.name,
            description: tool.description,
            isEnabled: true,
            config: {},
          },
        });
      } catch (error) {
        // Table might not exist yet
        this.logger.debug(`Could not sync tool ${tool.name} to database: ${error}`);
      }
    }
  }
}
