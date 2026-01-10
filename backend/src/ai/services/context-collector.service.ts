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
  private async getProjectStructure(projectId: string) {
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
}
