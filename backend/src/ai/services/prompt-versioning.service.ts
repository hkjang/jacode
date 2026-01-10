import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PromptVersioningService {
  private readonly logger = new Logger(PromptVersioningService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new prompt template
   */
  async createTemplate(data: {
    name: string;
    type: string;
    description?: string;
    content: string;
    variables?: string[];
  }) {
    return this.prisma.promptTemplate.create({
      data: {
        name: data.name,
        type: data.type as any,
        description: data.description,
        content: data.content,
        variables: data.variables || [],
        version: 1,
        versions: {
          create: {
            version: 1,
            content: data.content,
            changeLog: 'Initial version',
          },
        },
      },
      include: {
        versions: true,
      },
    });
  }

  /**
   * Update a prompt template (creates new version)
   */
  async updateTemplate(
    id: string,
    data: {
      content: string;
      changeLog?: string;
    }
  ) {
    const template = await this.prisma.promptTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new Error('Template not found');
    }

    const newVersion = template.version + 1;

    // Create new version
    await this.prisma.promptTemplateVersion.create({
      data: {
        templateId: id,
        version: newVersion,
        content: data.content,
        changeLog: data.changeLog || 'Updated',
      },
    });

    // Update template
    return this.prisma.promptTemplate.update({
      where: { id },
      data: {
        content: data.content,
        version: newVersion,
        updatedAt: new Date(),
      },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 10, // Last 10 versions
        },
      },
    });
  }

  /**
   * Get template by name
   */
  async getTemplate(name: string) {
    return this.prisma.promptTemplate.findUnique({
      where: { name },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 5,
        },
      },
    });
  }

  /**
   * Get specific version of template
   */
  async getTemplateVersion(templateId: string, version: number) {
    return this.prisma.promptTemplateVersion.findFirst({
      where: {
        templateId,
        version,
      },
    });
  }

  /**
   * Rollback to a previous version
   */
  async rollbackToVersion(templateId: string, targetVersion: number) {
    const versionData = await this.getTemplateVersion(templateId, targetVersion);
    
    if (!versionData) {
      throw new Error(`Version ${targetVersion} not found`);
    }

    return this.updateTemplate(templateId, {
      content: versionData.content,
      changeLog: `Rolled back to version ${targetVersion}`,
    });
  }

  /**
   * List all templates
   */
  async listTemplates(type?: string) {
    return this.prisma.promptTemplate.findMany({
      where: type ? { type: type as any } : undefined,
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1, // Latest version only
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  /**
   * Render template with variables
   */
  renderTemplate(content: string, variables: Record<string, string>): string {
    let rendered = content;
    
    // Replace {{variable}} with actual values
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      rendered = rendered.replace(regex, value);
    }

    return rendered;
  }

  /**
   * Extract variables from template content
   */
  extractVariables(content: string): string[] {
    const regex = /\{\{\s*(\w+)\s*\}\}/g;
    const variables = new Set<string>();
    let match;

    while ((match = regex.exec(content)) !== null) {
      variables.add(match[1]);
    }

    return Array.from(variables);
  }

  /**
   * Get template version history
   */
  async getVersionHistory(templateId: string) {
    return this.prisma.promptTemplateVersion.findMany({
      where: { templateId },
      orderBy: { version: 'desc' },
    });
  }

  /**
   * Compare two versions
   */
  async compareVersions(templateId: string, version1: number, version2: number) {
    const [v1, v2] = await Promise.all([
      this.getTemplateVersion(templateId, version1),
      this.getTemplateVersion(templateId, version2),
    ]);

    if (!v1 || !v2) {
      throw new Error('One or both versions not found');
    }

    return {
      version1: v1,
      version2: v2,
      contentDiff: this.calculateDiff(v1.content, v2.content),
    };
  }

  /**
   * Simple diff calculation (can be enhanced with proper diff library)
   */
  private calculateDiff(oldContent: string, newContent: string) {
    return {
      old: oldContent,
      new: newContent,
      linesAdded: newContent.split('\n').length - oldContent.split('\n').length,
      changed: oldContent !== newContent,
    };
  }
}
