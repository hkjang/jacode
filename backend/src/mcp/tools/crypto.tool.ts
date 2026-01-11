import { Injectable } from '@nestjs/common';
import { McpTool, McpToolResult, McpContext, McpToolSchema } from '../interfaces/mcp.interface';
import * as crypto from 'crypto';

@Injectable()
export class CryptoTool implements McpTool {
  name = 'crypto';
  description = 'Generate hashes, UUIDs, random tokens, and encode/decode strings. Useful for security and data processing.';

  inputSchema: McpToolSchema = {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        enum: ['hash', 'uuid', 'random', 'base64_encode', 'base64_decode', 'hex_encode', 'hex_decode'],
        description: 'Crypto operation to perform',
      },
      input: {
        type: 'string',
        description: 'Input string for hash/encode/decode operations',
      },
      algorithm: {
        type: 'string',
        enum: ['md5', 'sha1', 'sha256', 'sha512'],
        description: 'Hash algorithm (default: sha256)',
      },
      length: {
        type: 'number',
        description: 'Length for random token generation (default: 32)',
      },
    },
    required: ['operation'],
  };

  async execute(args: any, context: McpContext): Promise<McpToolResult> {
    const { operation, input, algorithm = 'sha256', length = 32 } = args;

    switch (operation) {
      case 'hash':
        if (!input) return this.error('Input is required for hash operation');
        return this.hash(input, algorithm);

      case 'uuid':
        return this.generateUuid();

      case 'random':
        return this.generateRandom(length);

      case 'base64_encode':
        if (!input) return this.error('Input is required for base64_encode');
        return this.base64Encode(input);

      case 'base64_decode':
        if (!input) return this.error('Input is required for base64_decode');
        return this.base64Decode(input);

      case 'hex_encode':
        if (!input) return this.error('Input is required for hex_encode');
        return this.hexEncode(input);

      case 'hex_decode':
        if (!input) return this.error('Input is required for hex_decode');
        return this.hexDecode(input);

      default:
        return this.error(`Unknown operation: ${operation}`);
    }
  }

  private hash(input: string, algorithm: string): McpToolResult {
    try {
      const hash = crypto.createHash(algorithm).update(input).digest('hex');
      return {
        content: [{ type: 'text', text: `${algorithm.toUpperCase()}: ${hash}` }],
        metadata: { algorithm, hash, inputLength: input.length }
      };
    } catch (e) {
      return this.error(`Hash failed: ${e}`);
    }
  }

  private generateUuid(): McpToolResult {
    const uuid = crypto.randomUUID();
    return {
      content: [{ type: 'text', text: uuid }],
      metadata: { uuid, version: 4 }
    };
  }

  private generateRandom(length: number): McpToolResult {
    const safeLength = Math.min(Math.max(length, 8), 256);
    const bytes = crypto.randomBytes(Math.ceil(safeLength / 2));
    const token = bytes.toString('hex').slice(0, safeLength);
    
    // Also generate alphanumeric version
    const alphanumeric = crypto.randomBytes(safeLength)
      .toString('base64')
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, safeLength);

    return {
      content: [{ 
        type: 'text', 
        text: `Hex: ${token}\nAlphanumeric: ${alphanumeric}`
      }],
      metadata: { hex: token, alphanumeric, length: safeLength }
    };
  }

  private base64Encode(input: string): McpToolResult {
    const encoded = Buffer.from(input, 'utf-8').toString('base64');
    return {
      content: [{ type: 'text', text: encoded }],
      metadata: { inputLength: input.length, outputLength: encoded.length }
    };
  }

  private base64Decode(input: string): McpToolResult {
    try {
      const decoded = Buffer.from(input, 'base64').toString('utf-8');
      return {
        content: [{ type: 'text', text: decoded }],
        metadata: { inputLength: input.length, outputLength: decoded.length }
      };
    } catch (e) {
      return this.error(`Base64 decode failed: ${e}`);
    }
  }

  private hexEncode(input: string): McpToolResult {
    const encoded = Buffer.from(input, 'utf-8').toString('hex');
    return {
      content: [{ type: 'text', text: encoded }],
      metadata: { inputLength: input.length, outputLength: encoded.length }
    };
  }

  private hexDecode(input: string): McpToolResult {
    try {
      const decoded = Buffer.from(input, 'hex').toString('utf-8');
      return {
        content: [{ type: 'text', text: decoded }],
        metadata: { inputLength: input.length, outputLength: decoded.length }
      };
    } catch (e) {
      return this.error(`Hex decode failed: ${e}`);
    }
  }

  private error(message: string): McpToolResult {
    return { content: [], isError: true, error: { code: -1, message } } as any;
  }
}
