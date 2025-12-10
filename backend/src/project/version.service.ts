import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VersionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a project snapshot
   */
  async createSnapshot(projectId: string, name: string, description?: string, agentTaskId?: string) {
    // Get all current file versions
    const files = await this.prisma.file.findMany({
      where: { projectId },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    const fileVersionIds = files
      .map((f) => f.versions[0]?.id)
      .filter(Boolean) as string[];

    return this.prisma.projectSnapshot.create({
      data: {
        name,
        description,
        fileVersionIds,
        projectId,
        agentTaskId,
      },
    });
  }

  /**
   * Get all snapshots for a project
   */
  async getSnapshots(projectId: string) {
    return this.prisma.projectSnapshot.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a specific snapshot
   */
  async getSnapshot(id: string) {
    const snapshot = await this.prisma.projectSnapshot.findUnique({
      where: { id },
    });

    if (!snapshot) {
      throw new NotFoundException('Snapshot not found');
    }

    return snapshot;
  }

  /**
   * Compare two snapshots
   */
  async compareSnapshots(snapshotId1: string, snapshotId2: string) {
    const [snapshot1, snapshot2] = await Promise.all([
      this.getSnapshot(snapshotId1),
      this.getSnapshot(snapshotId2),
    ]);

    // Get file versions for both snapshots
    const [versions1, versions2] = await Promise.all([
      this.prisma.fileVersion.findMany({
        where: { id: { in: snapshot1.fileVersionIds } },
        include: { file: true },
      }),
      this.prisma.fileVersion.findMany({
        where: { id: { in: snapshot2.fileVersionIds } },
        include: { file: true },
      }),
    ]);

    const version1Map = new Map(versions1.map((v) => [v.file.path, v]));
    const version2Map = new Map(versions2.map((v) => [v.file.path, v]));

    const allPaths = new Set([...version1Map.keys(), ...version2Map.keys()]);

    const diffs = [];
    for (const path of allPaths) {
      const v1 = version1Map.get(path);
      const v2 = version2Map.get(path);

      if (!v1) {
        diffs.push({ path, type: 'added', newContent: v2?.content });
      } else if (!v2) {
        diffs.push({ path, type: 'removed', oldContent: v1.content });
      } else if (v1.content !== v2.content) {
        diffs.push({
          path,
          type: 'modified',
          oldContent: v1.content,
          newContent: v2.content,
        });
      }
    }

    return {
      snapshot1: { id: snapshot1.id, name: snapshot1.name, createdAt: snapshot1.createdAt },
      snapshot2: { id: snapshot2.id, name: snapshot2.name, createdAt: snapshot2.createdAt },
      diffs,
    };
  }

  /**
   * Rollback to a snapshot
   */
  async rollbackToSnapshot(snapshotId: string) {
    const snapshot = await this.getSnapshot(snapshotId);

    // Get file versions in the snapshot
    const fileVersions = await this.prisma.fileVersion.findMany({
      where: { id: { in: snapshot.fileVersionIds } },
      include: { file: true },
    });

    // Update each file's content to match the snapshot version
    for (const version of fileVersions) {
      await this.prisma.file.update({
        where: { id: version.fileId },
        data: { content: version.content },
      });

      // Create a new version to record the rollback
      const latestVersion = await this.prisma.fileVersion.findFirst({
        where: { fileId: version.fileId },
        orderBy: { version: 'desc' },
      });

      await this.prisma.fileVersion.create({
        data: {
          fileId: version.fileId,
          version: (latestVersion?.version || 0) + 1,
          content: version.content,
          message: `Rollback to snapshot: ${snapshot.name}`,
        },
      });
    }

    return { success: true, restoredFiles: fileVersions.length };
  }

  /**
   * Delete a snapshot
   */
  async deleteSnapshot(id: string) {
    return this.prisma.projectSnapshot.delete({ where: { id } });
  }
}
