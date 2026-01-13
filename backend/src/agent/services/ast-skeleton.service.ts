import { Injectable, Logger } from '@nestjs/common';

/**
 * AST Skeleton options
 */
export interface SkeletonOptions {
  includeSignatures: boolean;
  includeDocstrings: boolean;
  maxDepth: number;
  excludePrivate: boolean;
}

/**
 * Detailed symbol categories
 */
export type SymbolCategory = 
  | 'class'
  | 'interface'
  | 'type'
  | 'function'
  | 'method'
  | 'arrow_function'
  | 'api_endpoint'
  | 'decorator'
  | 'variable'
  | 'constant'
  | 'enum'
  | 'hook'
  | 'component'
  | 'unknown';

/**
 * Symbol skeleton for context optimization
 */
export interface SymbolSkeleton {
  name: string;
  type: string;
  category: SymbolCategory;
  signature?: string;
  docstring?: string;
  children?: SymbolSkeleton[];
  exported: boolean;
  decorators?: string[];
  httpMethod?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  route?: string;
  isAsync?: boolean;
  parameters?: string[];
}

/**
 * File skeleton result
 */
export interface FileSkeleton {
  filePath: string;
  language: string;
  symbols: SymbolSkeleton[];
  imports: string[];
  exports: string[];
  lineCount: number;
  tokenEstimate: number;
}

/**
 * AST Skeleton Service
 * 
 * Generates compact AST skeletons for LLM context optimization.
 * Uses regex-based parsing for simplicity and reliability.
 */
@Injectable()
export class ASTSkeletonService {
  private readonly logger = new Logger(ASTSkeletonService.name);

  /**
   * Generate skeleton from source code
   */
  async generateSkeleton(
    source: string,
    filePath: string,
    options: Partial<SkeletonOptions> = {}
  ): Promise<FileSkeleton> {
    const opts: SkeletonOptions = {
      includeSignatures: true,
      includeDocstrings: false,
      maxDepth: 3,
      excludePrivate: true,
      ...options,
    };

    const language = this.detectLanguage(filePath);
    const symbols = this.extractSymbolsFromSource(source, language, opts);
    const imports = this.extractImportsFromSource(source, language);
    const exports = this.extractExportsFromSource(source, language);
    const lines = source.split('\n');

    return {
      filePath,
      language,
      symbols,
      imports,
      exports,
      lineCount: lines.length,
      tokenEstimate: this.estimateTokens(symbols),
    };
  }

  /**
   * Detect language from file extension
   */
  private detectLanguage(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const langMap: Record<string, string> = {
      ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
      py: 'python', java: 'java', go: 'go', rs: 'rust', rb: 'ruby'
    };
    return langMap[ext || ''] || 'unknown';
  }

