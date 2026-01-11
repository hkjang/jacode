import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { McpTool } from '../interfaces/mcp.interface';

@Injectable()
export class ToolRegistryService implements OnModuleInit {
  private readonly logger = new Logger(ToolRegistryService.name);
  private tools: Map<string, McpTool> = new Map();

  onModuleInit() {
    this.logger.log('ToolRegistryService initialized');
  }

  /**
   * Register a new tool
   */
  registerTool(tool: McpTool) {
    if (this.tools.has(tool.name)) {
      this.logger.warn(`Tool ${tool.name} is already registered. Overwriting.`);
    }
    this.tools.set(tool.name, tool);
    this.logger.log(`Registered tool: ${tool.name}`);
  }

  /**
   * Get a tool by name
   */
  getTool(name: string): McpTool | undefined {
    return this.tools.get(name);
  }

  /**
   * Get all registered tools
   */
  getTools(): McpTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tool schemas for LLM consumption
   */
  getToolDefinitions() {
    return this.getTools().map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
      },
    }));
  }

  /**
   * Remove a tool
   */
  unregisterTool(name: string) {
    this.tools.delete(name);
    this.logger.log(`Unregistered tool: ${name}`);
  }
}
