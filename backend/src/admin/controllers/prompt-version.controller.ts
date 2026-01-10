import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('api/admin/prompts')
@UseGuards(JwtAuthGuard)
export class PromptVersionController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all prompt templates
   */
  @Get()
  async getAllTemplates() {
    return this.prisma.promptTemplate.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get template by ID
   */
  @Get(':id')
  async getTemplate(@Param('id') id: string) {
    return this.prisma.promptTemplate.findUnique({
      where: { id },
    });
  }

  /**
   * Create template
   */
  @Post()
  async createTemplate(@Body() body: { name: string; content: string; description?: string; type?: string }) {
    return this.prisma.promptTemplate.create({
      data: {
        name: body.name,
        content: body.content,
        description: body.description,
        type: (body.type as any) || 'CUSTOM',
        variables: [],
        version: 1,
      },
    });
  }

  /**
   * Update template
   */
  @Patch(':id')
  async updateTemplate(
    @Param('id') id: string,
    @Body() body: { content?: string; description?: string },
  ) {
    const current = await this.prisma.promptTemplate.findUnique({ where: { id } });
    
    return this.prisma.promptTemplate.update({
      where: { id },
      data: {
        content: body.content || current?.content,
        description: body.description || current?.description,
        version: (current?.version || 0) + 1,
      },
    });
  }

  /**
   * Delete template
   */
  @Delete(':id')
  async deleteTemplate(@Param('id') id: string) {
    return this.prisma.promptTemplate.delete({
      where: { id },
    });
  }

  /**
   * Render template with variables
   */
  @Post(':id/render')
  async renderTemplate(
    @Param('id') id: string,
    @Body() body: { variables: Record<string, string> },
  ) {
    const template = await this.prisma.promptTemplate.findUnique({ where: { id } });
    if (!template) {
      throw new Error('Template not found');
    }

    let rendered = template.content;
    for (const [key, value] of Object.entries(body.variables)) {
      rendered = rendered.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }

    return { rendered };
  }
}
