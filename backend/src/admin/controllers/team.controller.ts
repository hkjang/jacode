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
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { TeamService } from '../services/team.service';

@ApiTags('admin/teams')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('api/admin/teams')
export class TeamController {
  constructor(private readonly service: TeamService) {}

  @Get()
  @ApiOperation({ summary: 'Get all teams' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get team by ID' })
  findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'Get team members' })
  getMembers(@Param('id') id: string) {
    return this.service.getMembers(id);
  }

  @Get(':id/usage')
  @ApiOperation({ summary: 'Check team usage limit' })
  checkUsage(@Param('id') id: string) {
    return this.service.checkUsageLimit(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create team' })
  create(@Body() data: { name: string; description?: string; usageLimit?: number }) {
    return this.service.create(data);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update team' })
  update(@Param('id') id: string, @Body() data: any) {
    return this.service.update(id, data);
  }

  @Post(':id/members/:userId')
  @ApiOperation({ summary: 'Add member to team' })
  addMember(@Param('id') id: string, @Param('userId') userId: string) {
    return this.service.addMember(id, userId);
  }

  @Delete(':id/members/:userId')
  @ApiOperation({ summary: 'Remove member from team' })
  removeMember(@Param('userId') userId: string) {
    return this.service.removeMember(userId);
  }

  @Post(':id/reset-usage')
  @ApiOperation({ summary: 'Reset team usage' })
  resetUsage(@Param('id') id: string) {
    return this.service.resetUsage(id);
  }

  @Post('reset-all-usage')
  @ApiOperation({ summary: 'Reset all teams usage' })
  resetAllUsage() {
    return this.service.resetAllUsage();
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete team' })
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
