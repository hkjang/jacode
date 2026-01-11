import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { AIService } from '../../ai/ai.service';
import { ContextCollectorService } from '../../ai/services/context-collector.service';
import { QUEUE_NAMES } from '../constants';
import { CodeGenerationJob } from '../queue.service';
import { AgentGateway } from '../../agent/agent.gateway';
import { Inject, forwardRef } from '@nestjs/common';

// Use string literals for Prisma enums
type AgentStatusType = 'PENDING' | 'PLANNING' | 'EXECUTING' | 'WAITING_APPROVAL' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
type ArtifactTypeType = 'PLAN' | 'CODE' | 'DIFF' | 'TEST_RESULT' | 'LOG' | 'SCREENSHOT' | 'REVIEW' | 'DOCUMENTATION';
type ArtifactStatusType = 'DRAFT' | 'APPROVED' | 'REJECTED' | 'APPLIED';

@Injectable()
@Processor(QUEUE_NAMES.CODE_GENERATION)
export class CodeProcessor extends WorkerHost {
  private readonly logger = new Logger(CodeProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AIService,
    private readonly contextCollector: ContextCollectorService,
    @Inject(forwardRef(() => AgentGateway))
    private readonly agentGateway: AgentGateway,
  ) {
    super();
  }

  async process(job: Job<CodeGenerationJob>): Promise<any> {
    const { taskId, prompt, context, language } = job.data;

    try {
      // Update task status to executing
      // Update task status to executing
      await this.updateTaskStatus(taskId, 'EXECUTING', 0, 'Starting code generation...');
      this.agentGateway.notifyTaskProgress({ id: taskId, userId: job.data.userId || '', projectId: job.data.projectId || '', progress: 0, currentStep: 'Starting code generation...' });

      // Check for cancellation
      if (await this.isCancelled(job)) {
        await this.updateTaskStatus(taskId, 'CANCELLED');
        return { cancelled: true };
      }

      // Update progress
      await job.updateProgress(10);
      await this.updateTaskStatus(taskId, 'EXECUTING', 10, 'Analyzing requirements...');
      this.agentGateway.notifyTaskProgress({ id: taskId, userId: job.data.userId || '', projectId: job.data.projectId || '', progress: 10, currentStep: 'Analyzing requirements...' });

      // Enrich context with STRATEGIC context (imports, reverse deps, config, similar files)
      let enrichedContext = context || '';
      if (job.data.projectId) {
        try {
          const strategicContext = await this.contextCollector.gatherStrategicContext(
            job.data.projectId,
            prompt, // Use prompt as the query for semantic search
            job.data.files || [], // Focus on target files if provided
            { maxFiles: 10, includeConfig: true, includeImports: true, includeReverseDeps: true }
          );
          
          // Add project info
          if (strategicContext.projectInfo) {
            enrichedContext += `\n\nProject: ${strategicContext.projectInfo.name}`;
            enrichedContext += `\nTechnologies: ${strategicContext.projectInfo.technologies.join(', ')}`;
          }
          
          // Add strategic files as context
          if (strategicContext.files.length > 0) {
            enrichedContext += `\n\n--- RELATED FILES (${strategicContext.files.length} files, ${strategicContext.totalLines} lines) ---\n`;
            for (const file of strategicContext.files) {
              enrichedContext += `\n[${file.source.toUpperCase()}] ${file.path}:\n\`\`\`\n${file.content.slice(0, 2000)}\n\`\`\`\n`;
            }
          }
          
          this.logger.log(`Strategic context: ${strategicContext.files.length} files, ${strategicContext.totalLines} lines`);
        } catch (error) {
          this.logger.warn(`Failed to get strategic context: ${error.message}`);
        }
      }

      // Generate code
      await job.updateProgress(30);
      await this.updateTaskStatus(taskId, 'EXECUTING', 30, 'Generating code...');
      this.agentGateway.notifyTaskProgress({ id: taskId, userId: job.data.userId || '', projectId: job.data.projectId || '', progress: 30, currentStep: 'Generating code...' });

      // Custom system prompt for multi-file generation
      const systemPrompt = `You are an expert software developer.
Your task is to generate code based on the user's request.
You can generate multiple files if needed.

IMPORTANT: You MUST output the code in the following XML format for EACH file:

<file path="path/to/filename.ext">
... code content ...
</file>

Example:
<file path="src/components/Button.tsx">
import React from 'react';
export const Button = () => <button>Click me</button>;
</file>

<file path="src/components/Button.test.tsx">
import { render } from '@testing-library/react';
import { Button } from './Button';
test('renders button', () => { ... });
</file>

Rule 1: Always use the <file> tag with the "path" attribute.
Rule 2: Ensure the path is relative to the project root.
Rule 3: Provide the complete file content inside the tags.
Rule 4: Do not use markdown code blocks (\`\`\`) inside the <file> tags, just raw code.
`;

      const result = await this.aiService.chat([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Request: ${prompt}\n\n${enrichedContext ? `Context:\n${enrichedContext}` : ''}` }
      ], {
        model: job.data.model,
        temperature: 0.2, // Lower temperature for more structured output
      });

      // Check for cancellation again
      if (await this.isCancelled(job)) {
        await this.updateTaskStatus(taskId, 'CANCELLED');
        return { cancelled: true };
      }

      await job.updateProgress(80);
      await this.updateTaskStatus(taskId, 'EXECUTING', 80, 'Creating artifacts...');
      this.agentGateway.notifyTaskProgress({ id: taskId, userId: job.data.userId || '', projectId: job.data.projectId || '', progress: 80, currentStep: 'Creating artifacts...' });

      const responseContent = result.content || ''; // Handle potential null content
      const fileRegex = /<file\s+path="([^"]+)">([\s\S]*?)<\/file>/g;
      const files: { path: string; content: string }[] = [];
      let match;

      while ((match = fileRegex.exec(responseContent)) !== null) {
        files.push({
          path: match[1],
          content: match[2].trim(),
        });
      }

      const createdArtifacts = [];

      if (files.length > 0) {
        // Multi-file handling
        for (const file of files) {
           const artifact = await this.prisma.artifact.create({
            data: {
              type: 'CODE' as ArtifactTypeType,
              title: `Generated: ${file.path.split('/').pop()}`,
              content: file.content,
              metadata: {
                language: this.detectLanguage(file.path),
                explanation: 'Generated by AI Agent',
                prompt,
                filePath: file.path,
              },
              status: 'DRAFT' as ArtifactStatusType,
              agentTaskId: taskId,
            },
          });
          createdArtifacts.push(artifact);
           // Notify artifact created
          if (job.data.userId && job.data.projectId) {
            this.agentGateway.notifyArtifactCreated(artifact, job.data.userId, job.data.projectId);
          }
        }
      } else {
        // Fallback to single file / legacy handling
        // Determine file path
        let filePath = (context as any)?.filePath;
        let code = responseContent || ''; // Ensure string
        
        // Strip markdown blocks if present (legacy format)
        const codeBlockMatch = (responseContent || '').match(/```[\w]*\n([\s\S]*?)```/);
        if (codeBlockMatch) {
            code = codeBlockMatch[1];
        }

        if (!filePath) {
            // Try to find file path in prompt
            const pathMatch = prompt.match(/File: ([^\s]+)/);
            if (pathMatch) {
            filePath = pathMatch[1];
            } else {
            // Fallback
            const ext = language === 'typescript' ? 'ts' : language === 'javascript' ? 'js' : 'txt';
            filePath = `generated/code-${Date.now()}.${ext}`;
            }
        }

        const artifact = await this.prisma.artifact.create({
            data: {
            type: 'CODE' as ArtifactTypeType,
            title: `Generated Code`,
            content: code,
            metadata: {
                language,
                explanation: 'Generated by AI Agent (Fallback)',
                prompt,
                filePath,
            },
            status: 'DRAFT' as ArtifactStatusType,
            agentTaskId: taskId,
            },
        });
        createdArtifacts.push(artifact);
        if (job.data.userId && job.data.projectId) {
            this.agentGateway.notifyArtifactCreated(artifact, job.data.userId, job.data.projectId);
        }
      }

      // Update task to waiting approval
      await job.updateProgress(100);
      await this.updateTaskStatus(
        taskId,
        'WAITING_APPROVAL',
        100,
        'Waiting for approval',
      );
      
      // Notify completion (waiting approval)
      const updatedTask = await this.prisma.agentTask.findUnique({ where: { id: taskId } });
      if (updatedTask) {
        this.agentGateway.notifyTaskUpdated(updatedTask);
      }

      this.logger.log(`Code generation completed for task ${taskId}. Created ${createdArtifacts.length} artifacts.`);

      return {
        success: true,
        artifactIds: createdArtifacts.map(a => a.id),
      };
    } catch (error) {
      this.logger.error(`Code generation failed for task ${taskId}`, error);
      await this.updateTaskStatus(taskId, 'FAILED', undefined, undefined, (error as Error).message);
      throw error;
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Job ${job.id} failed: ${error.message}`);
  }

  private async updateTaskStatus(
    taskId: string,
    status: AgentStatusType,
    progress?: number,
    currentStep?: string,
    error?: string,
  ) {
    await this.prisma.agentTask.update({
      where: { id: taskId },
      data: {
        status,
        ...(progress !== undefined && { progress }),
        ...(currentStep && { currentStep }),
        ...(error && { error }),
        ...(status === 'EXECUTING' && !error && { startedAt: new Date() }),
        ...(status === 'COMPLETED' && { completedAt: new Date() }),
        ...(status === 'FAILED' && { completedAt: new Date() }),
      },
    });
  }

  private async isCancelled(job: Job): Promise<boolean> {
    // Check if job data has cancellation flag
    return (job.data as any)?.cancelled === true;
  }

  private detectLanguage(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'ts':
      case 'tsx':
        return 'typescript';
      case 'js':
      case 'jsx':
        return 'javascript';
      case 'py':
        return 'python';
      case 'html':
        return 'html';
      case 'css':
        return 'css';
      case 'json':
        return 'json';
      case 'md':
        return 'markdown';
      case 'sql':
        return 'sql';
      default:
        return 'plaintext';
    }
  }
}

