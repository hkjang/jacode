export declare enum AgentStatus {
    PENDING = "PENDING",
    PLANNING = "PLANNING",
    EXECUTING = "EXECUTING",
    WAITING_APPROVAL = "WAITING_APPROVAL",
    COMPLETED = "COMPLETED",
    FAILED = "FAILED",
    CANCELLED = "CANCELLED"
}
export declare enum AgentType {
    CODE_GENERATION = "CODE_GENERATION",
    CODE_MODIFICATION = "CODE_MODIFICATION",
    CODE_REVIEW = "CODE_REVIEW",
    TEST_GENERATION = "TEST_GENERATION",
    REFACTORING = "REFACTORING",
    BUG_FIX = "BUG_FIX",
    DOCUMENTATION = "DOCUMENTATION"
}
export declare enum AgentPriority {
    LOW = 0,
    NORMAL = 1,
    HIGH = 2,
    URGENT = 3
}
export interface AgentContext {
    projectId: string;
    files: string[];
    codeContext?: string;
    previousArtifacts?: string[];
    selection?: {
        filePath: string;
        startLine: number;
        endLine: number;
        content: string;
    };
    metadata?: Record<string, unknown>;
}
export interface ArtifactReference {
    id: string;
    type: string;
    title: string;
}
export interface AgentTask {
    id: string;
    type: AgentType;
    status: AgentStatus;
    priority: AgentPriority;
    prompt: string;
    context: AgentContext;
    artifacts: ArtifactReference[];
    error?: string;
    progress?: number;
    currentStep?: string;
    groupId?: string;
    createdAt: Date;
    updatedAt: Date;
    startedAt?: Date;
    completedAt?: Date;
}
export interface CreateAgentTaskDto {
    type: AgentType;
    prompt: string;
    context: AgentContext;
    priority?: AgentPriority;
    groupId?: string;
}
export interface UpdateAgentTaskDto {
    status?: AgentStatus;
    priority?: AgentPriority;
    progress?: number;
    currentStep?: string;
    error?: string;
}
export interface AgentTaskFilter {
    projectId?: string;
    status?: AgentStatus[];
    type?: AgentType[];
    groupId?: string;
    priority?: AgentPriority[];
}
export interface PlanStep {
    id: string;
    order: number;
    description: string;
    type: 'analyze' | 'generate' | 'modify' | 'test' | 'review';
    targetFiles?: string[];
    status: 'pending' | 'running' | 'completed' | 'failed';
    output?: string;
}
export interface ExecutionPlan {
    taskId: string;
    summary: string;
    steps: PlanStep[];
    estimatedDuration?: number;
    createdAt: Date;
}
