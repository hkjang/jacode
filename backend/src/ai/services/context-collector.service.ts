import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface CodeContext {
  currentFile?: {
    path: string;
    content: string;
    language: string;
  };
  relatedFiles: {
    path: string;
    content: string;
    relation: 'import' | 'export' | 'reference';
  }[];
  projectStructure?: {
    name: string;
    directories: string[];
    technologies: string[];
  };
}

@Injectable()
export class ContextCollectorService {
  private readonly logger = new Logger(ContextCollectorService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Collect code context for AI generation
   */
  async collectContext(
    projectId: string,
    focusFilePath: string,
    options?: {
      includeRelatedFiles?: boolean;
      maxRelatedFiles?: number;
      includeProjectStructure?: boolean;
    }
  ): Promise<CodeContext> {
    const { 
      includeRelatedFiles = true, 
      maxRelatedFiles = 5,
      includeProjectStructure = true 
    } = options || {};

    // Get focus file
    const focusFile = await this.prisma.file.findFirst({
      where: { 
        projectId, 
        path: focusFilePath,
        isDirectory: false,
      },
    });

    if (!focusFile) {
      throw new Error(`File not found: ${focusFilePath}`);
    }

    const context: CodeContext = {
      currentFile: {
        path: focusFile.path,
        content: focusFile.content || '',
        language: this.detectLanguage(focusFile.extension),
      },
      relatedFiles: [],
    };

    // Collect related files
    if (includeRelatedFiles && focusFile.content) {
      context.relatedFiles = await this.findRelatedFiles(
        projectId,
        focusFile,
        maxRelatedFiles
      );
    }

    // Get project structure
    if (includeProjectStructure) {
      context.projectStructure = await this.getProjectStructure(projectId);
    }

    this.logger.debug(
      `Collected context for ${focusFilePath}: ${context.relatedFiles.length} related files`
    );

    return context;
  }

  /**
   * Find related files based on imports and references
   */
  private async findRelatedFiles(
    projectId: string,
    focusFile: any,
    maxFiles: number
  ): Promise<CodeContext['relatedFiles']> {
    const relatedFiles: CodeContext['relatedFiles'] = [];
    const content = focusFile.content || '';

    // Extract import statements
    const imports = this.extractImports(content, focusFile.extension);

    // Find imported files
    for (const importPath of imports.slice(0, maxFiles)) {
      const resolvedPath = this.resolveImportPath(focusFile.path, importPath);
      
      const file = await this.prisma.file.findFirst({
        where: {
          projectId,
          path: {
            contains: resolvedPath,
          },
          isDirectory: false,
        },
      });

      if (file && file.content) {
        relatedFiles.push({
          path: file.path,
          content: file.content.substring(0, 2000), // Limit content size
          relation: 'import',
        });

        if (relatedFiles.length >= maxFiles) break;
      }
    }

    return relatedFiles;
  }

  /**
   * Extract import statements from code
   */
  private extractImports(content: string, extension: string): string[] {
    const imports: string[] = [];

    if (extension === 'ts' || extension === 'tsx' || extension === 'js' || extension === 'jsx') {
      // Match: import ... from 'path'
      const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        imports.push(match[1]);
      }

      // Match: require('path')
      const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
      while ((match = requireRegex.exec(content)) !== null) {
        imports.push(match[1]);
      }
    } else if (extension === 'py') {
      // Match: import module or from module import ...
      const pythonImportRegex = /(?:from\s+(\S+)\s+)?import\s+(\S+)/g;
      let match;
      while ((match = pythonImportRegex.exec(content)) !== null) {
        imports.push(match[1] || match[2]);
      }
    } else if (extension === 'java') {
      // Match: import package.Class;
      const javaImportRegex = /import\s+([\w.]+);/g;
      let match;
      while ((match = javaImportRegex.exec(content)) !== null) {
        imports.push(match[1]);
      }
    }

    return [...new Set(imports)]; // Remove duplicates
  }

