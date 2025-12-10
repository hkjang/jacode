// Agent Types
export * from './agent';

// Artifact Types
export * from './artifact';

// Project Types
export * from './project';

// User Types
export * from './user';

// AI Types
export * from './ai';

/**
 * API Response Wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

/**
 * API Error
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Pagination Options
 */
export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * WebSocket Event Types
 */
export enum WSEventType {
  // Agent Events
  AGENT_CREATED = 'agent:created',
  AGENT_UPDATED = 'agent:updated',
  AGENT_PROGRESS = 'agent:progress',
  AGENT_COMPLETED = 'agent:completed',
  AGENT_FAILED = 'agent:failed',
  
  // Artifact Events
  ARTIFACT_CREATED = 'artifact:created',
  ARTIFACT_UPDATED = 'artifact:updated',
  
  // File Events
  FILE_CREATED = 'file:created',
  FILE_UPDATED = 'file:updated',
  FILE_DELETED = 'file:deleted',
  
  // Connection Events
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',
}

/**
 * WebSocket Message
 */
export interface WSMessage<T = unknown> {
  type: WSEventType;
  payload: T;
  timestamp: number;
}
