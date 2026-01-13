import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * MCP Server connection configuration
 */
export interface MCPServerConfig {
  id: string;
  name: string;
  url: string;
  type: 'stdio' | 'sse' | 'websocket';
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  enabled: boolean;
}

/**
 * MCP Tool definition from external server
 */
export interface MCPExternalTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
  serverId: string;
}

/**
 * MCP Resource definition
 */
export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
  serverId: string;
}

/**
 * Connection status
 */
export interface MCPConnectionStatus {
  serverId: string;
  connected: boolean;
  lastPing?: Date;
  error?: string;
  toolCount: number;
  resourceCount: number;
}

/**
 * MCP Client Service
 * 
 * Connects to external MCP servers following the Model Context Protocol.
 * Supports stdio, SSE, and WebSocket transports.
 */
@Injectable()
export class MCPClientService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MCPClientService.name);
  
  private servers: Map<string, MCPServerConfig> = new Map();
  private connections: Map<string, MCPConnectionStatus> = new Map();
  private externalTools: Map<string, MCPExternalTool[]> = new Map();
  private externalResources: Map<string, MCPResource[]> = new Map();
  private reconnectIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.loadServers();
    this.logger.log('MCPClientService initialized');
  }

  async onModuleDestroy() {
    for (const interval of this.reconnectIntervals.values()) {
      clearInterval(interval);
    }
    await this.disconnectAll();
  }

  /**
   * Load MCP server configurations from database
   */
  async loadServers(): Promise<void> {
    try {
      // Load from database (could be MCPServer table)
      const servers = await this.prisma.$queryRaw<MCPServerConfig[]>`
        SELECT id, name, url, type, command, args, env, enabled
        FROM mcp_servers
        WHERE enabled = true
      `.catch(() => []);

      for (const server of servers) {
        this.servers.set(server.id, server);
        if (server.enabled) {
          await this.connect(server.id);
        }
      }
    } catch (error) {
      this.logger.warn('No MCP servers configured in database');
    }
  }

  /**
   * Register an MCP server
   */
  async registerServer(config: MCPServerConfig): Promise<void> {
    this.servers.set(config.id, config);
    
    if (config.enabled) {
      await this.connect(config.id);
    }
    
    this.logger.log(`Registered MCP server: ${config.name}`);
  }

  /**
   * Connect to an MCP server
   */
  async connect(serverId: string): Promise<boolean> {
    const server = this.servers.get(serverId);
    if (!server) {
      this.logger.warn(`Server not found: ${serverId}`);
      return false;
    }

    try {
      this.logger.debug(`Connecting to MCP server: ${server.name} (${server.type})`);

      switch (server.type) {
        case 'sse':
          await this.connectSSE(server);
          break;
        case 'websocket':
          await this.connectWebSocket(server);
          break;
        case 'stdio':
          await this.connectStdio(server);
          break;
        default:
          throw new Error(`Unsupported transport type: ${server.type}`);
      }

      // Fetch tools and resources
      await this.discoverCapabilities(serverId);

      const status: MCPConnectionStatus = {
        serverId,
        connected: true,
        lastPing: new Date(),
        toolCount: this.externalTools.get(serverId)?.length || 0,
        resourceCount: this.externalResources.get(serverId)?.length || 0,
      };
      this.connections.set(serverId, status);

      this.logger.log(`Connected to MCP server: ${server.name}`);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.connections.set(serverId, {
        serverId,
        connected: false,
        error: message,
        toolCount: 0,
        resourceCount: 0,
      });
      this.logger.error(`Failed to connect to ${server.name}: ${message}`);
      return false;
    }
  }

  /**
   * Connect via SSE (Server-Sent Events)
   */
  private async connectSSE(server: MCPServerConfig): Promise<void> {
    // SSE connection for MCP
    const initUrl = `${server.url}/sse`;
    
    const response = await fetch(initUrl, {
      method: 'GET',
      headers: { 'Accept': 'text/event-stream' },
    });

    if (!response.ok) {
      throw new Error(`SSE connection failed: ${response.statusText}`);
    }

    this.logger.debug(`SSE connection established to ${server.name}`);
  }

  /**
   * Connect via WebSocket
   */
  private async connectWebSocket(server: MCPServerConfig): Promise<void> {
    // WebSocket connection placeholder
    this.logger.debug(`WebSocket connection to ${server.url}`);
  }

  /**
   * Connect via stdio (subprocess)
   */
  private async connectStdio(server: MCPServerConfig): Promise<void> {
    if (!server.command) {
      throw new Error('Stdio transport requires command');
    }

    // Spawn subprocess placeholder
    this.logger.debug(`Stdio connection via ${server.command}`);
  }

  /**
   * Discover capabilities from connected server
   */
  private async discoverCapabilities(serverId: string): Promise<void> {
    const server = this.servers.get(serverId);
    if (!server) return;

    try {
      // List tools
      const toolsResponse = await this.sendRequest(serverId, 'tools/list', {});
      if (toolsResponse?.tools) {
        this.externalTools.set(serverId, toolsResponse.tools.map((t: any) => ({
          ...t,
          serverId,
        })));
      }

      // List resources
      const resourcesResponse = await this.sendRequest(serverId, 'resources/list', {});
      if (resourcesResponse?.resources) {
        this.externalResources.set(serverId, resourcesResponse.resources.map((r: any) => ({
          ...r,
          serverId,
        })));
      }
    } catch (error) {
      this.logger.warn(`Failed to discover capabilities for ${serverId}`);
    }
  }

  /**
   * Send JSON-RPC request to MCP server
   */
  private async sendRequest(
    serverId: string,
    method: string,
    params: any
  ): Promise<any> {
    const server = this.servers.get(serverId);
    if (!server) throw new Error(`Server not found: ${serverId}`);

    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const request = {
      jsonrpc: '2.0',
      id: requestId,
      method,
      params,
    };

    if (server.type === 'sse' || server.type === 'websocket') {
      const response = await fetch(`${server.url}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`Request failed: ${response.statusText}`);
      }

      return response.json();
    }

    // For stdio, would use subprocess communication
    return null;
  }

  /**
   * Execute a tool on an external MCP server
   */
  async executeTool(
    serverId: string,
    toolName: string,
    args: any
  ): Promise<any> {
    const connection = this.connections.get(serverId);
    if (!connection?.connected) {
      throw new Error(`Not connected to server: ${serverId}`);
    }

    const result = await this.sendRequest(serverId, 'tools/call', {
      name: toolName,
      arguments: args,
    });

    return result;
  }

  /**
   * Read a resource from an external MCP server
   */
  async readResource(serverId: string, uri: string): Promise<any> {
    const connection = this.connections.get(serverId);
    if (!connection?.connected) {
      throw new Error(`Not connected to server: ${serverId}`);
    }

    const result = await this.sendRequest(serverId, 'resources/read', { uri });
    return result;
  }

  /**
   * Get all discovered tools across all servers
   */
  getAllExternalTools(): MCPExternalTool[] {
    const tools: MCPExternalTool[] = [];
    for (const serverTools of this.externalTools.values()) {
      tools.push(...serverTools);
    }
    return tools;
  }

  /**
   * Get all discovered resources across all servers
   */
  getAllExternalResources(): MCPResource[] {
    const resources: MCPResource[] = [];
    for (const serverResources of this.externalResources.values()) {
      resources.push(...serverResources);
    }
    return resources;
  }

  /**
   * Get connection status for all servers
   */
  getConnectionStatuses(): MCPConnectionStatus[] {
    return Array.from(this.connections.values());
  }

  /**
   * Disconnect from a server
   */
  async disconnect(serverId: string): Promise<void> {
    const interval = this.reconnectIntervals.get(serverId);
    if (interval) {
      clearInterval(interval);
      this.reconnectIntervals.delete(serverId);
    }

    this.connections.delete(serverId);
    this.externalTools.delete(serverId);
    this.externalResources.delete(serverId);
    
    this.logger.log(`Disconnected from server: ${serverId}`);
  }

  /**
   * Disconnect from all servers
   */
  async disconnectAll(): Promise<void> {
    for (const serverId of this.servers.keys()) {
      await this.disconnect(serverId);
    }
  }

  /**
   * Check if a server is connected
   */
  isConnected(serverId: string): boolean {
    return this.connections.get(serverId)?.connected || false;
  }
}
