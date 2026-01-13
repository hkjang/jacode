import { BaseParser } from './base-parser';
import { ASTNode, ParsedFile, Location } from '../types/ast-node';
import { ExtractedSymbol, ImportInfo, ExportInfo } from '../types/parser';
import { v4 as uuidv4 } from 'uuid';

/**
 * Go AST Parser
 * 
 * Uses regex-based parsing for Go code.
 */
export class GoParser extends BaseParser {
  readonly language = 'go';
  readonly extensions = ['.go'];

  async parse(source: string, filePath: string): Promise<ParsedFile> {
    const lines = source.split('\n');
    const children: ASTNode[] = [];
    
    // Parse package
    const packageNode = this.parsePackage(source, lines);
    if (packageNode) children.push(packageNode);
    
    // Parse imports
    const importNodes = this.parseImportNodes(source, lines);
    children.push(...importNodes);
    
    // Parse types (structs, interfaces)
    const typeNodes = this.parseTypes(source, lines);
    children.push(...typeNodes);
    
    // Parse functions
    const funcNodes = this.parseFunctions(source, lines);
    children.push(...funcNodes);

    const root: ASTNode = {
      id: uuidv4(),
      type: 'program',
      name: this.getPackageName(source) || this.getFileName(filePath),
      location: {
        startLine: 1,
        endLine: lines.length,
        startColumn: 0,
        endColumn: lines[lines.length - 1]?.length || 0,
        startIndex: 0,
        endIndex: source.length,
      },
      children,
      text: source,
    };

    return {
      filePath,
      language: this.language,
      root,
      source,
      errors: [],
      parsedAt: new Date(),
    };
  }

  extractSymbols(root: ASTNode): ExtractedSymbol[] {
    const symbols: ExtractedSymbol[] = [];
    this.traverseForSymbols(root, symbols);
    return symbols;
  }

  serialize(node: ASTNode): string {
    if (node.text) return node.text;
    return '';
  }

  protected traverseForSymbols(node: ASTNode, symbols: ExtractedSymbol[]): void {
    if (['function', 'method', 'struct', 'interface'].includes(node.type) && node.name) {
      symbols.push({
        name: node.name,
        type: node.type as ExtractedSymbol['type'],
        location: node.location,
        visibility: this.isExported(node.name) ? 'public' : 'private',
        exported: this.isExported(node.name),
        parameters: node.metadata?.parameters as ExtractedSymbol['parameters'],
      });
    }
    
    for (const child of node.children) {
      this.traverseForSymbols(child, symbols);
    }
  }

  extractImports(root: ASTNode): ImportInfo[] {
    const imports: ImportInfo[] = [];
    
    for (const child of root.children) {
      if (child.type === 'import' && child.name) {
        imports.push({
          source: child.name,
          imports: [],
          location: child.location,
        });
      }
    }
    
    return imports;
  }

  extractExports(root: ASTNode): ExportInfo[] {
    // In Go, exported symbols start with uppercase
    const exports: ExportInfo[] = [];
    
    for (const child of root.children) {
      if (['function', 'type', 'struct', 'interface'].includes(child.type) && child.name) {
        if (this.isExported(child.name)) {
          exports.push({
            name: child.name,
            isDefault: false,
            isReExport: false,
            location: child.location,
          });
        }
      }
    }
    
    return exports;
  }

  private parsePackage(source: string, lines: string[]): ASTNode | null {
    const match = source.match(/package\s+(\w+)/);
    if (!match) return null;
    
    const startLine = this.getLineNumber(source, match.index!);
    
    return {
      id: uuidv4(),
      type: 'package',
      name: match[1],
      location: {
        startLine,
        endLine: startLine,
        startColumn: 0,
        endColumn: match[0].length,
        startIndex: match.index!,
        endIndex: match.index! + match[0].length,
      },
      children: [],
      text: match[0],
    };
  }

