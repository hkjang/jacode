import { Injectable } from '@nestjs/common';
import { McpTool, McpToolResult, McpContext, McpToolSchema } from '../interfaces/mcp.interface';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execAsync = promisify(exec);

@Injectable()
export class GitTool implements McpTool {
  name = 'git';
  description = 'Git operations: get diffs, commit logs, and status. Use to understand changes.';

  inputSchema: McpToolSchema = {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        enum: ['diff', 'log', 'status'],
        description: 'Git operation',
      },
      target: {
        type: 'string',
        description: 'Target branch, commit, or file (optional)',
      },
      limit: {
        type: 'number',
        description: 'Limit number of commits (for log)',
      },
      path: {
        type: 'string',
        description: 'Specific path for status or diff',
      }
    },
    required: ['operation'],
  };

  async execute(args: any, context: McpContext): Promise<McpToolResult> {
    const { operation, target, limit } = args;
    
    // Requires physical working directory
    if (!context.workingDirectory) {
      return {
        content: [],
        isError: true,
        error: { code: -1, message: 'Git tool requires a working directory context' }
      } as any;
    }

    try {
      let output = '';
      const cwd = context.workingDirectory;

      switch (operation) {
        case 'diff':
          // If target provides, diff against it, else diff staged/unstaged
          const diffCmd = target ? `git diff ${target}` : 'git diff HEAD';
          const { stdout: diffOut } = await execAsync(diffCmd, { cwd });
          output = diffOut || 'No changes detected.';
          break;

        case 'log':
          const logLimit = limit || 10;
          const logCmd = `git log -n ${logLimit} --pretty=format:"%h - %an, %ar : %s"`;
          const { stdout: logOut } = await execAsync(logCmd, { cwd });
          output = logOut;
          break;

        case 'status':
          const { stdout: statusOut } = await execAsync('git status', { cwd });
          output = statusOut;
          break;

        default:
          throw new Error(`Unknown git operation: ${operation}`);
      }

      return {
        content: [{ type: 'text', text: output }],
      };

    } catch (error) {
      return {
        content: [],
        isError: true,
        error: { 
          code: -1, 
          message: `Git command failed: ${error instanceof Error ? error.message : String(error)}` 
        }
      } as any;
    }
  }
}
