import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ResolvedPlan, ResolvedStep } from './change-planner.service';
import * as fs from 'fs/promises';

/**
 * Execution result for a change
 */
export interface ExecutionResult {
  planId: string;
  success: boolean;
  modifiedFiles: string[];
  errors?: string[];
  rollbackInfo: RollbackInfo;
}

/**
 * Rollback information for undoing changes
 */
export interface RollbackInfo {
  id: string;
  planId: string;
  backups: FileBackup[];
  createdAt: Date;
}

export interface FileBackup {
  filePath: string;
  originalContent: string;
  wasCreated: boolean;
}

/**
 * AST Executor Service
 * 
 * Executes resolved change plans by modifying files based on
 * precise AST-derived locations.
 */
@Injectable()
export class ASTExecutorService {
  private readonly logger = new Logger(ASTExecutorService.name);
  private rollbackStore = new Map<string, RollbackInfo>();
  private rollbackCounter = 0;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Execute a resolved plan
   */
  async execute(plan: ResolvedPlan): Promise<ExecutionResult> {
    this.logger.log(`Executing plan ${plan.id}`);

    const rollbackId = `rollback_${++this.rollbackCounter}_${Date.now()}`;
    const backups: FileBackup[] = [];
    const modifiedFiles = new Set<string>();
    const errors: string[] = [];

    // Group steps by file
    const stepsByFile = this.groupStepsByFile(plan.resolvedSteps);

    try {
      // Backup and apply changes for each file
      for (const [filePath, steps] of stepsByFile) {
        try {
          // Read and backup original content
          let content: string;
          let wasCreated = false;
          
          try {
            content = await fs.readFile(filePath, 'utf-8');
          } catch {
            // File doesn't exist, will be created
            content = '';
            wasCreated = true;
          }

          backups.push({
            filePath,
            originalContent: content,
            wasCreated,
          });

          // Apply changes in reverse order (by position) to maintain accuracy
          const sortedSteps = [...steps].sort(
            (a, b) => b.location.startIndex - a.location.startIndex
          );

          let modifiedContent = content;
          for (const step of sortedSteps) {
            modifiedContent = this.applyStep(modifiedContent, step);
          }

          // Write modified content
          await this.ensureDirectory(filePath);
          await fs.writeFile(filePath, modifiedContent, 'utf-8');
          modifiedFiles.add(filePath);

          this.logger.debug(`Modified file: ${filePath}`);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          errors.push(`File ${filePath}: ${message}`);
          this.logger.error(`Failed to modify ${filePath}: ${message}`);
        }
      }

      const rollbackInfo: RollbackInfo = {
        id: rollbackId,
        planId: plan.id,
        backups,
        createdAt: new Date(),
      };

      // Store rollback info
      this.rollbackStore.set(rollbackId, rollbackInfo);

      const success = errors.length === 0;
      
      this.logger.log(
        `Execution ${success ? 'completed' : 'completed with errors'}: ` +
        `${modifiedFiles.size} files modified`
      );

      return {
        planId: plan.id,
        success,
        modifiedFiles: Array.from(modifiedFiles),
        errors: errors.length > 0 ? errors : undefined,
        rollbackInfo,
      };
    } catch (error) {
      // Critical error - attempt rollback
      this.logger.error('Critical error during execution, attempting rollback');
      
      await this.rollbackBackups(backups);
      
      throw error;
    }
  }

  /**
   * Rollback a previous execution
   */
  async rollback(rollbackId: string): Promise<{ success: boolean; errors?: string[] }> {
    const rollbackInfo = this.rollbackStore.get(rollbackId);
    
    if (!rollbackInfo) {
      return {
        success: false,
        errors: [`Rollback info not found: ${rollbackId}`],
      };
    }

    this.logger.log(`Rolling back plan ${rollbackInfo.planId}`);

    const errors: string[] = [];
    
    await this.rollbackBackups(rollbackInfo.backups, errors);

    // Remove rollback info
    this.rollbackStore.delete(rollbackId);

    return {
      success: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Apply a single step to content
   */
  private applyStep(content: string, step: ResolvedStep): string {
    const { startIndex, endIndex } = step.location;
    const before = content.slice(0, startIndex);
    const after = content.slice(endIndex);

    switch (step.type) {
      case 'insert':
        return before + step.newContent + content.slice(startIndex);
      
      case 'replace':
        return before + step.newContent + after;
      
      case 'delete':
        return before + after;
      
      default:
        return content;
    }
  }

  /**
   * Group steps by file path
   */
  private groupStepsByFile(steps: ResolvedStep[]): Map<string, ResolvedStep[]> {
    const grouped = new Map<string, ResolvedStep[]>();
    
    for (const step of steps) {
      const existing = grouped.get(step.filePath) || [];
      existing.push(step);
      grouped.set(step.filePath, existing);
    }
    
    return grouped;
  }

  /**
   * Ensure directory exists for a file path
   */
  private async ensureDirectory(filePath: string): Promise<void> {
    const path = await import('path');
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
  }

  /**
   * Rollback file backups
   */
  private async rollbackBackups(
    backups: FileBackup[],
    errors: string[] = []
  ): Promise<void> {
    for (const backup of backups) {
      try {
        if (backup.wasCreated) {
          // Delete created file
          try {
            await fs.unlink(backup.filePath);
          } catch {
            // File may not exist
          }
        } else {
          // Restore original content
          await fs.writeFile(backup.filePath, backup.originalContent, 'utf-8');
        }
        
        this.logger.debug(`Rolled back: ${backup.filePath}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`Rollback failed for ${backup.filePath}: ${message}`);
        this.logger.error(`Rollback failed for ${backup.filePath}: ${message}`);
      }
    }
  }

  /**
   * Get rollback info
   */
  getRollbackInfo(rollbackId: string): RollbackInfo | undefined {
    return this.rollbackStore.get(rollbackId);
  }

  /**
   * List all available rollbacks
   */
  listRollbacks(): RollbackInfo[] {
    return Array.from(this.rollbackStore.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Clean old rollback entries
   */
  cleanOldRollbacks(maxAge: number = 24 * 60 * 60 * 1000): number {
    const cutoff = Date.now() - maxAge;
    let cleaned = 0;

    for (const [id, info] of this.rollbackStore.entries()) {
      if (info.createdAt.getTime() < cutoff) {
        this.rollbackStore.delete(id);
        cleaned++;
      }
    }

    return cleaned;
  }
}
