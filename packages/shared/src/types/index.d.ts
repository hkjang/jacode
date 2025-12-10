export * from './agent';
export * from './artifact';
export * from './project';
export * from './user';
export * from './ai';
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
export interface ApiError {
    code: string;
    message: string;
    details?: Record<string, unknown>;
}
export interface PaginationOptions {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
export declare enum WSEventType {
    AGENT_CREATED = "agent:created",
    AGENT_UPDATED = "agent:updated",
    AGENT_PROGRESS = "agent:progress",
    AGENT_COMPLETED = "agent:completed",
    AGENT_FAILED = "agent:failed",
    ARTIFACT_CREATED = "artifact:created",
    ARTIFACT_UPDATED = "artifact:updated",
    FILE_CREATED = "file:created",
    FILE_UPDATED = "file:updated",
    FILE_DELETED = "file:deleted",
    CONNECTED = "connected",
    DISCONNECTED = "disconnected",
    ERROR = "error"
}
export interface WSMessage<T = unknown> {
    type: WSEventType;
    payload: T;
    timestamp: number;
}
