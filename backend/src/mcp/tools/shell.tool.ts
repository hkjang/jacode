import { Injectable, Logger } from '@nestjs/common';
import { McpTool, McpToolResult, McpContext, McpToolSchema } from '../interfaces/mcp.interface';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Injectable()
export class ShellTool implements McpTool {
  private readonly logger = new Logger(ShellTool.name);
  
  name = 'shell_execute';
  description = 'Execute shell commands in the project directory. Use with caution - only safe, read-only commands are recommended.';

  inputSchema: McpToolSchema = {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description: 'The shell command to execute',
      },
      timeout: {
        type: 'number',
        description: 'Command timeout in milliseconds (default: 30000, max: 60000)',
      },
    },
    required: ['command'],
  };

  requiredPermissions = ['SHELL_EXECUTE', 'ADMIN'];

  // Dangerous commands that are blocked
  private readonly blockedCommands = [
    'rm -rf', 'rm -r /', 'rmdir', 'del /f', 'format',
    'shutdown', 'reboot', 'poweroff', 'init 0', 'init 6',
    'mkfs', 'dd if=', ':(){', 'fork bomb',
    'chmod 777 /', 'chown', 'sudo', 'su -',
    '> /dev/', 'curl | sh', 'wget | sh', 'curl | bash', 'wget | bash',
    'eval', '$(', '`',
  ];

  async execute(args: any, context: McpContext): Promise<McpToolResult> {
    const { command, timeout = 30000 } = args;

    if (!context.workingDirectory) {
      return {
        content: [],
        isError: true,
        error: { code: -1, message: 'Shell tool requires working directory' }
      } as any;
    }

    // Security check: Block dangerous commands
    const lowerCommand = command.toLowerCase();
    for (const blocked of this.blockedCommands) {
      if (lowerCommand.includes(blocked.toLowerCase())) {
        this.logger.warn(`Blocked dangerous command: ${command}`);
        return {
          content: [],
          isError: true,
          error: { code: -1, message: `Command contains blocked pattern: ${blocked}` }
        } as any;
      }
    }

    // Limit timeout
    const safeTimeout = Math.min(timeout, 60000);

    try {
      this.logger.log(`Executing command: ${command} in ${context.workingDirectory}`);
      
      const { stdout, stderr } = await execAsync(command, {
        cwd: context.workingDirectory,
        timeout: safeTimeout,
        maxBuffer: 1024 * 1024, // 1MB max output
      });

      const output = stdout || stderr || 'Command completed with no output';
      
      // Truncate very long output
      const truncatedOutput = output.length > 10000 
        ? output.substring(0, 10000) + '\n... (output truncated)'
        : output;

      return {
        content: [{ type: 'text', text: truncatedOutput }],
        metadata: {
          command,
          outputLength: output.length,
          truncated: output.length > 10000,
        }
      };

    } catch (error: any) {
      // Handle timeout
      if (error.killed) {
        return {
          content: [],
          isError: true,
          error: { code: -1, message: `Command timed out after ${safeTimeout}ms` }
        } as any;
      }

      // Return stderr if available
      if (error.stderr) {
        return {
          content: [{ type: 'text', text: `Error output:\n${error.stderr}` }],
          isError: true,
          error: { code: error.code || -1, message: error.message }
        } as any;
      }

      return {
        content: [],
        isError: true,
        error: {
          code: -1,
          message: `Command failed: ${error.message}`
        }
      } as any;
    }
  }
}
