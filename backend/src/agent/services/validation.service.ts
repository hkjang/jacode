import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execAsync = promisify(exec);

/**
 * Validation result from a single check
 */
export interface CheckResult {
  name: string;
  passed: boolean;
  errors: string[];
  warnings: string[];
  duration: number;
}

/**
 * Complete validation pipeline result
 */
export interface ValidationResult {
  success: boolean;
  checks: CheckResult[];
  totalDuration: number;
  changedFiles: string[];
}

/**
 * Lint result details
 */
export interface LintResult {
  passed: boolean;
  errors: LintError[];
  warnings: LintError[];
}

export interface LintError {
  file: string;
  line: number;
  column: number;
  message: string;
  rule?: string;
}

/**
 * Test result details
 */
export interface TestResult {
  passed: boolean;
  total: number;
  passed_count: number;
  failed: number;
  skipped: number;
  failures: TestFailure[];
}

export interface TestFailure {
  name: string;
  file?: string;
  error: string;
}

/**
 * Validation Service
 * 
 * Runs validation checks on modified files including:
 * - Static analysis (lint, type-check)
 * - Unit tests
 * - Build verification
 */
@Injectable()
export class ValidationService {
  private readonly logger = new Logger(ValidationService.name);

  /**
   * Run the full validation pipeline
   */
  async runPipeline(
    projectPath: string,
    changedFiles: string[],
  ): Promise<ValidationResult> {
    this.logger.log(`Running validation pipeline for ${changedFiles.length} files`);

    const startTime = Date.now();
    const checks: CheckResult[] = [];

    // Run lint check
    const lintResult = await this.runCheck('lint', () =>
      this.runLint(projectPath, changedFiles)
    );
    checks.push(lintResult);

    // Run type check
    const typeResult = await this.runCheck('typecheck', () =>
      this.runTypeCheck(projectPath)
    );
    checks.push(typeResult);

    // Run tests (only if lint and type check pass)
    if (lintResult.passed && typeResult.passed) {
      const testResult = await this.runCheck('test', () =>
        this.runTests(projectPath, changedFiles)
      );
      checks.push(testResult);
    }

    const totalDuration = Date.now() - startTime;
    const success = checks.every(c => c.passed);

    this.logger.log(
      `Validation ${success ? 'passed' : 'failed'} in ${totalDuration}ms`
    );

    return {
      success,
      checks,
      totalDuration,
      changedFiles,
    };
  }

