import { v4 as uuidv4 } from 'uuid';
import {
  ASTNode,
  ParsedFile,
  ParseError,
  Location,
  NodeType,
  getLanguageFromExtension,
} from '../types/ast-node';
import { Parser, ExtractedSymbol, ImportInfo, ExportInfo } from '../types/parser';

/**
 * Abstract base parser providing common functionality for all language parsers
 */
export abstract class BaseParser implements Parser {
  abstract readonly language: string;
  abstract readonly extensions: string[];

  /**
   * Parse source code into an AST - implemented by subclasses
   */
  abstract parse(source: string, filePath: string): Promise<ParsedFile>;

  /**
   * Serialize AST back to source code - implemented by subclasses
   */
  abstract serialize(node: ASTNode): string;

  /**
   * Check if this parser supports the given file
   */
  supports(filePath: string): boolean {
    const ext = '.' + filePath.split('.').pop()?.toLowerCase();
    return this.extensions.includes(ext);
  }

  /**
   * Create a new AST node with a unique ID
   */
  protected createNode(
    type: NodeType,
    location: Location,
    options: Partial<Omit<ASTNode, 'id' | 'type' | 'location'>> = {}
  ): ASTNode {
    return {
      id: uuidv4(),
      type,
      location,
      children: [],
      ...options,
    };
  }

  /**
   * Create a location from line/column info
   */
  protected createLocation(
    startLine: number,
    startColumn: number,
    endLine: number,
    endColumn: number,
    startIndex: number,
    endIndex: number
  ): Location {
    return {
      startLine,
      startColumn,
      endLine,
      endColumn,
      startIndex,
      endIndex,
    };
  }

  /**
   * Create a parse error
   */
  protected createError(
    message: string,
    location: Location,
    severity: 'error' | 'warning' = 'error'
  ): ParseError {
    return { message, location, severity };
  }

  /**
   * Extract all symbols from an AST
   */
  extractSymbols(root: ASTNode): ExtractedSymbol[] {
    const symbols: ExtractedSymbol[] = [];
    this.traverseForSymbols(root, symbols);
    return symbols;
  }

  /**
   * Extract all imports from an AST
   */
  abstract extractImports(root: ASTNode): ImportInfo[];

  /**
   * Extract all exports from an AST
   */
  abstract extractExports(root: ASTNode): ExportInfo[];

  /**
   * Traverse AST looking for symbols - implemented by subclasses
   */
  protected abstract traverseForSymbols(node: ASTNode, symbols: ExtractedSymbol[]): void;

  /**
   * Find a node by its ID
   */
  findNodeById(root: ASTNode, id: string): ASTNode | undefined {
    if (root.id === id) return root;
    
    for (const child of root.children) {
      const found = this.findNodeById(child, id);
      if (found) return found;
    }
    
    return undefined;
  }

  /**
   * Find nodes by type
   */
  findNodesByType(root: ASTNode, type: NodeType): ASTNode[] {
    const results: ASTNode[] = [];
    this.collectNodesByType(root, type, results);
    return results;
  }

  private collectNodesByType(node: ASTNode, type: NodeType, results: ASTNode[]): void {
    if (node.type === type) {
      results.push(node);
    }
    for (const child of node.children) {
      this.collectNodesByType(child, type, results);
    }
  }

  /**
   * Find a symbol by name
   */
  findSymbolByName(root: ASTNode, name: string): ASTNode | undefined {
    if (root.name === name) return root;
    
    for (const child of root.children) {
      const found = this.findSymbolByName(child, name);
      if (found) return found;
    }
    
    return undefined;
  }
}
