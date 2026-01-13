import * as ts from 'typescript';
import { v4 as uuidv4 } from 'uuid';
import { BaseParser } from './base-parser';
import {
  ASTNode,
  ParsedFile,
  Location,
  NodeType,
} from '../types/ast-node';
import { ExtractedSymbol, ImportInfo, ExportInfo, ParameterInfo } from '../types/parser';

/**
 * TypeScript/JavaScript parser using the TypeScript Compiler API
 * 
 * Uses TypeScript's built-in parser instead of tree-sitter for better accuracy
 * with TypeScript-specific syntax and type information.
 */
export class TypeScriptParser extends BaseParser {
  readonly language = 'typescript';
  readonly extensions = ['.ts', '.tsx', '.js', '.jsx', '.mts', '.cts', '.mjs', '.cjs'];

  private sourceFile: ts.SourceFile | null = null;
  private source: string = '';

  async parse(source: string, filePath: string): Promise<ParsedFile> {
    this.source = source;
    this.sourceFile = ts.createSourceFile(
      filePath,
      source,
      ts.ScriptTarget.Latest,
      true, // setParentNodes
      this.getScriptKind(filePath)
    );

    const root = this.convertNode(this.sourceFile);
    
    return {
      filePath,
      language: this.language,
      root,
      source,
      errors: this.collectDiagnostics(this.sourceFile),
      parsedAt: new Date(),
    };
  }

  serialize(node: ASTNode): string {
    // For now, return the original text if available
    if (node.text !== undefined) {
      return node.text;
    }
    
    // If we have children, concatenate their serialized form
    if (node.children.length > 0) {
      return node.children.map(child => this.serialize(child)).join('');
    }
    
    return '';
  }

