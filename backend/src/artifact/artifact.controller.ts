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
import { ArtifactService } from './artifact.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ArtifactStatus, ArtifactType } from '@prisma/client';

@ApiTags('artifacts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/artifacts')
export class ArtifactController {
  constructor(private readonly artifactService: ArtifactService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get artifact by ID' })
  @ApiParam({ name: 'id', type: String })
  async getArtifact(@Param('id') id: string) {
    return this.artifactService.getArtifact(id);
  }

  @Get('task/:taskId')
  @ApiOperation({ summary: 'Get artifacts for a task' })
  @ApiParam({ name: 'taskId', type: String })
  async getArtifactsByTask(@Param('taskId') taskId: string) {
    return this.artifactService.getArtifactsByTask(taskId);
  }

  @Get('project/:projectId')
  @ApiOperation({ summary: 'Get artifacts by type for a project' })
  @ApiParam({ name: 'projectId', type: String })
  @ApiQuery({ name: 'type', enum: ArtifactType })
  async getArtifactsByType(
    @Param('projectId') projectId: string,
    @Query('type') type: ArtifactType,
  ) {
    return this.artifactService.getArtifactsByType(projectId, type);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update artifact status' })
  @ApiParam({ name: 'id', type: String })
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: ArtifactStatus },
  ) {
    return this.artifactService.updateStatus(id, body.status);
  }

  @Post(':id/feedback')
  @ApiOperation({ summary: 'Add feedback to artifact' })
  @ApiParam({ name: 'id', type: String })
  async addFeedback(
    @Param('id') id: string,
    @Body() body: { rating?: number; comment?: string; lineComments?: object[] },
  ) {
    return this.artifactService.addFeedback(id, body);
  }

  @Post(':id/apply')
  @ApiOperation({ summary: 'Apply code artifact to file' })
  @ApiParam({ name: 'id', type: String })
  async applyArtifact(@Param('id') id: string) {
    return this.artifactService.applyCodeArtifact(id);
  }

  @Get('recent')
  @ApiOperation({ summary: 'Get recent artifacts for user' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getRecentArtifacts(@Request() req: any, @Query('limit') limit?: number) {
    return this.artifactService.getRecentArtifacts(req.user.sub, limit);
  }
}
