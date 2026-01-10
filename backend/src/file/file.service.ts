import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFileDto } from './dto/create-file.dto';
import { UpdateFileDto } from './dto/update-file.dto';
import * as path from 'path';
import { Express } from 'express';

@Injectable()
export class FileService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new file or directory
   */
  async create(dto: CreateFileDto) {
    // Check if file already exists
    const existing = await this.prisma.file.findFirst({
      where: {
        projectId: dto.projectId,
        path: dto.path,
      },
    });

    if (existing) {
      throw new ConflictException('File already exists at this path');
    }

    const extension = path.extname(dto.name).slice(1);

    if (!dto.projectId) {
      throw new ConflictException('Project ID is required');
    }

    return this.prisma.file.create({
      data: {
        projectId: dto.projectId,
        path: dto.path,
        name: dto.name,
        extension,
        content: dto.content || '',
        isDirectory: dto.isDirectory || false,
        size: dto.content?.length || 0,
        mimeType: this.getMimeType(extension),
      },
    });
  }

  /**
   * Get file tree for a project
   */
  async getFileTree(projectId: string) {
    const files = await this.prisma.file.findMany({
      where: { projectId },
      select: {
        id: true,
        path: true,
        name: true,
        extension: true,
        isDirectory: true,
        size: true,
      },
      orderBy: [{ isDirectory: 'desc' }, { name: 'asc' }],
    });

    return this.buildFileTree(files);
  }

  /**
   * Get file content
   */
  async getContent(id: string, projectId: string) {
    const file = await this.prisma.file.findFirst({
      where: { id, projectId },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    return file;
  }

  /**
   * Get file content chunk (specific line range)
   * For large file chunk rendering support
   */
  async getContentChunk(
    id: string,
    projectId: string,
    startLine: number,
    endLine: number,
  ) {
    const file = await this.prisma.file.findFirst({
      where: { id, projectId },
      select: {
        id: true,
        path: true,
        name: true,
        extension: true,
        content: true,
        size: true,
      },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    const lines = (file.content || '').split('\n');
    const totalLines = lines.length;
    
    // Clamp to valid range
    const start = Math.max(0, startLine - 1); // Convert to 0-indexed
    const end = Math.min(totalLines, endLine);
    
    const chunkContent = lines.slice(start, end).join('\n');

    return {
      id: file.id,
      path: file.path,
      name: file.name,
      extension: file.extension,
      size: file.size,
      totalLines,
      startLine: start + 1, // Return 1-indexed
      endLine: end,
      content: chunkContent,
      hasMore: end < totalLines,
    };
  }

  /**
   * Update file content
   */
  async update(id: string, projectId: string, dto: UpdateFileDto) {
    const file = await this.prisma.file.findFirst({
      where: { id, projectId },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    // Create version backup before updating
    if (dto.content !== undefined && dto.content !== file.content) {
      const lastVersion = await this.prisma.fileVersion.findFirst({
        where: { fileId: id },
        orderBy: { version: 'desc' },
      });

      await this.prisma.fileVersion.create({
        data: {
          fileId: id,
          version: (lastVersion?.version || 0) + 1,
          content: file.content || '',
          message: dto.message || 'Auto-saved version',
        },
      });
      await this.prisma.fileVersion.create({
        data: {
          fileId: id,
          version: (lastVersion?.version || 0) + 1,
          content: file.content || '',
          message: dto.message || 'Auto-saved version',
        },
      });
    }

    // Handle directory move/rename
    if (file.isDirectory && dto.path && dto.path !== file.path) {
      const oldPath = file.path;
      const newPath = dto.path;
      
      const children = await this.prisma.file.findMany({
        where: {
          projectId,
          path: { startsWith: oldPath + '/' },
        },
      });

      for (const child of children) {
        const newChildPath = child.path.replace(oldPath, newPath);
        await this.prisma.file.update({
          where: { id: child.id },
          data: { path: newChildPath },
        });
      }
    }

    return this.prisma.file.update({
      where: { id },
      data: {
        content: dto.content,
        size: dto.content?.length,
        ...(dto.path && { path: dto.path }),
        ...(dto.name && {
          name: dto.name,
          extension: path.extname(dto.name).slice(1),
        }),
      },
    });
  }

  /**
   * Delete a file or directory
   */
  async remove(id: string, projectId: string) {
    const file = await this.prisma.file.findFirst({
      where: { id, projectId },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    // If directory, delete all children
    if (file.isDirectory) {
      await this.prisma.file.deleteMany({
        where: {
          projectId,
          path: { startsWith: file.path + '/' },
        },
      });
    }

    return this.prisma.file.delete({ where: { id } });
  }

  /**
   * Get file versions
   */
  async getVersions(id: string, projectId: string) {
    const file = await this.prisma.file.findFirst({
      where: { id, projectId },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    return this.prisma.fileVersion.findMany({
      where: { fileId: id },
      orderBy: { version: 'desc' },
      take: 50,
    });
  }

  /**
   * Restore file to a specific version
   */
  async restoreVersion(id: string, projectId: string, versionId: string) {
    const file = await this.prisma.file.findFirst({
      where: { id, projectId },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    const version = await this.prisma.fileVersion.findFirst({
      where: { id: versionId, fileId: id },
    });

    if (!version) {
      throw new NotFoundException('Version not found');
    }

    return this.prisma.file.update({
      where: { id },
      data: {
        content: version.content,
        size: version.content.length,
      },
    });
  }

  /**
   * Build hierarchical file tree from flat list
   */
  private buildFileTree(files: any[]) {
    const tree: any[] = [];
    const pathMap = new Map();

    // Sort by path depth
    files.sort((a, b) => a.path.split('/').length - b.path.split('/').length);

    for (const file of files) {
      const parts = file.path.split('/').filter(Boolean);
      const parentPath = parts.slice(0, -1).join('/');

      const node = {
        ...file,
        children: file.isDirectory ? [] : undefined,
      };

      pathMap.set(file.path, node);

      if (parentPath && pathMap.has(parentPath)) {
        pathMap.get(parentPath).children.push(node);
      } else {
        tree.push(node);
      }
    }

    return tree;
  }

  /**
   * Get MIME type from extension
   */
  private getMimeType(extension: string): string {
    const mimeTypes: Record<string, string> = {
      js: 'application/javascript',
      ts: 'application/typescript',
      jsx: 'application/javascript',
      tsx: 'application/typescript',
      json: 'application/json',
      html: 'text/html',
      css: 'text/css',
      md: 'text/markdown',
      py: 'text/x-python',
      java: 'text/x-java',
      go: 'text/x-go',
      rs: 'text/x-rust',
      c: 'text/x-c',
      cpp: 'text/x-c++',
      h: 'text/x-c',
      hpp: 'text/x-c++',
    };
    return mimeTypes[extension] || 'text/plain';
  }

  /**
   * Upload file
   */
  async uploadFile(
    projectId: string,
    file: Express.Multer.File,
    parentPath?: string,
  ) {
    if (!file) {
      throw new NotFoundException('No file provided');
    }

    const fileName = file.originalname;
    // Sanitize path to avoid double slashes
    const cleanParentPath = parentPath === '/' || parentPath === '.' ? '' : parentPath;
    const filePath = cleanParentPath 
      ? `${cleanParentPath}/${fileName}` 
      : fileName;

    // Convert buffer to string - assuming text files for now due to DB schema constraint
    // In a production app, we would check mime-type and store binary separately
    const content = file.buffer.toString('utf-8');

    // Check if file exists
    const existing = await this.prisma.file.findFirst({
      where: {
        projectId,
        path: filePath,
      },
    });

    if (existing) {
      // Update existing file
      return this.update(existing.id, projectId, {
        content,
        size: content.length,
      });
    }

    // Create new file
    return this.create({
      projectId,
      path: filePath,
      name: fileName,
      content,
      isDirectory: false,
    });
  }

  /**
   * Get file for download
   */
  async getDownloadData(id: string, projectId: string) {
    const file = await this.prisma.file.findFirst({
      where: { id, projectId },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    if (file.isDirectory) {
      throw new ConflictException('Cannot download directory directly');
    }

    return {
      name: file.name,
      content: Buffer.from(file.content || ''),
      mimeType: file.mimeType || 'text/plain',
    };
  }
}
