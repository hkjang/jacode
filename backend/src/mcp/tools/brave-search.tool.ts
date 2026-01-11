import { Injectable, Logger } from '@nestjs/common';
import { McpTool, McpToolResult, McpContext, McpToolSchema } from '../interfaces/mcp.interface';

@Injectable()
export class BraveSearchTool implements McpTool {
  private readonly logger = new Logger(BraveSearchTool.name);
  
  name = 'brave_search';
  description = 'Search the web using Brave Search API. Useful for finding documentation, code examples, or current information.';

  inputSchema: McpToolSchema = {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query',
      },
      count: {
        type: 'number',
        description: 'Number of results to return (default: 5, max: 20)',
      },
    },
    required: ['query'],
  };

  requiredPermissions = ['WEB_ACCESS'];

  async execute(args: any, context: McpContext): Promise<McpToolResult> {
    const { query, count = 5 } = args;
    const safeCount = Math.min(count, 20);

    // Check for Brave API key
    const apiKey = process.env.BRAVE_SEARCH_API_KEY;
    if (!apiKey) {
      // Fallback: Return a message about configuration
      return {
        content: [{ 
          type: 'text', 
          text: `Brave Search API key not configured.\n\nTo enable web search:\n1. Get an API key from https://brave.com/search/api/\n2. Set BRAVE_SEARCH_API_KEY environment variable\n\nQuery attempted: "${query}"` 
        }],
        metadata: { configured: false }
      };
    }

    try {
      const response = await fetch(
        `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${safeCount}`,
        {
          headers: {
            'Accept': 'application/json',
            'X-Subscription-Token': apiKey,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Brave API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const results = data.web?.results || [];

      if (results.length === 0) {
        return {
          content: [{ type: 'text', text: `No results found for: "${query}"` }],
          metadata: { query, resultCount: 0 }
        };
      }

      // Format results
      const formattedResults = results.map((r: any, i: number) => 
        `${i + 1}. **${r.title}**\n   ${r.url}\n   ${r.description || 'No description'}`
      ).join('\n\n');

      return {
        content: [{ 
          type: 'text', 
          text: `Search results for "${query}":\n\n${formattedResults}` 
        }],
        metadata: { 
          query, 
          resultCount: results.length,
        }
      };

    } catch (error) {
      this.logger.error(`Brave Search failed: ${error}`);
      return {
        content: [],
        isError: true,
        error: {
          code: -1,
          message: `Search failed: ${error instanceof Error ? error.message : String(error)}`
        }
      } as any;
    }
  }
}
