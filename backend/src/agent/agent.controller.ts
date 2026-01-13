import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AgentService } from './agent.service';
import { CreateAgentTaskDto } from './dto/create-agent-task.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AgentStatus } from '@prisma/client';
import { QueueService } from '../queue/queue.service';
import { ToolRegistryService } from './services/tool-registry.service';
import { PrismaService } from '../prisma/prisma.service';
import { AgentOrchestratorService } from './services/agent-orchestrator.service';
import { SessionManagerService } from './services/session-manager.service';
import { GitService } from './services/git.service';
import { TokenTrackingService } from '../ai/services/token-tracking.service';
import { ASTSkeletonService } from './services/ast-skeleton.service';
import { ValidationService } from './services/validation.service';

@ApiTags('agents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/agents')
export class AgentController {
  constructor(
    private readonly agentService: AgentService,
    private readonly queueService: QueueService,
    private readonly toolRegistry: ToolRegistryService,
    private readonly prisma: PrismaService,
    private readonly orchestrator: AgentOrchestratorService,
    private readonly sessions: SessionManagerService,
    private readonly git: GitService,
    private readonly tokenTracker: TokenTrackingService,
    private readonly astSkeleton: ASTSkeletonService,
    private readonly validation: ValidationService,
  ) {}

  @Post('tasks')
  @ApiOperation({ summary: 'Create a new agent task' })
  async createTask(@Request() req: any, @Body() dto: CreateAgentTaskDto) {
    return this.agentService.createTask(req.user.sub, dto);
  }

  @Get('tasks')
  @ApiOperation({ summary: 'Get tasks by status' })
  @ApiQuery({ name: 'status', required: false, enum: AgentStatus, isArray: true })
  async getTasks(
    @Request() req: any,
    @Query('status') status?: AgentStatus | AgentStatus[],
  ) {
    const statuses = status
      ? Array.isArray(status) ? status : [status]
      : [AgentStatus.PENDING, AgentStatus.PLANNING, AgentStatus.EXECUTING, AgentStatus.WAITING_APPROVAL];

    return this.agentService.getTasksByStatus(req.user.sub, statuses);
  }

  @Get('projects/:projectId/tasks')
  @ApiOperation({ summary: 'Get all tasks for a project' })
  @ApiParam({ name: 'projectId', type: String })
  async getProjectTasks(
    @Request() req: any,
    @Param('projectId') projectId: string,
  ) {
    return this.agentService.getTasksByProject(projectId, req.user.sub);
  }

  @Get('tasks/:id')
  @ApiOperation({ summary: 'Get a single task' })
  @ApiParam({ name: 'id', type: String })
  async getTask(@Request() req: any, @Param('id') id: string) {
    return this.agentService.getTask(id, req.user.sub);
  }

  // ============================================================================
  // New Endpoints for Enhanced Agent System
  // ============================================================================

  @Get('tasks/:id/steps')
  @ApiOperation({ summary: 'Get execution steps for a task' })
  @ApiParam({ name: 'id', type: String })
  async getTaskSteps(@Request() req: any, @Param('id') id: string) {
    // Verify user owns the task
    await this.agentService.getTask(id, req.user.sub);
    
    return this.prisma.agentStep.findMany({
      where: { taskId: id },
      orderBy: { stepNumber: 'asc' },
    });
  }

  @Get('tasks/:id/memory')
  @ApiOperation({ summary: 'Get memory/context for a task' })
  @ApiParam({ name: 'id', type: String })
  async getTaskMemory(@Request() req: any, @Param('id') id: string) {
    // Verify user owns the task
    await this.agentService.getTask(id, req.user.sub);
    
    return this.prisma.agentMemory.findMany({
      where: { taskId: id },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get('tools')
  @ApiOperation({ summary: 'Get list of registered tools' })
  async getTools() {
    const tools = this.toolRegistry.getAllTools();
    
    // Also get tool config from database
    const dbTools = await this.prisma.agentTool.findMany();
    const dbToolMap = new Map(dbTools.map(t => [t.name, t]));
    
    return tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
      isEnabled: dbToolMap.get(tool.name)?.isEnabled ?? true,
      usageCount: dbToolMap.get(tool.name)?.usageCount ?? 0,
    }));
  }

  @Patch('tools/:name')
  @ApiOperation({ summary: 'Enable or disable a tool' })
  @ApiParam({ name: 'name', type: String })
  async updateTool(
    @Param('name') name: string,
    @Body() body: { isEnabled?: boolean; config?: any },
  ) {
    return this.prisma.agentTool.upsert({
      where: { name },
      update: {
        isEnabled: body.isEnabled,
        config: body.config || {},
      },
      create: {
        name,
        isEnabled: body.isEnabled ?? true,
        config: body.config || {},
      },
    });
  }

