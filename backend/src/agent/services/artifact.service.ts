import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Artifact types
 */
export type ArtifactType = 'task_list' | 'implementation_plan' | 'code_review' | 'analysis' | 'other';

/**
 * Task item in a task list
 */
export interface TaskItem {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  priority: 'high' | 'medium' | 'low';
  subtasks?: TaskItem[];
  estimatedTime?: string;
  assignee?: string;
}

/**
 * Implementation plan change
 */
export interface PlannedChange {
  file: string;
  action: 'create' | 'modify' | 'delete';
  description: string;
  codePreview?: string;
  dependencies?: string[];
}

/**
 * Implementation plan structure
 */
export interface ImplementationPlan {
  id: string;
  title: string;
  summary: string;
  changes: PlannedChange[];
  verificationSteps: string[];
  rollbackPlan?: string;
  estimatedImpact: {
    filesAffected: number;
    linesChanged: number;
    riskLevel: 'low' | 'medium' | 'high';
  };
}

/**
 * Artifact metadata
 */
export interface ArtifactMetadata {
  id: string;
  type: ArtifactType;
  title: string;
  filePath: string;
  createdAt: Date;
  updatedAt: Date;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: Date;
}

/**
 * Artifact Service
 * 
 * Manages Task List and Implementation Plan artifacts.
 */
@Injectable()
export class ArtifactService {
  private readonly logger = new Logger(ArtifactService.name);
  private artifactsDir: string = '.agent/artifacts';

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Set artifacts directory
   */
  setArtifactsDir(dir: string): void {
    this.artifactsDir = dir;
  }

  // ==================== Task List ====================

  /**
   * Generate a task list from a goal description
   */
  async generateTaskList(
    goal: string,
    projectContext?: { files: string[]; dependencies: string[] }
  ): Promise<{ tasks: TaskItem[]; markdown: string }> {
    // In a real implementation, this would use LLM to generate tasks
    // For now, return a structured template
    const tasks: TaskItem[] = [
      {
        id: `task_${Date.now()}_1`,
        title: 'Analyze requirements',
        description: `Understand the goal: ${goal}`,
        status: 'pending',
        priority: 'high',
        estimatedTime: '10min',
      },
      {
        id: `task_${Date.now()}_2`,
        title: 'Review existing code',
        description: 'Check relevant files and dependencies',
        status: 'pending',
        priority: 'high',
        subtasks: [
          {
            id: `task_${Date.now()}_2_1`,
            title: 'Identify affected files',
            status: 'pending',
            priority: 'medium',
          },
          {
            id: `task_${Date.now()}_2_2`,
            title: 'Check for conflicts',
            status: 'pending',
            priority: 'medium',
          },
        ],
      },
      {
        id: `task_${Date.now()}_3`,
        title: 'Implement changes',
        description: 'Make the required code changes',
        status: 'pending',
        priority: 'high',
        estimatedTime: '30min',
      },
      {
        id: `task_${Date.now()}_4`,
        title: 'Test and verify',
        description: 'Run tests and verify functionality',
        status: 'pending',
        priority: 'high',
        estimatedTime: '15min',
      },
    ];

    const markdown = this.taskListToMarkdown(tasks, goal);
    
    return { tasks, markdown };
  }

  /**
   * Convert task list to markdown
   */
  private taskListToMarkdown(tasks: TaskItem[], goal: string): string {
    const lines: string[] = [
      '# Task List',
      '',
      `**Goal:** ${goal}`,
      '',
      '---',
      '',
    ];

    const renderTask = (task: TaskItem, indent: number = 0): void => {
      const prefix = '  '.repeat(indent);
      const checkbox = task.status === 'completed' ? '[x]' : task.status === 'in_progress' ? '[/]' : '[ ]';
      const priority = task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢';
      
      lines.push(`${prefix}- ${checkbox} ${priority} **${task.title}**`);
      
      if (task.description) {
        lines.push(`${prefix}  - ${task.description}`);
      }
      if (task.estimatedTime) {
        lines.push(`${prefix}  - ⏱️ ${task.estimatedTime}`);
      }
      
      if (task.subtasks) {
        for (const subtask of task.subtasks) {
          renderTask(subtask, indent + 1);
        }
      }
    };

    for (const task of tasks) {
      renderTask(task);
      lines.push('');
    }

    return lines.join('\n');
  }

  // ==================== Implementation Plan ====================

