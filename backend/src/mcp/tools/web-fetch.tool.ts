import { Injectable } from '@nestjs/common';
import { McpTool, McpToolResult, McpContext, McpToolSchema } from '../interfaces/mcp.interface';

@Injectable()
export class WebFetchTool implements McpTool {
  name = 'web_fetch';
  description = 'Fetch content from a URL. Useful for reading documentation, API responses, or web pages.';

  inputSchema: McpToolSchema = {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'The URL to fetch content from',
      },
      method: {
        type: 'string',
        enum: ['GET', 'POST'],
        description: 'HTTP method (default: GET)',
      },
      headers: {
        type: 'object',
        description: 'Optional HTTP headers',
      },
      body: {
        type: 'string',
        description: 'Request body for POST requests',
      },
    },
    required: ['url'],
  };

  requiredPermissions = ['WEB_ACCESS'];

  async execute(args: any, context: McpContext): Promise<McpToolResult> {
    const { url, method = 'GET', headers = {}, body } = args;

    // Validate URL
    try {
      new URL(url);
    } catch {
      return {
        content: [],
        isError: true,
        error: { code: -1, message: 'Invalid URL provided' }
      } as any;
    }

    // Security: Block internal/private URLs
    const blockedPatterns = ['localhost', '127.0.0.1', '0.0.0.0', '192.168.', '10.', '172.'];
    if (blockedPatterns.some(pattern => url.includes(pattern))) {
      return {
        content: [],
        isError: true,
        error: { code: -1, message: 'Access to internal/private URLs is not allowed' }
      } as any;
    }

    try {
      const fetchOptions: RequestInit = {
        method,
        headers: {
          'User-Agent': 'MCP-WebFetch/1.0',
          ...headers,
        },
      };

      if (method === 'POST' && body) {
        fetchOptions.body = body;
      }

      const response = await fetch(url, fetchOptions);
      const contentType = response.headers.get('content-type') || '';
      
      let content: string;
      if (contentType.includes('application/json')) {
        const json = await response.json();
        content = JSON.stringify(json, null, 2);
      } else {
        content = await response.text();
        // Truncate very long responses
        if (content.length > 50000) {
          content = content.substring(0, 50000) + '\n... (truncated)';
        }
      }

      return {
        content: [{ 
          type: 'text', 
          text: `Status: ${response.status} ${response.statusText}\n\n${content}` 
        }],
        metadata: {
          status: response.status,
          contentType,
          contentLength: content.length,
        }
      };

    } catch (error) {
      return {
        content: [],
        isError: true,
        error: {
          code: -1,
          message: `Fetch failed: ${error instanceof Error ? error.message : String(error)}`
        }
      } as any;
    }
  }
}
