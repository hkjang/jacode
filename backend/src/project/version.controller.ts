import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { VersionService } from './version.service';

class CreateSnapshotDto {
  name: string;
  description?: string;
}

@ApiTags('Versions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/projects/:projectId/versions')
export class VersionController {
  constructor(private readonly versionService: VersionService) {}

  @Post('snapshots')
  @ApiOperation({ summary: 'Create a project snapshot' })
  async createSnapshot(
    @Param('projectId') projectId: string,
    @Body() dto: CreateSnapshotDto,
  ) {
    return this.versionService.createSnapshot(projectId, dto.name, dto.description);
  }

  @Get('snapshots')
  @ApiOperation({ summary: 'Get all snapshots for a project' })
  async getSnapshots(@Param('projectId') projectId: string) {
    return this.versionService.getSnapshots(projectId);
  }

  @Get('snapshots/:id')
  @ApiOperation({ summary: 'Get a specific snapshot' })
  async getSnapshot(@Param('id') id: string) {
    return this.versionService.getSnapshot(id);
  }

  @Get('snapshots/compare')
  @ApiOperation({ summary: 'Compare two snapshots' })
  async compareSnapshots(
    @Query('from') fromId: string,
    @Query('to') toId: string,
  ) {
    return this.versionService.compareSnapshots(fromId, toId);
  }

  @Post('snapshots/:id/rollback')
  @ApiOperation({ summary: 'Rollback to a snapshot' })
  async rollbackToSnapshot(@Param('id') id: string) {
    return this.versionService.rollbackToSnapshot(id);
  }

  @Delete('snapshots/:id')
  @ApiOperation({ summary: 'Delete a snapshot' })
  async deleteSnapshot(@Param('id') id: string) {
    return this.versionService.deleteSnapshot(id);
  }
}
