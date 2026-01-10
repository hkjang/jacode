import { Injectable, Logger } from '@nestjs/common';

export interface SecurityCheckResult {
  safe: boolean;
  violations: {
    type: 'injection' | 'unsafe_code' | 'sensitive_data';
    severity: 'high' | 'medium' | 'low';
    message: string;
    pattern?: string;
  }[];
  sanitized?: string;
}

@Injectable()
export class PromptSanitizerService {
  private readonly logger = new Logger(PromptSanitizerService.name);

  /**
   * Sanitize user input to prevent prompt injection
   */
  sanitize(userInput: string): string {
    // 1. Check for prompt injection patterns
    const result = this.checkInjection(userInput);
    
    if (!result.safe) {
      this.logger.warn(`Potential prompt injection detected: ${result.violations[0]?.message}`);
      throw new Error(`Security violation: ${result.violations[0]?.message}`);
    }

    // 2. Normalize input
    let sanitized = userInput
      .replace(/\u0000/g, '') // Remove null bytes
      .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width characters
      .trim();

    // 3. Limit length
    const MAX_LENGTH = 10000;
    if (sanitized.length > MAX_LENGTH) {
      sanitized = sanitized.substring(0, MAX_LENGTH);
      this.logger.warn(`Input truncated from ${userInput.length} to ${MAX_LENGTH} chars`);
    }

    return sanitized;
  }

  /**
   * Check for prompt injection attempts
   */
  checkInjection(input: string): SecurityCheckResult {
    const violations: SecurityCheckResult['violations'] = [];

    const injectionPatterns = [
      {
        pattern: /ignore\s+(previous|above|all)\s+(instructions?|prompts?|rules?)/i,
        message: 'Attempt to override system instructions',
      },
      {
        pattern: /system:\s*\n/i,
        message: 'Attempt to inject system role',
      },
      {
        pattern: /\/\*\s*SYSTEM\s*\*\//i,
        message: 'Attempt to inject system marker',
      },
      {
        pattern: /<\|system\|>/i,
        message: 'Attempt to inject special tokens',
      },
      {
        pattern: /pretend\s+(you\s+are|to\s+be)/i,
        message: 'Attempt to manipulate AI behavior',
      },
      {
        pattern: /new\s+instructions?:/i,
        message: 'Attempt to provide new instructions',
      },
    ];

    for (const { pattern, message } of injectionPatterns) {
      if (pattern.test(input)) {
        violations.push({
          type: 'injection',
          severity: 'high',
          message,
          pattern: pattern.toString(),
        });
      }
    }

    return {
      safe: violations.length === 0,
      violations,
    };
  }

  /**
   * Separate user input from system prompts
   */
  separateUserInput(systemPrompt: string, userInput: string): {
    system: string;
    user: string;
  } {
    return {
      system: systemPrompt,
      user: this.sanitize(userInput),
    };
  }
}

@Injectable()
export class CodeSafetyFilterService {
  private readonly logger = new Logger(CodeSafetyFilterService.name);