  /**
   * Extract symbols using regex patterns
   */
  private extractSymbolsFromSource(
    source: string, 
    language: string,
    opts: SkeletonOptions
  ): SymbolSkeleton[] {
    const symbols: SymbolSkeleton[] = [];
    const lines = source.split('\n');

    // TypeScript/JavaScript patterns
    if (language === 'typescript' || language === 'javascript') {
      // API Endpoints (NestJS decorators)
      const apiRegex = /@(Get|Post|Put|Delete|Patch)\s*\(['"`]([^'"`]+)['"`]\)\s*\n\s*(async\s+)?(\w+)\s*\(/gm;
      let match: RegExpExecArray | null;
      while ((match = apiRegex.exec(source)) !== null) {
        const httpMethod = match[1].toUpperCase() as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
        const route = match[2];
        const isAsync = !!match[3];
        const name = match[4];
        symbols.push({
          name,
          type: `${httpMethod} ${route}`,
          category: 'api_endpoint',
          exported: true,
          httpMethod,
          route,
          isAsync,
          decorators: [match[1]],
          signature: `@${match[1]}('${route}') ${isAsync ? 'async ' : ''}${name}(...)`,
        });
      }

      // React Hooks (useXxx pattern)
      const hookRegex = /^(\s*)(export\s+)?(const|function)\s+(use[A-Z]\w+)\s*[=:]/gm;
      while ((match = hookRegex.exec(source)) !== null) {
        const name = match[4];
        if (opts.excludePrivate && name.startsWith('_')) continue;
        symbols.push({
          name,
          type: 'hook',
          category: 'hook',
          exported: !!match[2],
          signature: match[0].trim(),
        });
      }

      // React Components (PascalCase functions returning JSX)
      const componentRegex = /^(\s*)(export\s+)?(const|function)\s+([A-Z][A-Za-z0-9]+)\s*[=:]\s*(React\.FC|FC|function|\()/gm;
      while ((match = componentRegex.exec(source)) !== null) {
        const name = match[4];
        // Skip if already detected as hook
        if (name.startsWith('use')) continue;
        if (opts.excludePrivate && name.startsWith('_')) continue;
        symbols.push({
          name,
          type: 'component',
          category: 'component',
          exported: !!match[2],
          signature: match[0].trim(),
        });
      }

      // Classes with decorators
      const decoratedClassRegex = /(@\w+\([^)]*\)\s*\n)+\s*(export\s+)?(abstract\s+)?class\s+(\w+)/gm;
      while ((match = decoratedClassRegex.exec(source)) !== null) {
        const name = match[4];
        if (opts.excludePrivate && name.startsWith('_')) continue;
        const decoratorMatches = match[0].match(/@(\w+)/g) || [];
        symbols.push({
          name,
          type: 'class',
          category: 'class',
          exported: !!match[2],
          signature: match[0].trim(),
          decorators: decoratorMatches.map(d => d.slice(1)),
        });
      }

      // Regular Classes
      const classRegex = /^(\s*)(export\s+)?(abstract\s+)?class\s+(\w+)/gm;
      while ((match = classRegex.exec(source)) !== null) {
        const name = match[4];
        if (opts.excludePrivate && name.startsWith('_')) continue;
        // Skip if already added as decorated class
        if (symbols.some(s => s.name === name && s.category === 'class')) continue;
        symbols.push({
          name,
          type: 'class',
          category: 'class',
          exported: !!match[2],
          signature: match[0].trim(),
        });
      }

      // Interfaces
      const interfaceRegex = /^(\s*)(export\s+)?interface\s+(\w+)/gm;
      while ((match = interfaceRegex.exec(source)) !== null) {
        const name = match[3];
        if (opts.excludePrivate && name.startsWith('_')) continue;
        symbols.push({
          name,
          type: 'interface',
          category: 'interface',
          exported: !!match[2],
          signature: match[0].trim(),
        });
      }

      // Type aliases
      const typeRegex = /^(\s*)(export\s+)?type\s+(\w+)\s*=/gm;
      while ((match = typeRegex.exec(source)) !== null) {
        const name = match[3];
        if (opts.excludePrivate && name.startsWith('_')) continue;
        symbols.push({
          name,
          type: 'type',
          category: 'type',
          exported: !!match[2],
          signature: match[0].trim(),
        });
      }

      // Enums
      const enumRegex = /^(\s*)(export\s+)?enum\s+(\w+)/gm;
      while ((match = enumRegex.exec(source)) !== null) {
        const name = match[3];
        if (opts.excludePrivate && name.startsWith('_')) continue;
        symbols.push({
          name,
          type: 'enum',
          category: 'enum',
          exported: !!match[2],
          signature: match[0].trim(),
        });
      }

      // Functions (excluding hooks and components)
      const funcRegex = /^(\s*)(export\s+)?(async\s+)?function\s+(\w+)\s*\([^)]*\)/gm;
      while ((match = funcRegex.exec(source)) !== null) {
        const name = match[4];
        if (opts.excludePrivate && name.startsWith('_')) continue;
        // Skip if already detected as hook or component
        if (symbols.some(s => s.name === name)) continue;
        symbols.push({
          name,
          type: 'function',
          category: 'function',
          exported: !!match[2],
          isAsync: !!match[3],
          signature: match[0].trim(),
        });
      }

      // Arrow functions (const name = async () => {})
      const arrowRegex = /^(\s*)(export\s+)?(const|let)\s+(\w+)\s*=\s*(async\s+)?\([^)]*\)\s*(:\s*\S+)?\s*=>/gm;
      while ((match = arrowRegex.exec(source)) !== null) {
        const name = match[4];
        if (opts.excludePrivate && name.startsWith('_')) continue;
        // Skip if already detected
        if (symbols.some(s => s.name === name)) continue;
        symbols.push({
          name,
          type: 'arrow_function',
          category: 'arrow_function',
          exported: !!match[2],
          isAsync: !!match[5],
          signature: match[0].replace('=>', '').trim(),
        });
      }

      // Constants (UPPER_CASE)
      const constRegex = /^(\s*)(export\s+)?const\s+([A-Z][A-Z0-9_]+)\s*=/gm;
      while ((match = constRegex.exec(source)) !== null) {
        const name = match[3];
        symbols.push({
          name,
          type: 'constant',
          category: 'constant',
          exported: !!match[2],
          signature: match[0].trim(),
        });
      }
    }

    // Python patterns
    if (language === 'python') {
      const classRegex = /^class\s+(\w+)/gm;
      let match: RegExpExecArray | null;
      while ((match = classRegex.exec(source)) !== null) {
        const name = match[1];
        if (opts.excludePrivate && name.startsWith('_')) continue;
        symbols.push({
          name,
          type: 'class',
          category: 'class',
          exported: !name.startsWith('_'),
          signature: match[0].trim(),
        });
      }

      const funcRegex = /^(async\s+)?def\s+(\w+)\s*\([^)]*\)/gm;
      while ((match = funcRegex.exec(source)) !== null) {
        const name = match[2];
        if (opts.excludePrivate && name.startsWith('_')) continue;
        symbols.push({
          name,
          type: 'function',
          category: 'function',
          exported: !name.startsWith('_'),
          isAsync: !!match[1],
          signature: match[0].trim(),
        });
      }
    }

    return symbols;
  }

  /**
   * Extract imports from source
   */
  private extractImportsFromSource(source: string, language: string): string[] {
    const imports: string[] = [];

    if (language === 'typescript' || language === 'javascript') {
      const importRegex = /import\s+.+\s+from\s+['"]([^'"]+)['"]/g;
      let match: RegExpExecArray | null;
      while ((match = importRegex.exec(source)) !== null) {
        imports.push(match[1]);
      }
    }

    if (language === 'python') {
      const importRegex = /^(?:from\s+(\S+)\s+import|import\s+(\S+))/gm;
      let match: RegExpExecArray | null;
      while ((match = importRegex.exec(source)) !== null) {
        imports.push(match[1] || match[2]);
      }
    }

    return [...new Set(imports)];
  }

  /**
   * Extract exports from source
   */
  private extractExportsFromSource(source: string, language: string): string[] {
    const exports: string[] = [];

    if (language === 'typescript' || language === 'javascript') {
      // Named exports
      const namedExportRegex = /export\s+(?:const|let|var|function|class|interface|type)\s+(\w+)/g;
      let match: RegExpExecArray | null;
      while ((match = namedExportRegex.exec(source)) !== null) {
        exports.push(match[1]);
      }

      // Default exports
      if (source.includes('export default')) {
        exports.push('default');
      }
    }

    return [...new Set(exports)];
  }

  /**
   * Estimate token count for skeleton
   */
  private estimateTokens(symbols: SymbolSkeleton[]): number {
    let charCount = 0;

    const countSymbol = (symbol: SymbolSkeleton) => {
      charCount += symbol.name.length;
      charCount += symbol.type.length;
      if (symbol.signature) charCount += symbol.signature.length;
      if (symbol.docstring) charCount += symbol.docstring.length;
      if (symbol.children) symbol.children.forEach(countSymbol);
    };

    symbols.forEach(countSymbol);
    
    // Rough estimate: ~4 chars per token
    return Math.ceil(charCount / 4);
  }

  /**
   * Format skeleton to compact string for LLM context
   */
  formatForContext(skeleton: FileSkeleton): string {
    const lines: string[] = [
      `// ${skeleton.filePath} (${skeleton.language}, ${skeleton.lineCount} lines)`,
    ];

    if (skeleton.imports.length > 0) {
      lines.push(`// Imports: ${skeleton.imports.slice(0, 5).join(', ')}${skeleton.imports.length > 5 ? '...' : ''}`);
    }

    const formatSymbol = (symbol: SymbolSkeleton, indent: string = '') => {
      const exportMark = symbol.exported ? 'export ' : '';
      if (symbol.signature) {
        lines.push(`${indent}${exportMark}${symbol.signature}`);
      } else {
        lines.push(`${indent}${exportMark}${symbol.type} ${symbol.name}`);
      }

      if (symbol.children) {
        for (const child of symbol.children) {
          formatSymbol(child, indent + '  ');
        }
      }
    };

    for (const symbol of skeleton.symbols) {
      formatSymbol(symbol);
    }

    return lines.join('\n');
  }
}
