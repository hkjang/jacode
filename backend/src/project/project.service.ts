import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new project
   */
  async create(userId: string, dto: CreateProjectDto) {
    return this.prisma.project.create({
      data: {
        ...dto,
        userId,
        settings: dto.settings || {},
      },
    });
  }

  /**
   * Get all projects for a user
   */
  async findAll(userId: string) {
    return this.prisma.project.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { files: true, agentTasks: true },
        },
      },
    });
  }

  /**
   * Get a single project by ID
   */
  async findOne(id: string, userId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, userId },
      include: {
        files: {
          where: { isDirectory: false },
          select: { id: true, path: true, name: true, extension: true },
        },
        _count: {
          select: { agentTasks: true },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  /**
   * Update a project
   */
  async update(id: string, userId: string, dto: UpdateProjectDto) {
    // Verify ownership
    await this.findOne(id, userId);

    return this.prisma.project.update({
      where: { id },
      data: dto,
    });
  }

  /**
   * Delete a project
   */
  async remove(id: string, userId: string) {
    // Verify ownership
    await this.findOne(id, userId);

    return this.prisma.project.delete({
      where: { id },
    });
  }

  /**
   * Get project statistics
   */
  async getStats(id: string, userId: string) {
    const project = await this.findOne(id, userId);

    const [fileCount, taskCount] = await Promise.all([
      this.prisma.file.count({ where: { projectId: id } }),
      this.prisma.agentTask.count({ where: { projectId: id } }),
    ]);

    return {
      projectId: id,
      fileCount,
      taskCount,
      lastActivity: project.updatedAt,
    };
  }
}
