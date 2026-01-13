import { Injectable, Logger } from '@nestjs/common';
import { SandboxService } from './sandbox.service';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';

/**
 * File operation result
 */
export interface FileOperationResult {
  success: boolean;
  path: string;
  operation: 'create' | 'modify' | 'delete' | 'read' | 'mkdir';
  message?: string;
  error?: string;
  previousContent?: string;
  newContent?: string;
}

/**
 * File check result
 */
export interface FileCheckResult {
  path: string;
  exists: boolean;
  isFile: boolean;
  isDirectory: boolean;
  size?: number;
  modifiedAt?: Date;
  permissions?: {
    readable: boolean;
    writable: boolean;
  };
}

/**
 * Batch operation result
 */
export interface BatchOperationResult {
  total: number;
  successful: number;
  failed: number;
  results: FileOperationResult[];
}

/**
 * Intelligent File Operations Service
 * 
 * Provides safe file operations with:
 * - Mandatory pre-operation checks
 * - Conditional branching (create vs modify)
 * - Directory auto-creation
 * - Rollback support
 */
@Injectable()
export class FileOperationsService {
  private readonly logger = new Logger(FileOperationsService.name);
  private projectRoot: string = process.cwd();
  
  constructor(private readonly sandbox: SandboxService) {}

  /**
   * Set project root for operations
   */
  setProjectRoot(root: string): void {
    this.projectRoot = root;
  }

  // ==================== Pre-Operation Checks ====================

