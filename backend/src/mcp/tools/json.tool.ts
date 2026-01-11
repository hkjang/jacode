import { Injectable } from '@nestjs/common';
import { McpTool, McpToolResult, McpContext, McpToolSchema } from '../interfaces/mcp.interface';

@Injectable()
export class JsonTool implements McpTool {
  name = 'json';
  description = 'Parse, format, query, and transform JSON data. Useful for working with API responses and config files.';

  inputSchema: McpToolSchema = {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        enum: ['parse', 'format', 'query', 'validate', 'diff'],
        description: 'JSON operation to perform',
      },
      data: {
        type: 'string',
        description: 'JSON string to process',
      },
      data2: {
        type: 'string',
        description: 'Second JSON string (for diff operation)',
      },
      path: {
        type: 'string',
        description: 'JSON path to query (e.g., "user.name" or "items[0].id")',
      },
      indent: {
        type: 'number',
        description: 'Indentation spaces for format operation (default: 2)',
      },
    },
    required: ['operation', 'data'],
  };

  async execute(args: any, context: McpContext): Promise<McpToolResult> {
    const { operation, data, data2, path, indent = 2 } = args;

    switch (operation) {
      case 'parse':
        return this.parse(data);

      case 'format':
        return this.format(data, indent);

      case 'query':
        if (!path) return this.error('Path is required for query operation');
        return this.query(data, path);

      case 'validate':
        return this.validate(data);

      case 'diff':
        if (!data2) return this.error('Second JSON is required for diff operation');
        return this.diff(data, data2);

      default:
        return this.error(`Unknown operation: ${operation}`);
    }
  }

  private parse(jsonStr: string): McpToolResult {
    try {
      const parsed = JSON.parse(jsonStr);
      const type = Array.isArray(parsed) ? 'array' : typeof parsed;
      const keys = typeof parsed === 'object' && parsed !== null ? Object.keys(parsed) : [];
      
      return {
        content: [{ 
          type: 'text', 
          text: `Valid JSON (${type})\nKeys: ${keys.length > 0 ? keys.join(', ') : 'N/A'}\nFormatted:\n${JSON.stringify(parsed, null, 2)}`
        }],
        metadata: { type, keyCount: keys.length, keys: keys.slice(0, 20) }
      };
    } catch (e) {
      return this.error(`Invalid JSON: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  private format(jsonStr: string, indent: number): McpToolResult {
    try {
      const parsed = JSON.parse(jsonStr);
      const formatted = JSON.stringify(parsed, null, indent);
      return { content: [{ type: 'text', text: formatted }] };
    } catch (e) {
      return this.error(`Invalid JSON: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  private query(jsonStr: string, path: string): McpToolResult {
    try {
      const parsed = JSON.parse(jsonStr);
      
      // Simple path parser: "user.name" or "items[0].id" or "data.users[*].name"
      const parts = path.split(/\.|\[|\]/).filter(p => p !== '');
      let current: any = parsed;

      for (const part of parts) {
        if (current === null || current === undefined) {
          return { content: [{ type: 'text', text: `Path "${path}" not found (undefined at "${part}")` }] };
        }

        if (part === '*' && Array.isArray(current)) {
          // Collect remaining path from all array elements
          const remainingPath = parts.slice(parts.indexOf(part) + 1).join('.');
          if (remainingPath) {
            const results = current.map((item: any) => {
              try {
                return this.getNestedValue(item, remainingPath);
              } catch {
                return undefined;
              }
            }).filter((v: any) => v !== undefined);
            return { 
              content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
              metadata: { path, count: results.length }
            };
          }
          current = current;
          break;
        }

        const index = parseInt(part, 10);
        if (!isNaN(index) && Array.isArray(current)) {
          current = current[index];
        } else {
          current = current[part];
        }
      }

      const resultStr = typeof current === 'object' 
        ? JSON.stringify(current, null, 2) 
        : String(current);

      return { 
        content: [{ type: 'text', text: resultStr }],
        metadata: { path, type: typeof current }
      };
    } catch (e) {
      return this.error(`Query failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((acc, key) => acc?.[key], obj);
  }

  private validate(jsonStr: string): McpToolResult {
    try {
      JSON.parse(jsonStr);
      return { 
        content: [{ type: 'text', text: '✅ Valid JSON' }],
        metadata: { valid: true }
      };
    } catch (e) {
      return { 
        content: [{ type: 'text', text: `❌ Invalid JSON: ${e instanceof Error ? e.message : String(e)}` }],
        metadata: { valid: false, error: String(e) }
      };
    }
  }

  private diff(json1Str: string, json2Str: string): McpToolResult {
    try {
      const obj1 = JSON.parse(json1Str);
      const obj2 = JSON.parse(json2Str);
      const differences = this.findDifferences(obj1, obj2, '');

      if (differences.length === 0) {
        return { content: [{ type: 'text', text: '✅ JSON objects are identical' }] };
      }

      return {
        content: [{ 
          type: 'text', 
          text: `Found ${differences.length} difference(s):\n${differences.map(d => `- ${d}`).join('\n')}`
        }],
        metadata: { differenceCount: differences.length, differences }
      };
    } catch (e) {
      return this.error(`Diff failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  private findDifferences(obj1: any, obj2: any, path: string): string[] {
    const diffs: string[] = [];

    if (typeof obj1 !== typeof obj2) {
      diffs.push(`${path || 'root'}: type changed from ${typeof obj1} to ${typeof obj2}`);
      return diffs;
    }

    if (obj1 === null || obj2 === null) {
      if (obj1 !== obj2) diffs.push(`${path || 'root'}: ${obj1} → ${obj2}`);
      return diffs;
    }

    if (typeof obj1 !== 'object') {
      if (obj1 !== obj2) diffs.push(`${path || 'root'}: ${JSON.stringify(obj1)} → ${JSON.stringify(obj2)}`);
      return diffs;
    }

    const keys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);
    for (const key of keys) {
      const newPath = path ? `${path}.${key}` : key;
      if (!(key in obj1)) {
        diffs.push(`${newPath}: added`);
      } else if (!(key in obj2)) {
        diffs.push(`${newPath}: removed`);
      } else {
        diffs.push(...this.findDifferences(obj1[key], obj2[key], newPath));
      }
    }

    return diffs;
  }

  private error(message: string): McpToolResult {
    return { content: [], isError: true, error: { code: -1, message } } as any;
  }
}
