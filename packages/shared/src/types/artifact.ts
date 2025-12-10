/**
 * Artifact Type - Categorizes the type of artifact produced by an agent
 */
export enum ArtifactType {
  /** Implementation plan/strategy document */
  PLAN = 'PLAN',
  /** Generated source code */
  CODE = 'CODE',
  /** Code changes/diff */
  DIFF = 'DIFF',
  /** Test execution results */
  TEST_RESULT = 'TEST_RESULT',
  /** Execution logs */
  LOG = 'LOG',
  /** Screenshots or visual output */
  SCREENSHOT = 'SCREENSHOT',
  /** Code review feedback */
  REVIEW = 'REVIEW',
  /** Documentation */
  DOCUMENTATION = 'DOCUMENTATION',
}

/**
 * Artifact Status
 */
export enum ArtifactStatus {
  /** Draft - not yet reviewed */
  DRAFT = 'DRAFT',
  /** Approved by user */
  APPROVED = 'APPROVED',
  /** Rejected by user */
  REJECTED = 'REJECTED',
  /** Applied to codebase */
  APPLIED = 'APPLIED',
}

/**
 * Base Artifact interface
 */
export interface Artifact {
  /** Unique identifier */
  id: string;
  /** Type of artifact */
  type: ArtifactType;
  /** Associated agent task ID */
  agentTaskId: string;
  /** Human-readable title */
  title: string;
  /** Content of the artifact */
  content: string;
  /** Additional metadata */
  metadata: ArtifactMetadata;
  /** Current status */
  status: ArtifactStatus;
  /** User feedback if any */
  feedback?: ArtifactFeedback;
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Artifact Metadata
 */
export interface ArtifactMetadata {
  /** File path for code/diff artifacts */
  filePath?: string;
  /** Programming language */
  language?: string;
  /** Line count for code artifacts */
  lineCount?: number;
  /** Token count used for generation */
  tokenCount?: number;
  /** Generation duration in ms */
  duration?: number;
  /** Model used for generation */
  model?: string;
  /** Custom metadata */
  custom?: Record<string, unknown>;
}

/**
 * User feedback on an artifact
 */
export interface ArtifactFeedback {
  /** Rating (1-5 or thumbs up/down) */
  rating?: number;
  /** User comment */
  comment?: string;
  /** Specific line comments for code */
  lineComments?: LineComment[];
  /** Timestamp */
  createdAt: Date;
}

/**
 * Line-specific comment on code artifact
 */
export interface LineComment {
  /** Line number */
  line: number;
  /** Comment text */
  comment: string;
  /** Comment type */
  type: 'suggestion' | 'issue' | 'question' | 'praise';
}

/**
 * Diff Hunk - represents a single change block
 */
export interface DiffHunk {
  /** Starting line in the old file */
  oldStart: number;
  /** Number of lines in old version */
  oldLines: number;
  /** Starting line in the new file */
  newStart: number;
  /** Number of lines in new version */
  newLines: number;
  /** The actual diff content */
  content: string;
  /** Change lines */
  changes: DiffChange[];
}

/**
 * Individual change in a diff
 */
export interface DiffChange {
  /** Type of change */
  type: 'add' | 'delete' | 'normal';
  /** Line content */
  content: string;
  /** Line number in old file (for delete/normal) */
  oldLine?: number;
  /** Line number in new file (for add/normal) */
  newLine?: number;
}

/**
 * Code Diff Artifact - represents changes to a file
 */
export interface CodeDiff {
  /** File path */
  filePath: string;
  /** Original file content */
  originalContent: string;
  /** Modified file content */
  modifiedContent: string;
  /** Parsed diff hunks */
  hunks: DiffHunk[];
  /** Summary of changes */
  summary: {
    additions: number;
    deletions: number;
    changes: number;
  };
}

/**
 * Plan Artifact - implementation strategy
 */
export interface PlanArtifact extends Artifact {
  type: ArtifactType.PLAN;
  content: string; // Markdown content
  metadata: ArtifactMetadata & {
    steps: number;
    estimatedTime?: string;
  };
}

/**
 * Code Artifact - generated code
 */
export interface CodeArtifact extends Artifact {
  type: ArtifactType.CODE;
  metadata: ArtifactMetadata & {
    filePath: string;
    language: string;
    lineCount: number;
  };
}

/**
 * Diff Artifact - code changes
 */
export interface DiffArtifact extends Artifact {
  type: ArtifactType.DIFF;
  metadata: ArtifactMetadata & {
    filePath: string;
    diff: CodeDiff;
  };
}

/**
 * Create Artifact DTO
 */
export interface CreateArtifactDto {
  type: ArtifactType;
  agentTaskId: string;
  title: string;
  content: string;
  metadata?: ArtifactMetadata;
}

/**
 * Update Artifact DTO
 */
export interface UpdateArtifactDto {
  status?: ArtifactStatus;
  feedback?: ArtifactFeedback;
}

/**
 * Artifact Filter
 */
export interface ArtifactFilter {
  agentTaskId?: string;
  type?: ArtifactType[];
  status?: ArtifactStatus[];
  projectId?: string;
}
