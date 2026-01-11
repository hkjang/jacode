import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ArtifactStatus, ArtifactType } from '@prisma/client';

@Injectable()
export class ArtifactService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get artifact by ID
   */
  async getArtifact(id: string) {
    const artifact = await this.prisma.artifact.findUnique({
      where: { id },
      include: {
        feedback: true,
        agentTask: {
          select: { id: true, type: true, prompt: true, projectId: true, userId: true },
        },
      },
    });

    if (!artifact) {
      throw new NotFoundException('Artifact not found');
    }

    return artifact;
  }

  /**
   * Get artifacts for a task
   */
  async getArtifactsByTask(taskId: string) {
    return this.prisma.artifact.findMany({
      where: { agentTaskId: taskId },
      include: { feedback: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get artifacts by type for a project
   */
  async getArtifactsByType(projectId: string, type: ArtifactType) {
    return this.prisma.artifact.findMany({
      where: {
        type,
        agentTask: { projectId },
      },
      include: {
        agentTask: { select: { id: true, prompt: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update artifact status
   */
  async updateStatus(id: string, status: ArtifactStatus) {
    return this.prisma.artifact.update({
      where: { id },
      data: { status },
    });
  }

  /**
   * Add feedback to artifact
   */
  async addFeedback(
    id: string,
    feedback: { rating?: number; comment?: string; lineComments?: object[] },
  ) {
    // Check if feedback already exists
    const existing = await this.prisma.artifactFeedback.findUnique({
      where: { artifactId: id },
    });

    if (existing) {
      return this.prisma.artifactFeedback.update({
        where: { id: existing.id },
        data: {
          rating: feedback.rating,
          comment: feedback.comment,
          lineComments: feedback.lineComments || [],
        },
      });
    }

    return this.prisma.artifactFeedback.create({
      data: {
        artifactId: id,
        rating: feedback.rating,
        comment: feedback.comment,
        lineComments: feedback.lineComments || [],
      },
    });
  }

  /**
   * Apply code artifact to file
   */
  async applyCodeArtifact(id: string) {
    const artifact = await this.getArtifact(id);

    if (artifact.type !== ArtifactType.CODE && artifact.type !== ArtifactType.DIFF) {
      throw new Error('Only CODE or DIFF artifacts can be applied');
    }

    const metadata = artifact.metadata as any;
    let filePath = metadata?.filePath;

    if (!filePath) {
      // Fallback for legacy artifacts or those created before the fix
      const language = metadata?.language || 'typescript';
      const ext = language === 'typescript' ? 'ts' : language === 'javascript' ? 'js' : 'txt';
      filePath = `generated/legacy-artifact-${id}.${ext}`;
      console.warn(`Artifact ${id} missing filePath, using fallback: ${filePath}`);
    }

    // Find or create the file
    const projectId = artifact.agentTask.projectId;
    const fileName = filePath.split('/').pop();

    let file = await this.prisma.file.findFirst({
      where: { projectId, path: filePath },
    });

    if (file) {
      // Create version backup
      const lastVersion = await this.prisma.fileVersion.findFirst({
        where: { fileId: file.id },
        orderBy: { version: 'desc' },
      });

      await this.prisma.fileVersion.create({
        data: {
          fileId: file.id,
          version: (lastVersion?.version || 0) + 1,
          content: file.content || '',
          message: `Before applying artifact ${artifact.id}`,
          agentTaskId: artifact.agentTaskId,
        },
      });

      // Update file content
      await this.prisma.file.update({
        where: { id: file.id },
        data: {
          content: artifact.content,
          size: artifact.content.length,
        },
      });
    } else {
      // Create new file
      file = await this.prisma.file.create({
        data: {
          projectId,
          path: filePath,
          name: fileName,
          extension: fileName.split('.').pop() || '',
          content: artifact.content,
          size: artifact.content.length,
        },
      });
    }

    // Update artifact status
    await this.updateStatus(id, ArtifactStatus.APPLIED);

    return { file, artifact };
  }

  /**
   * Get recent artifacts across all projects for a user
   */
  async getRecentArtifacts(userId: string, limit = 10) {
    return this.prisma.artifact.findMany({
      where: {
        agentTask: { userId },
      },
      include: {
        agentTask: {
          select: { id: true, prompt: true, project: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
