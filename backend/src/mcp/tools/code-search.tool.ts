import { Injectable } from '@nestjs/common';
import { McpTool, McpToolResult, McpContext, McpToolSchema } from '../interfaces/mcp.interface';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execAsync = promisify(exec);

@Injectable()
export class CodeSearchTool implements McpTool {
  name = 'search_code';
  description = 'Search for code patterns in the codebase. Useful for finding references or definitions.';

  inputSchema: McpToolSchema = {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query (regex supported)',
      },
      include: {
        type: 'array',
        items: { type: 'string' },
        description: 'File patterns to include (e.g. *.ts)',
      },
    },
    required: ['query'],
  };

  async execute(args: any, context: McpContext): Promise<McpToolResult> {
    const { query, filePattern } = args;

    if (!context.workingDirectory) {
        return {
            content: [],
            isError: true,
            error: { code: -1, message: 'Search tool requires working directory' }
        } as any;
    }

    try {
        // Using git grep for performance if available, otherwise grep
        // We'll stick to a simple recursive grep for now to avoid git dependency if .git missing
        // But since we have a git tool, let's assume git grep is best for code
        
        let cmd = `grep -r "${query}" .`;
        if (filePattern) {
            cmd = `grep -r --include="${filePattern}" "${query}" .`;
        }
        
        // Add line numbers and limit output
        cmd += ` -n --max-count=10`; 

        const { stdout } = await execAsync(cmd, { cwd: context.workingDirectory });
        
        return {
            content: [{ type: 'text', text: stdout || 'No matches found.' }]
        };

    } catch (error) {
        // Grep returns exit code 1 if no matches found, which throws error in execAsync
        if (typeof error === 'object' && error !== null && 'code' in error && (error as any).code === 1) {
             return {
                content: [{ type: 'text', text: 'No matches found.' }]
             };
        }

        return {
            content: [],
            isError: true,
            error: {
                code: -1,
                message: `Search failed: ${error}`
            }
        } as any;
    }
  }
}
