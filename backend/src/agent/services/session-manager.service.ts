import { Injectable, Logger } from '@nestjs/common';

/**
 * Session state
 */
export type SessionState = 
  | 'idle'
  | 'planning'
  | 'executing'
  | 'awaiting_approval'
  | 'completed'
  | 'failed'
  | 'cancelled';

/**
 * Session event types
 */
export interface SessionEvent {
  sessionId: string;
  type: 'state_change' | 'message' | 'progress' | 'error' | 'tool_call';
  payload: any;
  timestamp: Date;
}

/**
 * Agent session data
 */
export interface AgentSession {
  id: string;
  projectRoot: string;
  goal: string;
  state: SessionState;
  createdAt: Date;
  updatedAt: Date;
  
  // Execution data
  plan?: {
    tasks: any[];
    currentTaskIndex: number;
  };
  
  // History
  events: SessionEvent[];
  messageHistory: { role: string; content: string }[];
  
  // Results
  filesChanged: string[];
  errors: string[];
}

/**
 * Session Manager Service
 * 
 * Manages agent execution sessions with state tracking and history.
 */
@Injectable()
export class SessionManagerService {
  private readonly logger = new Logger(SessionManagerService.name);
  private sessions: Map<string, AgentSession> = new Map();
  private eventEmitter?: any;

  /**
   * Set event emitter for session events
   */
  setEventEmitter(emitter: any): void {
    this.eventEmitter = emitter;
  }

  /**
   * Create a new session
   */
  createSession(projectRoot: string, goal: string): AgentSession {
    const id = `session_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    const session: AgentSession = {
      id,
      projectRoot,
      goal,
      state: 'idle',
      createdAt: new Date(),
      updatedAt: new Date(),
      events: [],
      messageHistory: [],
      filesChanged: [],
      errors: [],
    };

    this.sessions.set(id, session);
    this.emitEvent(id, 'state_change', { state: 'idle' });
    
    this.logger.log(`Created session: ${id}`);
    return session;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): AgentSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Update session state
   */
  updateState(sessionId: string, state: SessionState): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const previousState = session.state;
    session.state = state;
    session.updatedAt = new Date();

    this.emitEvent(sessionId, 'state_change', { 
      previousState, 
      newState: state 
    });
    
    this.logger.debug(`Session ${sessionId}: ${previousState} -> ${state}`);
  }

  /**
   * Add message to session history
   */
  addMessage(sessionId: string, role: string, content: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.messageHistory.push({ role, content });
    session.updatedAt = new Date();
    
    this.emitEvent(sessionId, 'message', { role, content });
  }

  /**
   * Set session plan
   */
  setPlan(sessionId: string, tasks: any[]): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.plan = { tasks, currentTaskIndex: 0 };
    session.updatedAt = new Date();
    
    this.emitEvent(sessionId, 'progress', { 
      type: 'plan_set',
      taskCount: tasks.length 
    });
  }

  /**
   * Advance to next task in plan
   */
  advanceTask(sessionId: string): number {
    const session = this.sessions.get(sessionId);
    if (!session?.plan) return -1;

    session.plan.currentTaskIndex++;
    session.updatedAt = new Date();
    
    this.emitEvent(sessionId, 'progress', {
      type: 'task_advance',
      currentIndex: session.plan.currentTaskIndex,
      total: session.plan.tasks.length,
    });

    return session.plan.currentTaskIndex;
  }

  /**
   * Record file change
   */
  recordFileChange(sessionId: string, filePath: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    if (!session.filesChanged.includes(filePath)) {
      session.filesChanged.push(filePath);
    }
    session.updatedAt = new Date();
  }

  /**
   * Record error
   */
  recordError(sessionId: string, error: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.errors.push(error);
    session.updatedAt = new Date();
    
    this.emitEvent(sessionId, 'error', { error });
  }

  /**
   * Request user approval
   */
  requestApproval(sessionId: string, description: string, data: any): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.state = 'awaiting_approval';
    session.updatedAt = new Date();
    
    this.emitEvent(sessionId, 'state_change', {
      state: 'awaiting_approval',
      approvalRequest: { description, data }
    });
  }

  /**
   * Handle approval response
   */
  handleApproval(sessionId: string, approved: boolean): void {
    const session = this.sessions.get(sessionId);
    if (!session || session.state !== 'awaiting_approval') return;

    if (approved) {
      session.state = 'executing';
    } else {
      session.state = 'cancelled';
    }
    session.updatedAt = new Date();
    
    this.emitEvent(sessionId, 'state_change', {
      state: session.state,
      approved
    });
  }

  /**
   * Complete session
   */
  completeSession(sessionId: string, success: boolean = true): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.state = success ? 'completed' : 'failed';
    session.updatedAt = new Date();
    
    this.emitEvent(sessionId, 'state_change', { 
      state: session.state,
      filesChanged: session.filesChanged.length,
      errors: session.errors.length,
    });
    
    this.logger.log(
      `Session ${sessionId} ${session.state}: ` +
      `${session.filesChanged.length} files, ${session.errors.length} errors`
    );
  }

  /**
   * Get session summary
   */
  getSessionSummary(sessionId: string): string | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const duration = Date.now() - session.createdAt.getTime();
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);

    return [
      `Session: ${session.id}`,
      `Goal: ${session.goal}`,
      `State: ${session.state}`,
      `Duration: ${minutes}m ${seconds}s`,
      `Files Changed: ${session.filesChanged.length}`,
      `Errors: ${session.errors.length}`,
    ].join('\n');
  }

  /**
   * List active sessions
   */
  listActiveSessions(): AgentSession[] {
    return Array.from(this.sessions.values()).filter(
      s => !['completed', 'failed', 'cancelled'].includes(s.state)
    );
  }

  /**
   * Clean up old sessions
   */
  cleanupOldSessions(maxAgeMs: number = 24 * 60 * 60 * 1000): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, session] of this.sessions) {
      if (now - session.updatedAt.getTime() > maxAgeMs) {
        this.sessions.delete(id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.log(`Cleaned up ${cleaned} old sessions`);
    }
    return cleaned;
  }

  /**
   * Emit session event
   */
  private emitEvent(sessionId: string, type: SessionEvent['type'], payload: any): void {
    const event: SessionEvent = {
      sessionId,
      type,
      payload,
      timestamp: new Date(),
    };

    const session = this.sessions.get(sessionId);
    if (session) {
      session.events.push(event);
    }

    if (this.eventEmitter) {
      this.eventEmitter.emit('agent.session', event);
    }
  }
}
