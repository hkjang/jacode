import { Injectable, Logger } from '@nestjs/common';
import { exec as execCallback } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const exec = promisify(execCallback);

/**
 * Git status file info
 */
export interface GitFileStatus {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed' | 'untracked';
  staged: boolean;
}

/**
 * Git commit info
 */
export interface GitCommitInfo {
  hash: string;
  shortHash: string;
  author: string;
  date: Date;
  message: string;
}

/**
 * Git branch info
 */
export interface GitBranchInfo {
  name: string;
  current: boolean;
  upstream?: string;
  ahead?: number;
  behind?: number;
}

/**
 * Git diff stats
 */
export interface GitDiffStats {
  filesChanged: number;
  insertions: number;
  deletions: number;
}

/**
 * Git Service
 * 
 * Provides Git operations for version control integration.
 */
@Injectable()
export class GitService {
  private readonly logger = new Logger(GitService.name);

  /**
   * Check if directory is a git repository
   */
  async isGitRepo(projectRoot: string): Promise<boolean> {
    try {
      await exec('git rev-parse --is-inside-work-tree', { cwd: projectRoot });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Initialize git repository
   */
  async init(projectRoot: string): Promise<boolean> {
    try {
      await exec('git init', { cwd: projectRoot });
      this.logger.log(`Initialized git repo at ${projectRoot}`);
      return true;
    } catch (error: any) {
      this.logger.error(`Git init failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Get current branch name
   */
  async getCurrentBranch(projectRoot: string): Promise<string | null> {
    try {
      const { stdout } = await exec('git branch --show-current', { cwd: projectRoot });
      return stdout.trim();
    } catch {
      return null;
    }
  }

  /**
   * List all branches
   */
  async listBranches(projectRoot: string): Promise<GitBranchInfo[]> {
    try {
      const { stdout } = await exec('git branch -vv', { cwd: projectRoot });
      const branches: GitBranchInfo[] = [];
      
      for (const line of stdout.split('\n').filter(l => l.trim())) {
        const current = line.startsWith('*');
        const parts = line.replace(/^\*?\s+/, '').split(/\s+/);
        const name = parts[0];
        
        // Parse upstream info if present
        const upstreamMatch = line.match(/\[([^\]]+)\]/);
        let upstream: string | undefined;
        let ahead: number | undefined;
        let behind: number | undefined;
        
        if (upstreamMatch) {
          const upstreamInfo = upstreamMatch[1];
          const upstreamParts = upstreamInfo.split(':');
          upstream = upstreamParts[0];
          
          if (upstreamParts[1]) {
            const aheadMatch = upstreamParts[1].match(/ahead (\d+)/);
            const behindMatch = upstreamParts[1].match(/behind (\d+)/);
            if (aheadMatch) ahead = parseInt(aheadMatch[1]);
            if (behindMatch) behind = parseInt(behindMatch[1]);
          }
        }
        
        branches.push({ name, current, upstream, ahead, behind });
      }
      
      return branches;
    } catch {
      return [];
    }
  }

  /**
   * Create new branch
   */
  async createBranch(projectRoot: string, branchName: string, checkout: boolean = true): Promise<boolean> {
    try {
      const cmd = checkout ? `git checkout -b ${branchName}` : `git branch ${branchName}`;
      await exec(cmd, { cwd: projectRoot });
      this.logger.log(`Created branch: ${branchName}`);
      return true;
    } catch (error: any) {
      this.logger.error(`Create branch failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Checkout branch
   */
  async checkout(projectRoot: string, branchName: string): Promise<boolean> {
    try {
      await exec(`git checkout ${branchName}`, { cwd: projectRoot });
      return true;
    } catch (error: any) {
      this.logger.error(`Checkout failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Get status of files
   */
  async getStatus(projectRoot: string): Promise<GitFileStatus[]> {
    try {
      const { stdout } = await exec('git status --porcelain', { cwd: projectRoot });
      const files: GitFileStatus[] = [];
      
      for (const line of stdout.split('\n').filter(l => l.trim())) {
        const staged = line[0] !== ' ' && line[0] !== '?';
        const statusChar = staged ? line[0] : line[1];
        const filePath = line.slice(3).trim();
        
        let status: GitFileStatus['status'];
        switch (statusChar) {
          case 'A': status = 'added'; break;
          case 'M': status = 'modified'; break;
          case 'D': status = 'deleted'; break;
          case 'R': status = 'renamed'; break;
          case '?': status = 'untracked'; break;
          default: status = 'modified';
        }
        
        files.push({ path: filePath, status, staged });
      }
      
      return files;
    } catch {
      return [];
    }
  }

  /**
   * Stage files
   */
  async stage(projectRoot: string, files: string[] | 'all'): Promise<boolean> {
    try {
      const fileArg = files === 'all' ? '.' : files.join(' ');
      await exec(`git add ${fileArg}`, { cwd: projectRoot });
      return true;
    } catch (error: any) {
      this.logger.error(`Stage failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Unstage files
   */
  async unstage(projectRoot: string, files: string[]): Promise<boolean> {
    try {
      await exec(`git reset HEAD ${files.join(' ')}`, { cwd: projectRoot });
      return true;
    } catch (error: any) {
      this.logger.error(`Unstage failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Commit staged changes
   */
  async commit(projectRoot: string, message: string): Promise<GitCommitInfo | null> {
    try {
      await exec(`git commit -m "${message.replace(/"/g, '\\"')}"`, { cwd: projectRoot });
      
      // Get commit info
      const { stdout } = await exec('git log -1 --format=%H|%h|%an|%aI|%s', { cwd: projectRoot });
      const [hash, shortHash, author, dateStr, commitMessage] = stdout.trim().split('|');
      
      return {
        hash,
        shortHash,
        author,
        date: new Date(dateStr),
        message: commitMessage,
      };
    } catch (error: any) {
      this.logger.error(`Commit failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Get recent commits
   */
  async getRecentCommits(projectRoot: string, limit: number = 10): Promise<GitCommitInfo[]> {
    try {
      const { stdout } = await exec(
        `git log -${limit} --format=%H|%h|%an|%aI|%s`,
        { cwd: projectRoot }
      );
      
      return stdout.split('\n').filter(l => l.trim()).map(line => {
        const [hash, shortHash, author, dateStr, message] = line.split('|');
        return { hash, shortHash, author, date: new Date(dateStr), message };
      });
    } catch {
      return [];
    }
  }

  /**
   * Get diff for unstaged changes
   */
  async getDiff(projectRoot: string, staged: boolean = false): Promise<string> {
    try {
      const cmd = staged ? 'git diff --cached' : 'git diff';
      const { stdout } = await exec(cmd, { cwd: projectRoot });
      return stdout;
    } catch {
      return '';
    }
  }

  /**
   * Get diff stats
   */
  async getDiffStats(projectRoot: string, staged: boolean = false): Promise<GitDiffStats> {
    try {
      const cmd = staged ? 'git diff --cached --stat' : 'git diff --stat';
      const { stdout } = await exec(cmd, { cwd: projectRoot });
      
      const lastLine = stdout.split('\n').filter(l => l.trim()).pop() || '';
      const filesMatch = lastLine.match(/(\d+) files? changed/);
      const insertMatch = lastLine.match(/(\d+) insertions?\(\+\)/);
      const deleteMatch = lastLine.match(/(\d+) deletions?\(-\)/);
      
      return {
        filesChanged: filesMatch ? parseInt(filesMatch[1]) : 0,
        insertions: insertMatch ? parseInt(insertMatch[1]) : 0,
        deletions: deleteMatch ? parseInt(deleteMatch[1]) : 0,
      };
    } catch {
      return { filesChanged: 0, insertions: 0, deletions: 0 };
    }
  }

  /**
   * Reset to a commit
   */
  async reset(projectRoot: string, target: string = 'HEAD', mode: 'soft' | 'mixed' | 'hard' = 'mixed'): Promise<boolean> {
    try {
      await exec(`git reset --${mode} ${target}`, { cwd: projectRoot });
      return true;
    } catch (error: any) {
      this.logger.error(`Reset failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Stash changes
   */
  async stash(projectRoot: string, message?: string): Promise<boolean> {
    try {
      const cmd = message ? `git stash push -m "${message}"` : 'git stash';
      await exec(cmd, { cwd: projectRoot });
      return true;
    } catch (error: any) {
      this.logger.error(`Stash failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Pop stash
   */
  async stashPop(projectRoot: string): Promise<boolean> {
    try {
      await exec('git stash pop', { cwd: projectRoot });
      return true;
    } catch (error: any) {
      this.logger.error(`Stash pop failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Generate commit message using LLM (placeholder)
   */
  async generateCommitMessage(projectRoot: string): Promise<string> {
    const diff = await this.getDiff(projectRoot, true);
    if (!diff) {
      return 'Update files';
    }
    
    // Basic heuristic commit message
    const stats = await this.getDiffStats(projectRoot, true);
    
    if (stats.filesChanged === 1) {
      const status = await this.getStatus(projectRoot);
      const stagedFile = status.find(f => f.staged);
      if (stagedFile) {
        const action = stagedFile.status === 'added' ? 'Add' : 
                       stagedFile.status === 'deleted' ? 'Remove' : 'Update';
        return `${action} ${path.basename(stagedFile.path)}`;
      }
    }
    
    return `Update ${stats.filesChanged} files (+${stats.insertions} -${stats.deletions})`;
  }
}