  /**
   * Generate an implementation plan
   */
  async generateImplementationPlan(
    goal: string,
    analysis: {
      filesToCreate?: { path: string; description: string }[];
      filesToModify?: { path: string; changes: string }[];
      filesToDelete?: { path: string; reason: string }[];
    }
  ): Promise<{ plan: ImplementationPlan; markdown: string }> {
    const changes: PlannedChange[] = [];
    
    // Add creates
    for (const file of analysis.filesToCreate || []) {
      changes.push({
        file: file.path,
        action: 'create',
        description: file.description,
      });
    }
    
    // Add modifications
    for (const file of analysis.filesToModify || []) {
      changes.push({
        file: file.path,
        action: 'modify',
        description: file.changes,
      });
    }
    
    // Add deletes
    for (const file of analysis.filesToDelete || []) {
      changes.push({
        file: file.path,
        action: 'delete',
        description: file.reason,
      });
    }

    const plan: ImplementationPlan = {
      id: `plan_${Date.now()}`,
      title: goal,
      summary: `Implementation plan for: ${goal}`,
      changes,
      verificationSteps: [
        'Run lint checks',
        'Run type checks',
        'Run tests',
        'Manual verification',
      ],
      rollbackPlan: 'Restore from backup files or git reset',
      estimatedImpact: {
        filesAffected: changes.length,
        linesChanged: 0, // Would be calculated by actual analysis
        riskLevel: changes.length > 5 ? 'high' : changes.length > 2 ? 'medium' : 'low',
      },
    };

    const markdown = this.implementationPlanToMarkdown(plan);
    
    return { plan, markdown };
  }

  /**
   * Convert implementation plan to markdown
   */
  private implementationPlanToMarkdown(plan: ImplementationPlan): string {
    const riskEmoji = plan.estimatedImpact.riskLevel === 'high' ? '🔴' : 
                      plan.estimatedImpact.riskLevel === 'medium' ? '🟡' : '🟢';
    
    const lines: string[] = [
      `# ${plan.title}`,
      '',
      `> ${plan.summary}`,
      '',
      '---',
      '',
      '## Impact Assessment',
      '',
      `| Metric | Value |`,
      `|--------|-------|`,
      `| Files Affected | ${plan.estimatedImpact.filesAffected} |`,
      `| Risk Level | ${riskEmoji} ${plan.estimatedImpact.riskLevel.toUpperCase()} |`,
      '',
      '---',
      '',
      '## Proposed Changes',
      '',
    ];

    // Group by action
    const creates = plan.changes.filter(c => c.action === 'create');
    const modifies = plan.changes.filter(c => c.action === 'modify');
    const deletes = plan.changes.filter(c => c.action === 'delete');

    if (creates.length > 0) {
      lines.push('### New Files');
      lines.push('');
      for (const change of creates) {
        lines.push(`#### [NEW] \`${path.basename(change.file)}\``);
        lines.push(`- Path: \`${change.file}\``);
        lines.push(`- ${change.description}`);
        lines.push('');
      }
    }

    if (modifies.length > 0) {
      lines.push('### Modified Files');
      lines.push('');
      for (const change of modifies) {
        lines.push(`#### [MODIFY] \`${path.basename(change.file)}\``);
        lines.push(`- Path: \`${change.file}\``);
        lines.push(`- ${change.description}`);
        lines.push('');
      }
    }

    if (deletes.length > 0) {
      lines.push('### Deleted Files');
      lines.push('');
      for (const change of deletes) {
        lines.push(`#### [DELETE] \`${path.basename(change.file)}\``);
        lines.push(`- Path: \`${change.file}\``);
        lines.push(`- Reason: ${change.description}`);
        lines.push('');
      }
    }

    lines.push('---');
    lines.push('');
    lines.push('## Verification Steps');
    lines.push('');
    for (let i = 0; i < plan.verificationSteps.length; i++) {
      lines.push(`${i + 1}. ${plan.verificationSteps[i]}`);
    }
    lines.push('');

    if (plan.rollbackPlan) {
      lines.push('---');
      lines.push('');
      lines.push('## Rollback Plan');
      lines.push('');
      lines.push(`> ${plan.rollbackPlan}`);
    }

    return lines.join('\n');
  }

  // ==================== Artifact Storage ====================

  /**
   * Save artifact to file
   */
  async saveArtifact(
    type: ArtifactType,
    title: string,
    content: string,
    projectRoot: string
  ): Promise<ArtifactMetadata> {
    const id = `artifact_${Date.now()}`;
    const filename = `${type}_${id}.md`;
    const artifactPath = path.join(projectRoot, this.artifactsDir, filename);
    
    // Ensure directory exists
    await fs.mkdir(path.dirname(artifactPath), { recursive: true });
    
    // Write file
    await fs.writeFile(artifactPath, content, 'utf-8');
    
    const metadata: ArtifactMetadata = {
      id,
      type,
      title,
      filePath: artifactPath,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'pending_approval',
    };

    this.logger.log(`Saved artifact: ${artifactPath}`);
    
    return metadata;
  }

  /**
   * Update artifact status
   */
  async updateArtifactStatus(
    metadata: ArtifactMetadata,
    status: ArtifactMetadata['status'],
    approvedBy?: string
  ): Promise<ArtifactMetadata> {
    const updated: ArtifactMetadata = {
      ...metadata,
      status,
      updatedAt: new Date(),
    };

    if (status === 'approved' && approvedBy) {
      updated.approvedBy = approvedBy;
      updated.approvedAt = new Date();
    }

    return updated;
  }

  /**
   * List artifacts in project
   */
  async listArtifacts(projectRoot: string): Promise<string[]> {
    const artifactPath = path.join(projectRoot, this.artifactsDir);
    
    try {
      const files = await fs.readdir(artifactPath);
      return files.filter(f => f.endsWith('.md'));
    } catch {
      return [];
    }
  }
}
