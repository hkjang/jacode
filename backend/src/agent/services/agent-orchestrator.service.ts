import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { LLMGatewayService } from './llm-gateway.service';
import { ChangePlannerService } from './change-planner.service';
import { ASTExecutorService } from './ast-executor.service';
import { ValidationService } from './validation.service';
import { FileOperationsService } from './file-operations.service';
import { ArtifactService } from './artifact.service';
import { SessionManagerService } from './session-manager.service';
import { CodeDiffService } from './code-diff.service';
import { RAGService } from './rag.service';
import { SandboxService } from './sandbox.service';
import { ThinkingStreamService } from '../../ai/services/thinking-stream.service';
import { TokenTrackingService } from '../../ai/services/token-tracking.service';

/**
 * Orchestration result
 */
export interface OrchestrationResult {
  success: boolean;
  sessionId: string;
  goal: string;
  filesChanged: string[];
  errors: string[];
  tokensUsed: number;
  duration: number;
}

/**
 * Agent step
 */
export interface AgentStep {
  type: 'plan' | 'execute' | 'validate' | 'approve';
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  result?: any;
  error?: string;
}

/**
 * Agent Orchestrator Service
 * 
 * Coordinates all agent services for autonomous code generation.
 * Implements the full loop: Plan → Approve → Execute → Validate
 */
@Injectable()
export class AgentOrchestratorService implements OnModuleInit {
  private readonly logger = new Logger(AgentOrchestratorService.name);

  constructor(
    private readonly llmGateway: LLMGatewayService,
    private readonly changePlanner: ChangePlannerService,
    private readonly astExecutor: ASTExecutorService,
    private readonly validation: ValidationService,
    private readonly fileOps: FileOperationsService,
    private readonly artifacts: ArtifactService,
    private readonly sessions: SessionManagerService,
    private readonly codeDiff: CodeDiffService,
    private readonly rag: RAGService,
    private readonly sandbox: SandboxService,
    private readonly thinkingStream: ThinkingStreamService,
    private readonly tokenTracker: TokenTrackingService,
  ) {}

  onModuleInit() {
    this.logger.log('Agent Orchestrator initialized');
  }

