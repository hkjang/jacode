import { Injectable } from '@nestjs/common';
import { McpTool, McpToolResult, McpContext, McpToolSchema } from '../interfaces/mcp.interface';
import { PrismaService } from '../../prisma/prisma.service';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Standard File System Tool for MCP
 */
@Injectable()
export class FileSystemTool implements McpTool {
  name = 'filesystem';
  description = 'Read files and list directory contents. Use this to get code context.';
  
  inputSchema: McpToolSchema = {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        enum: ['read', 'list', 'exists'],
        description: 'File operation to perform',
      },
      path: {
        type: 'string',
        description: 'Path strictly relative to project root',
      },
    },
    required: ['operation', 'path'],
  };

  requiredPermissions = []; // Basic read is public for now, or governed by default policy

  constructor(private readonly prisma: PrismaService) {}

  async execute(args: any, context: McpContext): Promise<McpToolResult> {
    const { operation, path: filePath } = args;

    try {
      if (operation === 'read') {
        const content = await this.readFile(filePath, context);
        return {
          content: [{ type: 'text', text: content }],
        };
      } else if (operation === 'list') {
        const list = await this.listDirectory(filePath, context);
        return {
          content: [{ type: 'text', text: list }],
        };
      } else if (operation === 'exists') {
        const exists = await this.checkExists(filePath, context);
        return {
          content: [{ type: 'text', text: String(exists) }],
        };
      }

      throw new Error(`Unknown operation: ${operation}`);
    } catch (error) {
      throw error;
    }
  }

  private async readFile(filePath: string, context: McpContext): Promise<string> {
    // 1. Try DB first (Project Files)
    if (context.projectId) {
      const file = await this.prisma.file.findFirst({
        where: {
          projectId: context.projectId,
          path: filePath,
        },
      });
      if (file && file.content) return file.content;
    }

    // 2. Try Physical FS if allowed
    // CAUTION: This allows reading arbitrary files if workingDirectory is set. 
    // In production, strictly validate 'workingDirectory' to be efficiently scoped.
    if (context.workingDirectory) {
      const fullPath = path.resolve(context.workingDirectory, filePath);
      if (!fullPath.startsWith(path.resolve(context.workingDirectory))) {
        throw new Error('Access denied: Path outside working directory');
      }
      return await fs.readFile(fullPath, 'utf-8');
    }

    throw new Error(`File not found: ${filePath}`);
  }

  private async listDirectory(dirPath: string, context: McpContext): Promise<string> {
    // 1. Try DB
    if (context.projectId) {
      const files = await this.prisma.file.findMany({
        where: {
          projectId: context.projectId,
          path: { startsWith: dirPath },
        },
        select: { path: true, isDirectory: true },
        take: 50,
      });
      
      if (files.length > 0) {
        return files.map(f => `${f.isDirectory ? '[DIR]' : '[FILE]'} ${f.path}`).join('\n');
      }
    }

    // 2. Try Physical FS
    if (context.workingDirectory) {
       const fullPath = path.resolve(context.workingDirectory, dirPath);
       // Security check
       if (!fullPath.startsWith(path.resolve(context.workingDirectory))) {
         throw new Error('Access denied: Path outside working directory');
       }
       
       const items = await fs.readdir(fullPath, { withFileTypes: true });
       return items.map(item => `${item.isDirectory() ? '[DIR]' : '[FILE]'} ${item.name}`).join('\n');
    }

    return 'Directory not found or empty';
  }

  private async checkExists(filePath: string, context: McpContext): Promise<boolean> {
     // Check DB
     if (context.projectId) {
       const count = await this.prisma.file.count({
         where: { projectId: context.projectId, path: filePath }
       });
       if (count > 0) return true;
     }
     
     // Check FS
     if (context.workingDirectory) {
        try {
          const fullPath = path.resolve(context.workingDirectory, filePath);
          await fs.access(fullPath);
          return true;
        } catch {
          return false;
        }
     }
     return false;
  }
}
