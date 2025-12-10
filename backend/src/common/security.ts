import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

// In-memory rate limit store (use Redis in production)
const rateLimitStore = new Map<string, RateLimitRecord>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (record.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 300000);

export const RATE_LIMIT_KEY = 'rateLimit';

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

export function RateLimit(options: RateLimitOptions) {
  return (target: any, key?: string, descriptor?: PropertyDescriptor) => {
    Reflect.defineMetadata(RATE_LIMIT_KEY, options, descriptor?.value || target);
    return descriptor || target;
  };
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.get<RateLimitOptions>(
      RATE_LIMIT_KEY,
      context.getHandler(),
    );

    if (!options) {
      return true; // No rate limit configured
    }

    const request = context.switchToHttp().getRequest();
    const key = this.getKey(request);
    const now = Date.now();

    let record = rateLimitStore.get(key);

    if (!record || record.resetTime < now) {
      // Create new record
      record = {
        count: 1,
        resetTime: now + options.windowMs,
      };
      rateLimitStore.set(key, record);
      return true;
    }

    if (record.count >= options.limit) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
          retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    record.count++;
    return true;
  }

  private getKey(request: any): string {
    const userId = request.user?.id || request.user?.sub;
    const ip = request.ip || request.headers['x-forwarded-for'] || 'unknown';
    const endpoint = `${request.method}:${request.route?.path || request.url}`;
    
    return `${userId || ip}:${endpoint}`;
  }
}

// Prompt validation utilities
export class PromptValidator {
  // Maximum prompt length (characters)
  static readonly MAX_PROMPT_LENGTH = 50000;

  // Suspicious patterns to detect
  private static readonly SUSPICIOUS_PATTERNS = [
    /ignore\s+previous\s+instructions/i,
    /disregard\s+all\s+instructions/i,
    /you\s+are\s+now/i,
    /pretend\s+you\s+are/i,
    /act\s+as\s+if/i,
    /system\s*:\s*/i,
    /\[system\]/i,
    /\<\|im_start\|\>/i,
    /\<\|endoftext\|\>/i,
  ];

  static validate(prompt: string): { valid: boolean; error?: string } {
    if (!prompt || typeof prompt !== 'string') {
      return { valid: false, error: 'Prompt is required and must be a string' };
    }

    if (prompt.length > this.MAX_PROMPT_LENGTH) {
      return {
        valid: false,
        error: `Prompt exceeds maximum length of ${this.MAX_PROMPT_LENGTH} characters`,
      };
    }

    // Check for suspicious patterns
    for (const pattern of this.SUSPICIOUS_PATTERNS) {
      if (pattern.test(prompt)) {
        return {
          valid: false,
          error: 'Prompt contains potentially malicious content',
        };
      }
    }

    // Check for excessive repetition
    if (this.hasExcessiveRepetition(prompt)) {
      return {
        valid: false,
        error: 'Prompt contains excessive repetition',
      };
    }

    return { valid: true };
  }

  private static hasExcessiveRepetition(text: string): boolean {
    // Check if any 10+ character sequence repeats more than 50 times
    const minLength = 10;
    const maxRepetitions = 50;

    for (let len = minLength; len <= 100; len++) {
      const seen = new Map<string, number>();
      for (let i = 0; i <= text.length - len; i++) {
        const substr = text.substring(i, i + len);
        const count = (seen.get(substr) || 0) + 1;
        if (count > maxRepetitions) {
          return true;
        }
        seen.set(substr, count);
      }
    }

    return false;
  }

  // Sanitize prompt for safe logging
  static sanitizeForLog(prompt: string, maxLength = 200): string {
    const sanitized = prompt
      .replace(/[\r\n]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (sanitized.length > maxLength) {
      return sanitized.substring(0, maxLength) + '...';
    }

    return sanitized;
  }
}

// File path validation
export class PathValidator {
  private static readonly DANGEROUS_PATTERNS = [
    /\.\.\//,           // Path traversal
    /\.\.\\/,           // Windows path traversal
    /^\/etc\//i,        // System directories
    /^\/proc\//i,
    /^\/sys\//i,
    /^c:\\windows/i,    // Windows system
    /^c:\\program/i,
  ];

  static validate(path: string, basePath?: string): { valid: boolean; error?: string } {
    if (!path || typeof path !== 'string') {
      return { valid: false, error: 'Path is required' };
    }

    // Check for dangerous patterns
    for (const pattern of this.DANGEROUS_PATTERNS) {
      if (pattern.test(path)) {
        return { valid: false, error: 'Invalid path' };
      }
    }

    // If basePath is provided, ensure the path is within it
    if (basePath) {
      const normalizedPath = path.replace(/\\/g, '/').toLowerCase();
      const normalizedBase = basePath.replace(/\\/g, '/').toLowerCase();

      if (!normalizedPath.startsWith(normalizedBase)) {
        return { valid: false, error: 'Path is outside allowed directory' };
      }
    }

    return { valid: true };
  }
}
