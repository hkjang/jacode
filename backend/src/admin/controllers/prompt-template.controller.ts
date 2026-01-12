import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole, PromptType } from '@prisma/client';
import { PromptTemplateService } from '../services/prompt-template.service';

@ApiTags('admin/prompts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.EDITOR)
@Controller('api/admin/prompts')
export class PromptTemplateController {
  constructor(private readonly service: PromptTemplateService) {}

  @Get()
  @ApiOperation({ summary: 'Get all prompt templates' })
  findAll(@Query('type') type?: PromptType) {
    return this.service.findAll(type);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get template by ID' })
  findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Get(':id/versions')
  @ApiOperation({ summary: 'Get template version history' })
  getVersions(@Param('id') id: string) {
    return this.service.getVersionHistory(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create prompt template' })
  create(@Body() data: {
    name: string;
    type: PromptType;
    description?: string;
    content: string;
    variables?: string[];
  }) {
    return this.service.create(data);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update prompt template' })
  update(
    @Param('id') id: string,
    @Body() data: { name?: string; description?: string; content?: string; isActive?: boolean },
    @Query('changeLog') changeLog?: string,
  ) {
    return this.service.update(id, data, changeLog);
  }

  @Post(':id/rollback/:version')
  @ApiOperation({ summary: 'Rollback to specific version' })
  rollback(@Param('id') id: string, @Param('version') version: string) {
    return this.service.rollback(id, parseInt(version));
  }

  @Get(':id/versions/:version')
  @ApiOperation({ summary: 'Get specific version content' })
  getVersionContent(@Param('id') id: string, @Param('version') version: string) {
    return this.service.getVersionContent(id, parseInt(version));
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate a template' })
  duplicate(
    @Param('id') id: string,
    @Body() data?: { name?: string }
  ) {
    return this.service.duplicate(id, data?.name);
  }

  @Post('render')
  @ApiOperation({ summary: 'Render template with variables' })
  render(@Body() data: { content: string; variables: Record<string, string> }) {
    return { rendered: this.service.render(data.content, data.variables) };
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete prompt template' })
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }

  @Post('initialize')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Initialize default templates' })
  initialize() {
    return this.service.initializeDefaults();
  }
}