  private getScriptKind(filePath: string): ts.ScriptKind {
    const ext = filePath.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'ts':
      case 'mts':
      case 'cts':
        return ts.ScriptKind.TS;
      case 'tsx':
        return ts.ScriptKind.TSX;
      case 'jsx':
        return ts.ScriptKind.JSX;
      case 'js':
      case 'mjs':
      case 'cjs':
      default:
        return ts.ScriptKind.JS;
    }
  }

  private convertNode(node: ts.Node): ASTNode {
    const location = this.getLocation(node);
    const type = this.getNodeType(node);
    const name = this.getNodeName(node);

    const astNode: ASTNode = {
      id: uuidv4(),
      type,
      location,
      children: [],
      name,
      text: node.getText(this.sourceFile!),
      metadata: {
        tsKind: ts.SyntaxKind[node.kind],
      },
    };

    // Convert children
    node.forEachChild((child) => {
      const childNode = this.convertNode(child);
      childNode.parent = astNode;
      astNode.children.push(childNode);
    });

    return astNode;
  }

  private getLocation(node: ts.Node): Location {
    const sourceFile = this.sourceFile!;
    const start = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());

    return {
      startLine: start.line + 1,
      startColumn: start.character + 1,
      endLine: end.line + 1,
      endColumn: end.character + 1,
      startIndex: node.getStart(sourceFile),
      endIndex: node.getEnd(),
    };
  }

  private getNodeType(node: ts.Node): NodeType {
    switch (node.kind) {
      case ts.SyntaxKind.SourceFile:
        return 'program';
      case ts.SyntaxKind.ModuleDeclaration:
        return 'module';
      case ts.SyntaxKind.FunctionDeclaration:
      case ts.SyntaxKind.FunctionExpression:
        return 'function';
      case ts.SyntaxKind.ArrowFunction:
        return 'arrow_function';
      case ts.SyntaxKind.MethodDeclaration:
      case ts.SyntaxKind.MethodSignature:
        return 'method';
      case ts.SyntaxKind.ClassDeclaration:
      case ts.SyntaxKind.ClassExpression:
        return 'class';
      case ts.SyntaxKind.InterfaceDeclaration:
        return 'interface';
      case ts.SyntaxKind.TypeAliasDeclaration:
        return 'type_alias';
      case ts.SyntaxKind.VariableDeclaration:
      case ts.SyntaxKind.VariableStatement:
        return 'variable';
      case ts.SyntaxKind.Parameter:
        return 'parameter';
      case ts.SyntaxKind.PropertyDeclaration:
      case ts.SyntaxKind.PropertySignature:
        return 'property';
      case ts.SyntaxKind.ImportDeclaration:
        return 'import';
      case ts.SyntaxKind.ExportDeclaration:
      case ts.SyntaxKind.ExportAssignment:
        return 'export';
      case ts.SyntaxKind.CallExpression:
        return 'call_expression';
      case ts.SyntaxKind.Block:
        return 'block';
      case ts.SyntaxKind.Decorator:
        return 'decorator';
      default:
        if (ts.isStatement(node)) return 'statement';
        if (ts.isExpression(node)) return 'expression';
        return 'unknown';
    }
  }

  private getNodeName(node: ts.Node): string | undefined {
    if (ts.isFunctionDeclaration(node) || 
        ts.isClassDeclaration(node) || 
        ts.isInterfaceDeclaration(node) ||
        ts.isTypeAliasDeclaration(node) ||
        ts.isMethodDeclaration(node) ||
        ts.isPropertyDeclaration(node)) {
      return node.name?.getText(this.sourceFile!);
    }
    if (ts.isVariableDeclaration(node)) {
      return node.name.getText(this.sourceFile!);
    }
    return undefined;
  }

  private collectDiagnostics(sourceFile: ts.SourceFile): ParsedFile['errors'] {
    // Get syntactic diagnostics only (no type checking)
    const program = ts.createProgram([sourceFile.fileName], {
      noEmit: true,
      allowJs: true,
      checkJs: false,
    });
    
    // For now, return empty - we're only doing syntactic parsing
    return [];
  }

  extractImports(root: ASTNode): ImportInfo[] {
    const imports: ImportInfo[] = [];
    
    this.traverseNode(root, (node) => {
      if (node.type === 'import' && this.sourceFile) {
        const importInfo = this.parseImportNode(node);
        if (importInfo) {
          imports.push(importInfo);
        }
      }
    });
    
    return imports;
  }

  extractExports(root: ASTNode): ExportInfo[] {
    const exports: ExportInfo[] = [];
    
    this.traverseNode(root, (node) => {
      if (node.type === 'export') {
        const exportInfo = this.parseExportNode(node);
        if (exportInfo) {
          exports.push(...exportInfo);
        }
      }
    });
    
    return exports;
  }

  protected traverseForSymbols(node: ASTNode, symbols: ExtractedSymbol[]): void {
    const symbolTypes: NodeType[] = ['function', 'class', 'method', 'interface', 'type_alias', 'variable'];
    
    if (symbolTypes.includes(node.type) && node.name) {
      symbols.push(this.createSymbol(node));
    }
    
    for (const child of node.children) {
      this.traverseForSymbols(child, symbols);
    }
  }

  private createSymbol(node: ASTNode): ExtractedSymbol {
    const typeMap: Record<NodeType, ExtractedSymbol['type']> = {
      'function': 'function',
      'arrow_function': 'function',
      'class': 'class',
      'method': 'method',
      'interface': 'interface',
      'type_alias': 'type',
      'variable': 'variable',
      'program': 'variable',
      'module': 'variable',
      'parameter': 'variable',
      'property': 'variable',
      'import': 'import',
      'export': 'variable',
      'call_expression': 'variable',
      'block': 'variable',
      'statement': 'variable',
      'expression': 'variable',
      'comment': 'variable',
      'decorator': 'variable',
      'struct': 'struct',
      'package': 'package',
      'unknown': 'variable',
    };

    return {
      name: node.name!,
      type: typeMap[node.type] || 'variable',
      location: node.location,
      signature: this.extractSignature(node),
      exported: this.isExported(node),
      async: this.isAsync(node),
    };
  }

  private extractSignature(node: ASTNode): string | undefined {
    // Extract the first line or function signature from the text
    if (node.text) {
      const lines = node.text.split('\n');
      if (lines.length > 0) {
        const firstLine = lines[0].trim();
        // Remove body content
        const signaturePart = firstLine.replace(/\{.*$/, '').trim();
        return signaturePart;
      }
    }
    return undefined;
  }

  private isExported(node: ASTNode): boolean {
    if (node.text) {
      return node.text.trimStart().startsWith('export');
    }
    return false;
  }

  private isAsync(node: ASTNode): boolean {
    if (node.text) {
      return node.text.includes('async ');
    }
    return false;
  }

  private parseImportNode(node: ASTNode): ImportInfo | null {
    if (!node.text) return null;
    
    const match = node.text.match(/import\s+(?:type\s+)?(.+?)\s+from\s+['"](.+?)['"]/);
    if (!match) return null;
    
    const [, importPart, source] = match;
    const imports: ImportInfo['imports'] = [];
    
    // Parse default import
    const defaultMatch = importPart.match(/^(\w+)/);
    if (defaultMatch && !importPart.startsWith('{')) {
      imports.push({ name: defaultMatch[1], isDefault: true });
    }
    
    // Parse named imports
    const namedMatch = importPart.match(/\{(.+?)\}/);
    if (namedMatch) {
      const names = namedMatch[1].split(',').map(n => n.trim());
      for (const name of names) {
        const [originalName, alias] = name.split(/\s+as\s+/);
        imports.push({
          name: originalName.trim(),
          alias: alias?.trim(),
        });
      }
    }
    
    // Parse namespace import
    const namespaceMatch = importPart.match(/\*\s+as\s+(\w+)/);
    if (namespaceMatch) {
      imports.push({ name: namespaceMatch[1], isNamespace: true });
    }
    
    return {
      source,
      imports,
      location: node.location,
      isTypeOnly: node.text.includes('import type'),
    };
  }

  private parseExportNode(node: ASTNode): ExportInfo[] | null {
    if (!node.text) return null;
    
    const exports: ExportInfo[] = [];
    
    // Check for default export
    if (node.text.includes('export default')) {
      exports.push({
        name: 'default',
        isDefault: true,
        isReExport: false,
        location: node.location,
      });
    }
    
    // Check for named exports
    const namedMatch = node.text.match(/export\s+\{(.+?)\}/);
    if (namedMatch) {
      const names = namedMatch[1].split(',').map(n => n.trim());
      for (const name of names) {
        const [localName, exportedName] = name.split(/\s+as\s+/);
        exports.push({
          name: exportedName?.trim() || localName.trim(),
          localName: localName.trim(),
          isDefault: false,
          isReExport: false,
          location: node.location,
        });
      }
    }
    
    return exports.length > 0 ? exports : null;
  }

  private traverseNode(node: ASTNode, callback: (node: ASTNode) => void): void {
    callback(node);
    for (const child of node.children) {
      this.traverseNode(child, callback);
    }
  }
}
