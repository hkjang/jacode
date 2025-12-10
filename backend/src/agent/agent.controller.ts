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

@ApiTags('agents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/agents')
export class AgentController {
  constructor(
    private readonly agentService: AgentService,
    private readonly queueService: QueueService,
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
}

