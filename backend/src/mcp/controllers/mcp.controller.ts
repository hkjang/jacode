import { Controller, Get, Post, Body, UseGuards, Param, Request } from '@nestjs/common';
import { ToolRegistryService } from '../services/tool-registry.service';
import { McpHostService } from '../services/mcp-host.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CircuitBreakerService } from '../../ai/services/circuit-breaker.service';

@Controller('api/admin/mcp')
export class McpController {
  constructor(
    private readonly toolRegistry: ToolRegistryService,
    private readonly mcpHost: McpHostService,
    private readonly circuitBreaker: CircuitBreakerService,
  ) {}

  @Get('tools')
  async getTools() {
    return this.toolRegistry.getTools().map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      requiredPermissions: tool.requiredPermissions,
    }));
  }

  @Get('tools/:name')
  async getTool(@Param('name') name: string) {
    const tool = this.toolRegistry.getTool(name);
    if (!tool) {
      return { error: 'Tool not found' };
    }
    return {
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    };
  }

  @Post('execute')
  @UseGuards(JwtAuthGuard)
  async executeTool(@Body() toolCall: { name: string; args: any; projectId?: string }, @Request() req: any) {
    const context = {
      userId: req.user.id,
      userRole: req.user.role,
      projectId: toolCall.projectId, // Optional, can be null
    };

    return this.mcpHost.executeTool(toolCall.name, toolCall.args, context as any);
  }

  @Post('reset-circuit')
  @UseGuards(JwtAuthGuard)
  async resetCircuit(@Body() body: { toolName: string }) {
    const circuitId = `mcp-tool:${body.toolName}`;
    this.circuitBreaker.reset(circuitId);
    return { success: true, message: `Circuit breaker for ${body.toolName} has been reset.` };
  }

  @Get('circuit-status')
  async getCircuitStatus() {
    const allStates = this.circuitBreaker.getAllStates();
    const mcpCircuits: Record<string, any> = {};
    allStates.forEach((metrics, key) => {
      if (key.startsWith('mcp-tool:')) {
        mcpCircuits[key.replace('mcp-tool:', '')] = metrics;
      }
    });
    return mcpCircuits;
  }
}
