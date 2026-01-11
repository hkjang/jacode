import { Tool, ToolResult, ToolContext, JSONSchema } from '../interfaces/tool.interface';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Code Analysis Tool
 * 
 * Analyzes code structure and dependencies:
 * - Find imports and exports
 * - Search for symbols (functions, classes)
 * - Analyze file dependencies
 * - Get file outline/structure
 */
export class CodeAnalysisTool implements Tool {
  name = 'code_analysis';
  description = `Analyze code structure and dependencies.
Use this tool when you need to:
- Find what a file imports or exports
- Search for function or class definitions
- Understand file dependencies
- Get an overview of a file's structure`;

  parameters: JSONSchema = {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        description: 'Analysis operation to perform',
        enum: ['imports', 'exports', 'symbols', 'outline', 'dependencies', 'search'],
      },
      path: {
        type: 'string',
        description: 'File path to analyze',
      },
      query: {
        type: 'string',
        description: 'Search query (for search operation)',
      },
    },
    required: ['operation'],
  };

  constructor(private readonly prisma: PrismaService) {}

  async execute(args: Record<string, any>, context: ToolContext): Promise<ToolResult> {
    const { operation, path: filePath, query } = args;

    try {
      switch (operation) {
        case 'imports':
          return await this.analyzeImports(filePath, context);
        case 'exports':
          return await this.analyzeExports(filePath, context);
        case 'symbols':
          return await this.findSymbols(filePath, context);
        case 'outline':
          return await this.getOutline(filePath, context);
        case 'dependencies':
          return await this.analyzeDependencies(filePath, context);
        case 'search':
          return await this.searchCode(query, context);
        default:
          return {
            success: false,
            output: '',
            error: `Unknown operation: ${operation}`,
          };
      }
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async analyzeImports(filePath: string, context: ToolContext): Promise<ToolResult> {
    const file = await this.getFile(filePath, context);
    if (!file) {
      return { success: false, output: '', error: `File not found: ${filePath}` };
    }

    const content = file.content || '';
    const imports = this.extractImports(content, file.extension);

    return {
      success: true,
      output: `Imports in ${filePath}:\n${imports.map(i => `- ${i.module}${i.names.length ? ` (${i.names.join(', ')})` : ''}`).join('\n')}`,
      data: { imports },
    };
  }

  private async analyzeExports(filePath: string, context: ToolContext): Promise<ToolResult> {
    const file = await this.getFile(filePath, context);
    if (!file) {
      return { success: false, output: '', error: `File not found: ${filePath}` };
    }

    const content = file.content || '';
    const exports = this.extractExports(content, file.extension);

    return {
      success: true,
      output: `Exports in ${filePath}:\n${exports.map(e => `- ${e.name} (${e.type})`).join('\n')}`,
      data: { exports },
    };
  }

  private async findSymbols(filePath: string, context: ToolContext): Promise<ToolResult> {
    const file = await this.getFile(filePath, context);
    if (!file) {
      return { success: false, output: '', error: `File not found: ${filePath}` };
    }

    const content = file.content || '';
    const symbols = this.extractSymbols(content, file.extension);

    const symbolList = symbols.map(s => `- ${s.type} ${s.name}${s.line ? ` (line ${s.line})` : ''}`).join('\n');

    return {
      success: true,
      output: `Symbols in ${filePath}:\n${symbolList}`,
      data: { symbols },
    };
  }

  private async getOutline(filePath: string, context: ToolContext): Promise<ToolResult> {
    const file = await this.getFile(filePath, context);
    if (!file) {
      return { success: false, output: '', error: `File not found: ${filePath}` };
    }

    const content = file.content || '';
    const outline = this.generateOutline(content, file.extension);

    return {
      success: true,
      output: `Outline of ${filePath}:\n${outline}`,
      data: { outline },
    };
  }

  private async analyzeDependencies(filePath: string, context: ToolContext): Promise<ToolResult> {
    const file = await this.getFile(filePath, context);
    if (!file) {
      return { success: false, output: '', error: `File not found: ${filePath}` };
    }

    const content = file.content || '';
    const imports = this.extractImports(content, file.extension);

    // Find local imports that exist in the project
    const localDeps: string[] = [];
    for (const imp of imports) {
      if (imp.module.startsWith('.') || imp.module.startsWith('@/')) {
        const depFile = await this.prisma.file.findFirst({
          where: {
            projectId: context.projectId,
            path: { contains: imp.module.replace(/^\.\/|^@\//, '') },
          },
        });
        if (depFile) {
          localDeps.push(depFile.path);
        }
      }
    }

    // Find reverse dependencies (files that import this file)
    const fileName = filePath.split('/').pop()?.replace(/\.[^.]+$/, '');
    const reverseDeps = await this.prisma.file.findMany({
      where: {
        projectId: context.projectId,
        content: { contains: fileName || '' },
      },
      select: { path: true },
      take: 20,
    });

    return {
      success: true,
      output: `Dependencies for ${filePath}:
Depends on:
${localDeps.map(d => `- ${d}`).join('\n') || '  (none)'}

Depended on by:
${reverseDeps.map(d => `- ${d.path}`).join('\n') || '  (none)'}`,
      data: { dependencies: localDeps, reverseDependencies: reverseDeps.map(d => d.path) },
    };
  }

  private async searchCode(query: string, context: ToolContext): Promise<ToolResult> {
    if (!query) {
      return { success: false, output: '', error: 'Query is required for search operation' };
    }

    const files = await this.prisma.file.findMany({
      where: {
        projectId: context.projectId,
        content: { contains: query },
      },
      select: { path: true, content: true },
      take: 10,
    });

    const results = files.map(file => {
      const content = file.content || '';
      const lines = content.split('\n');
      const matches = lines
        .map((line, index) => ({ line: index + 1, content: line }))
        .filter(l => l.content.includes(query))
        .slice(0, 3);

      return {
        path: file.path,
        matches: matches.map(m => `  Line ${m.line}: ${m.content.trim().substring(0, 100)}`).join('\n'),
      };
    });

    return {
      success: true,
      output: `Search results for "${query}":\n${results.map(r => `${r.path}:\n${r.matches}`).join('\n\n')}`,
      data: { results },
    };
  }

  private async getFile(filePath: string, context: ToolContext) {
    return this.prisma.file.findFirst({
      where: {
        projectId: context.projectId,
        path: filePath,
      },
    });
  }

  private extractImports(content: string, extension: string): Array<{ module: string; names: string[] }> {
    const imports: Array<{ module: string; names: string[] }> = [];
    
    // TypeScript/JavaScript imports
    if (['ts', 'tsx', 'js', 'jsx'].includes(extension)) {
      // Named imports: import { a, b } from 'module'
      const namedImportRegex = /import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g;
      let match;
      while ((match = namedImportRegex.exec(content)) !== null) {
        imports.push({
          module: match[2],
          names: match[1].split(',').map(n => n.trim().split(' as ')[0].trim()),
        });
      }

      // Default imports: import X from 'module'
      const defaultImportRegex = /import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g;
      while ((match = defaultImportRegex.exec(content)) !== null) {
        imports.push({ module: match[2], names: [match[1]] });
      }

      // Namespace imports: import * as X from 'module'
      const namespaceImportRegex = /import\s+\*\s+as\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g;
      while ((match = namespaceImportRegex.exec(content)) !== null) {
        imports.push({ module: match[2], names: [`* as ${match[1]}`] });
      }
    }

    // Python imports
    if (extension === 'py') {
      const pythonImportRegex = /(?:from\s+(\S+)\s+)?import\s+(.+)/g;
      let match;
      while ((match = pythonImportRegex.exec(content)) !== null) {
        imports.push({
          module: match[1] || match[2].split(',')[0].trim(),
          names: match[2].split(',').map(n => n.trim()),
        });
      }
    }

    return imports;
  }

  private extractExports(content: string, extension: string): Array<{ name: string; type: string }> {
    const exports: Array<{ name: string; type: string }> = [];

    if (['ts', 'tsx', 'js', 'jsx'].includes(extension)) {
      // Named exports: export const/function/class X
      const namedExportRegex = /export\s+(const|let|var|function|class|interface|type|enum)\s+(\w+)/g;
      let match;
      while ((match = namedExportRegex.exec(content)) !== null) {
        exports.push({ name: match[2], type: match[1] });
      }

      // Default export
      if (/export\s+default/.test(content)) {
        exports.push({ name: 'default', type: 'default' });
      }

      // Re-exports: export { X } from 'module'
      const reExportRegex = /export\s+\{([^}]+)\}\s+from/g;
      while ((match = reExportRegex.exec(content)) !== null) {
        const names = match[1].split(',').map(n => n.trim().split(' as ')[0].trim());
        names.forEach(n => exports.push({ name: n, type: 're-export' }));
      }
    }

    return exports;
  }

  private extractSymbols(content: string, extension: string): Array<{ name: string; type: string; line?: number }> {
    const symbols: Array<{ name: string; type: string; line?: number }> = [];
    const lines = content.split('\n');

    if (['ts', 'tsx', 'js', 'jsx'].includes(extension)) {
      lines.forEach((line, index) => {
        // Functions
        let match = line.match(/(?:export\s+)?(?:async\s+)?function\s+(\w+)/);
        if (match) symbols.push({ name: match[1], type: 'function', line: index + 1 });

        // Arrow functions assigned to const
        match = line.match(/(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?\(/);
        if (match) symbols.push({ name: match[1], type: 'function', line: index + 1 });

        // Classes
        match = line.match(/(?:export\s+)?class\s+(\w+)/);
        if (match) symbols.push({ name: match[1], type: 'class', line: index + 1 });

        // Interfaces
        match = line.match(/(?:export\s+)?interface\s+(\w+)/);
        if (match) symbols.push({ name: match[1], type: 'interface', line: index + 1 });

        // Types
        match = line.match(/(?:export\s+)?type\s+(\w+)/);
        if (match) symbols.push({ name: match[1], type: 'type', line: index + 1 });

        // Enums
        match = line.match(/(?:export\s+)?enum\s+(\w+)/);
        if (match) symbols.push({ name: match[1], type: 'enum', line: index + 1 });
      });
    }

    return symbols;
  }

  private generateOutline(content: string, extension: string): string {
    const symbols = this.extractSymbols(content, extension);
    const imports = this.extractImports(content, extension);
    const exports = this.extractExports(content, extension);

    let outline = '';

    if (imports.length > 0) {
      outline += `Imports (${imports.length}):\n`;
      outline += imports.slice(0, 5).map(i => `  - ${i.module}`).join('\n');
      if (imports.length > 5) outline += `\n  ... and ${imports.length - 5} more`;
      outline += '\n\n';
    }

    if (symbols.length > 0) {
      outline += `Symbols (${symbols.length}):\n`;
      outline += symbols.map(s => `  - ${s.type} ${s.name} (line ${s.line})`).join('\n');
      outline += '\n\n';
    }

    if (exports.length > 0) {
      outline += `Exports (${exports.length}):\n`;
      outline += exports.map(e => `  - ${e.name} (${e.type})`).join('\n');
    }

    return outline || 'No structure information available';
  }

  validate(args: Record<string, any>): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    if (!args.operation) {
      errors.push('operation is required');
    }

    if (['imports', 'exports', 'symbols', 'outline', 'dependencies'].includes(args.operation) && !args.path) {
      errors.push('path is required for this operation');
    }

    if (args.operation === 'search' && !args.query) {
      errors.push('query is required for search operation');
    }

    return { valid: errors.length === 0, errors };
  }
}
