import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * Indexed file entry
 */
export interface IndexedFile {
  path: string;
  relativePath: string;
  language: string;
  size: number;
  hash: string;
  symbols: string[];
  lastModified: Date;
  lastIndexed: Date;
}

/**
 * File index for a project
 */
export interface FileIndex {
  projectId: string;
  projectRoot: string;
  files: Map<string, IndexedFile>;
  totalFiles: number;
  totalSymbols: number;
  lastUpdated: Date;
}

/**
 * Index options
 */
export interface IndexOptions {
  extensions?: string[];
  excludeDirs?: string[];
  maxFileSize?: number;
  extractSymbols?: boolean;
}

const DEFAULT_INDEX_OPTIONS: IndexOptions = {
  extensions: ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.java', '.rs'],
  excludeDirs: ['node_modules', '.git', 'dist', 'build', 'coverage', '__pycache__', '.next', '.cache'],
  maxFileSize: 1024 * 1024, // 1MB
  extractSymbols: true,
};

/**
 * Language detection from extension
 */
const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.py': 'python',
  '.go': 'go',
  '.java': 'java',
  '.rs': 'rust',
  '.c': 'c',
  '.cpp': 'cpp',
  '.h': 'c',
  '.hpp': 'cpp',
};

/**
 * File Indexer Service
 * 
 * Provides real-time file tree indexing for projects.
 * Extracts symbol information and maintains an up-to-date index.
 */
