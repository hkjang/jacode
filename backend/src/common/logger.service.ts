import { Injectable, LoggerService, LogLevel } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

interface LogEntry {
  timestamp: string;
  level: string;
  context: string;
  message: string;
  trace?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class CustomLoggerService implements LoggerService {
  private logFile: string;
  private logBuffer: LogEntry[] = [];
  private flushInterval: NodeJS.Timeout;

  constructor() {
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    const date = new Date().toISOString().split('T')[0];
    this.logFile = path.join(logsDir, `jacode-${date}.log`);
    
    // Flush logs every 5 seconds
    this.flushInterval = setInterval(() => this.flush(), 5000);
  }

  log(message: any, context?: string): void {
    this.writeLog('LOG', message, context);
  }

  error(message: any, trace?: string, context?: string): void {
    this.writeLog('ERROR', message, context, trace);
  }

  warn(message: any, context?: string): void {
    this.writeLog('WARN', message, context);
  }

  debug(message: any, context?: string): void {
    this.writeLog('DEBUG', message, context);
  }

  verbose(message: any, context?: string): void {
    this.writeLog('VERBOSE', message, context);
  }

  private writeLog(level: string, message: any, context?: string, trace?: string): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      context: context || 'Application',
      message: typeof message === 'string' ? message : JSON.stringify(message),
      trace,
    };

    // Console output with colors
    const colors: Record<string, string> = {
      LOG: '\x1b[32m',     // Green
      ERROR: '\x1b[31m',   // Red
      WARN: '\x1b[33m',    // Yellow
      DEBUG: '\x1b[36m',   // Cyan
      VERBOSE: '\x1b[35m', // Magenta
    };
    const reset = '\x1b[0m';
    const color = colors[level] || '';
    
    console.log(
      `${color}[${entry.context}] ${entry.timestamp} ${level}${reset}: ${entry.message}`
    );
    
    if (trace) {
      console.log(`${colors.ERROR}${trace}${reset}`);
    }

    // Add to buffer for file logging
    this.logBuffer.push(entry);
  }

  private flush(): void {
    if (this.logBuffer.length === 0) return;

    const logs = this.logBuffer.map((entry) => JSON.stringify(entry)).join('\n') + '\n';
    this.logBuffer = [];

    fs.appendFile(this.logFile, logs, (err) => {
      if (err) {
        console.error('Failed to write logs:', err);
      }
    });
  }

  onModuleDestroy(): void {
    clearInterval(this.flushInterval);
    this.flush();
  }
}

// Error tracking helper
export class ErrorTracker {
  private static errors: Map<string, { count: number; lastOccurred: Date; stack?: string }> = new Map();

  static track(error: Error, context?: string): void {
    const key = `${context || 'unknown'}:${error.message}`;
    const existing = this.errors.get(key);
    
    if (existing) {
      existing.count++;
      existing.lastOccurred = new Date();
    } else {
      this.errors.set(key, {
        count: 1,
        lastOccurred: new Date(),
        stack: error.stack,
      });
    }
  }

  static getErrorSummary(): Array<{ key: string; count: number; lastOccurred: Date }> {
    return Array.from(this.errors.entries()).map(([key, value]) => ({
      key,
      count: value.count,
      lastOccurred: value.lastOccurred,
    }));
  }

  static clear(): void {
    this.errors.clear();
  }
}