  private parseImportNodes(source: string, lines: string[]): ASTNode[] {
    const nodes: ASTNode[] = [];
    
    // Single import: import "fmt"
    const singleImportRegex = /import\s+"([^"]+)"/g;
    let match;
    while ((match = singleImportRegex.exec(source)) !== null) {
      const startLine = this.getLineNumber(source, match.index);
      nodes.push({
        id: uuidv4(),
        type: 'import',
        name: match[1],
        location: {
          startLine,
          endLine: startLine,
          startColumn: 0,
          endColumn: match[0].length,
          startIndex: match.index,
          endIndex: match.index + match[0].length,
        },
        children: [],
        text: match[0],
      });
    }
    
    // Multi import: import ( ... )
    const multiImportRegex = /import\s*\(([\s\S]*?)\)/g;
    while ((match = multiImportRegex.exec(source)) !== null) {
      const block = match[1];
      const importLines = block.split('\n');
      const baseStartLine = this.getLineNumber(source, match.index);
      
      for (let i = 0; i < importLines.length; i++) {
        const lineMatch = importLines[i].match(/"([^"]+)"/);
        if (lineMatch) {
          nodes.push({
            id: uuidv4(),
            type: 'import',
            name: lineMatch[1],
            location: {
              startLine: baseStartLine + i,
              endLine: baseStartLine + i,
              startColumn: 0,
              endColumn: importLines[i].length,
              startIndex: 0,
              endIndex: 0,
            },
            children: [],
            text: importLines[i].trim(),
          });
        }
      }
    }
    
    return nodes;
  }

  private parseTypes(source: string, lines: string[]): ASTNode[] {
    const nodes: ASTNode[] = [];
    
    // Struct types
    const structRegex = /type\s+(\w+)\s+struct\s*\{/g;
    let match;
    while ((match = structRegex.exec(source)) !== null) {
      const name = match[1];
      const startLine = this.getLineNumber(source, match.index);
      const endLine = this.findBlockEnd(source, match.index + match[0].length - 1);
      
      nodes.push({
        id: uuidv4(),
        type: 'struct',
        name,
        location: this.createLocationFromLines(source, lines, startLine, endLine),
        children: [],
        metadata: {
          exported: this.isExported(name),
        },
      });
    }
    
    // Interface types
    const interfaceRegex = /type\s+(\w+)\s+interface\s*\{/g;
    while ((match = interfaceRegex.exec(source)) !== null) {
      const name = match[1];
      const startLine = this.getLineNumber(source, match.index);
      const endLine = this.findBlockEnd(source, match.index + match[0].length - 1);
      
      nodes.push({
        id: uuidv4(),
        type: 'interface',
        name,
        location: this.createLocationFromLines(source, lines, startLine, endLine),
        children: [],
        metadata: {
          exported: this.isExported(name),
        },
      });
    }
    
    return nodes;
  }

  private parseFunctions(source: string, lines: string[]): ASTNode[] {
    const nodes: ASTNode[] = [];
    
    // Regular functions: func name(...)
    // Method functions: func (receiver) name(...)
    const funcRegex = /func\s+(?:\((\w+)\s+\*?(\w+)\)\s+)?(\w+)\s*\(([^)]*)\)(?:\s*\(([^)]*)\)|\s*([^{\n]+))?\s*\{/g;
    
    let match;
    while ((match = funcRegex.exec(source)) !== null) {
      const receiverName = match[1];
      const receiverType = match[2];
      const name = match[3];
      const params = match[4];
      const multiReturn = match[5];
      const singleReturn = match[6];
      
      const startLine = this.getLineNumber(source, match.index);
      const endLine = this.findBlockEnd(source, match.index + match[0].length - 1);
      
      const isMethod = !!receiverType;
      
      nodes.push({
        id: uuidv4(),
        type: isMethod ? 'method' : 'function',
        name,
        location: this.createLocationFromLines(source, lines, startLine, endLine),
        children: [],
        metadata: {
          exported: this.isExported(name),
          receiver: isMethod ? { name: receiverName, type: receiverType } : undefined,
          parameters: this.parseParameters(params),
          returnType: multiReturn?.trim() || singleReturn?.trim(),
        },
      });
    }
    
    return nodes;
  }

  private parseParameters(params: string): { name: string; type: string }[] {
    if (!params.trim()) return [];
    
    const result: { name: string; type: string }[] = [];
    const parts = params.split(',').map(p => p.trim());
    
    for (const part of parts) {
      const tokens = part.split(/\s+/);
      if (tokens.length >= 2) {
        const name = tokens[0];
        const type = tokens.slice(1).join(' ');
        result.push({ name, type });
      } else if (tokens.length === 1 && tokens[0]) {
        // Type only (for grouped params)
        result.push({ name: '', type: tokens[0] });
      }
    }
    
    return result;
  }

  private isExported(name: string): boolean {
    // Go exports symbols that start with uppercase
    return /^[A-Z]/.test(name);
  }

  private getPackageName(source: string): string | null {
    const match = source.match(/package\s+(\w+)/);
    return match ? match[1] : null;
  }

  private getFileName(filePath: string): string {
    const parts = filePath.replace(/\\/g, '/').split('/');
    return parts[parts.length - 1].replace(/\.go$/, '');
  }

  private getLineNumber(source: string, index: number): number {
    return source.slice(0, index).split('\n').length;
  }

  private findBlockEnd(source: string, openBraceIndex: number): number {
    let depth = 1;
    let i = openBraceIndex + 1;
    
    while (i < source.length && depth > 0) {
      if (source[i] === '{') depth++;
      else if (source[i] === '}') depth--;
      i++;
    }
    
    return source.slice(0, i).split('\n').length;
  }

  private createLocationFromLines(source: string, lines: string[], startLine: number, endLine: number): Location {
    let startIndex = 0;
    for (let i = 0; i < startLine - 1; i++) {
      startIndex += lines[i].length + 1;
    }
    
    let endIndex = startIndex;
    for (let i = startLine - 1; i < Math.min(endLine, lines.length); i++) {
      endIndex += lines[i].length + 1;
    }
    
    return {
      startLine,
      endLine,
      startColumn: 0,
      endColumn: lines[Math.min(endLine - 1, lines.length - 1)]?.length || 0,
      startIndex,
      endIndex,
    };
  }
}
