export interface Project {
    id: string;
    name: string;
    description?: string;
    userId: string;
    settings: ProjectSettings;
    rootPath: string;
    stats?: ProjectStats;
    createdAt: Date;
    updatedAt: Date;
}
export interface ProjectSettings {
    defaultModel?: string;
    language?: string;
    framework?: string;
    systemPrompt?: string;
    editor?: {
        tabSize: number;
        insertSpaces: boolean;
        theme: string;
    };
    formatting?: {
        enabled: boolean;
        formatOnSave: boolean;
        linter?: string;
    };
}
export interface ProjectStats {
    fileCount: number;
    lineCount: number;
    agentTaskCount: number;
    lastActivity: Date;
}
export interface ProjectFile {
    id: string;
    path: string;
    name: string;
    extension: string;
    content?: string;
    projectId: string;
    size: number;
    mimeType?: string;
    isDirectory: boolean;
    children?: ProjectFile[];
    createdAt: Date;
    updatedAt: Date;
}
export interface FileVersion {
    id: string;
    fileId: string;
    version: number;
    content: string;
    message?: string;
    authorId?: string;
    agentTaskId?: string;
    createdAt: Date;
}
export interface ProjectSnapshot {
    id: string;
    projectId: string;
    name: string;
    description?: string;
    fileVersions: string[];
    agentTaskId?: string;
    createdAt: Date;
}
export interface FileTreeNode {
    id: string;
    name: string;
    path: string;
    isDirectory: boolean;
    extension?: string;
    isExpanded?: boolean;
    isSelected?: boolean;
    isEditing?: boolean;
    children?: FileTreeNode[];
    icon?: string;
}
export interface CreateProjectDto {
    name: string;
    description?: string;
    settings?: Partial<ProjectSettings>;
}
export interface UpdateProjectDto {
    name?: string;
    description?: string;
    settings?: Partial<ProjectSettings>;
}
export interface CreateFileDto {
    projectId: string;
    path: string;
    name: string;
    content?: string;
    isDirectory?: boolean;
}
export interface UpdateFileDto {
    content?: string;
    path?: string;
    name?: string;
}
export interface FileOperationResult {
    success: boolean;
    file?: ProjectFile;
    error?: string;
}
