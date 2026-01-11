import { Injectable, Logger } from '@nestjs/common';
import { AIService } from '../ai.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ContextCollectorService } from './context-collector.service';

export interface MultiFileTask {
  files: {
    path: string;
    action: 'create' | 'modify' | 'delete';
    description: string;
  }[];
  description: string;
}

export interface MultiFileResult {
  success: boolean;
  changes: {
    filePath: string;
    action: 'create' | 'modify' | 'delete';
    content?: string;
    originalContent?: string;
    explanation: string;
  }[];
  summary: string;
}

@Injectable()
export class MultiFileEditorService {
  private readonly logger = new Logger(MultiFileEditorService.name);

  constructor(
    private readonly aiService: AIService,
    private readonly prisma: PrismaService,
    private readonly contextCollector: ContextCollectorService,
  ) {}

  /**
   * Plan multi-file changes
   */
  async planChanges(
    projectId: string,
    userRequest: string,
  ): Promise<MultiFileTask> {
    this.logger.log(`Planning multi-file changes for: ${userRequest}`);

    // Get project structure
    const context = await this.getProjectContext(projectId);

    // Ask AI to create a plan
    const planPrompt = `You are a senior software architect. The user wants to: "${userRequest}"

Project context:
${context}

Create a detailed plan for the changes needed. Respond in JSON format:
{
  "files": [
    {
      "path": "src/example.ts",
      "action": "create|modify|delete",
      "description": "what changes to make"
    }
  ],
  "description": "overall summary of changes"
}`;

    const response = await this.aiService.chat([
      { role: 'system', content: 'You are a senior software architect creating implementation plans.' },
      { role: 'user', content: planPrompt },
    ]);

    try {
      const plan = JSON.parse(this.extractJSON(response.content));
      return plan as MultiFileTask;
    } catch (error) {
      this.logger.error('Failed to parse plan', error);
      throw new Error('Failed to create implementation plan');
    }
  }

  /**
   * Execute multi-file changes
   */
  async executeChanges(
    projectId: string,
    task: MultiFileTask,
  ): Promise<MultiFileResult> {
    const changes: MultiFileResult['changes'] = [];

    for (const fileTask of task.files) {
      try {
        let change: MultiFileResult['changes'][0];

        switch (fileTask.action) {
          case 'create':
            change = await this.createFile(projectId, fileTask);
            break;
          case 'modify':
            change = await this.modifyFile(projectId, fileTask);
            break;
          case 'delete':
            change = await this.deleteFile(projectId, fileTask);
            break;
        }

        changes.push(change);
      } catch (error) {
        this.logger.error(`Failed to ${fileTask.action} ${fileTask.path}`, error);
        changes.push({
          filePath: fileTask.path,
          action: fileTask.action,
          explanation: `Error: ${error.message}`,
        });
      }
    }

    const successCount = changes.filter(c => !c.explanation.startsWith('Error')).length;

    return {
      success: successCount === changes.length,
      changes,
      summary: `${successCount}/${changes.length} files processed successfully`,
    };
  }

  /**
   * Execute complete workflow: plan + execute
   */
  async editMultipleFiles(
    projectId: string,
    userRequest: string,
  ): Promise<{ plan: MultiFileTask; result: MultiFileResult }> {
    // Step 1: Plan
    const plan = await this.planChanges(projectId, userRequest);
    
    this.logger.log(`Plan created: ${plan.files.length} files to ${plan.description}`);

    // Step 2: Execute
    const result = await this.executeChanges(projectId, plan);

    return { plan, result };
  }

  /**
   * Create new file
   */
  private async createFile(
    projectId: string,
    task: { path: string; description: string }
  ): Promise<MultiFileResult['changes'][0]> {
    // Get context for better code generation
    const context = await this.getProjectContext(projectId);

    const prompt = `Create a new file: ${task.path}

Requirements:
${task.description}

Project context:
${context}

Generate the complete file content.`;

    const result = await this.aiService.generateCode(
      prompt,
      context,
      this.detectLanguage(task.path)
    );

    return {
      filePath: task.path,
      action: 'create',
      content: result.code,
      explanation: `Created new file with ${result.code.split('\n').length} lines`,
    };
  }

  /**
   * Modify existing file
   */
  private async modifyFile(
    projectId: string,
    task: { path: string; description: string }
  ): Promise<MultiFileResult['changes'][0]> {
    // Get current file content
    const file = await this.prisma.file.findFirst({
      where: { projectId, path: task.path },
    });

    if (!file) {
      throw new Error('File not found');
    }

    const prompt = `Modify the file: ${task.path}

Current content:
\`\`\`
${file.content}
\`\`\`

Required changes:
${task.description}

Provide the complete updated file content.`;

    const result = await this.aiService.modifyCode(
      file.content || '',
      task.description,
      file.extension
    );

    return {
      filePath: task.path,
      action: 'modify',
      originalContent: file.content || '',
      content: result.code,
      explanation: result.explanation || `Modified file based on: ${task.description}`,
    };
  }

  /**
   * Delete file
   */
  private async deleteFile(
    projectId: string,
    task: { path: string; description: string }
  ): Promise<MultiFileResult['changes'][0]> {
    return {
      filePath: task.path,
      action: 'delete',
      explanation: `File marked for deletion: ${task.description}`,
    };
  }

  /**
   * Get project context
   */
  private async getProjectContext(projectId: string): Promise<string> {
    const files = await this.prisma.file.findMany({
      where: { projectId, isDirectory: false },
      select: { path: true, extension: true, size: true },
      take: 50,
    });

    const fileTree = files.map(f => `- ${f.path} (${f.extension})`).join('\n');

    return `Project structure:\n${fileTree}`;
  }

  /**
   * Detect language from file path
   */
  private detectLanguage(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase();
    const langMap: Record<string, string> = {
      ts: 'typescript',
      tsx: 'typescript',
      js: 'javascript',
      jsx: 'javascript',
      py: 'python',
      java: 'java',
      go: 'go',
      rs: 'rust',
    };
    return langMap[ext || ''] || 'typescript';
  }

  /**
   * Extract JSON from text
   */
  private extractJSON(text: string | null): string {
    if (!text) return '{}';
    const match = text.match(/\{[\s\S]*\}/);
    return match ? match[0] : '{}';
  }
}
