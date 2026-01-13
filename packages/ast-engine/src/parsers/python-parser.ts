import { BaseParser } from './base-parser';
import { ASTNode, ParsedFile, Location } from '../types/ast-node';
import { ExtractedSymbol, ImportInfo, ExportInfo } from '../types/parser';
import { v4 as uuidv4 } from 'uuid';

/**
 * Python AST Parser
 * 
 * Uses regex-based parsing for Python code.
 * Can be enhanced with tree-sitter-python for more accurate parsing.
 */
export class PythonParser extends BaseParser {
  readonly language = 'python';
  readonly extensions = ['.py', '.pyi'];

  async parse(source: string, filePath: string): Promise<ParsedFile> {
    const lines = source.split('\n');
    const children: ASTNode[] = [];
    
    // Parse classes
    const classNodes = this.parseClasses(source, lines);
    children.push(...classNodes);
    
    // Parse top-level functions
    const functionNodes = this.parseFunctions(source, lines);
    children.push(...functionNodes);
    
    // Parse imports
    const importNodes = this.parseImportNodes(source, lines);
    children.push(...importNodes);

    const root: ASTNode = {
      id: uuidv4(),
      type: 'module',
      name: this.getModuleName(filePath),
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
    // Basic serialization - reconstruct from text if available
    if (node.text) {
      return node.text;
    }
    // Otherwise return empty string (full serialization would require language-specific logic)
    return '';
  }

  protected traverseForSymbols(node: ASTNode, symbols: ExtractedSymbol[]): void {
    if (node.type === 'class' || node.type === 'function' || node.type === 'method') {
      symbols.push({
        name: node.name || '',
        type: node.type as ExtractedSymbol['type'],
        location: node.location,
        visibility: node.name?.startsWith('_') ? 'private' : 'public',
        exported: !node.name?.startsWith('_'),
        async: node.metadata?.async as boolean,
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
      if (child.type === 'import' && child.text) {
        // Parse "import x" or "from x import y"
        const fromMatch = child.text.match(/^from\s+([\w.]+)\s+import\s+(.+)/);
        const importMatch = child.text.match(/^import\s+(.+)/);
        
        if (fromMatch) {
          const module = fromMatch[1];
          const items = fromMatch[2].split(',').map(s => s.trim());
          for (const item of items) {
            const asMatch = item.match(/(\w+)\s+as\s+(\w+)/);
            imports.push({
              source: module,
              imports: asMatch 
                ? [{ name: asMatch[1], alias: asMatch[2], isDefault: false }]
                : [{ name: item, isDefault: false }],
              location: child.location,
            });
          }
        } else if (importMatch) {
          const modules = importMatch[1].split(',').map(s => s.trim());
          for (const mod of modules) {
            const asMatch = mod.match(/(\w+)\s+as\s+(\w+)/);
            imports.push({
              source: asMatch ? asMatch[1] : mod,
              imports: [],
              location: child.location,
            });
          }
        }
      }
    }
    
    return imports;
  }

  extractExports(root: ASTNode): ExportInfo[] {
    // Python doesn't have explicit exports, return public symbols
    const exports: ExportInfo[] = [];
    
    for (const child of root.children) {
      if ((child.type === 'class' || child.type === 'function') && child.name) {
        // Skip private symbols (starting with _)
        if (!child.name.startsWith('_')) {
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

  private parseClasses(source: string, lines: string[]): ASTNode[] {
    const nodes: ASTNode[] = [];
    const classRegex = /^class\s+(\w+)(?:\(([^)]*)\))?:/gm;
    
    let match;
    while ((match = classRegex.exec(source)) !== null) {
      const name = match[1];
      const bases = match[2]?.split(',').map(s => s.trim()).filter(Boolean) || [];
      const startIndex = match.index;
      const startLine = this.getLineNumber(source, startIndex);
      const endLine = this.findBlockEnd(lines, startLine - 1);
      
      const classNode: ASTNode = {
        id: uuidv4(),
        type: 'class',
        name,
        location: this.createLocationFromLines(source, lines, startLine, endLine),
        children: [],
        metadata: { bases },
      };
      
      // Parse methods within class
      const classBody = lines.slice(startLine - 1, endLine).join('\n');
      classNode.children = this.parseMethods(classBody, startLine);
      
      nodes.push(classNode);
    }
    
    return nodes;
  }

  private parseMethods(classBody: string, classStartLine: number): ASTNode[] {
    const nodes: ASTNode[] = [];
    const methodRegex = /^\s+def\s+(\w+)\s*\(([^)]*)\)(?:\s*->\s*([^:]+))?:/gm;
    
    let match;
    while ((match = methodRegex.exec(classBody)) !== null) {
      const name = match[1];
      const params = match[2];
      const returnType = match[3]?.trim();
      const lineOffset = classBody.slice(0, match.index).split('\n').length - 1;
      
      nodes.push({
        id: uuidv4(),
        type: 'method',
        name,
        location: {
          startLine: classStartLine + lineOffset,
          endLine: classStartLine + lineOffset, // Simplified
          startColumn: 0,
          endColumn: match[0].length,
          startIndex: match.index,
          endIndex: match.index + match[0].length,
        },
        children: [],
        metadata: {
          parameters: this.parseParameters(params),
          returnType,
          async: name.startsWith('async_') || classBody.slice(match.index - 10, match.index).includes('async'),
        },
      });
    }
    
    return nodes;
  }

  private parseFunctions(source: string, lines: string[]): ASTNode[] {
    const nodes: ASTNode[] = [];
    // Match only top-level functions (no indent)
    const funcRegex = /^(async\s+)?def\s+(\w+)\s*\(([^)]*)\)(?:\s*->\s*([^:]+))?:/gm;
    
    let match;
    while ((match = funcRegex.exec(source)) !== null) {
      const isAsync = !!match[1];
      const name = match[2];
      const params = match[3];
      const returnType = match[4]?.trim();
      const startLine = this.getLineNumber(source, match.index);
      const endLine = this.findBlockEnd(lines, startLine - 1);
      
      nodes.push({
        id: uuidv4(),
        type: 'function',
        name,
        location: this.createLocationFromLines(source, lines, startLine, endLine),
        children: [],
        metadata: {
          parameters: this.parseParameters(params),
          returnType,
          async: isAsync,
        },
      });
    }
    
    return nodes;
  }

  private parseImportNodes(source: string, lines: string[]): ASTNode[] {
    const nodes: ASTNode[] = [];
    const importRegex = /^(?:from\s+[\w.]+\s+)?import\s+.+/gm;
    
    let match;
    while ((match = importRegex.exec(source)) !== null) {
      const startLine = this.getLineNumber(source, match.index);
      
      nodes.push({
        id: uuidv4(),
        type: 'import',
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
    
    return nodes;
  }

  private parseParameters(params: string): { name: string; type?: string; default?: string }[] {
    if (!params.trim()) return [];
    
    return params.split(',').map(p => {
      const parts = p.trim();
      const typeMatch = parts.match(/(\w+)\s*:\s*([^=]+)(?:=(.+))?/);
      const defaultMatch = parts.match(/(\w+)\s*=\s*(.+)/);
      
      if (typeMatch) {
        return {
          name: typeMatch[1],
          type: typeMatch[2].trim(),
          default: typeMatch[3]?.trim(),
        };
      } else if (defaultMatch) {
        return {
          name: defaultMatch[1],
          default: defaultMatch[2].trim(),
        };
      }
      return { name: parts.split(':')[0].split('=')[0].trim() };
    }).filter(p => p.name && p.name !== 'self' && p.name !== 'cls');
  }


  private getModuleName(filePath: string): string {
    const parts = filePath.replace(/\\/g, '/').split('/');
    return parts[parts.length - 1].replace(/\.py[i]?$/, '');
  }

  private getLineNumber(source: string, index: number): number {
    return source.slice(0, index).split('\n').length;
  }

  private findBlockEnd(lines: string[], startLineIndex: number): number {
    const startIndent = this.getIndent(lines[startLineIndex]);
    
    for (let i = startLineIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim() === '') continue; // Skip empty lines
      
      const indent = this.getIndent(line);
      if (indent <= startIndent && line.trim() !== '') {
        return i; // Found a line with same or less indentation
      }
    }
    
    return lines.length;
  }

  private getIndent(line: string): number {
    const match = line.match(/^(\s*)/);
    return match ? match[1].length : 0;
  }

  private createLocationFromLines(source: string, lines: string[], startLine: number, endLine: number): Location {
    let startIndex = 0;
    for (let i = 0; i < startLine - 1; i++) {
      startIndex += lines[i].length + 1;
    }
    
    let endIndex = startIndex;
    for (let i = startLine - 1; i < endLine; i++) {
      endIndex += lines[i].length + 1;
    }
    
    return {
      startLine,
      endLine,
      startColumn: 0,
      endColumn: lines[endLine - 1]?.length || 0,
      startIndex,
      endIndex,
    };
  }
}
