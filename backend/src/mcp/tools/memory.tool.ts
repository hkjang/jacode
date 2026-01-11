import { Injectable, Logger } from '@nestjs/common';
import { McpTool, McpToolResult, McpContext, McpToolSchema } from '../interfaces/mcp.interface';

interface MemoryEntry {
  key: string;
  value: string;
  createdAt: number;
  expiresAt?: number;
}

@Injectable()
export class MemoryTool implements McpTool {
  private readonly logger = new Logger(MemoryTool.name);
  private readonly memory = new Map<string, MemoryEntry>();
  
  name = 'memory';
  description = 'Store and retrieve information across conversation turns. Useful for remembering context, user preferences, or intermediate results.';

  inputSchema: McpToolSchema = {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        enum: ['store', 'retrieve', 'delete', 'list'],
        description: 'Memory operation to perform',
      },
      key: {
        type: 'string',
        description: 'Key for the memory entry',
      },
      value: {
        type: 'string',
        description: 'Value to store (for store operation)',
      },
      ttl: {
        type: 'number',
        description: 'Time-to-live in seconds (optional, for store operation)',
      },
    },
    required: ['operation'],
  };

  requiredPermissions = ['MEMORY_ACCESS'];

  async execute(args: any, context: McpContext): Promise<McpToolResult> {
    const { operation, key, value, ttl } = args;
    const sessionKey = `${context.userId}:${key || ''}`;

    switch (operation) {
      case 'store':
        if (!key || value === undefined) {
          return {
            content: [],
            isError: true,
            error: { code: -1, message: 'Store operation requires key and value' }
          } as any;
        }
        
        const entry: MemoryEntry = {
          key,
          value,
          createdAt: Date.now(),
          expiresAt: ttl ? Date.now() + (ttl * 1000) : undefined,
        };
        this.memory.set(sessionKey, entry);
        this.logger.log(`Stored memory: ${sessionKey}`);
        
        return {
          content: [{ type: 'text', text: `Successfully stored "${key}"` }],
          metadata: { operation: 'store', key, hasExpiry: !!ttl }
        };

      case 'retrieve':
        if (!key) {
          return {
            content: [],
            isError: true,
            error: { code: -1, message: 'Retrieve operation requires key' }
          } as any;
        }
        
        const stored = this.memory.get(sessionKey);
        if (!stored) {
          return {
            content: [{ type: 'text', text: `No memory found for key "${key}"` }],
            metadata: { operation: 'retrieve', found: false }
          };
        }
        
        // Check expiry
        if (stored.expiresAt && Date.now() > stored.expiresAt) {
          this.memory.delete(sessionKey);
          return {
            content: [{ type: 'text', text: `Memory for key "${key}" has expired` }],
            metadata: { operation: 'retrieve', expired: true }
          };
        }
        
        return {
          content: [{ type: 'text', text: stored.value }],
          metadata: { 
            operation: 'retrieve', 
            found: true,
            createdAt: stored.createdAt,
          }
        };

      case 'delete':
        if (!key) {
          return {
            content: [],
            isError: true,
            error: { code: -1, message: 'Delete operation requires key' }
          } as any;
        }
        
        const deleted = this.memory.delete(sessionKey);
        return {
          content: [{ type: 'text', text: deleted ? `Deleted "${key}"` : `Key "${key}" not found` }],
          metadata: { operation: 'delete', deleted }
        };

      case 'list':
        const userPrefix = `${context.userId}:`;
        const keys: string[] = [];
        this.memory.forEach((entry, k) => {
          if (k.startsWith(userPrefix)) {
            // Check expiry
            if (!entry.expiresAt || Date.now() <= entry.expiresAt) {
              keys.push(entry.key);
            }
          }
        });
        
        return {
          content: [{ 
            type: 'text', 
            text: keys.length > 0 
              ? `Stored keys:\n${keys.map(k => `- ${k}`).join('\n')}` 
              : 'No stored memories'
          }],
          metadata: { operation: 'list', count: keys.length }
        };

      default:
        return {
          content: [],
          isError: true,
          error: { code: -1, message: `Unknown operation: ${operation}` }
        } as any;
    }
  }
}
