import { Tool, ToolResult, ToolContext, JSONSchema } from '../interfaces/tool.interface';
import { PrismaService } from '../../prisma/prisma.service';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * File System Tool
 * 
 * Provides file system operations for the agent:
 * - Read file contents
 * - Write/update files
 * - List directory contents
 * - Check if file exists
 */
export class FileSystemTool implements Tool {
  name = 'file_system';
  description = `Perform file system operations. Supports reading, writing, and listing files.
Use this tool when you need to:
- Read the content of a file
- Create or update a file
- List files in a directory
- Check if a file exists`;

  parameters: JSONSchema = {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        description: 'The operation to perform',
        enum: ['read', 'write', 'list', 'exists'],
      },
      path: {
        type: 'string',
        description: 'File or directory path (relative to project root)',
      },
      content: {
        type: 'string',
        description: 'Content to write (required for write operation)',
      },
    },
    required: ['operation', 'path'],
  };

  constructor(private readonly prisma: PrismaService) {}

  async execute(args: Record<string, any>, context: ToolContext): Promise<ToolResult> {
    const { operation, path: filePath, content } = args;
    const startTime = Date.now();

    try {
      switch (operation) {
        case 'read':
          return await this.readFile(filePath, context);
        case 'write':
          return await this.writeFile(filePath, content, context);
        case 'list':
          return await this.listDirectory(filePath, context);
        case 'exists':
          return await this.checkExists(filePath, context);
        default:
          return {
            success: false,
            output: '',
            error: `Unknown operation: ${operation}`,
          };
      }
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
        metadata: { durationMs: Date.now() - startTime },
      };
    }
  }

  private async readFile(filePath: string, context: ToolContext): Promise<ToolResult> {
    // Try to read from database first (project files)
    const file = await this.prisma.file.findFirst({
      where: {
        projectId: context.projectId,
        path: filePath,
      },
    });

    if (file && file.content) {
      return {
        success: true,
        output: file.content,
        data: {
          path: file.path,
          size: file.size,
          extension: file.extension,
        },
      };
    }

    // Fallback to file system if project root is available
    if (context.workingDirectory) {
      const fullPath = path.join(context.workingDirectory, filePath);
      const content = await fs.readFile(fullPath, 'utf-8');
      return {
        success: true,
        output: content,
        data: { path: filePath },
      };
    }

    return {
      success: false,
      output: '',
      error: `File not found: ${filePath}`,
    };
  }

  private async writeFile(filePath: string, content: string, context: ToolContext): Promise<ToolResult> {
    if (!content) {
      return {
        success: false,
        output: '',
        error: 'Content is required for write operation',
      };
    }

    const fileName = path.basename(filePath);
    const extension = path.extname(fileName).slice(1);

    // Check if file exists in database
    const existingFile = await this.prisma.file.findFirst({
      where: {
        projectId: context.projectId,
        path: filePath,
      },
    });

    if (existingFile) {
      // Create version backup
      const lastVersion = await this.prisma.fileVersion.findFirst({
        where: { fileId: existingFile.id },
        orderBy: { version: 'desc' },
      });

      await this.prisma.fileVersion.create({
        data: {
          fileId: existingFile.id,
          version: (lastVersion?.version || 0) + 1,
          content: existingFile.content || '',
          message: `Updated by AI Agent (task: ${context.taskId})`,
        },
      });

      // Update file
      await this.prisma.file.update({
        where: { id: existingFile.id },
        data: {
          content,
          size: content.length,
        },
      });

      return {
        success: true,
        output: `Updated file: ${filePath}`,
        data: { path: filePath, size: content.length, updated: true },
      };
    } else {
      // Create new file
      await this.prisma.file.create({
        data: {
          projectId: context.projectId,
          path: filePath,
          name: fileName,
          extension,
          content,
          size: content.length,
        },
      });

      return {
        success: true,
        output: `Created file: ${filePath}`,
        data: { path: filePath, size: content.length, created: true },
      };
    }
  }

  private async listDirectory(dirPath: string, context: ToolContext): Promise<ToolResult> {
    // List files from database
    const files = await this.prisma.file.findMany({
      where: {
        projectId: context.projectId,
        path: {
          startsWith: dirPath,
        },
      },
      select: {
        path: true,
        name: true,
        extension: true,
        size: true,
        isDirectory: true,
      },
      take: 100,
    });

    if (files.length === 0) {
      return {
        success: true,
        output: `Directory is empty or does not exist: ${dirPath}`,
        data: { files: [] },
      };
    }

    const fileList = files.map(f => `${f.isDirectory ? '[DIR]' : '[FILE]'} ${f.path}`).join('\n');

    return {
      success: true,
      output: `Contents of ${dirPath}:\n${fileList}`,
      data: { files: files.map(f => ({ path: f.path, isDirectory: f.isDirectory })) },
    };
  }

  private async checkExists(filePath: string, context: ToolContext): Promise<ToolResult> {
    const file = await this.prisma.file.findFirst({
      where: {
        projectId: context.projectId,
        path: filePath,
      },
    });

    return {
      success: true,
      output: file ? `File exists: ${filePath}` : `File does not exist: ${filePath}`,
      data: { exists: !!file },
    };
  }

  validate(args: Record<string, any>): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    if (!args.operation) {
      errors.push('operation is required');
    } else if (!['read', 'write', 'list', 'exists'].includes(args.operation)) {
      errors.push('operation must be one of: read, write, list, exists');
    }

    if (!args.path) {
      errors.push('path is required');
    }

    if (args.operation === 'write' && !args.content) {
      errors.push('content is required for write operation');
    }

    return { valid: errors.length === 0, errors };
  }
}
