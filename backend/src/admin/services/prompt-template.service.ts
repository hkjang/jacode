import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PromptType } from '@prisma/client';

@Injectable()
export class PromptTemplateService {
  private readonly logger = new Logger(PromptTemplateService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ==================== CRUD ====================

  async findAll(type?: PromptType) {
    return this.prisma.promptTemplate.findMany({
      where: type ? { type } : undefined,
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 5,
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    return this.prisma.promptTemplate.findUnique({
      where: { id },
      include: {
        versions: {
          orderBy: { version: 'desc' },
        },
      },
    });
  }

  async findByName(name: string) {
    return this.prisma.promptTemplate.findUnique({
      where: { name },
    });
  }

  async findActive(type: PromptType) {
    return this.prisma.promptTemplate.findFirst({
      where: { type, isActive: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async create(data: {
    name: string;
    type: PromptType;
    description?: string;
    content: string;
    variables?: string[];
  }) {
    // Extract variables from content
    const extractedVars = this.extractVariables(data.content);
    const allVariables = [...new Set([...(data.variables || []), ...extractedVars])];

    return this.prisma.promptTemplate.create({
      data: {
        ...data,
        variables: allVariables,
        versions: {
          create: {
            version: 1,
            content: data.content,
            changeLog: 'Initial version',
          },
        },
      },
      include: { versions: true },
    });
  }

  async update(id: string, data: {
    name?: string;
    description?: string;
    content?: string;
    variables?: string[];
    isActive?: boolean;
  }, changeLog?: string) {
    const template = await this.prisma.promptTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new Error('Template not found');
    }

    // If content changed, create new version
    if (data.content && data.content !== template.content) {
      await this.prisma.promptTemplateVersion.create({
        data: {
          templateId: id,
          version: template.version + 1,
          content: data.content,
          changeLog: changeLog || 'Content updated',
        },
      });

      return this.prisma.promptTemplate.update({
        where: { id },
        data: {
          ...data,
          version: template.version + 1,
          variables: data.variables || this.extractVariables(data.content),
        },
        include: { versions: true },
      });
    }

    return this.prisma.promptTemplate.update({
      where: { id },
      data,
      include: { versions: true },
    });
  }

  async delete(id: string) {
    return this.prisma.promptTemplate.delete({
      where: { id },
    });
  }

  // ==================== Version Management ====================

  async rollback(id: string, targetVersion: number) {
    const template = await this.prisma.promptTemplate.findUnique({
      where: { id },
      include: {
        versions: {
          where: { version: targetVersion },
        },
      },
    });

    if (!template || !template.versions[0]) {
      throw new Error('Template or version not found');
    }

    const versionContent = template.versions[0].content;

    return this.update(
      id,
      { content: versionContent },
      `Rolled back to version ${targetVersion}`
    );
  }

  async getVersionHistory(id: string) {
    return this.prisma.promptTemplateVersion.findMany({
      where: { templateId: id },
      orderBy: { version: 'desc' },
    });
  }

  /**
   * Get specific version content for diff comparison
   */
  async getVersionContent(id: string, version: number) {
    const versionRecord = await this.prisma.promptTemplateVersion.findFirst({
      where: { templateId: id, version },
    });

    if (!versionRecord) {
      throw new Error(`Version ${version} not found for template ${id}`);
    }

    return versionRecord;
  }

  /**
   * Duplicate a template with a new name
   */
  async duplicate(id: string, newName?: string) {
    const template = await this.findById(id);
    
    if (!template) {
      throw new Error('Template not found');
    }

    // Generate unique name
    const baseName = newName || `${template.name} (Copy)`;
    let finalName = baseName;
    let counter = 1;
    
    while (await this.findByName(finalName)) {
      finalName = `${baseName} ${counter++}`;
    }

    return this.create({
      name: finalName,
      type: template.type,
      description: template.description || undefined,
      content: template.content,
      variables: template.variables,
    });
  }

  /**
   * Validate template data before create/update
   */
  private validateTemplateData(data: { name?: string; content?: string }) {
    const errors: string[] = [];
    
    if (data.name !== undefined && (!data.name || data.name.trim().length === 0)) {
      errors.push('Template name is required');
    }
    
    if (data.name && data.name.length > 100) {
      errors.push('Template name must be 100 characters or less');
    }
    
    if (data.content !== undefined && (!data.content || data.content.trim().length === 0)) {
      errors.push('Template content is required');
    }
    
    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }
  }

  // ==================== Template Rendering ====================

  render(content: string, variables: Record<string, string>): string {
    let result = content;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return result;
  }

  private extractVariables(content: string): string[] {
    const regex = /{{(\w+)}}/g;
    const matches = content.matchAll(regex);
    return [...new Set([...matches].map((m) => m[1]))];
  }

  // ==================== Initialize Defaults ====================

  async initializeDefaults() {
    const defaults = [
      {
        name: 'System Prompt',
        type: PromptType.SYSTEM,
        description: '기본 시스템 프롬프트',
        content: `You are an expert software engineer assistant. Your task is to help developers write clean, efficient, and maintainable code.

Guidelines:
- Follow best practices for the given programming language
- Write clear and concise code with appropriate comments
- Consider edge cases and error handling
- Suggest improvements when appropriate`,
      },
      {
        name: 'Code Generation',
        type: PromptType.CODE_GENERATION,
        description: '코드 생성용 프롬프트',
        content: `Generate code based on the following requirements:

Context:
{{context}}

Requirements:
{{requirements}}

Language: {{language}}

Please provide clean, well-documented code that follows best practices.`,
      },
      {
        name: 'Bug Fix',
        type: PromptType.BUG_FIX,
        description: '버그 수정용 프롬프트',
        content: `Analyze and fix the following bug:

Error Message:
{{error}}

Current Code:
{{code}}

Please identify the root cause and provide a corrected version.`,
      },
    ];

    for (const template of defaults) {
      const existing = await this.findByName(template.name);
      if (!existing) {
        await this.create(template);
      }
    }

    this.logger.log('Default prompt templates initialized');
  }
}
