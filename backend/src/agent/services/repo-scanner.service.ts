import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * File metadata for scanned files
 */
export interface FileMetadata {
  path: string;
  relativePath: string;
  size: number;
  extension: string;
  language: string;
  lastModified: Date;
}

/**
 * Scan result containing all project files
 */
export interface ScanResult {
  projectId: string;
  projectPath: string;
  files: FileMetadata[];
  totalFiles: number;
  totalSize: number;
  languages: Record<string, number>;
  scannedAt: Date;
}

/**
 * Scan options
 */
export interface ScanOptions {
  /** File extensions to include (e.g., ['.ts', '.js']) */
  extensions?: string[];
  
  /** Directories to exclude */
  excludeDirs?: string[];
  
  /** Maximum file size in bytes */
  maxFileSize?: number;
  
  /** Maximum depth to scan */
  maxDepth?: number;
}

const DEFAULT_SCAN_OPTIONS: ScanOptions = {
  extensions: ['.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.go', '.rs'],
  excludeDirs: ['node_modules', '.git', 'dist', 'build', 'coverage', '__pycache__', '.next'],
  maxFileSize: 1024 * 1024, // 1MB
  maxDepth: 20,
};

/**
 * Language detection from file extension
 */
const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.mts': 'typescript',
  '.cts': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.py': 'python',
  '.pyi': 'python',
  '.java': 'java',
  '.go': 'go',
  '.rs': 'rust',
  '.cpp': 'cpp',
  '.c': 'c',
  '.h': 'c',
  '.hpp': 'cpp',
  '.cs': 'csharp',
  '.rb': 'ruby',
  '.php': 'php',
  '.swift': 'swift',
  '.kt': 'kotlin',
  '.scala': 'scala',
};

/**
 * Repository Scanner Service
 * 
 * Scans project directories to collect file metadata and
 * prepare for AST analysis.
 */
@Injectable()
export class RepoScannerService {
  private readonly logger = new Logger(RepoScannerService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Scan a project directory
   */
  async scanProject(
    projectId: string,
    projectPath: string,
    options: ScanOptions = {}
  ): Promise<ScanResult> {
    const opts = { ...DEFAULT_SCAN_OPTIONS, ...options };
    
    this.logger.log(`Scanning project: ${projectPath}`);
    
    const files: FileMetadata[] = [];
    const languages: Record<string, number> = {};
    
    await this.scanDirectory(projectPath, projectPath, files, opts, 0);
    
    // Calculate language statistics
    let totalSize = 0;
    for (const file of files) {
      totalSize += file.size;
      languages[file.language] = (languages[file.language] || 0) + 1;
    }
    
    const result: ScanResult = {
      projectId,
      projectPath,
      files,
      totalFiles: files.length,
      totalSize,
      languages,
      scannedAt: new Date(),
    };
    
    this.logger.log(`Scan complete: ${files.length} files, ${Object.keys(languages).length} languages`);
    
    return result;
  }

  /**
   * Get files by language
   */
  async getFilesByLanguage(
    scanResult: ScanResult,
    language: string
  ): Promise<FileMetadata[]> {
    return scanResult.files.filter(f => f.language === language);
  }

  /**
   * Read file content
   */
  async readFile(filePath: string): Promise<string> {
    return fs.readFile(filePath, 'utf-8');
  }

  /**
   * Read multiple files
   */
  async readFiles(filePaths: string[]): Promise<Map<string, string>> {
    const contents = new Map<string, string>();
    
    await Promise.all(
      filePaths.map(async (filePath) => {
        try {
          const content = await this.readFile(filePath);
          contents.set(filePath, content);
        } catch (error) {
          this.logger.warn(`Failed to read file: ${filePath}`);
        }
      })
    );
    
    return contents;
  }

  /**
   * Scan directory recursively
   */
  private async scanDirectory(
    rootPath: string,
    currentPath: string,
    files: FileMetadata[],
    options: ScanOptions,
    depth: number
  ): Promise<void> {
    if (options.maxDepth && depth > options.maxDepth) return;
    
    try {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        
        if (entry.isDirectory()) {
          // Check exclude list
          if (options.excludeDirs?.includes(entry.name)) continue;
          
          await this.scanDirectory(rootPath, fullPath, files, options, depth + 1);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          
          // Check extension filter
          if (options.extensions && !options.extensions.includes(ext)) continue;
          
          // Get file stats
          const stats = await fs.stat(fullPath);
          
          // Check file size
          if (options.maxFileSize && stats.size > options.maxFileSize) continue;
          
          const language = EXTENSION_TO_LANGUAGE[ext] || 'unknown';
          
          files.push({
            path: fullPath,
            relativePath: path.relative(rootPath, fullPath),
            size: stats.size,
            extension: ext,
            language,
            lastModified: stats.mtime,
          });
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to scan directory: ${currentPath}`);
    }
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): string[] {
    return [...new Set(Object.values(EXTENSION_TO_LANGUAGE))];
  }

  /**
   * Check if a file extension is supported
   */
  isSupported(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return ext in EXTENSION_TO_LANGUAGE;
  }
}