  /**
   * Check if file/directory exists with detailed info
   */
  async checkExists(targetPath: string): Promise<FileCheckResult> {
    const absolutePath = this.resolvePath(targetPath);
    
    try {
      const stats = await fs.stat(absolutePath);
      
      // Check permissions
      let readable = false;
      let writable = false;
      try {
        await fs.access(absolutePath, fsSync.constants.R_OK);
        readable = true;
      } catch { /* not readable */ }
      try {
        await fs.access(absolutePath, fsSync.constants.W_OK);
        writable = true;
      } catch { /* not writable */ }
      
      return {
        path: absolutePath,
        exists: true,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
        size: stats.size,
        modifiedAt: stats.mtime,
        permissions: { readable, writable },
      };
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return {
          path: absolutePath,
          exists: false,
          isFile: false,
          isDirectory: false,
        };
      }
      throw error;
    }
  }

  /**
   * List files in a directory
   */
  async listFiles(
    dirPath: string,
    options: { recursive?: boolean; pattern?: RegExp } = {}
  ): Promise<string[]> {
    const absolutePath = this.resolvePath(dirPath);
    const sandboxResult = this.sandbox.validatePath(absolutePath, this.projectRoot, 'list');
    
    if (!sandboxResult.allowed) {
      this.logger.warn(`Blocked listFiles: ${sandboxResult.reason}`);
      return [];
    }

    const check = await this.checkExists(dirPath);
    if (!check.exists || !check.isDirectory) {
      return [];
    }

    const files: string[] = [];
    
    const scanDir = async (dir: string) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isFile()) {
          if (!options.pattern || options.pattern.test(entry.name)) {
            files.push(fullPath);
          }
        } else if (entry.isDirectory() && options.recursive) {
          await scanDir(fullPath);
        }
      }
    };

    await scanDir(absolutePath);
    return files;
  }

  /**
   * Check multiple files at once
   */
  async batchCheck(paths: string[]): Promise<Map<string, FileCheckResult>> {
    const results = new Map<string, FileCheckResult>();
    
    await Promise.all(
      paths.map(async (p) => {
        const result = await this.checkExists(p);
        results.set(p, result);
      })
    );
    
    return results;
  }

  // ==================== Conditional Operations ====================

  /**
   * Smart write: auto-detect create vs modify
   */
  async smartWrite(
    targetPath: string,
    content: string,
    options: { createDirs?: boolean; backup?: boolean } = {}
  ): Promise<FileOperationResult> {
    const absolutePath = this.resolvePath(targetPath);
    
    // Sandbox check
    const sandboxResult = this.sandbox.validatePath(absolutePath, this.projectRoot, 'write');
    if (!sandboxResult.allowed) {
      return {
        success: false,
        path: absolutePath,
        operation: 'create',
        error: `Sandbox blocked: ${sandboxResult.reason}`,
      };
    }

    const check = await this.checkExists(targetPath);
    
    if (check.exists && check.isFile) {
      // Modify existing file
      return this.modifyFile(targetPath, content, { backup: options.backup });
    } else {
      // Create new file
      return this.createFile(targetPath, content, { createDirs: options.createDirs });
    }
  }

  /**
   * Create a new file (fails if exists)
   */
  async createFile(
    targetPath: string,
    content: string,
    options: { createDirs?: boolean; overwrite?: boolean } = {}
  ): Promise<FileOperationResult> {
    const absolutePath = this.resolvePath(targetPath);
    
    // Sandbox check
    const sandboxResult = this.sandbox.validatePath(absolutePath, this.projectRoot, 'write');
    if (!sandboxResult.allowed) {
      return {
        success: false,
        path: absolutePath,
        operation: 'create',
        error: `Sandbox blocked: ${sandboxResult.reason}`,
      };
    }

    const check = await this.checkExists(targetPath);
    
    if (check.exists && !options.overwrite) {
      return {
        success: false,
        path: absolutePath,
        operation: 'create',
        error: 'File already exists. Use overwrite option or modifyFile instead.',
      };
    }

    try {
      // Auto-create directories if needed
      if (options.createDirs) {
        const dir = path.dirname(absolutePath);
        await this.ensureDir(dir);
      }

      await fs.writeFile(absolutePath, content, 'utf-8');
      
      this.logger.log(`Created file: ${absolutePath}`);
      
      return {
        success: true,
        path: absolutePath,
        operation: 'create',
        message: 'File created successfully',
        newContent: content,
      };
    } catch (error: any) {
      return {
        success: false,
        path: absolutePath,
        operation: 'create',
        error: error.message,
      };
    }
  }

  /**
   * Modify an existing file
   */
  async modifyFile(
    targetPath: string,
    content: string,
    options: { backup?: boolean } = {}
  ): Promise<FileOperationResult> {
    const absolutePath = this.resolvePath(targetPath);
    
    // Sandbox check
    const sandboxResult = this.sandbox.validatePath(absolutePath, this.projectRoot, 'write');
    if (!sandboxResult.allowed) {
      return {
        success: false,
        path: absolutePath,
        operation: 'modify',
        error: `Sandbox blocked: ${sandboxResult.reason}`,
      };
    }

    const check = await this.checkExists(targetPath);
    
    if (!check.exists) {
      return {
        success: false,
        path: absolutePath,
        operation: 'modify',
        error: 'File does not exist. Use createFile instead.',
      };
    }

    try {
      // Read previous content
      const previousContent = await fs.readFile(absolutePath, 'utf-8');
      
      // Create backup if requested
      if (options.backup) {
        const backupPath = `${absolutePath}.bak.${Date.now()}`;
        await fs.writeFile(backupPath, previousContent, 'utf-8');
        this.logger.debug(`Created backup: ${backupPath}`);
      }

      await fs.writeFile(absolutePath, content, 'utf-8');
      
      this.logger.log(`Modified file: ${absolutePath}`);
      
      return {
        success: true,
        path: absolutePath,
        operation: 'modify',
        message: 'File modified successfully',
        previousContent,
        newContent: content,
      };
    } catch (error: any) {
      return {
        success: false,
        path: absolutePath,
        operation: 'modify',
        error: error.message,
      };
    }
  }

  /**
   * Delete a file
   */
  async deleteFile(targetPath: string, options: { backup?: boolean } = {}): Promise<FileOperationResult> {
    const absolutePath = this.resolvePath(targetPath);
    
    const sandboxResult = this.sandbox.validatePath(absolutePath, this.projectRoot, 'delete');
    if (!sandboxResult.allowed) {
      return {
        success: false,
        path: absolutePath,
        operation: 'delete',
        error: `Sandbox blocked: ${sandboxResult.reason}`,
      };
    }

    const check = await this.checkExists(targetPath);
    if (!check.exists) {
      return {
        success: false,
        path: absolutePath,
        operation: 'delete',
        error: 'File does not exist',
      };
    }

    try {
      let previousContent: string | undefined;
      
      if (check.isFile) {
        previousContent = await fs.readFile(absolutePath, 'utf-8');
        
        if (options.backup) {
          const backupPath = `${absolutePath}.deleted.${Date.now()}`;
          await fs.writeFile(backupPath, previousContent, 'utf-8');
        }
      }

      await fs.rm(absolutePath, { recursive: true });
      
      this.logger.log(`Deleted: ${absolutePath}`);
      
      return {
        success: true,
        path: absolutePath,
        operation: 'delete',
        message: check.isDirectory ? 'Directory deleted' : 'File deleted',
        previousContent,
      };
    } catch (error: any) {
      return {
        success: false,
        path: absolutePath,
        operation: 'delete',
        error: error.message,
      };
    }
  }

  // ==================== Directory Operations ====================

  /**
   * Ensure directory exists (mkdir -p)
   */
  async ensureDir(dirPath: string): Promise<FileOperationResult> {
    const absolutePath = this.resolvePath(dirPath);
    
    const sandboxResult = this.sandbox.validatePath(absolutePath, this.projectRoot, 'write');
    if (!sandboxResult.allowed) {
      return {
        success: false,
        path: absolutePath,
        operation: 'mkdir',
        error: `Sandbox blocked: ${sandboxResult.reason}`,
      };
    }

    try {
      await fs.mkdir(absolutePath, { recursive: true });
      
      return {
        success: true,
        path: absolutePath,
        operation: 'mkdir',
        message: 'Directory created/verified',
      };
    } catch (error: any) {
      return {
        success: false,
        path: absolutePath,
        operation: 'mkdir',
        error: error.message,
      };
    }
  }

  // ==================== Read Operations ====================

  /**
   * Read file with pre-check
   */
  async readFile(targetPath: string): Promise<{ content: string | null; error?: string }> {
    const absolutePath = this.resolvePath(targetPath);
    
    const sandboxResult = this.sandbox.validatePath(absolutePath, this.projectRoot, 'read');
    if (!sandboxResult.allowed) {
      return { content: null, error: `Sandbox blocked: ${sandboxResult.reason}` };
    }

    const check = await this.checkExists(targetPath);
    if (!check.exists) {
      return { content: null, error: 'File does not exist' };
    }
    if (!check.isFile) {
      return { content: null, error: 'Path is not a file' };
    }
    if (!check.permissions?.readable) {
      return { content: null, error: 'File is not readable' };
    }

    try {
      const content = await fs.readFile(absolutePath, 'utf-8');
      return { content };
    } catch (error: any) {
      return { content: null, error: error.message };
    }
  }

  // ==================== Batch Operations ====================

  /**
   * Execute multiple file operations atomically (with rollback on failure)
   */
  async batchWrite(
    operations: { path: string; content: string }[],
    options: { atomic?: boolean; createDirs?: boolean } = {}
  ): Promise<BatchOperationResult> {
    const results: FileOperationResult[] = [];
    const completedOps: { path: string; previousContent?: string }[] = [];
    
    for (const op of operations) {
      const result = await this.smartWrite(op.path, op.content, {
        createDirs: options.createDirs,
        backup: true,
      });
      
      results.push(result);
      
      if (result.success) {
        completedOps.push({
          path: result.path,
          previousContent: result.previousContent,
        });
      } else if (options.atomic) {
        // Rollback on failure
        this.logger.warn(`Atomic write failed, rolling back ${completedOps.length} operations`);
        
        for (const completed of completedOps.reverse()) {
          if (completed.previousContent !== undefined) {
            await fs.writeFile(completed.path, completed.previousContent, 'utf-8');
          } else {
            await fs.rm(completed.path).catch(() => {});
          }
        }
        
        break;
      }
    }

    return {
      total: operations.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
    };
  }

  // ==================== Helper Methods ====================

  private resolvePath(targetPath: string): string {
    if (path.isAbsolute(targetPath)) {
      return targetPath;
    }
    return path.resolve(this.projectRoot, targetPath);
  }
}
