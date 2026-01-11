import { Injectable, Logger } from '@nestjs/common';
import { Tool, ToolResult, ToolContext, JSONSchema } from '../interfaces/tool.interface';

/**
 * Tool Registry Service
 * 
 * Manages registration and retrieval of agent tools.
 * Provides tool descriptions for LLM prompting.
 */
@Injectable()
export class ToolRegistryService {
  private readonly logger = new Logger(ToolRegistryService.name);
  private readonly tools = new Map<string, Tool>();

  /**
   * Register a tool with the registry
   */
  register(tool: Tool): void {
    if (this.tools.has(tool.name)) {
      this.logger.warn(`Tool '${tool.name}' is being overwritten`);
    }
    this.tools.set(tool.name, tool);
    this.logger.log(`Registered tool: ${tool.name}`);
  }

  /**
   * Register multiple tools at once
   */
  registerAll(tools: Tool[]): void {
    for (const tool of tools) {
      this.register(tool);
    }
  }

  /**
   * Get a tool by name
   */
  getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  /**
   * Get all registered tools
   */
  getAllTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get list of registered tool names
   */
  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Check if a tool is registered
   */
  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Unregister a tool
   */
  unregister(name: string): boolean {
    const existed = this.tools.has(name);
    this.tools.delete(name);
    if (existed) {
      this.logger.log(`Unregistered tool: ${name}`);
    }
    return existed;
  }

  /**
   * Execute a tool by name
   */
  async executeTool(
    name: string,
    args: Record<string, any>,
    context: ToolContext,
  ): Promise<ToolResult> {
    const tool = this.tools.get(name);
    
    if (!tool) {
      return {
        success: false,
        output: '',
        error: `Tool '${name}' not found`,
      };
    }

    // Validate arguments if tool provides validation
    if (tool.validate) {
      const validation = tool.validate(args);
      if (!validation.valid) {
        return {
          success: false,
          output: '',
          error: `Invalid arguments: ${validation.errors?.join(', ')}`,
        };
      }
    }

    const startTime = Date.now();
    
    try {
      const result = await tool.execute(args, context);
      result.metadata = {
        ...result.metadata,
        durationMs: Date.now() - startTime,
      };
      return result;
    } catch (error) {
      this.logger.error(`Tool '${name}' execution failed:`, error);
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          durationMs: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Generate tool descriptions for LLM system prompt
   * Format optimized for function calling
   */
  getToolDescriptions(toolNames?: string[]): string {
    const tools = toolNames
      ? toolNames.map(name => this.tools.get(name)).filter(Boolean) as Tool[]
      : this.getAllTools();

    if (tools.length === 0) {
      return 'No tools available.';
    }

    const descriptions = tools.map(tool => {
      const params = this.formatParameters(tool.parameters);
      return `### ${tool.name}
${tool.description}

Parameters:
${params}`;
    });

    return `## Available Tools

You can use the following tools to accomplish tasks. To use a tool, respond with:

<tool_call>
<name>tool_name</name>
<arguments>
{
  "param1": "value1",
  "param2": "value2"
}
</arguments>
</tool_call>

${descriptions.join('\n\n---\n\n')}`;
  }

  /**
   * Generate OpenAI-style function definitions for tools
   */
  getToolsAsOpenAIFunctions(toolNames?: string[]): Array<{
    type: 'function';
    function: {
      name: string;
      description: string;
      parameters: JSONSchema;
    };
  }> {
    const tools = toolNames
      ? toolNames.map(name => this.tools.get(name)).filter(Boolean) as Tool[]
      : this.getAllTools();

    return tools.map(tool => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
  }

  /**
   * Format parameters for display
   */
  private formatParameters(schema: JSONSchema): string {
    if (!schema.properties || Object.keys(schema.properties).length === 0) {
      return '  (none)';
    }

    const required = new Set(schema.required || []);
    
    return Object.entries(schema.properties)
      .map(([name, prop]) => {
        const isRequired = required.has(name);
        const reqMarker = isRequired ? ' (required)' : '';
        return `  - ${name}: ${prop.type}${reqMarker}
    ${prop.description || 'No description'}`;
      })
      .join('\n');
  }
}
