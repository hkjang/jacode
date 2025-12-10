import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

interface UserActivity {
  lastActivity: number;
  userId: string;
}

// In-memory store for session tracking (use Redis in production)
const sessionStore = new Map<string, UserActivity>();

// Cleanup old sessions every 5 minutes
setInterval(() => {
  const now = Date.now();
  const timeout = 30 * 60 * 1000; // 30 minutes
  
  for (const [token, session] of sessionStore.entries()) {
    if (now - session.lastActivity > timeout) {
      sessionStore.delete(token);
    }
  }
}, 5 * 60 * 1000);

@Injectable()
export class SessionTimeoutMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SessionTimeoutMiddleware.name);
  private readonly IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

  use(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    const session = sessionStore.get(token);
    const now = Date.now();

    if (session) {
      // Check if session has timed out
      if (now - session.lastActivity > this.IDLE_TIMEOUT_MS) {
        sessionStore.delete(token);
        return res.status(401).json({
          statusCode: 401,
          message: 'Session expired due to inactivity. Please login again.',
          error: 'SessionTimeout',
        });
      }

      // Update last activity
      session.lastActivity = now;
    } else {
      // First request with this token, track it
      const userId = (req as any).user?.id || 'unknown';
      sessionStore.set(token, { lastActivity: now, userId });
    }

    // Add remaining time to response headers
    const remainingMs = session
      ? this.IDLE_TIMEOUT_MS - (now - session.lastActivity)
      : this.IDLE_TIMEOUT_MS;
    
    res.setHeader('X-Session-Remaining', Math.max(0, Math.floor(remainingMs / 1000)));

    next();
  }

  // Static methods for session management
  static invalidateSession(token: string) {
    sessionStore.delete(token);
  }

  static getActiveSessions(): number {
    return sessionStore.size;
  }

  static updateActivity(token: string, userId: string) {
    sessionStore.set(token, { lastActivity: Date.now(), userId });
  }
}
