import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';

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

@Controller('api/admin/code-styles')
@UseGuards(JwtAuthGuard)
export class CodeStyleController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all code style presets
   */
  @Get()
  async getAll() {
    return this.prisma.codeStylePreset.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get preset by ID
   */
  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.prisma.codeStylePreset.findUnique({
      where: { id },
    });
  }

  /**
   * Create new preset
   */
  @Post()
  async create(@Body() dto: CreateStylePresetDto) {
    return this.prisma.codeStylePreset.create({
      data: {
        name: dto.name,
        language: dto.language,
        rules: dto.rules || {},
        conventions: dto.conventions,
        isGlobal: dto.isGlobal || false,
      },
    });
  }

  /**
   * Update preset
   */
  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateStylePresetDto) {
    return this.prisma.codeStylePreset.update({
      where: { id },
      data: dto as any,
    });
  }

  /**
   * Delete preset
   */
  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.prisma.codeStylePreset.delete({
      where: { id },
    });
  }

  /**
   * Get presets by language
   */
  @Get('language/:language')
  async getByLanguage(@Param('language') language: string) {
    return this.prisma.codeStylePreset.findMany({
      where: { language },
    });
  }
}