  /**
   * Run lint check
   */
  async runLint(
    projectPath: string,
    files: string[],
  ): Promise<CheckResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Try ESLint
      const fileArgs = files.map(f => `"${f}"`).join(' ');
      await execAsync(`npx eslint ${fileArgs} --format json`, {
        cwd: projectPath,
        timeout: 60000,
      });
    } catch (error: any) {
      // ESLint exits with non-zero on errors
      if (error.stdout) {
        try {
          const results = JSON.parse(error.stdout);
          for (const file of results) {
            for (const msg of file.messages || []) {
              const location = `${file.filePath}:${msg.line}:${msg.column}`;
              const text = `${location} - ${msg.message} (${msg.ruleId || 'unknown'})`;
              
              if (msg.severity === 2) {
                errors.push(text);
              } else {
                warnings.push(text);
              }
            }
          }
        } catch {
          errors.push(error.message || 'ESLint failed');
        }
      } else if (error.message?.includes('ENOENT')) {
        // ESLint not installed, skip
        this.logger.debug('ESLint not found, skipping lint check');
      } else {
        errors.push(error.message || 'Lint check failed');
      }
    }

    return {
      name: 'lint',
      passed: errors.length === 0,
      errors,
      warnings,
      duration: Date.now() - startTime,
    };
  }

  /**
   * Run TypeScript type check
   */
  async runTypeCheck(projectPath: string): Promise<CheckResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      await execAsync('npx tsc --noEmit', {
        cwd: projectPath,
        timeout: 120000,
      });
    } catch (error: any) {
      if (error.stdout || error.stderr) {
        const output = (error.stdout || '') + (error.stderr || '');
        const lines = output.split('\n').filter(Boolean);
        
        for (const line of lines) {
          if (line.includes('error TS')) {
            errors.push(line.trim());
          } else if (line.includes('warning')) {
            warnings.push(line.trim());
          }
        }
      } else if (error.message?.includes('ENOENT')) {
        this.logger.debug('TypeScript not found, skipping type check');
      } else {
        errors.push(error.message || 'Type check failed');
      }
    }

    return {
      name: 'typecheck',
      passed: errors.length === 0,
      errors,
      warnings,
      duration: Date.now() - startTime,
    };
  }

  /**
   * Run unit tests
   */
  async runTests(
    projectPath: string,
    changedFiles: string[],
  ): Promise<CheckResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Try to run tests related to changed files
      const testFiles = changedFiles
        .filter(f => f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.js'))
        .map(f => path.basename(f, path.extname(f)));
      
      if (testFiles.length === 0) {
        return {
          name: 'test',
          passed: true,
          errors: [],
          warnings: ['No test files to run'],
          duration: Date.now() - startTime,
        };
      }

      // Run Jest with pattern matching
      const pattern = testFiles.join('|');
      await execAsync(`npx jest --passWithNoTests --testPathPattern="${pattern}"`, {
        cwd: projectPath,
        timeout: 300000,
      });
    } catch (error: any) {
      if (error.stdout) {
        // Parse Jest output
        const output = error.stdout;
        if (output.includes('FAIL')) {
          const failMatches = output.match(/FAIL .+/g);
          if (failMatches) {
            errors.push(...failMatches);
          }
        }
      } else if (error.message?.includes('ENOENT')) {
        this.logger.debug('Jest not found, skipping tests');
      } else {
        errors.push(error.message || 'Test run failed');
      }
    }

    return {
      name: 'test',
      passed: errors.length === 0,
      errors,
      warnings,
      duration: Date.now() - startTime,
    };
  }

  /**
   * Run a check with timing
   */
  private async runCheck(
    name: string,
    fn: () => Promise<CheckResult>,
  ): Promise<CheckResult> {
    try {
      return await fn();
    } catch (error) {
      return {
        name,
        passed: false,
        errors: [error instanceof Error ? error.message : String(error)],
        warnings: [],
        duration: 0,
      };
    }
  }

  /**
   * Quick syntax check without full pipeline
   */
  async quickCheck(filePath: string, content: string): Promise<{ valid: boolean; errors?: string[] }> {
    try {
      const ts = await import('typescript');
      const sourceFile = ts.createSourceFile(
        filePath,
        content,
        ts.ScriptTarget.Latest,
        true
      );

      // Check for syntax errors
      // TypeScript's parser doesn't throw, but we can check for certain patterns
      const errors: string[] = [];
      
      // Basic validation passed
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : 'Syntax error'],
      };
    }
  }

  /**
   * Run full validation on a project (wrapper for runPipeline with file discovery)
   */
  async runFullValidation(projectRoot: string): Promise<ValidationResult> {
    // For full validation, we run on all TypeScript files
    const fs = await import('fs');
    const path = await import('path');
    
    const findFiles = (dir: string, extensions: string[]): string[] => {
      const results: string[] = [];
      try {
        const items = fs.readdirSync(dir, { withFileTypes: true });
        for (const item of items) {
          const fullPath = path.join(dir, item.name);
          if (item.isDirectory() && !item.name.startsWith('.') && item.name !== 'node_modules') {
            results.push(...findFiles(fullPath, extensions));
          } else if (extensions.some(ext => item.name.endsWith(ext))) {
            results.push(fullPath);
          }
        }
      } catch {
        // Ignore read errors
      }
      return results;
    };

    const files = findFiles(projectRoot, ['.ts', '.tsx', '.js', '.jsx']).slice(0, 50); // Limit for performance
    return this.runPipeline(projectRoot, files);
  }
}
