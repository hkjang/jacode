/**
 * Tool Interface and Types for Agent System
 * 
 * Defines the contract for all agent tools following the ReAct pattern.
 */

/**
 * JSON Schema for tool parameter validation
 */
export interface JSONSchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  enum?: string[];
  items?: JSONSchemaProperty;
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
  default?: any;
}

export interface JSONSchema {
  type: 'object';
  properties: Record<string, JSONSchemaProperty>;
  required?: string[];
}

/**
 * Result of a tool execution
 */
export interface ToolResult {
  success: boolean;
  output: string;
  data?: any;
  error?: string;
  metadata?: {
    durationMs?: number;
    tokensUsed?: number;
    [key: string]: any;
  };
}

/**
 * Context passed to tools during execution
 */
export interface ToolContext {
  taskId: string;
  projectId: string;
  userId: string;
  workingDirectory?: string;
  env?: Record<string, string>;
  abortSignal?: AbortSignal;
}

/**
 * Base interface for all agent tools
 */
export interface Tool {
  /** Unique name of the tool */
  name: string;
  
  /** Human-readable description for LLM understanding */
  description: string;
  
  /** JSON Schema defining the tool's parameters */
  parameters: JSONSchema;
  
  /**
   * Execute the tool with given arguments
   * @param args - Arguments matching the parameters schema
   * @param context - Execution context
   */
  execute(args: Record<string, any>, context: ToolContext): Promise<ToolResult>;
  
  /**
   * Optional validation before execution
   */
  validate?(args: Record<string, any>): { valid: boolean; errors?: string[] };
}

/**
 * Agent step types in ReAct pattern
 */
export enum AgentStepType {
  /** Agent reasoning about what to do */
  REASON = 'REASON',
  /** Agent selecting and executing a tool */
  ACT = 'ACT',
  /** Agent observing the result of an action */
  OBSERVE = 'OBSERVE',
  /** Agent creating a plan for complex tasks */
  PLAN = 'PLAN',
  /** Agent reflecting on progress */
  REFLECT = 'REFLECT',
}

/**
 * A single step in the agent's execution
 */
export interface AgentStep {
  id: string;
  taskId: string;
  stepNumber: number;
  type: AgentStepType;
  
  /** Agent's reasoning/thought process */
  thought?: string;
  
  /** Tool selected for execution */
  toolName?: string;
  
  /** Input passed to the tool */
  toolInput?: Record<string, any>;
  
  /** Raw output from the tool */
  toolOutput?: string;
  
  /** Agent's observation/interpretation of the output */
  observation?: string;
  
  /** Duration of this step in milliseconds */
  durationMs: number;
  
  /** Error if the step failed */
  error?: string;
  
  createdAt: Date;
}

/**
 * Memory types for agent context management
 */
export enum MemoryType {
  /** Full conversation history */
  CONVERSATION = 'CONVERSATION',
  /** Working memory for current task */
  WORKING = 'WORKING',
  /** Summarized context */
  SUMMARY = 'SUMMARY',
}

/**
 * Agent memory entry
 */
export interface AgentMemoryEntry {
  id: string;
  taskId: string;
  type: MemoryType;
  content: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

/**
 * Message in agent conversation
 */
export interface AgentMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  toolCallId?: string;
}

/**
 * Options for agent loop execution
 */
export interface AgentLoopOptions {
  maxIterations: number;
  maxTokens?: number;
  temperature?: number;
  tools: string[];
  systemPrompt?: string;
  onStep?: (step: AgentStep) => void;
}

/**
 * Result of agent loop execution
 */
export interface AgentLoopResult {
  success: boolean;
  finalOutput: string;
  steps: AgentStep[];
  totalDurationMs: number;
  tokensUsed?: number;
  error?: string;
}
