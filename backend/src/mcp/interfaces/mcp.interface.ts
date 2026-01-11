export interface JSONSchema {
  type: string;
  properties?: Record<string, any>;
  required?: string[];
  description?: string;
  enum?: any[];
  items?: JSONSchema | JSONSchema[];
  [key: string]: any;
}

export interface McpToolSchema extends JSONSchema {
  type: 'object';
}

export interface McpTool {
  name: string;
  description: string;
  inputSchema: McpToolSchema;
  outputSchema?: JSONSchema;
  
  /**
   * Execute the tool with the given arguments
   */
  execute<T = any>(args: any, context: McpContext): Promise<McpToolResult<T>>;

  /**
   * Required permissions to execute this tool
   * If empty, tool is public (or subject to default policy)
   */
  requiredPermissions?: string[];
}

export interface McpContext {
  sessionId: string;
  userId: string;
  projectId?: string;
  userRole?: string;
  workingDirectory?: string;
  metadata?: Record<string, any>;
}

export interface McpToolResult<T = any> {
  content: {
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string; // base64 for images
    mimeType?: string;
    resource?: any;
  }[];
  isError?: boolean;
  metadata?: Record<string, any>; // Execution time, etc.
}

export interface McpRequest {
  jsonrpc: '2.0';
  method: string;
  params?: any;
  id: string | number;
}

export interface McpResponse {
  jsonrpc: '2.0';
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  id: string | number | null;
}

export const McpErrorCodes = {
  ParseError: -32700,
  InvalidRequest: -32600,
  MethodNotFound: -32601,
  InvalidParams: -32602,
  InternalError: -32603,
  ServerError: -32000,
  UnknownTool: -32001,
  PermissionDenied: -32002,
  ToolExecutionError: -32003,
};
