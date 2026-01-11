import { Injectable } from '@nestjs/common';
import { McpTool, McpToolResult, McpContext, McpToolSchema } from '../interfaces/mcp.interface';

@Injectable()
export class TextTool implements McpTool {
  name = 'text';
  description = 'Process and transform text. Includes regex search/replace, case conversion, line counting, and more.';

  inputSchema: McpToolSchema = {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        enum: ['regex', 'replace', 'case', 'count', 'trim', 'split', 'join', 'reverse', 'truncate'],
        description: 'Text operation to perform',
      },
      text: {
        type: 'string',
        description: 'Input text to process',
      },
      pattern: {
        type: 'string',
        description: 'Regex pattern or search string',
      },
      replacement: {
        type: 'string',
        description: 'Replacement string (for replace operation)',
      },
      caseType: {
        type: 'string',
        enum: ['upper', 'lower', 'title', 'camel', 'snake', 'kebab'],
        description: 'Case type for case operation',
      },
      separator: {
        type: 'string',
        description: 'Separator for split/join operations',
      },
      maxLength: {
        type: 'number',
        description: 'Maximum length for truncate operation',
      },
    },
    required: ['operation', 'text'],
  };

  async execute(args: any, context: McpContext): Promise<McpToolResult> {
    const { operation, text, pattern, replacement, caseType, separator, maxLength } = args;

    switch (operation) {
      case 'regex':
        if (!pattern) return this.error('Pattern is required for regex operation');
        return this.regexSearch(text, pattern);

      case 'replace':
        if (!pattern) return this.error('Pattern is required for replace operation');
        return this.replace(text, pattern, replacement || '');

      case 'case':
        if (!caseType) return this.error('caseType is required for case operation');
        return this.changeCase(text, caseType);

      case 'count':
        return this.count(text);

      case 'trim':
        return this.trim(text);

      case 'split':
        return this.split(text, separator || '\n');

      case 'join':
        return this.join(text, separator || ' ');

      case 'reverse':
        return this.reverse(text);

      case 'truncate':
        return this.truncate(text, maxLength || 100);

      default:
        return this.error(`Unknown operation: ${operation}`);
    }
  }

  private regexSearch(text: string, pattern: string): McpToolResult {
    try {
      const regex = new RegExp(pattern, 'gm');
      const matches = text.match(regex) || [];
      
      return {
        content: [{ 
          type: 'text', 
          text: matches.length > 0 
            ? `Found ${matches.length} match(es):\n${matches.map((m, i) => `${i + 1}. ${m}`).join('\n')}`
            : 'No matches found'
        }],
        metadata: { pattern, matchCount: matches.length, matches: matches.slice(0, 50) }
      };
    } catch (e) {
      return this.error(`Invalid regex: ${e}`);
    }
  }

  private replace(text: string, pattern: string, replacement: string): McpToolResult {
    try {
      const regex = new RegExp(pattern, 'g');
      const result = text.replace(regex, replacement);
      const changeCount = (text.match(regex) || []).length;
      
      return {
        content: [{ type: 'text', text: result }],
        metadata: { replacements: changeCount }
      };
    } catch (e) {
      // Fallback to simple string replace
      const result = text.split(pattern).join(replacement);
      return { content: [{ type: 'text', text: result }] };
    }
  }

  private changeCase(text: string, caseType: string): McpToolResult {
    let result: string;

    switch (caseType) {
      case 'upper':
        result = text.toUpperCase();
        break;
      case 'lower':
        result = text.toLowerCase();
        break;
      case 'title':
        result = text.replace(/\b\w/g, c => c.toUpperCase());
        break;
      case 'camel':
        result = text
          .replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase())
          .replace(/^./, c => c.toLowerCase());
        break;
      case 'snake':
        result = text
          .replace(/([A-Z])/g, '_$1')
          .replace(/[\s-]+/g, '_')
          .toLowerCase()
          .replace(/^_/, '');
        break;
      case 'kebab':
        result = text
          .replace(/([A-Z])/g, '-$1')
          .replace(/[\s_]+/g, '-')
          .toLowerCase()
          .replace(/^-/, '');
        break;
      default:
        return this.error(`Unknown case type: ${caseType}`);
    }

    return { content: [{ type: 'text', text: result }] };
  }

  private count(text: string): McpToolResult {
    const lines = text.split('\n').length;
    const words = text.split(/\s+/).filter(w => w.length > 0).length;
    const chars = text.length;
    const charsNoSpace = text.replace(/\s/g, '').length;

    return {
      content: [{ 
        type: 'text', 
        text: `Characters: ${chars}\nCharacters (no spaces): ${charsNoSpace}\nWords: ${words}\nLines: ${lines}`
      }],
      metadata: { characters: chars, charactersNoSpace: charsNoSpace, words, lines }
    };
  }

  private trim(text: string): McpToolResult {
    const trimmed = text.trim();
    const lines = trimmed.split('\n').map(l => l.trim()).join('\n');
    return { 
      content: [{ type: 'text', text: lines }],
      metadata: { originalLength: text.length, trimmedLength: lines.length }
    };
  }

  private split(text: string, separator: string): McpToolResult {
    const parts = text.split(separator);
    return {
      content: [{ type: 'text', text: JSON.stringify(parts, null, 2) }],
      metadata: { partCount: parts.length }
    };
  }

  private join(text: string, separator: string): McpToolResult {
    // Assume text is JSON array or newline-separated
    let parts: string[];
    try {
      parts = JSON.parse(text);
    } catch {
      parts = text.split('\n');
    }
    const result = parts.join(separator);
    return { content: [{ type: 'text', text: result }] };
  }

  private reverse(text: string): McpToolResult {
    // Reverse by lines
    const lines = text.split('\n').reverse().join('\n');
    return { content: [{ type: 'text', text: lines }] };
  }

  private truncate(text: string, maxLength: number): McpToolResult {
    if (text.length <= maxLength) {
      return { content: [{ type: 'text', text }] };
    }
    const truncated = text.slice(0, maxLength - 3) + '...';
    return { 
      content: [{ type: 'text', text: truncated }],
      metadata: { originalLength: text.length, truncated: true }
    };
  }

  private error(message: string): McpToolResult {
    return { content: [], isError: true, error: { code: -1, message } } as any;
  }
}