  /**
   * Check generated code for safety issues
   */
  checkGeneratedCode(code: string): SecurityCheckResult {
    const violations: SecurityCheckResult['violations'] = [];

    const dangerousPatterns = [
      {
        pattern: /eval\s*\(/,
        message: 'Use of eval() is dangerous',
        severity: 'high' as const,
      },
      {
        pattern: /Function\s*\(/,
        message: 'Dynamic function creation detected',
        severity: 'high' as const,
      },
      {
        pattern: /exec\(|spawn\(|child_process/,
        message: 'Shell command execution detected',
        severity: 'high' as const,
      },
      {
        pattern: /fs\.(unlink|rmdir|rm)/,
        message: 'File deletion operation detected',
        severity: 'medium' as const,
      },
      {
        pattern: /rm\s+-rf|del\s+\/f/,
        message: 'Dangerous shell command detected',
        severity: 'high' as const,
      },
      {
        pattern: /document\.cookie/,
        message: 'Cookie access detected',
        severity: 'medium' as const,
      },
      {
        pattern: /localStorage|sessionStorage/,
        message: 'Web storage access detected',
        severity: 'low' as const,
      },
      {
        pattern: /\.innerHTML\s*=/,
        message: 'innerHTML assignment (XSS risk)',
        severity: 'medium' as const,
      },
      {
        pattern: /process\.env\[/,
        message: 'Dynamic environment variable access',
        severity: 'low' as const,
      },
    ];

    for (const { pattern, message, severity } of dangerousPatterns) {
      if (pattern.test(code)) {
        violations.push({
          type: 'unsafe_code',
          severity,
          message,
          pattern: pattern.toString(),
        });
      }
    }

    return {
      safe: violations.filter(v => v.severity === 'high').length === 0,
      violations,
    };
  }

  /**
   * Filter out dangerous code
   */
  filterDangerousCode(code: string): string {
    const result = this.checkGeneratedCode(code);
    
    if (!result.safe) {
      const highSeverityViolations = result.violations.filter(v => v.severity === 'high');
      this.logger.error(`Generated code contains dangerous patterns: ${highSeverityViolations.map(v => v.message).join(', ')}`);
      throw new Error('Generated code failed safety check');
    }

    if (result.violations.length > 0) {
      this.logger.warn(`Generated code has ${result.violations.length} safety warnings`);
    }

    return code;
  }
}

@Injectable()
export class PIIMaskerService {
  private readonly logger = new Logger(PIIMaskerService.name);

  /**
   * Mask sensitive data in logs
   */
  maskSensitiveData(log: string): string {
    let masked = log;

    const patterns = [
      // Email addresses
      {
        pattern: /\b[\w.-]+@[\w.-]+\.\w+\b/g,
        replacement: '[EMAIL_REDACTED]',
      },
      // Phone numbers (various formats)
      {
        pattern: /\b\d{3}[-.]?\d{3,4}[-.]?\d{4}\b/g,
        replacement: '[PHONE_REDACTED]',
      },
      // Korean SSN
      {
        pattern: /\b\d{6}-?\d{7}\b/g,
        replacement: '[SSN_REDACTED]',
      },
      // Credit card numbers
      {
        pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
        replacement: '[CARD_REDACTED]',
      },
      // IP addresses
      {
        pattern: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
        replacement: '[IP_REDACTED]',
      },
      // Password fields in various formats
      {
        pattern: /password[\s:=]+[^\s]+/gi,
        replacement: 'password=[REDACTED]',
      },
      {
        pattern: /api[_-]?key[\s:=]+[^\s]+/gi,
        replacement: 'api_key=[REDACTED]',
      },
      {
        pattern: /secret[\s:=]+[^\s]+/gi,
        replacement: 'secret=[REDACTED]',
      },
      // JWT tokens
      {
        pattern: /eyJ[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_.+/]+=*/g,
        replacement: '[JWT_REDACTED]',
      },
    ];

    for (const { pattern, replacement } of patterns) {
      masked = masked.replace(pattern, replacement);
    }

    return masked;
  }

  /**
   * Detect if string contains PII
   */
  containsPII(text: string): boolean {
    const piiPatterns = [
      /\b[\w.-]+@[\w.-]+\.\w+\b/, // Email
      /\b\d{3}[-.]?\d{3,4}[-.]?\d{4}\b/, // Phone
      /\b\d{6}-?\d{7}\b/, // SSN
      /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/, // Credit card
    ];

    return piiPatterns.some(pattern => pattern.test(text));
  }

  /**
   * Safe logging wrapper
   */
  safeLog(level: 'log' | 'error' | 'warn', message: string, ...meta: any[]): void {
    const maskedMessage = this.maskSensitiveData(message);
    const maskedMeta = meta.map(m => 
      typeof m === 'string' ? this.maskSensitiveData(m) : m
    );

    this.logger[level](maskedMessage, ...maskedMeta);
  }
}
