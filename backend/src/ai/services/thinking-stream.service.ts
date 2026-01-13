import { Injectable, Logger } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';

/**
 * Thinking step for visualization
 */
export interface ThinkingStep {
  id: string;
  type: 'analyzing' | 'planning' | 'reasoning' | 'executing' | 'validating' | 'completed';
  title: string;
  description?: string;
  status: 'active' | 'completed' | 'error';
  startTime: Date;
  endTime?: Date;
  metadata?: Record<string, any>;
}

/**
 * Thinking progress event
 */
export interface ThinkingProgressEvent {
  sessionId: string;
  currentStep: ThinkingStep;
  allSteps: ThinkingStep[];
  progress: number; // 0-100
  estimatedTimeRemaining?: number; // milliseconds
}

/**
 * Streaming content chunk
 */
export interface StreamingChunk {
  sessionId: string;
  type: 'thinking' | 'content' | 'tool_call' | 'tool_result' | 'error';
  content: string;
  timestamp: Date;
  metadata?: {
    toolName?: string;
    stepId?: string;
    tokenCount?: number;
  };
}

/**
 * Thinking Stream Service
 * 
 * Manages streaming of LLM thinking process for UI visualization.
 */
@Injectable()
export class ThinkingStreamService {
  private readonly logger = new Logger(ThinkingStreamService.name);
  
  private sessions: Map<string, {
    steps: ThinkingStep[];
    subject: Subject<ThinkingProgressEvent>;
    contentSubject: Subject<StreamingChunk>;
    startTime: Date;
  }> = new Map();

  /**
   * Start a new thinking session
   */
  startSession(sessionId: string): Observable<ThinkingProgressEvent> {
    const subject = new Subject<ThinkingProgressEvent>();
    const contentSubject = new Subject<StreamingChunk>();
    
    this.sessions.set(sessionId, {
      steps: [],
      subject,
      contentSubject,
      startTime: new Date(),
    });

    this.logger.debug(`Started thinking session: ${sessionId}`);
    
    return subject.asObservable();
  }

  /**
   * Get content stream for a session
   */
  getContentStream(sessionId: string): Observable<StreamingChunk> | null {
    return this.sessions.get(sessionId)?.contentSubject.asObservable() || null;
  }

  /**
   * Add a thinking step
   */
  addStep(
    sessionId: string,
    type: ThinkingStep['type'],
    title: string,
    description?: string
  ): string {
    const session = this.sessions.get(sessionId);
    if (!session) return '';

    const stepId = `step_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    const step: ThinkingStep = {
      id: stepId,
      type,
      title,
      description,
      status: 'active',
      startTime: new Date(),
    };

    session.steps.push(step);
    this.emitProgress(sessionId);
    
    return stepId;
  }

  /**
   * Complete a step
   */
  completeStep(sessionId: string, stepId: string, metadata?: Record<string, any>): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const step = session.steps.find(s => s.id === stepId);
    if (step) {
      step.status = 'completed';
      step.endTime = new Date();
      if (metadata) step.metadata = { ...step.metadata, ...metadata };
    }

    this.emitProgress(sessionId);
  }

  /**
   * Mark step as error
   */
  errorStep(sessionId: string, stepId: string, error: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const step = session.steps.find(s => s.id === stepId);
    if (step) {
      step.status = 'error';
      step.endTime = new Date();
      step.metadata = { ...step.metadata, error };
    }

    this.emitProgress(sessionId);
  }

  /**
   * Stream content chunk
   */
  streamContent(
    sessionId: string,
    type: StreamingChunk['type'],
    content: string,
    metadata?: StreamingChunk['metadata']
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.contentSubject.next({
      sessionId,
      type,
      content,
      timestamp: new Date(),
      metadata,
    });
  }

  /**
   * End a thinking session
   */
  endSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // Mark any remaining steps as completed
    for (const step of session.steps) {
      if (step.status === 'active') {
        step.status = 'completed';
        step.endTime = new Date();
      }
    }

    // Emit final progress
    this.emitProgress(sessionId);

    // Complete subjects
    session.subject.complete();
    session.contentSubject.complete();

    // Clean up
    this.sessions.delete(sessionId);
    this.logger.debug(`Ended thinking session: ${sessionId}`);
  }

  /**
   * Get current progress for a session
   */
  getProgress(sessionId: string): ThinkingProgressEvent | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const completedSteps = session.steps.filter(s => s.status === 'completed').length;
    const activeStep = session.steps.find(s => s.status === 'active');
    
    const progress = session.steps.length > 0 
      ? Math.round((completedSteps / session.steps.length) * 100)
      : 0;

    return {
      sessionId,
      currentStep: activeStep || session.steps[session.steps.length - 1],
      allSteps: session.steps,
      progress,
    };
  }

  private emitProgress(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    const progress = this.getProgress(sessionId);
    
    if (session && progress) {
      session.subject.next(progress);
    }
  }

  /**
   * Check if session exists
   */
  hasSession(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }
}
