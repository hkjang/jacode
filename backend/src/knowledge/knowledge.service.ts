import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateKnowledgeEntryDto {
  type: 'CODE_PATTERN' | 'STYLE_GUIDE' | 'SNIPPET' | 'PROMPT_TEMPLATE';
  title: string;
  content: string;
  description?: string;
  tags?: string[];
  language?: string;
  projectId?: string;
}

export interface UpdateKnowledgeEntryDto {
  title?: string;
  content?: string;
  description?: string;
  tags?: string[];
  language?: string;
}

@Injectable()
export class KnowledgeService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a knowledge entry
   */
  async create(userId: string, dto: CreateKnowledgeEntryDto) {
    return this.prisma.knowledgeEntry.create({
      data: {
        type: dto.type,
        title: dto.title,
        content: dto.content,
        description: dto.description,
        tags: dto.tags || [],
        language: dto.language,
        projectId: dto.projectId,
        userId,
      },
    });
  }

  /**
   * Get all knowledge entries for a user
   */
  async findAll(userId: string, filters?: { type?: string; tag?: string; language?: string; search?: string }) {
    const where: any = { userId };

    if (filters?.type) {
      where.type = filters.type;
    }
    if (filters?.tag) {
      where.tags = { has: filters.tag };
    }
    if (filters?.language) {
      where.language = filters.language;
    }
    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { content: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.knowledgeEntry.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Get a single knowledge entry
   */
  async findOne(id: string, userId: string) {
    const entry = await this.prisma.knowledgeEntry.findFirst({
      where: { id, userId },
    });

    if (!entry) {
      throw new NotFoundException('Knowledge entry not found');
    }

    return entry;
  }

  /**
   * Update a knowledge entry
   */
  async update(id: string, userId: string, dto: UpdateKnowledgeEntryDto) {
    await this.findOne(id, userId); // Check ownership

    return this.prisma.knowledgeEntry.update({
      where: { id },
      data: dto,
    });
  }

  /**
   * Delete a knowledge entry
   */
  async delete(id: string, userId: string) {
    await this.findOne(id, userId); // Check ownership

    return this.prisma.knowledgeEntry.delete({ where: { id } });
  }

  /**
   * Get code patterns
   */
  async getCodePatterns(userId: string, language?: string) {
    return this.findAll(userId, { type: 'CODE_PATTERN', language });
  }

  /**
   * Get style guides
   */
  async getStyleGuides(userId: string, language?: string) {
    return this.findAll(userId, { type: 'STYLE_GUIDE', language });
  }

  /**
   * Get code snippets
   */
  async getSnippets(userId: string, language?: string, tag?: string) {
    return this.findAll(userId, { type: 'SNIPPET', language, tag });
  }

  /**
   * Get prompt templates
   */
  async getPromptTemplates(userId: string) {
    return this.findAll(userId, { type: 'PROMPT_TEMPLATE' });
  }

  /**
   * Get all unique tags
   */
  async getAllTags(userId: string) {
    const entries = await this.prisma.knowledgeEntry.findMany({
      where: { userId },
      select: { tags: true },
    });

    const allTags = entries.flatMap((e) => e.tags);
    return [...new Set(allTags)];
  }
}
