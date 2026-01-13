import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';

/**
 * Access log entry for security auditing
 */
export interface AccessLogEntry {
  timestamp: Date;
  path: string;
  operation: 'read' | 'write' | 'delete' | 'list' | 'execute';
  allowed: boolean;
  reason?: string;
  userId?: string;
  projectId?: string;
}

/**
 * Sandbox validation result
 */
export interface SandboxValidation {
  allowed: boolean;
  normalizedPath: string;
  reason?: string;
}

/**
 * System paths that should never be accessed
 */
const BLOCKED_PATHS = [
  // Windows system paths
  'C:\\Windows',
  'C:\\Program Files',
  'C:\\Program Files (x86)',
  'C:\\ProgramData',
  'C:\\Users\\Default',
  // Linux system paths  
  '/etc',
  '/bin',
  '/sbin',
  '/usr',
  '/var',
  '/root',
  '/boot',
  '/sys',
  '/proc',
  // Common sensitive patterns
  '.ssh',
  '.gnupg',
  '.aws',
  '.azure',
  '.kube',
  '.npmrc',
  '.env.local',
  '.env.production',
  'id_rsa',
  'id_ed25519',
  'credentials',
  'secrets',
];

/**
 * File patterns that should never be modified
 */
const BLOCKED_PATTERNS = [
  /\.exe$/i,
  /\.dll$/i,
  /\.sys$/i,
  /\.bat$/i,
  /\.cmd$/i,
  /\.ps1$/i,
  /\.sh$/,
  /\.bash_profile$/,
  /\.bashrc$/,
  /\.zshrc$/,
  /\.profile$/,
  /id_rsa/,
  /id_ed25519/,
  /\.pem$/,
  /\.key$/,
  /\.pfx$/,
];

/**
 * Sandbox Service
 * 
 * Enforces security boundaries for agent file operations.
 * All file access is restricted to the project root directory.
 */
@Injectable()
export class SandboxService {
  private readonly logger = new Logger(SandboxService.name);
  private accessLog: AccessLogEntry[] = [];
  private readonly MAX_LOG_SIZE = 1000;

  /**
   * Validate that a path is within the allowed project boundary
   */
  validatePath(
    targetPath: string,
    projectRoot: string,
    operation: AccessLogEntry['operation'] = 'read'
  ): SandboxValidation {
    try {
      // Normalize paths to handle different separators and resolve ..
      const normalizedTarget = path.resolve(targetPath);
      const normalizedRoot = path.resolve(projectRoot);

      // Check if path is within project root
      const relative = path.relative(normalizedRoot, normalizedTarget);
      const isWithinRoot = !relative.startsWith('..') && !path.isAbsolute(relative);

      if (!isWithinRoot) {
        this.logAccess({
          path: targetPath,
          operation,
          allowed: false,
          reason: 'Path escapes project root',
        });
        
        return {
          allowed: false,
          normalizedPath: normalizedTarget,
          reason: `Access denied: Path "${targetPath}" is outside project root`,
        };
      }

      // Check for blocked system paths
      for (const blockedPath of BLOCKED_PATHS) {
        if (normalizedTarget.toLowerCase().includes(blockedPath.toLowerCase())) {
          this.logAccess({
            path: targetPath,
            operation,
            allowed: false,
            reason: `Blocked system path: ${blockedPath}`,
          });
          
          return {
            allowed: false,
            normalizedPath: normalizedTarget,
            reason: `Access denied: Path contains blocked system location`,
          };
        }
      }

      // Check for blocked file patterns (for write/delete operations)
      if (operation === 'write' || operation === 'delete' || operation === 'execute') {
        for (const pattern of BLOCKED_PATTERNS) {
          if (pattern.test(normalizedTarget)) {
            this.logAccess({
              path: targetPath,
              operation,
              allowed: false,
              reason: `Blocked file pattern: ${pattern.source}`,
            });
            
            return {
              allowed: false,
              normalizedPath: normalizedTarget,
              reason: `Access denied: Cannot ${operation} files matching this pattern`,
            };
          }
        }
      }

      // Access allowed
      this.logAccess({
        path: targetPath,
        operation,
        allowed: true,
      });

      return {
        allowed: true,
        normalizedPath: normalizedTarget,
      };
    } catch (error) {
      this.logger.error(`Path validation error: ${error}`);
      
      return {
        allowed: false,
        normalizedPath: targetPath,
        reason: `Path validation failed: ${error}`,
      };
    }
  }

  /**
   * Check if a file is a system/sensitive file
   */
  isSystemFile(filePath: string): boolean {
    const normalizedPath = path.normalize(filePath).toLowerCase();
    
    // Check blocked paths
    for (const blocked of BLOCKED_PATHS) {
      if (normalizedPath.includes(blocked.toLowerCase())) {
        return true;
      }
    }
    
    // Check blocked patterns
    for (const pattern of BLOCKED_PATTERNS) {
      if (pattern.test(normalizedPath)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Sanitize a path to prevent directory traversal
   */
  sanitizePath(targetPath: string, projectRoot: string): string {
    // Remove null bytes and control characters
    let sanitized = targetPath.replace(/[\x00-\x1f\x7f]/g, '');
    
    // Normalize path separators
    sanitized = sanitized.replace(/\\/g, '/');
    
    // Remove leading slashes to make relative
    sanitized = sanitized.replace(/^\/+/, '');
    
    // Resolve against project root
    const resolved = path.resolve(projectRoot, sanitized);
    
    // Verify still within root
    const relative = path.relative(projectRoot, resolved);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new Error('Path escapes project boundary');
    }
    
    return resolved;
  }

  /**
   * Log an access attempt
   */
  private logAccess(entry: Omit<AccessLogEntry, 'timestamp'>): void {
    const fullEntry: AccessLogEntry = {
      ...entry,
      timestamp: new Date(),
    };
    
    this.accessLog.push(fullEntry);
    
    // Trim log if too large
    if (this.accessLog.length > this.MAX_LOG_SIZE) {
      this.accessLog = this.accessLog.slice(-this.MAX_LOG_SIZE / 2);
    }
    
    // Log denied accesses as warnings
    if (!entry.allowed) {
      this.logger.warn(
        `Access DENIED: ${entry.operation} on "${entry.path}" - ${entry.reason}`
      );
    } else {
      this.logger.debug(`Access allowed: ${entry.operation} on "${entry.path}"`);
    }
  }

  /**
   * Get recent access log entries
   */
  getAccessLog(limit: number = 100): AccessLogEntry[] {
    return this.accessLog.slice(-limit);
  }

  /**
   * Get denied access attempts
   */
  getDeniedAttempts(limit: number = 50): AccessLogEntry[] {
    return this.accessLog
      .filter(entry => !entry.allowed)
      .slice(-limit);
  }

  /**
   * Clear access log
   */
  clearAccessLog(): void {
    this.accessLog = [];
  }
}
