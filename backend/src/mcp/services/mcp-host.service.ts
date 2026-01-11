import { Injectable, Logger } from '@nestjs/common';
import { ToolRegistryService } from './tool-registry.service';
import { PermissionService } from './permission.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CircuitBreakerService } from '../../ai/services/circuit-breaker.service';
import { McpContext, McpErrorCodes, McpToolResult } from '../interfaces/mcp.interface';

@Injectable()
export class McpHostService {
  private readonly logger = new Logger(McpHostService.name);

  constructor(
    private readonly toolRegistry: ToolRegistryService,
    private readonly permissionService: PermissionService,
    private readonly prisma: PrismaService,
    private readonly circuitBreaker: CircuitBreakerService,
  ) {}

  private readonly cache = new Map<string, { result: McpToolResult; timestamp: number }>();
  private readonly CACHE_TTL = 60000; // 1 minute

  /**
   * Execute a tool call
   */
  async executeTool(
    toolName: string,
    args: any,
    context: McpContext,
  ): Promise<McpToolResult> {
    const startTime = Date.now();
    this.logger.log(`Executing tool: ${toolName} for user ${context.userId}`);

    try {
      // 1. Validate Tool Existence
      const tool = this.toolRegistry.getTool(toolName);
      if (!tool) {
        return {
          content: [],
          isError: true,
          error: {
            code: McpErrorCodes.UnknownTool,
            message: `Tool not found: ${toolName}`,
          },
        } as any;
      }

      // 2. Validate Permissions
      const hasPermission = await this.permissionService.checkPermission(
        context.userId,
        toolName,
        tool.requiredPermissions,
      );

      if (!hasPermission) {
        return {
          content: [],
          isError: true,
          error: {
            code: McpErrorCodes.PermissionDenied,
            message: `Permission denied for tool: ${toolName}`,
          },
        } as any;
      }

      // 3. Validate Project Access (if project context exists)
      if (context.projectId) {
        const hasProjectAccess = await this.permissionService.checkProjectAccess(
          context.userId,
          context.projectId,
          context.userRole,
        );
        if (!hasProjectAccess) {
          return {
            content: [],
            isError: true,
            error: {
              code: McpErrorCodes.PermissionDenied,
              message: `Access denied to project: ${context.projectId}`,
            },
          } as any;
        }

        // Fetch project to get working directory if not already provided
        if (!context.workingDirectory) {
            const project = await this.prisma.project.findUnique({
                where: { id: context.projectId },
                select: { rootPath: true }
            });
            if (project && project.rootPath) {
                context.workingDirectory = project.rootPath;
            }
        }
      }

      // 4. Validate Arguments (Optional, if schema validator available)
      // TODO: Implement JSON Schema validation

      // 4. Circuit Breaker Check
      if (this.circuitBreaker.isOpen(`mcp-tool:${toolName}`)) {
        return {
          content: [],
          isError: true,
          error: {
            code: McpErrorCodes.ToolExecutionError,
            message: `Circuit breaker is open for tool: ${toolName}. Too many failures.`,
          },
        } as any;
      }

      // 5. Check Cache (for read operations)
      const cacheKey = `${toolName}:${JSON.stringify(args)}:${context.projectId}`;
      const isCacheable = toolName.startsWith('filesystem_read') || toolName.startsWith('git_diff') || toolName.startsWith('code_search');
      
      if (isCacheable) {
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
          this.logger.log(`Cache hit for tool: ${toolName}`);
          return { ...cached.result, metadata: { ...cached.result.metadata, cached: true } };
        }
      }

      // 6. Execute Tool
      let result;
      try {
        result = await tool.execute(args, context);
        this.circuitBreaker.recordSuccess(`mcp-tool:${toolName}`);
        
        if (isCacheable && !result.isError) {
          this.cache.set(cacheKey, { result, timestamp: Date.now() });
        }
      } catch (execError) {
        this.circuitBreaker.recordFailure(`mcp-tool:${toolName}`);
        throw execError;
      }

      // 7. Log Execution (Audit)
      await this.prisma.activityLog.create({
        data: {
          userId: context.userId,
          action: 'MCP_TOOL_EXECUTE',
          resource: toolName,
          resourceId: context.projectId,
          metadata: {
            inputs: args,
            success: true,
            executionTime: Date.now() - startTime
          }
        }
      });

      return {
        ...result,
        metadata: {
          ...result.metadata,
          serverDuration: Date.now() - startTime,
        },
      };

    } catch (error) {
      this.logger.error(`Tool execution failed: ${toolName}`, error);
      await this.prisma.activityLog.create({
        data: {
          userId: context.userId,
          action: 'MCP_TOOL_EXECUTE',
          resource: toolName,
          resourceId: context.projectId,
          metadata: {
            inputs: args,
            success: false,
            error: error instanceof Error ? error.message : String(error),
            executionTime: Date.now() - startTime
          }
        }
      });
      return {
        content: [],
        isError: true,
        error: {
          code: McpErrorCodes.ToolExecutionError,
          message: error instanceof Error ? error.message : String(error),
        },
      } as any;
    }
  }

  /**
   * Get available tools for a user context
   */
  async getAvailableTools(userId: string): Promise<any[]> {
    const tools = this.toolRegistry.getTools();
    // Filter by permission if needed
    // For now return all, as LLM needs to know what's possible
    return this.toolRegistry.getToolDefinitions();
  }
}
