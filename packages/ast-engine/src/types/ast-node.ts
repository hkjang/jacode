/**
 * AST Node Location Information
 */
export interface Location {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
  startIndex: number;
  endIndex: number;
}

/**
 * AST Node Types supported by the engine
 */
export type NodeType =
  | 'program'
  | 'module'
  | 'function'
  | 'arrow_function'
  | 'method'
  | 'class'
  | 'interface'
  | 'type_alias'
  | 'variable'
  | 'parameter'
  | 'property'
  | 'import'
  | 'export'
  | 'call_expression'
  | 'block'
  | 'statement'
  | 'expression'
  | 'comment'
  | 'decorator'
  | 'struct'
  | 'package'
  | 'unknown';

/**
 * Abstract Syntax Tree Node
 */
export interface ASTNode {
  /** Unique identifier for this node */
  id: string;
  
  /** Type of the node */
  type: NodeType;
  
  /** Name of the node (for named nodes like functions, classes) */
  name?: string;
  
  /** Location in the source code */
  location: Location;
  
  /** Child nodes */
  children: ASTNode[];
  
  /** Parent node reference (set during tree traversal) */
  parent?: ASTNode;
  
  /** Raw text content of the node */
  text?: string;
  
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Parsed file result containing the AST and metadata
 */
export interface ParsedFile {
  /** Original file path */
  filePath: string;
  
  /** Programming language */
  language: string;
  
  /** Root AST node */
  root: ASTNode;
  
  /** Original source code */
  source: string;
  
  /** Parse errors if any */
  errors: ParseError[];
  
  /** Parse timestamp */
  parsedAt: Date;
}

/**
 * Parse error information
 */
export interface ParseError {
  message: string;
  location: Location;
  severity: 'error' | 'warning';
}

/**
 * Language file extensions mapping
 */
export const LANGUAGE_EXTENSIONS: Record<string, string[]> = {
  typescript: ['.ts', '.tsx', '.mts', '.cts'],
  javascript: ['.js', '.jsx', '.mjs', '.cjs'],
  python: ['.py', '.pyi'],
};

/**
 * Get language from file extension
 */
export function getLanguageFromExtension(filePath: string): string | undefined {
  const ext = '.' + filePath.split('.').pop()?.toLowerCase();
  
  for (const [language, extensions] of Object.entries(LANGUAGE_EXTENSIONS)) {
    if (extensions.includes(ext)) {
      return language;
    }
  }
  
  return undefined;
}
