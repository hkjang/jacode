import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { CodeStyleService } from '../../ai/services/code-style.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

export class CreateStylePresetDto {
  name: string;
  language: string;
  rules: any;
  conventions: string;
  teamId?: string;
  isGlobal?: boolean;
}

export class UpdateStylePresetDto {
  name?: string;
  rules?: any;
  conventions?: string;
  isActive?: boolean;
}

@Controller('admin/code-styles')
@UseGuards(JwtAuthGuard)
export class CodeStyleController {
  constructor(private readonly codeStyleService: CodeStyleService) {}

  /**
   * Get all code style presets
   */
  @Get()
  async getAll() {
    return this.codeStyleService.getAllPresets();
  }

  /**
   * Get preset by ID
   */
  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.codeStyleService.getPresetById(id);
  }

  /**
   * Create new preset
   */
  @Post()
  async create(@Body() dto: CreateStylePresetDto) {
    return this.codeStyleService.createCustomPreset(
      dto.name,
      dto.language,
      dto.rules,
      dto.conventions,
      dto.teamId
    );
  }

  /**
   * Update preset
   */
  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateStylePresetDto) {
    return this.codeStyleService.updatePreset(id, dto);
  }

  /**
   * Delete preset
   */
  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.codeStyleService.deletePreset(id);
  }

  /**
   * Get presets by language
   */
  @Get('language/:language')
  async getByLanguage(@Param('language') language: string) {
    return this.codeStyleService.getPresetsByLanguage(language);
  }

  /**
   * Apply style to code (test)
   */
  @Post('apply')
  async applyStyle(@Body() body: { code: string; presetId: string }) {
    const preset = await this.codeStyleService.getPresetById(body.presetId);
    return this.codeStyleService.applyStyle(body.code, preset);
  }
}