@Injectable()
export class FileIndexerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FileIndexerService.name);
  private indices: Map<string, FileIndex> = new Map();
  private watchIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    this.logger.log('FileIndexerService initialized');
  }

  async onModuleDestroy() {
    // Clean up watch intervals
    for (const interval of this.watchIntervals.values()) {
      clearInterval(interval);
    }
    this.watchIntervals.clear();
  }

  /**
   * Index a project directory
   */
  async indexProject(
    projectId: string,
    projectRoot: string,
    options: IndexOptions = {}
  ): Promise<FileIndex> {
    const opts = { ...DEFAULT_INDEX_OPTIONS, ...options };
    this.logger.log(`Indexing project: ${projectRoot}`);

    const files = new Map<string, IndexedFile>();
    await this.scanDirectory(projectRoot, projectRoot, files, opts);

    let totalSymbols = 0;
    for (const file of files.values()) {
      totalSymbols += file.symbols.length;
    }

    const index: FileIndex = {
      projectId,
      projectRoot,
      files,
      totalFiles: files.size,
      totalSymbols,
      lastUpdated: new Date(),
    };

    this.indices.set(projectId, index);
    this.logger.log(`Indexed ${files.size} files, ${totalSymbols} symbols`);

    return index;
  }

  /**
   * Update index for changed files
   */
  async updateIndex(
    projectId: string,
    changedPaths: string[]
  ): Promise<void> {
    const index = this.indices.get(projectId);
    if (!index) {
      this.logger.warn(`No index found for project: ${projectId}`);
      return;
    }

    for (const filePath of changedPaths) {
      try {
        const stats = await fs.stat(filePath);
        if (!stats.isFile()) continue;

        const content = await fs.readFile(filePath, 'utf-8');
        const hash = this.hashContent(content);

        const existing = index.files.get(filePath);
        if (existing && existing.hash === hash) {
          continue; // No changes
        }

        const ext = path.extname(filePath).toLowerCase();
        const language = EXTENSION_TO_LANGUAGE[ext] || 'unknown';
        const symbols = this.extractSymbols(content, language);

        index.files.set(filePath, {
          path: filePath,
          relativePath: path.relative(index.projectRoot, filePath),
          language,
          size: stats.size,
          hash,
          symbols,
          lastModified: stats.mtime,
          lastIndexed: new Date(),
        });

        this.logger.debug(`Updated index for: ${filePath}`);
      } catch (error) {
        // File might have been deleted
        index.files.delete(filePath);
      }
    }

    index.lastUpdated = new Date();
  }

  /**
   * Start watching a project for changes
   */
  startWatching(projectId: string, intervalMs: number = 5000): void {
    if (this.watchIntervals.has(projectId)) {
      return;
    }

    const index = this.indices.get(projectId);
    if (!index) {
      this.logger.warn(`Cannot watch: no index for project ${projectId}`);
      return;
    }

    // Simple polling-based watch (could be replaced with fs.watch for better performance)
    const interval = setInterval(async () => {
      try {
        const changedFiles = await this.detectChanges(index);
        if (changedFiles.length > 0) {
          await this.updateIndex(projectId, changedFiles);
          this.logger.debug(`Updated ${changedFiles.length} files`);
        }
      } catch (error) {
        this.logger.error(`Watch error for ${projectId}`, error);
      }
    }, intervalMs);

    this.watchIntervals.set(projectId, interval);
    this.logger.log(`Started watching project: ${projectId}`);
  }

  /**
   * Stop watching a project
   */
  stopWatching(projectId: string): void {
    const interval = this.watchIntervals.get(projectId);
    if (interval) {
      clearInterval(interval);
      this.watchIntervals.delete(projectId);
      this.logger.log(`Stopped watching project: ${projectId}`);
    }
  }

  /**
   * Get files relevant to a query
   */
  async getRelevantFiles(
    projectId: string,
    query: string,
    limit: number = 10
  ): Promise<IndexedFile[]> {
    const index = this.indices.get(projectId);
    if (!index) return [];

    const queryTerms = query.toLowerCase().split(/\s+/);
    const scored: { file: IndexedFile; score: number }[] = [];

    for (const file of index.files.values()) {
      let score = 0;

      // Match in file path
      for (const term of queryTerms) {
        if (file.relativePath.toLowerCase().includes(term)) {
          score += 10;
        }
      }

      // Match in symbols
      for (const symbol of file.symbols) {
        const symbolLower = symbol.toLowerCase();
        for (const term of queryTerms) {
          if (symbolLower.includes(term)) {
            score += 5;
          }
          // Exact match bonus
          if (symbolLower === term) {
            score += 15;
          }
        }
      }

      if (score > 0) {
        scored.push({ file, score });
      }
    }

    // Sort by score and return top results
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map(s => s.file);
  }

  /**
   * Get file by symbol name
   */
  findFileBySymbol(projectId: string, symbolName: string): IndexedFile | undefined {
    const index = this.indices.get(projectId);
    if (!index) return undefined;

    for (const file of index.files.values()) {
      if (file.symbols.includes(symbolName)) {
        return file;
      }
    }
    return undefined;
  }

  /**
   * Get all symbols in a project
   */
  getAllSymbols(projectId: string): { symbol: string; file: string }[] {
    const index = this.indices.get(projectId);
    if (!index) return [];

    const result: { symbol: string; file: string }[] = [];
    for (const file of index.files.values()) {
      for (const symbol of file.symbols) {
        result.push({ symbol, file: file.relativePath });
      }
    }
    return result;
  }

  /**
   * Get index for a project
   */
  getIndex(projectId: string): FileIndex | undefined {
    return this.indices.get(projectId);
  }

  // Private methods

  private async scanDirectory(
    rootPath: string,
    currentPath: string,
    files: Map<string, IndexedFile>,
    options: IndexOptions
  ): Promise<void> {
    try {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);

        if (entry.isDirectory()) {
          if (options.excludeDirs?.includes(entry.name)) continue;
          await this.scanDirectory(rootPath, fullPath, files, options);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (options.extensions && !options.extensions.includes(ext)) continue;

          const stats = await fs.stat(fullPath);
          if (options.maxFileSize && stats.size > options.maxFileSize) continue;

          const content = await fs.readFile(fullPath, 'utf-8');
          const language = EXTENSION_TO_LANGUAGE[ext] || 'unknown';
          const symbols = options.extractSymbols 
            ? this.extractSymbols(content, language)
            : [];

          files.set(fullPath, {
            path: fullPath,
            relativePath: path.relative(rootPath, fullPath),
            language,
            size: stats.size,
            hash: this.hashContent(content),
            symbols,
            lastModified: stats.mtime,
            lastIndexed: new Date(),
          });
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to scan directory: ${currentPath}`);
    }
  }

  private extractSymbols(content: string, language: string): string[] {
    const symbols: string[] = [];

    // Simple regex-based extraction (in production, use AST)
    const patterns: RegExp[] = [];

    if (['typescript', 'javascript'].includes(language)) {
      patterns.push(
        /(?:export\s+)?(?:async\s+)?function\s+(\w+)/g,
        /(?:export\s+)?class\s+(\w+)/g,
        /(?:export\s+)?interface\s+(\w+)/g,
        /(?:export\s+)?type\s+(\w+)/g,
        /(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=/g,
      );
    } else if (language === 'python') {
      patterns.push(
        /^def\s+(\w+)/gm,
        /^class\s+(\w+)/gm,
      );
    } else if (language === 'go') {
      patterns.push(
        /^func\s+(?:\(\w+\s+\*?\w+\)\s+)?(\w+)/gm,
        /^type\s+(\w+)\s+(?:struct|interface)/gm,
      );
    }

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        if (match[1] && !symbols.includes(match[1])) {
          symbols.push(match[1]);
        }
      }
    }

    return symbols;
  }

  private hashContent(content: string): string {
    return crypto.createHash('md5').update(content).digest('hex');
  }

  private async detectChanges(index: FileIndex): Promise<string[]> {
    const changed: string[] = [];

    for (const [filePath, file] of index.files) {
      try {
        const stats = await fs.stat(filePath);
        if (stats.mtime > file.lastIndexed) {
          changed.push(filePath);
        }
      } catch {
        // File deleted
        changed.push(filePath);
      }
    }

    return changed;
  }
}
