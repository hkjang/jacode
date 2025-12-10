export declare enum ArtifactType {
    PLAN = "PLAN",
    CODE = "CODE",
    DIFF = "DIFF",
    TEST_RESULT = "TEST_RESULT",
    LOG = "LOG",
    SCREENSHOT = "SCREENSHOT",
    REVIEW = "REVIEW",
    DOCUMENTATION = "DOCUMENTATION"
}
export declare enum ArtifactStatus {
    DRAFT = "DRAFT",
    APPROVED = "APPROVED",
    REJECTED = "REJECTED",
    APPLIED = "APPLIED"
}
export interface Artifact {
    id: string;
    type: ArtifactType;
    agentTaskId: string;
    title: string;
    content: string;
    metadata: ArtifactMetadata;
    status: ArtifactStatus;
    feedback?: ArtifactFeedback;
    createdAt: Date;
    updatedAt: Date;
}
export interface ArtifactMetadata {
    filePath?: string;
    language?: string;
    lineCount?: number;
    tokenCount?: number;
    duration?: number;
    model?: string;
    custom?: Record<string, unknown>;
}
export interface ArtifactFeedback {
    rating?: number;
    comment?: string;
    lineComments?: LineComment[];
    createdAt: Date;
}
export interface LineComment {
    line: number;
    comment: string;
    type: 'suggestion' | 'issue' | 'question' | 'praise';
}
export interface DiffHunk {
    oldStart: number;
    oldLines: number;
    newStart: number;
    newLines: number;
    content: string;
    changes: DiffChange[];
}
export interface DiffChange {
    type: 'add' | 'delete' | 'normal';
    content: string;
    oldLine?: number;
    newLine?: number;
}
export interface CodeDiff {
    filePath: string;
    originalContent: string;
    modifiedContent: string;
    hunks: DiffHunk[];
    summary: {
        additions: number;
        deletions: number;
        changes: number;
    };
}
export interface PlanArtifact extends Artifact {
    type: ArtifactType.PLAN;
    content: string;
    metadata: ArtifactMetadata & {
        steps: number;
        estimatedTime?: string;
    };
}
export interface CodeArtifact extends Artifact {
    type: ArtifactType.CODE;
    metadata: ArtifactMetadata & {
        filePath: string;
        language: string;
        lineCount: number;
    };
}
export interface DiffArtifact extends Artifact {
    type: ArtifactType.DIFF;
    metadata: ArtifactMetadata & {
        filePath: string;
        diff: CodeDiff;
    };
}
export interface CreateArtifactDto {
    type: ArtifactType;
    agentTaskId: string;
    title: string;
    content: string;
    metadata?: ArtifactMetadata;
}
export interface UpdateArtifactDto {
    status?: ArtifactStatus;
    feedback?: ArtifactFeedback;
}
export interface ArtifactFilter {
    agentTaskId?: string;
    type?: ArtifactType[];
    status?: ArtifactStatus[];
    projectId?: string;
}
