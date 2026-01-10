import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole, AgentStatus, ArtifactStatus } from '@prisma/client';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('api/admin')
export class AdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get system statistics' })
  async getStats() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      totalUsers,
      adminUsers,
      totalProjects,
      activeProjects,
      totalTasks,
      pendingTasks,
      executingTasks,
      completedTasks,
      failedTasks,
      totalArtifacts,
      approvedArtifacts,
      rejectedArtifacts,
      draftArtifacts,
      totalKnowledge,
      patternKnowledge,
      snippetKnowledge,
      templateKnowledge,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: UserRole.ADMIN } }),
      this.prisma.project.count(),
      this.prisma.project.count({ where: { updatedAt: { gte: todayStart } } }),
      this.prisma.agentTask.count(),
      this.prisma.agentTask.count({ where: { status: AgentStatus.PENDING } }),
      this.prisma.agentTask.count({ where: { status: AgentStatus.EXECUTING } }),
      this.prisma.agentTask.count({ where: { status: AgentStatus.COMPLETED } }),
      this.prisma.agentTask.count({ where: { status: AgentStatus.FAILED } }),
      this.prisma.artifact.count(),
      this.prisma.artifact.count({ where: { status: ArtifactStatus.APPROVED } }),
      this.prisma.artifact.count({ where: { status: ArtifactStatus.REJECTED } }),
      this.prisma.artifact.count({ where: { status: ArtifactStatus.DRAFT } }),
      this.prisma.knowledgeEntry.count(),
      this.prisma.knowledgeEntry.count({ where: { type: 'CODE_PATTERN' } }),
      this.prisma.knowledgeEntry.count({ where: { type: 'SNIPPET' } }),
      this.prisma.knowledgeEntry.count({ where: { type: 'PROMPT_TEMPLATE' } }),
    ]);

    // Calculate uptime
    const uptimeSeconds = process.uptime();
    const days = Math.floor(uptimeSeconds / 86400);
    const hours = Math.floor((uptimeSeconds % 86400) / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const uptime = days > 0 ? `${days}d ${hours}h ${minutes}m` : `${hours}h ${minutes}m`;

    // Memory usage
    const memUsage = process.memoryUsage();
    const memoryUsage = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);

    return {
      users: {
        total: totalUsers,
        admins: adminUsers,
        active: totalUsers,
      },
      projects: {
        total: totalProjects,
        activeToday: activeProjects,
      },
      tasks: {
        total: totalTasks,
        pending: pendingTasks,
        executing: executingTasks,
        completed: completedTasks,
        failed: failedTasks,
      },
      artifacts: {
        total: totalArtifacts,
        approved: approvedArtifacts,
        rejected: rejectedArtifacts,
        draft: draftArtifacts,
      },
      knowledge: {
        total: totalKnowledge,
        patterns: patternKnowledge,
        snippets: snippetKnowledge,
        templates: templateKnowledge,
      },
      system: {
        uptime,
        memoryUsage,
        dbConnections: 1,
        nodeVersion: process.version,
      },
    };
  }

  @Get('users')
  @ApiOperation({ summary: 'Get all users' })
  async getUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            projects: true,
            agentTasks: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Patch('users/:id/role')
  @ApiOperation({ summary: 'Update user role' })
  async updateUserRole(
    @Param('id') id: string,
    @Body() body: { role: UserRole },
  ) {
    return this.prisma.user.update({
      where: { id },
      data: { role: body.role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Delete user' })
  async deleteUser(@Param('id') id: string) {
    return this.prisma.user.delete({
      where: { id },
    });
  }

  @Get('tasks/recent')
  @ApiOperation({ summary: 'Get recent tasks' })
  async getRecentTasks() {
    return this.prisma.agentTask.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true } },
        project: { select: { name: true } },
      },
    });
  }

  @Delete('tasks/old')
  @ApiOperation({ summary: 'Delete old completed tasks' })
  async deleteOldTasks() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await this.prisma.agentTask.deleteMany({
      where: {
        status: AgentStatus.COMPLETED,
        completedAt: { lt: thirtyDaysAgo },
      },
    });

    return { deleted: result.count };
  }

  @Get('ai-models')
  @ApiOperation({ summary: 'Get AI model settings' })
  async getAIModels() {
    return this.prisma.aIModelSetting.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post('ai-models')
  @ApiOperation({ summary: 'Create AI model' })
  async createAIModel(
    @Body() body: {
      name: string;
      provider: string;
      model: string;
      isActive?: boolean;
      settings?: object;
    },
  ) {
    return this.prisma.aIModelSetting.create({
      data: {
        name: body.name,
        provider: body.provider,
        model: body.model,
        isActive: body.isActive ?? true,
        isDefault: false,
        settings: body.settings || {},
      },
    });
  }

  @Patch('ai-models/:id')
  @ApiOperation({ summary: 'Update AI model' })
  async updateAIModel(
    @Param('id') id: string,
    @Body() body: { 
      name?: string;
      provider?: string;
      model?: string;
      isActive?: boolean; 
      settings?: object;
    },
  ) {
    return this.prisma.aIModelSetting.update({
      where: { id },
      data: body,
    });
  }

  @Delete('ai-models/:id')
  @ApiOperation({ summary: 'Delete AI model' })
  async deleteAIModel(@Param('id') id: string) {
    return this.prisma.aIModelSetting.delete({
      where: { id },
    });
  }

  @Patch('ai-models/:id/default')
  @ApiOperation({ summary: 'Set default AI model' })
  async setDefaultAIModel(@Param('id') id: string) {
    // Remove default from all
    await this.prisma.aIModelSetting.updateMany({
      data: { isDefault: false },
    });
    // Set new default
    return this.prisma.aIModelSetting.update({
      where: { id },
      data: { isDefault: true },
    });
  }


  @Get('export')
  @ApiOperation({ summary: 'Export all data' })
  async exportData() {
    const [users, projects, files, tasks, artifacts, knowledge, aiModels] = await Promise.all([
      this.prisma.user.findMany({ select: { id: true, email: true, name: true, role: true, createdAt: true } }),
      this.prisma.project.findMany({ select: { id: true, name: true, description: true, userId: true, createdAt: true } }),
      this.prisma.file.count(),
      this.prisma.agentTask.count(),
      this.prisma.artifact.count(),
      this.prisma.knowledgeEntry.count(),
      this.prisma.aIModelSetting.findMany(),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      summary: {
        users: users.length,
        projects: projects.length,
        files,
        tasks,
        artifacts,
        knowledge,
      },
      users,
      projects,
      aiModels,
    };
  }
}