  /**
   * Execute full autonomous coding loop
   */
  async execute(
    goal: string,
    projectRoot: string,
    options: {
      autoApprove?: boolean;
      maxIterations?: number;
      dryRun?: boolean;
    } = {}
  ): Promise<OrchestrationResult> {
    const startTime = Date.now();
    const { autoApprove = false, maxIterations = 5, dryRun = false } = options;

    // Initialize
    this.fileOps.setProjectRoot(projectRoot);
    
    // Create session
    const session = this.sessions.createSession(projectRoot, goal);
    const sessionId = session.id;
    
    // Start thinking stream
    this.thinkingStream.startSession(sessionId);

    try {
      // Phase 1: Analysis & Planning
      this.sessions.updateState(sessionId, 'planning');
      const planStepId = this.thinkingStream.addStep(sessionId, 'planning', 'Creating implementation plan');
      
      const plan = await this.createPlan(sessionId, goal, projectRoot);
      
      this.thinkingStream.completeStep(sessionId, planStepId, { taskCount: plan.changes.length });
      
      // Generate artifacts
      const { markdown: planMarkdown } = await this.artifacts.generateImplementationPlan(goal, {
        filesToCreate: plan.changes.filter(c => c.action === 'create').map(c => ({ path: c.file, description: c.description })),
        filesToModify: plan.changes.filter(c => c.action === 'modify').map(c => ({ path: c.file, changes: c.description })),
        filesToDelete: plan.changes.filter(c => c.action === 'delete').map(c => ({ path: c.file, reason: c.description })),
      });

      await this.artifacts.saveArtifact('implementation_plan', goal, planMarkdown, projectRoot);
      this.sessions.setPlan(sessionId, plan.changes);

      // Phase 2: Approval (if not auto-approve)
      if (!autoApprove) {
        this.sessions.requestApproval(sessionId, 'Implementation plan ready for review', plan);
        
        // In a real implementation, this would wait for user approval
        // For now, we'll simulate auto-approval in the service
        this.logger.log('Awaiting approval (simulating auto-approval for now)');
        this.sessions.handleApproval(sessionId, true);
      }

      // Phase 3: Execution
      if (dryRun) {
        this.logger.log('Dry run mode - skipping execution');
        this.sessions.completeSession(sessionId, true);
        
        return {
          success: true,
          sessionId,
          goal,
          filesChanged: [],
          errors: [],
          tokensUsed: this.tokenTracker.getStats().totalTokens,
          duration: Date.now() - startTime,
        };
      }

      this.sessions.updateState(sessionId, 'executing');
      const executeStepId = this.thinkingStream.addStep(sessionId, 'executing', 'Applying changes');

      let iteration = 0;
      while (iteration < maxIterations) {
        iteration++;
        
        const executeResult = await this.executeChanges(sessionId, plan.changes, projectRoot);
        
        if (executeResult.allSucceeded) {
          this.thinkingStream.completeStep(sessionId, executeStepId);
          break;
        }

        // Self-healing: try to fix errors
        const healStepId = this.thinkingStream.addStep(sessionId, 'reasoning', `Fixing errors (attempt ${iteration})`);
        
        const healed = await this.attemptSelfHealing(sessionId, executeResult.errors, projectRoot);
        
        if (!healed) {
          this.thinkingStream.errorStep(sessionId, healStepId, 'Could not auto-fix errors');
          break;
        }
        
        this.thinkingStream.completeStep(sessionId, healStepId);
      }

      // Phase 4: Validation
      const validateStepId = this.thinkingStream.addStep(sessionId, 'validating', 'Running validation checks');
      
      const validationResult = await this.runValidation(projectRoot);
      
      if (validationResult.success) {
        this.thinkingStream.completeStep(sessionId, validateStepId);
      } else {
        this.thinkingStream.errorStep(sessionId, validateStepId, validationResult.message);
      }

      // Complete
      this.sessions.completeSession(sessionId, validationResult.success);
      this.thinkingStream.endSession(sessionId);

      return {
        success: validationResult.success,
        sessionId,
        goal,
        filesChanged: session.filesChanged,
        errors: session.errors,
        tokensUsed: this.tokenTracker.getStats().totalTokens,
        duration: Date.now() - startTime,
      };

    } catch (error: any) {
      this.logger.error(`Orchestration failed: ${error.message}`);
      this.sessions.recordError(sessionId, error.message);
      this.sessions.completeSession(sessionId, false);
      this.thinkingStream.endSession(sessionId);

      return {
        success: false,
        sessionId,
        goal,
        filesChanged: session.filesChanged,
        errors: [...session.errors, error.message],
        tokensUsed: this.tokenTracker.getStats().totalTokens,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Create implementation plan using LLM
   */
  private async createPlan(
    sessionId: string,
    goal: string,
    projectRoot: string
  ): Promise<{ changes: { file: string; action: 'create' | 'modify' | 'delete'; description: string; content?: string }[] }> {
    // Build simple context string
    const context = `Project root: ${projectRoot}\nGoal: ${goal}`;
    
    // Generate plan using LLM
    const prompt = this.buildPlanningPrompt(goal, context);
    
    this.sessions.addMessage(sessionId, 'user', prompt);
    
    const response = await this.llmGateway.generateChangePlan({
      goal,
      projectRoot,
    });
    
    this.sessions.addMessage(sessionId, 'assistant', JSON.stringify(response));
    
    // Parse LLM response into structured changes
    const changes = this.parseChangePlan(response);
    
    return { changes };
  }

  /**
   * Execute planned changes
   */
  private async executeChanges(
    sessionId: string,
    changes: { file: string; action: string; description: string; content?: string }[],
    projectRoot: string
  ): Promise<{ allSucceeded: boolean; errors: string[] }> {
    const errors: string[] = [];

    for (const change of changes) {
      try {
        this.sessions.advanceTask(sessionId);
        
        switch (change.action) {
          case 'create':
            const createResult = await this.fileOps.createFile(
              change.file,
              change.content || '',
              { createDirs: true }
            );
            if (!createResult.success) {
              errors.push(`Create failed: ${change.file} - ${createResult.error}`);
            } else {
              this.sessions.recordFileChange(sessionId, change.file);
            }
            break;

          case 'modify':
            // For modify, we need to generate the actual content
            const modifyResult = await this.fileOps.modifyFile(
              change.file,
              change.content || '',
              { backup: true }
            );
            if (!modifyResult.success) {
              errors.push(`Modify failed: ${change.file} - ${modifyResult.error}`);
            } else {
              this.sessions.recordFileChange(sessionId, change.file);
            }
            break;

          case 'delete':
            const deleteResult = await this.fileOps.deleteFile(change.file, { backup: true });
            if (!deleteResult.success) {
              errors.push(`Delete failed: ${change.file} - ${deleteResult.error}`);
            } else {
              this.sessions.recordFileChange(sessionId, change.file);
            }
            break;
        }
      } catch (err: any) {
        errors.push(`${change.action} ${change.file}: ${err.message}`);
        this.sessions.recordError(sessionId, err.message);
      }
    }

    return { allSucceeded: errors.length === 0, errors };
  }

  /**
   * Attempt to self-heal errors
   */
  private async attemptSelfHealing(
    sessionId: string,
    errors: string[],
    projectRoot: string
  ): Promise<boolean> {
    // Simple self-healing: just return false for now
    // Full implementation would use LLM to analyze and fix errors
    this.logger.warn('Self-healing not fully implemented, errors:', errors);
    return false;
  }

  /**
   * Run validation checks
   */
  private async runValidation(projectRoot: string): Promise<{ success: boolean; message: string }> {
    const result = await this.validation.runFullValidation(projectRoot);
    
    return {
      success: result.success,
      message: result.success ? 'All checks passed' : result.checks.filter(c => !c.passed).map(c => c.errors.join(', ')).join('; '),
    };
  }

  /**
   * Build planning prompt with context
   */
  private buildPlanningPrompt(goal: string, context: string): string {
    return `
You are an expert developer. Create an implementation plan for the following goal:

## Goal
${goal}

## Project Context
${context}

## Instructions
1. Identify files to create, modify, or delete
2. For each change, provide a clear description
3. Consider dependencies and order of changes
4. Think about error handling and edge cases

Respond with a structured plan.
    `.trim();
  }

  /**
   * Parse LLM response into change plan
   */
  private parseChangePlan(response: any): { file: string; action: 'create' | 'modify' | 'delete'; description: string; content?: string }[] {
    // In a real implementation, this would parse the LLM's structured response
    // For now, return empty array as placeholder
    if (response.changes && Array.isArray(response.changes)) {
      return response.changes;
    }
    return [];
  }

  /**
   * Get session status
   */
  getSessionStatus(sessionId: string): string | null {
    return this.sessions.getSessionSummary(sessionId);
  }

  /**
   * Cancel running session
   */
  cancelSession(sessionId: string): void {
    const session = this.sessions.getSession(sessionId);
    if (session && !['completed', 'failed', 'cancelled'].includes(session.state)) {
      this.sessions.updateState(sessionId, 'cancelled');
      this.thinkingStream.endSession(sessionId);
    }
  }
}
