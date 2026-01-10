import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Query } from '@nestjs/common';
import { PromptVersioningService } from '../../ai/services/prompt-versioning.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

export class CreatePromptVersionDto {
  templateId: string;
  content: string;
  variables: string[];
  description?: string;
}

export class RenderPromptDto {
  templateId: string;
  variables: Record<string, string>;
}

@Controller('admin/prompts')
@UseGuards(JwtAuthGuard)
export class PromptVersionController {
  constructor(private readonly promptVersioning: PromptVersioningService) {}

  /**
   * Get all templates
   */
  @Get()
  async getAll() {
    return this.promptVersioning.getAllTemplates();
  }

  /**
   * Get template by ID
   */
  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.promptVersioning.getTemplate(id);
  }

  /**
   * Get template versions
   */
  @Get(':id/versions')
  async getVersions(@Param('id') id: string) {
    return this.promptVersioning.getVersionHistory(id);
  }

  /**
   * Create new version
   */
  @Post(':id/versions')
  async createVersion(@Param('id') id: string, @Body() dto: CreatePromptVersionDto) {
    return this.promptVersioning.saveVersion(id, dto.content, dto.variables, dto.description);
  }

  /**
   * Get specific version
   */
  @Get(':id/versions/:version')
  async getVersion(@Param('id') id: string, @Param('version') version: string) {
    return this.promptVersioning.getSpecificVersion(id, parseInt(version, 10));
  }

  /**
   * Rollback to version
   */
  @Post(':id/rollback/:version')
  async rollback(@Param('id') id: string, @Param('version') version: string) {
    return this.promptVersioning.rollbackToVersion(id, parseInt(version, 10));
  }

  /**
   * Compare versions
   */
  @Get(':id/compare')
  async compare(
    @Param('id') id: string,
    @Query('v1') v1: string,
    @Query('v2') v2: string
  ) {
    return this.promptVersioning.compareVersions(id, parseInt(v1, 10), parseInt(v2, 10));
  }

  /**
   * Render template with variables
   */
  @Post(':id/render')
  async render(@Param('id') id: string, @Body() dto: RenderPromptDto) {
    return this.promptVersioning.renderTemplate(id, dto.variables);
  }

  /**
   * Validate template
   */
  @Post(':id/validate')
  async validate(@Param('id') id: string, @Body() body: { content: string; variables: string[] }) {
    return this.promptVersioning.validateTemplate(body.content, body.variables);
  }
}
