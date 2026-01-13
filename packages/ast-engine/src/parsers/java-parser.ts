import { BaseParser } from './base-parser';
import { ASTNode, ParsedFile, Location } from '../types/ast-node';
import { ExtractedSymbol, ImportInfo, ExportInfo } from '../types/parser';
import { v4 as uuidv4 } from 'uuid';

/**
 * Java AST Parser
 * 
 * Uses regex-based parsing for Java code.
 */
export class JavaParser extends BaseParser {
  readonly language = 'java';
  readonly extensions = ['.java'];

  async parse(source: string, filePath: string): Promise<ParsedFile> {
    const lines = source.split('\n');
    const children: ASTNode[] = [];
    
    // Parse package
    const packageNode = this.parsePackage(source, lines);
    if (packageNode) children.push(packageNode);
    
    // Parse imports
    const importNodes = this.parseImportNodes(source, lines);
    children.push(...importNodes);
    
    // Parse classes and interfaces
    const classNodes = this.parseClasses(source, lines);
    children.push(...classNodes);
    
    // Parse interfaces
    const interfaceNodes = this.parseInterfaces(source, lines);
    children.push(...interfaceNodes);

    const root: ASTNode = {
      id: uuidv4(),
      type: 'program',
      name: this.getFileName(filePath),
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
    if (['class', 'interface', 'method'].includes(node.type) && node.name) {
      symbols.push({
        name: node.name,
        type: node.type as ExtractedSymbol['type'],
        location: node.location,
        visibility: node.metadata?.visibility as ExtractedSymbol['visibility'] || 'package',
        exported: node.metadata?.visibility === 'public',
        static: node.metadata?.static as boolean,
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
        const match = child.text.match(/import\s+(?:static\s+)?([\w.]+(?:\.\*)?);/);
        if (match) {
          const source = match[1];
          const isWildcard = source.endsWith('.*');
          const parts = source.split('.');
          
          imports.push({
            source: isWildcard ? source.slice(0, -2) : source,
            imports: isWildcard 
              ? [] 
              : [{ name: parts[parts.length - 1], isDefault: false }],
            location: child.location,
          });
        }
      }
    }
    
    return imports;
  }

  extractExports(root: ASTNode): ExportInfo[] {
    // Java public classes/interfaces are effectively exports
    const exports: ExportInfo[] = [];
    
    for (const child of root.children) {
      if ((child.type === 'class' || child.type === 'interface') && child.name) {
        if (child.metadata?.visibility === 'public') {
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
    const match = source.match(/package\s+([\w.]+)\s*;/);
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
    const importRegex = /import\s+(?:static\s+)?([\w.]+(?:\.\*)?)\s*;/g;
    
    let match;
    while ((match = importRegex.exec(source)) !== null) {
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
    
    return nodes;
  }

  private parseClasses(source: string, lines: string[]): ASTNode[] {
    const nodes: ASTNode[] = [];
    const classRegex = /(public|private|protected)?\s*(abstract|final)?\s*class\s+(\w+)(?:<[^>]+>)?(?:\s+extends\s+(\w+))?(?:\s+implements\s+([\w,\s]+))?\s*\{/g;
    
    let match;
    while ((match = classRegex.exec(source)) !== null) {
      const visibility = match[1] || 'package';
      const modifiers = match[2];
      const name = match[3];
      const extendsClass = match[4];
      const implementsInterfaces = match[5]?.split(',').map(s => s.trim());
      
      const startLine = this.getLineNumber(source, match.index);
      const endLine = this.findBlockEnd(source, match.index + match[0].length - 1);
      
      const classNode: ASTNode = {
        id: uuidv4(),
        type: 'class',
        name,
        location: this.createLocationFromLines(source, lines, startLine, endLine),
        children: [],
        metadata: {
          visibility,
          abstract: modifiers === 'abstract',
          final: modifiers === 'final',
          extends: extendsClass,
          implements: implementsInterfaces,
        },
      };
      
      // Parse methods and fields within class
      const classBody = this.extractBlock(source, match.index + match[0].length - 1);
      classNode.children = this.parseMethods(classBody, startLine);
      
      nodes.push(classNode);
    }
    
    return nodes;
  }

  private parseInterfaces(source: string, lines: string[]): ASTNode[] {
    const nodes: ASTNode[] = [];
    const interfaceRegex = /(public)?\s*interface\s+(\w+)(?:<[^>]+>)?(?:\s+extends\s+([\w,\s]+))?\s*\{/g;
    
    let match;
    while ((match = interfaceRegex.exec(source)) !== null) {
      const visibility = match[1] || 'package';
      const name = match[2];
      const extendsInterfaces = match[3]?.split(',').map(s => s.trim());
      
      const startLine = this.getLineNumber(source, match.index);
      const endLine = this.findBlockEnd(source, match.index + match[0].length - 1);
      
      nodes.push({
        id: uuidv4(),
        type: 'interface',
        name,
        location: this.createLocationFromLines(source, lines, startLine, endLine),
        children: [],
        metadata: {
          visibility,
          extends: extendsInterfaces,
        },
      });
    }
    
    return nodes;
  }

  private parseMethods(classBody: string, classStartLine: number): ASTNode[] {
    const nodes: ASTNode[] = [];
    const methodRegex = /(public|private|protected)?\s*(static)?\s*(abstract)?\s*([\w<>\[\],\s]+)\s+(\w+)\s*\(([^)]*)\)\s*(?:throws\s+[\w,\s]+)?\s*[{;]/g;
    
    let match;
    while ((match = methodRegex.exec(classBody)) !== null) {
      const visibility = match[1] || 'package';
      const isStatic = !!match[2];
      const isAbstract = !!match[3];
      const returnType = match[4].trim();
      const name = match[5];
      const params = match[6];
      
      // Skip if it looks like a constructor (return type = name)
      if (returnType === name) continue;
      
      const lineOffset = classBody.slice(0, match.index).split('\n').length - 1;
      
      nodes.push({
        id: uuidv4(),
        type: 'method',
        name,
        location: {
          startLine: classStartLine + lineOffset,
          endLine: classStartLine + lineOffset,
          startColumn: 0,
          endColumn: match[0].length,
          startIndex: match.index,
          endIndex: match.index + match[0].length,
        },
        children: [],
        metadata: {
          visibility,
          static: isStatic,
          abstract: isAbstract,
          returnType,
          parameters: this.parseParameters(params),
        },
      });
    }
    
    return nodes;
  }

  private parseParameters(params: string): { name: string; type: string }[] {
    if (!params.trim()) return [];
    
    return params.split(',').map(p => {
      const parts = p.trim().split(/\s+/);
      if (parts.length >= 2) {
        const name = parts[parts.length - 1];
        const type = parts.slice(0, -1).join(' ');
        return { name, type };
      }
      return { name: p.trim(), type: 'Object' };
    });
  }

  private getFileName(filePath: string): string {
    const parts = filePath.replace(/\\/g, '/').split('/');
    return parts[parts.length - 1].replace(/\.java$/, '');
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

  private extractBlock(source: string, openBraceIndex: number): string {
    let depth = 1;
    let i = openBraceIndex + 1;
    
    while (i < source.length && depth > 0) {
      if (source[i] === '{') depth++;
      else if (source[i] === '}') depth--;
      i++;
    }
    
    return source.slice(openBraceIndex + 1, i - 1);
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