  /**
   * Resolve import path relative to current file
   */
  private resolveImportPath(currentFilePath: string, importPath: string): string {
    // Skip node_modules and absolute imports
    if (importPath.startsWith('.')) {
      const currentDir = currentFilePath.substring(0, currentFilePath.lastIndexOf('/'));
      
      // Normalize path
      let resolved = importPath.replace(/^\.\//, '');
      
      // Handle ../ 
      const upCount = (importPath.match(/\.\.\//g) || []).length;
      let dir = currentDir;
      for (let i = 0; i < upCount; i++) {
        dir = dir.substring(0, dir.lastIndexOf('/'));
      }
      
      resolved = importPath.replace(/\.\.\//g, '');
      return `${dir}/${resolved}`;
    }
    
    return importPath;
  }

  /**
   * Get project structure overview
   */
  public async getProjectStructure(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return undefined;
    }

    // Get all directories
    const directories = await this.prisma.file.findMany({
      where: {
        projectId,
        isDirectory: true,
      },
      select: {
        path: true,
      },
    });

    // Detect technologies from files
    const files = await this.prisma.file.findMany({
      where: { projectId },
      select: { extension: true, name: true },
    });

    const technologies = this.detectTechnologies(files);

    return {
      name: project.name,
      directories: directories.map(d => d.path),
      technologies,
    };
  }

  /**
   * Detect technologies used in project
   */
  private detectTechnologies(files: { name: string; extension: string }[]): string[] {
    const techs = new Set<string>();

    for (const file of files) {
      // Check package files
      if (file.name === 'package.json') techs.add('Node.js');
      if (file.name === 'requirements.txt') techs.add('Python');
      if (file.name === 'pom.xml') techs.add('Java/Maven');
      if (file.name === 'Cargo.toml') techs.add('Rust');
      if (file.name === 'go.mod') techs.add('Go');

      // Check by extension
      if (file.extension === 'tsx' || file.extension === 'jsx') techs.add('React');
      if (file.extension === 'vue') techs.add('Vue');
      if (file.extension === 'ts') techs.add('TypeScript');
      if (file.extension === 'py') techs.add('Python');
      if (file.extension === 'java') techs.add('Java');
      if (file.extension === 'rs') techs.add('Rust');
      if (file.extension === 'go') techs.add('Go');
    }

    return Array.from(techs);
  }

  /**
   * Detect language from file extension
   */
  private detectLanguage(extension: string): string {
    const languageMap: Record<string, string> = {
      ts: 'typescript',
      tsx: 'typescript',
      js: 'javascript',
      jsx: 'javascript',
      py: 'python',
      java: 'java',
      go: 'go',
      rs: 'rust',
      c: 'c',
      cpp: 'cpp',
      cs: 'csharp',
      rb: 'ruby',
      php: 'php',
    };

    return languageMap[extension] || 'plaintext';
  }

  /**
   * Search for relevant files based on a query
   */
  public async searchRelevantFiles(
    projectId: string,
    query: string,
    limit: number = 5
  ): Promise<{ path: string; content: string; score: number }[]> {
    if (!query || !query.trim()) {
      return [];
    }

    const keywords = query.trim().split(/\s+/).filter(k => k.length > 2);
    if (keywords.length === 0) return [];

    // Simple keyword search in path and content
    // We prioritize path matches
    const files = await this.prisma.file.findMany({
      where: {
        projectId,
        isDirectory: false,
        OR: [
          ...keywords.map(k => ({ path: { contains: k, mode: 'insensitive' as const } })),
          ...keywords.map(k => ({ content: { contains: k, mode: 'insensitive' as const } })),
        ],
      },
      select: {
        path: true,
        content: true,
      },
      take: 50, // Fetch more to rank
    });

    // Ranking Logic
    const rankedFiles = files.map(file => {
      let score = 0;
      const lowerPath = file.path.toLowerCase();
      const lowerContent = (file.content || '').toLowerCase();

      for (const keyword of keywords) {
        const lowerK = keyword.toLowerCase();
        // Path match is strong signal
        if (lowerPath.includes(lowerK)) score += 10;
        // Exact filename match is very strong
        if (lowerPath.endsWith(`/${lowerK}`) || lowerPath.endsWith(`\\${lowerK}`)) score += 20;
        
        // Content match
        const contentMatches = (lowerContent.match(new RegExp(lowerK.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
        score += Math.min(contentMatches, 5); // Cap content bonus
      }

      return { ...file, score, content: file.content || '' };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

    return rankedFiles;
  }

  /**
   * Get key configuration files for the project
   */
  public async getConfigurationFiles(projectId: string): Promise<{ path: string; content: string }[]> {
    const configPatterns = [
      'package.json', 'tsconfig.json', 'next.config.js', 'next.config.mjs',
      'vite.config.ts', 'webpack.config.js', 'tailwind.config.js', 'tailwind.config.ts',
      '.env.example', 'prisma/schema.prisma', 'requirements.txt', 'setup.py',
      'Cargo.toml', 'go.mod', 'pom.xml', 'build.gradle'
    ];

    const files = await this.prisma.file.findMany({
      where: {
        projectId,
        isDirectory: false,
        OR: configPatterns.map(p => ({ path: { endsWith: p } }))
      },
      select: { path: true, content: true },
      take: 10
    });

    return files.map(f => ({ path: f.path, content: f.content || '' }));
  }

  /**
   * Find files that import the given file (reverse dependencies)
   */
  public async findReverseDependencies(
    projectId: string,
    filePath: string,
    limit: number = 5
  ): Promise<{ path: string; content: string }[]> {
    const fileName = filePath.split('/').pop()?.replace(/\.\w+$/, '') || '';
    const dirPath = filePath.substring(0, filePath.lastIndexOf('/'));
    
    // Search for files that might import this file
    const searchPatterns = [
      fileName,                                    // Direct name match
      `./${fileName}`,                            // Relative import
      `from '${fileName}'`,                       // ES6 import
      `from "./${fileName}"`,                     // ES6 import with double quotes
      `require('${fileName}')`,                   // CommonJS
    ];

    const files = await this.prisma.file.findMany({
      where: {
        projectId,
        isDirectory: false,
        path: { not: filePath },
        OR: searchPatterns.map(p => ({ content: { contains: p } }))
      },
      select: { path: true, content: true },
      take: limit * 2
    });

    // Filter to only those that actually import this specific file
    const importers = files.filter(f => {
      const content = f.content || '';
      return content.includes(fileName) && (
        content.includes(`from '`) || 
        content.includes(`from "`) || 
        content.includes(`require(`)
      );
    }).slice(0, limit);

    return importers.map(f => ({ path: f.path, content: f.content || '' }));
  }

  /**
   * Find similar files by naming convention
   */
  private async findSimilarFiles(
    projectId: string,
    filePath: string,
    limit: number = 3
  ): Promise<{ path: string; content: string }[]> {
    const fileName = filePath.split('/').pop() || '';
    const baseName = fileName.replace(/\.\w+$/, '').replace(/\.(test|spec|stories|styles)$/, '');
    
    // Look for related files: .test.ts, .spec.ts, .stories.tsx, .styles.ts, etc.
    const files = await this.prisma.file.findMany({
      where: {
        projectId,
        isDirectory: false,
        path: { not: filePath },
        name: { contains: baseName }
      },
      select: { path: true, content: true },
      take: limit
    });

    return files.map(f => ({ path: f.path, content: f.content || '' }));
  }

  /**
   * MASTER METHOD: Gather strategic context for AI operations
   * Combines semantic search, import chains, config files, and reverse deps
   */
  public async gatherStrategicContext(
    projectId: string,
    query: string,
    focusFilePaths: string[] = [],
    options: {
      maxFiles?: number;
      maxTokensPerFile?: number;
      includeConfig?: boolean;
      includeImports?: boolean;
      includeReverseDeps?: boolean;
      includeSimilar?: boolean;
    } = {}
  ): Promise<{
    files: { path: string; content: string; source: 'focus' | 'import' | 'reverse' | 'search' | 'config' | 'similar'; score?: number }[];
    projectInfo: { name: string; technologies: string[] } | null;
    totalLines: number;
  }> {
    const {
      maxFiles = 10,
      maxTokensPerFile = 3000,
      includeConfig = true,
      includeImports = true,
      includeReverseDeps = true,
      includeSimilar = true,
    } = options;

    const collectedFiles: Map<string, { path: string; content: string; source: string; score?: number }> = new Map();
    const maxChars = maxTokensPerFile * 4; // Rough token estimate

    // 1. Focus files (highest priority)
    for (const focusPath of focusFilePaths) {
      const file = await this.prisma.file.findFirst({
        where: { projectId, path: focusPath, isDirectory: false }
      });
      if (file && file.content) {
        collectedFiles.set(file.path, {
          path: file.path,
          content: file.content.slice(0, maxChars),
          source: 'focus',
          score: 100
        });
      }
    }

    // 2. Semantic search based on query
    if (query) {
      const searchResults = await this.searchRelevantFiles(projectId, query, 5);
      for (const file of searchResults) {
        if (!collectedFiles.has(file.path)) {
          collectedFiles.set(file.path, {
            path: file.path,
            content: file.content.slice(0, maxChars),
            source: 'search',
            score: file.score
          });
        }
      }
    }

    // 3. Import chain analysis for focus files
    if (includeImports) {
      for (const focusPath of focusFilePaths) {
        try {
          const context = await this.collectContext(projectId, focusPath, { 
            includeRelatedFiles: true, 
            maxRelatedFiles: 3,
            includeProjectStructure: false 
          });
          for (const related of context.relatedFiles) {
            if (!collectedFiles.has(related.path)) {
              collectedFiles.set(related.path, {
                path: related.path,
                content: related.content.slice(0, maxChars),
                source: 'import',
                score: 50
              });
            }
          }
        } catch (e) {
          this.logger.warn(`Failed to get imports for ${focusPath}: ${e}`);
        }
      }
    }

    // 4. Reverse dependencies
    if (includeReverseDeps) {
      for (const focusPath of focusFilePaths.slice(0, 2)) { // Limit to first 2 focus files
        const reverseDeps = await this.findReverseDependencies(projectId, focusPath, 2);
        for (const file of reverseDeps) {
          if (!collectedFiles.has(file.path)) {
            collectedFiles.set(file.path, {
              path: file.path,
              content: file.content.slice(0, maxChars),
              source: 'reverse',
              score: 40
            });
          }
        }
      }
    }

    // 5. Similar files (test, spec, stories)
    if (includeSimilar) {
      for (const focusPath of focusFilePaths.slice(0, 1)) {
        const similar = await this.findSimilarFiles(projectId, focusPath, 2);
        for (const file of similar) {
          if (!collectedFiles.has(file.path)) {
            collectedFiles.set(file.path, {
              path: file.path,
              content: file.content.slice(0, maxChars),
              source: 'similar',
              score: 30
            });
          }
        }
      }
    }

    // 6. Configuration files
    if (includeConfig) {
      const configs = await this.getConfigurationFiles(projectId);
      for (const file of configs.slice(0, 3)) { // Limit config files
        if (!collectedFiles.has(file.path)) {
          collectedFiles.set(file.path, {
            path: file.path,
            content: file.content.slice(0, maxChars / 2), // Less for config
            source: 'config',
            score: 20
          });
        }
      }
    }

    // Sort by score and limit
    const sortedFiles = Array.from(collectedFiles.values())
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, maxFiles) as any[];

    // Get project info
    const projectInfo = await this.getProjectStructure(projectId);

    // Calculate total lines
    const totalLines = sortedFiles.reduce((acc, f) => acc + (f.content?.split('\n').length || 0), 0);

    this.logger.log(`Gathered strategic context: ${sortedFiles.length} files, ${totalLines} lines`);

    return {
      files: sortedFiles,
      projectInfo: projectInfo ? { name: projectInfo.name, technologies: projectInfo.technologies } : null,
      totalLines
    };
  }
}