  // ============================================================================
  // Original Endpoints
  // ============================================================================

  @Post('tasks/:id/cancel')
  @ApiOperation({ summary: 'Cancel a task' })
  @ApiParam({ name: 'id', type: String })
  async cancelTask(@Request() req: any, @Param('id') id: string) {
    return this.agentService.cancelTask(id, req.user.sub);
  }

  @Post('tasks/:id/retry')
  @ApiOperation({ summary: 'Retry a failed task' })
  @ApiParam({ name: 'id', type: String })
  async retryTask(@Request() req: any, @Param('id') id: string) {
    return this.agentService.retryTask(id, req.user.sub);
  }

  @Patch('tasks/:id/priority')
  @ApiOperation({ summary: 'Update task priority' })
  @ApiParam({ name: 'id', type: String })
  async updatePriority(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { priority: number },
  ) {
    return this.agentService.updatePriority(id, req.user.sub, body.priority);
  }

  @Post('tasks/:id/approve')
  @ApiOperation({ summary: 'Approve task and apply changes' })
  @ApiParam({ name: 'id', type: String })
  async approveTask(@Request() req: any, @Param('id') id: string) {
    return this.agentService.approveTask(id, req.user.sub);
  }

  @Post('tasks/:id/reject')
  @ApiOperation({ summary: 'Reject task' })
  @ApiParam({ name: 'id', type: String })
  async rejectTask(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    return this.agentService.rejectTask(id, req.user.sub, body.reason);
  }

  @Get('groups')
  @ApiOperation({ summary: 'Get task group summary' })
  async getTaskGroups(@Request() req: any) {
    return this.agentService.getTaskGroups(req.user.sub);
  }

  @Get('queue-stats')
  @ApiOperation({ summary: 'Get queue statistics' })
  async getQueueStats() {
    return this.queueService.getAllQueueStats();
  }

  // ============================================================================
  // AST Analysis Endpoints
  // ============================================================================

  @Post('ast/analyze')
  @ApiOperation({ summary: 'Analyze file and extract symbols' })
  async analyzeFile(
    @Body() body: { filePath: string; content: string },
  ) {
    // Use ASTSkeletonService for analysis
    try {
      const skeleton = await this.astSkeleton.generateSkeleton(body.content, body.filePath);
      return {
        language: skeleton.language,
        lineCount: skeleton.lineCount,
        symbols: skeleton.symbols,
        imports: { imports: skeleton.imports.map(i => ({ source: i, name: i.split('/').pop() })) },
        exports: { exports: skeleton.exports },
      };
    } catch (error: any) {
      return { error: error.message, symbols: [], imports: [], exports: [] };
    }
  }

  @Post('ast/skeleton')
  @ApiOperation({ summary: 'Generate AST skeleton for context optimization' })
  async getASTSkeleton(
    @Body() body: { filePath: string; content: string; options?: object },
  ) {
    const { ASTSkeletonService } = await import('./services/ast-skeleton.service');
    const skeletonService = new ASTSkeletonService();
    
    const skeleton = await skeletonService.generateSkeleton(
      body.content, 
      body.filePath,
      body.options as any
    );
    
    return {
      ...skeleton,
      formatted: skeletonService.formatForContext(skeleton),
    };
  }

  @Post('ast/diff')
  @ApiOperation({ summary: 'Generate diff between original and modified code' })
  async generateDiff(
    @Body() body: { original: string; modified: string; filePath?: string },
  ) {
    const { CodeDiffService } = await import('./services/code-diff.service');
    const diffService = new CodeDiffService();
    
    const diff = diffService.generateDiff(
      body.original,
      body.modified,
      body.filePath || 'file'
    );
    
    return {
      ...diff,
      markdown: diffService.formatAsMarkdown(diff),
    };
  }

  @Get('ast/supported-languages')
  @ApiOperation({ summary: 'Get list of supported languages for AST parsing' })
  async getSupportedLanguages() {
    return {
      languages: [
        { id: 'typescript', extensions: ['.ts', '.tsx'], name: 'TypeScript' },
        { id: 'javascript', extensions: ['.js', '.jsx', '.mjs'], name: 'JavaScript' },
        { id: 'python', extensions: ['.py'], name: 'Python' },
        { id: 'java', extensions: ['.java'], name: 'Java' },
        { id: 'go', extensions: ['.go'], name: 'Go' },
      ],
    };
  }

  @Post('validation/check')
  @ApiOperation({ summary: 'Run validation checks on project' })
  async runValidation(
    @Body() body: { projectRoot: string; checks?: string[] },
  ) {
    const result = await this.validation.runFullValidation(body.projectRoot);
    return result;
  }
}
