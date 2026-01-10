import { Injectable, Logger } from '@nestjs/common';
import { AIService } from '../ai.service';
import { PrismaService } from '../../prisma/prisma.service';

export interface RefactoringTask {
  type: 'extract_function' | 'rename' | 'remove_duplication' | 'improve_naming' | 'optimize';
  target: {
    filePath: string;
    startLine: number;
    endLine: number;
  };
  reason: string;
  priority: 'low' | 'medium' | 'high';
}

export interface RefactoringResult {
  success: boolean;
  changes: {
    filePath: string;
    originalCode: string;
    refactoredCode: string;
    explanation: string;
  }[];
  improvements: string[];
}

@Injectable()
export class AutoRefactoringAgent {
  private readonly logger = new Logger(AutoRefactoringAgent.name);

  constructor(
    private readonly aiService: AIService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Analyze code and suggest refactorings
   */
  async analyzeCode(
    projectId: string,
    filePath: string
  ): Promise<RefactoringTask[]> {
    // Get file content
    const file = await this.prisma.file.findFirst({
      where: { projectId, path: filePath },
    });

    if (!file || !file.content) {
      throw new Error('File not found or empty');
    }

    const code = file.content;
    const tasks: RefactoringTask[] = [];

    // Analyze for code smells
    const codeSmells = this.detectCodeSmells(code);

    for (const smell of codeSmells) {
      tasks.push({
        type: smell.type,
        target: {
          filePath,
          startLine: smell.line,
          endLine: smell.line + smell.length,
        },
        reason: smell.reason,
        priority: smell.severity as any,
      });
    }

    return tasks;
  }

  /**
   * Execute refactoring task
   */
  async executeRefactoring(task: RefactoringTask): Promise<RefactoringResult> {
    // Get file content
    const file = await this.prisma.file.findFirst({
      where: { path: task.target.filePath },
    });

    if (!file || !file.content) {
      throw new Error('File not found');
    }

    const lines = file.content.split('\n');
    const targetCode = lines
      .slice(task.target.startLine - 1, task.target.endLine)
      .join('\n');

    // Generate refactoring prompt
    const prompt = this.createRefactoringPrompt(task, targetCode);

    // Call AI service
    const result = await this.aiService.generateCode(
      prompt,
      file.content,
      file.extension
    );

    return {
      success: true,
      changes: [
        {
          filePath: task.target.filePath,
          originalCode: targetCode,
          refactoredCode: result.code,
          explanation: result.explanation || task.reason,
        },
      ],
      improvements: [
        `Applied ${task.type} refactoring`,
        result.explanation || '',
      ],
    };
  }

  /**
   * Auto-refactor entire file
   */
  async refactorFile(projectId: string, filePath: string): Promise<RefactoringResult> {
    // Analyze code
    const tasks = await this.analyzeCode(projectId, filePath);

    if (tasks.length === 0) {
      return {
        success: true,
        changes: [],
        improvements: ['No refactoring suggestions found'],
      };
    }

    // Execute high-priority tasks
    const highPriorityTasks = tasks
      .filter(t => t.priority === 'high')
      .slice(0, 3); // Limit to 3 changes

    const changes: RefactoringResult['changes'] = [];
    const improvements: string[] = [];

    for (const task of highPriorityTasks) {
      try {
        const result = await this.executeRefactoring(task);
        changes.push(...result.changes);
        improvements.push(...result.improvements);
      } catch (error) {
        this.logger.error(`Failed to execute refactoring: ${error}`);
      }
    }

    return {
      success: true,
      changes,
      improvements,
    };
  }

  /**
   * Detect code smells
   */
  private detectCodeSmells(code: string): Array<{
    type: RefactoringTask['type'];
    line: number;
    length: number;
    reason: string;
    severity: string;
  }> {
    const smells: Array<any> = [];
    const lines = code.split('\n');

    lines.forEach((line, index) => {
      // Long function detection
      if (line.match(/function\s+\w+|const\s+\w+\s*=\s*\(/)) {
        let braceCount = 0;
        let functionLength = 0;
        
        for (let i = index; i < lines.length; i++) {
          braceCount += (lines[i].match(/\{/g) || []).length;
          braceCount -= (lines[i].match(/\}/g) || []).length;
          functionLength++;
          
          if (braceCount === 0) break;
        }

        if (functionLength > 50) {
          smells.push({
            type: 'extract_function',
            line: index + 1,
            length: functionLength,
            reason: 'Function is too long (>50 lines)',
            severity: 'high',
          });
        }
      }

      // Magic numbers
      if (line.match(/\d{3,}/) && !line.includes('//')) {
        smells.push({
          type: 'improve_naming',
          line: index + 1,
          length: 1,
          reason: 'Magic number detected, consider using named constant',
          severity: 'medium',
        });
      }

      // Poor naming (single letter variables except i, j, k in loops)
      const poorNames = line.match(/\b[a-hln-z]\b/g);
      if (poorNames && !line.includes('for')) {
        smells.push({
          type: 'rename',
          line: index + 1,
          length: 1,
          reason: 'Single-letter variable name',
          severity: 'low',
        });
      }
    });

    return smells;
  }

  /**
   * Create refactoring prompt
   */
  private createRefactoringPrompt(task: RefactoringTask, code: string): string {
    const prompts = {
      extract_function: `Extract this code into a well-named function:\n\n${code}\n\nReason: ${task.reason}`,
      rename: `Suggest a better name for the variable/function in this code:\n\n${code}\n\nProvide the refactored code.`,
      remove_duplication: `Remove code duplication:\n\n${code}`,
      improve_naming: `Improve variable and function names:\n\n${code}`,
      optimize: `Optimize this code for better performance:\n\n${code}`,
    };

    return prompts[task.type] || `Refactor this code:\n\n${code}`;
  }
}
