/**
 * Agent Status - Represents the current state of an agent task
 */
export enum AgentStatus {
  /** Task is queued and waiting to be processed */
  PENDING = 'PENDING',
  /** Agent is analyzing the request and creating a plan */
  PLANNING = 'PLANNING',
  /** Agent is executing the plan (generating/modifying code) */
  EXECUTING = 'EXECUTING',
  /** Agent has completed work and waiting for user approval */
  WAITING_APPROVAL = 'WAITING_APPROVAL',
  /** Task completed successfully with all changes applied */
  COMPLETED = 'COMPLETED',
  /** Task failed due to an error */
  FAILED = 'FAILED',
  /** Task was cancelled by the user */
  CANCELLED = 'CANCELLED',
}

/**
 * Agent Type - Categorizes the type of work an agent performs
 */
export enum AgentType {
  /** Generate new code from scratch */
  CODE_GENERATION = 'CODE_GENERATION',
  /** Modify existing code based on requirements */
  CODE_MODIFICATION = 'CODE_MODIFICATION',
  /** Review code for issues and improvements */
  CODE_REVIEW = 'CODE_REVIEW',
  /** Generate test cases for existing code */
  TEST_GENERATION = 'TEST_GENERATION',
  /** Refactor code for better structure/performance */
  REFACTORING = 'REFACTORING',
  /** Fix bugs in existing code */
  BUG_FIX = 'BUG_FIX',
  /** Document code with comments and docs */
  DOCUMENTATION = 'DOCUMENTATION',
}

/**
 * Agent Priority Levels
 */
export enum AgentPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  URGENT = 3,
}

/**
 * Context information for an agent task
 */
export interface AgentContext {
  /** Project ID this task belongs to */
  projectId: string;
  /** Files relevant to this task */
  files: string[];
  /** Code context (surrounding code, imports, etc.) */
  codeContext?: string;
  /** Reference to previous artifacts for context */
  previousArtifacts?: string[];
  /** Selected text or code range */
  selection?: {
    filePath: string;
    startLine: number;
    endLine: number;
    content: string;
  };
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Artifact reference in agent task
 */
export interface ArtifactReference {
  id: string;
  type: string;
  title: string;
}

/**
 * Agent Task - Represents a unit of work for an agent
 */
export interface AgentTask {
  /** Unique identifier */
  id: string;
  /** Type of agent work */
  type: AgentType;
  /** Current status */
  status: AgentStatus;
  /** Priority level */
  priority: AgentPriority;
  /** User's natural language prompt */
  prompt: string;
  /** Context information */
  context: AgentContext;
  /** Generated artifacts */
  artifacts: ArtifactReference[];
  /** Error message if failed */
  error?: string;
  /** Progress percentage (0-100) */
  progress?: number;
  /** Current step description */
  currentStep?: string;
  /** Task group identifier for batch operations */
  groupId?: string;
  /** When the task was created */
  createdAt: Date;
  /** When the task was last updated */
  updatedAt: Date;
  /** When the task started processing */
  startedAt?: Date;
  /** When the task completed */
  completedAt?: Date;
}

/**
 * Create Agent Task DTO
 */
export interface CreateAgentTaskDto {
  type: AgentType;
  prompt: string;
  context: AgentContext;
  priority?: AgentPriority;
  groupId?: string;
}

/**
 * Update Agent Task DTO
 */
export interface UpdateAgentTaskDto {
  status?: AgentStatus;
  priority?: AgentPriority;
  progress?: number;
  currentStep?: string;
  error?: string;
}

/**
 * Agent Task Filter
 */
export interface AgentTaskFilter {
  projectId?: string;
  status?: AgentStatus[];
  type?: AgentType[];
  groupId?: string;
  priority?: AgentPriority[];
}

/**
 * Agent execution plan step
 */
export interface PlanStep {
  id: string;
  order: number;
  description: string;
  type: 'analyze' | 'generate' | 'modify' | 'test' | 'review';
  targetFiles?: string[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  output?: string;
}

/**
 * Agent execution plan
 */
export interface ExecutionPlan {
  taskId: string;
  summary: string;
  steps: PlanStep[];
  estimatedDuration?: number;
  createdAt: Date;
}
