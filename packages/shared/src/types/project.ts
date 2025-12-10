/**
 * Project - Represents a code project/workspace
 */
export interface Project {
  /** Unique identifier */
  id: string;
  /** Project name */
  name: string;
  /** Project description */
  description?: string;
  /** Owner user ID */
  userId: string;
  /** Project settings */
  settings: ProjectSettings;
  /** Root directory path */
  rootPath: string;
  /** Project statistics */
  stats?: ProjectStats;
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Project Settings
 */
export interface ProjectSettings {
  /** Default AI model for this project */
  defaultModel?: string;
  /** Language/framework hints */
  language?: string;
  framework?: string;
  /** Custom prompts/context for agents */
  systemPrompt?: string;
  /** Editor settings */
  editor?: {
    tabSize: number;
    insertSpaces: boolean;
    theme: string;
  };
  /** Linting/formatting settings */
  formatting?: {
    enabled: boolean;
    formatOnSave: boolean;
    linter?: string;
  };
}

/**
 * Project Statistics
 */
export interface ProjectStats {
  /** Number of files */
  fileCount: number;
  /** Total lines of code */
  lineCount: number;
  /** Number of agent tasks run */
  agentTaskCount: number;
  /** Last activity timestamp */
  lastActivity: Date;
}

/**
 * File - Represents a file in a project
 */
export interface ProjectFile {
  /** Unique identifier */
  id: string;
  /** File path relative to project root */
  path: string;
  /** File name */
  name: string;
  /** File extension */
  extension: string;
  /** File content (may be lazy loaded) */
  content?: string;
  /** Parent project ID */
  projectId: string;
  /** File size in bytes */
  size: number;
  /** MIME type */
  mimeType?: string;
  /** Is directory */
  isDirectory: boolean;
  /** Children (for directories) */
  children?: ProjectFile[];
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * File Version - For version history
 */
export interface FileVersion {
  /** Unique identifier */
  id: string;
  /** File ID */
  fileId: string;
  /** Version number */
  version: number;
  /** File content at this version */
  content: string;
  /** Commit message/description */
  message?: string;
  /** Who made this change */
  authorId?: string;
  /** Associated agent task if any */
  agentTaskId?: string;
  /** Creation timestamp */
  createdAt: Date;
}

/**
 * Project Snapshot - Full project state at a point in time
 */
export interface ProjectSnapshot {
  /** Unique identifier */
  id: string;
  /** Project ID */
  projectId: string;
  /** Snapshot name/label */
  name: string;
  /** Description */
  description?: string;
  /** All file versions in this snapshot */
  fileVersions: string[];
  /** Associated agent task if any */
  agentTaskId?: string;
  /** Creation timestamp */
  createdAt: Date;
}

/**
 * File Tree Node - For UI representation
 */
export interface FileTreeNode {
  /** Node identifier (file path) */
  id: string;
  /** Display name */
  name: string;
  /** Full path */
  path: string;
  /** Is directory */
  isDirectory: boolean;
  /** File extension (if file) */
  extension?: string;
  /** Is expanded (for directories) */
  isExpanded?: boolean;
  /** Is selected */
  isSelected?: boolean;
  /** Is currently being edited */
  isEditing?: boolean;
  /** Children nodes */
  children?: FileTreeNode[];
  /** Icon name/type */
  icon?: string;
}

/**
 * Create Project DTO
 */
export interface CreateProjectDto {
  name: string;
  description?: string;
  settings?: Partial<ProjectSettings>;
}

/**
 * Update Project DTO
 */
export interface UpdateProjectDto {
  name?: string;
  description?: string;
  settings?: Partial<ProjectSettings>;
}

/**
 * Create File DTO
 */
export interface CreateFileDto {
  projectId: string;
  path: string;
  name: string;
  content?: string;
  isDirectory?: boolean;
}

/**
 * Update File DTO
 */
export interface UpdateFileDto {
  content?: string;
  path?: string;
  name?: string;
}

/**
 * File Operation Result
 */
export interface FileOperationResult {
  success: boolean;
  file?: ProjectFile;
  error?: string;
}
