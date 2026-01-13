import { Location } from '@jacode/ast-engine';

/**
 * Types of symbols that can be represented in the graph
 */
export type SymbolType =
  | 'function'
  | 'method'
  | 'class'
  | 'interface'
  | 'type'
  | 'variable'
  | 'constant'
  | 'module'
  | 'namespace'
  | 'property'
  | 'parameter';

/**
 * Visibility/access modifiers
 */
export type Visibility = 'public' | 'private' | 'protected' | 'internal' | 'package';

/**
 * A symbol node in the graph
 */
export interface SymbolNode {
  /** Unique identifier */
  id: string;
  
  /** Symbol type */
  type: SymbolType;
  
  /** Symbol name */
  name: string;
  
  /** Fully qualified name (e.g., "MyClass.myMethod") */
  qualifiedName: string;
  
  /** File path where the symbol is defined */
  filePath: string;
  
  /** Location in the source file */
  location: Location;
  
  /** Function/method signature */
  signature?: string;
  
  /** Documentation string */
  docstring?: string;
  
  /** Whether the symbol is exported */
  exported: boolean;
  
  /** Visibility modifier */
  visibility?: Visibility;
  
  /** Whether it's async (for functions/methods) */
  async?: boolean;
  
  /** Whether it's static (for class members) */
  static?: boolean;
  
  /** Generic type parameters */
  typeParameters?: string[];
  
  /** Return type (for functions/methods) */
  returnType?: string;
  
  /** Parameter count (for functions/methods) */
  parameterCount?: number;
  
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Types of relationships between symbols
 */
export type EdgeType =
  | 'calls'           // Function/method calls another
  | 'imports'         // Module imports from another
  | 'extends'         // Class extends another class
  | 'implements'      // Class implements an interface
  | 'uses'            // Symbol uses/references another
  | 'contains'        // Class/module contains a member
  | 'overrides'       // Method overrides parent method
  | 'decoratedBy'     // Symbol is decorated by a decorator
  | 'typeOf'          // Variable is of a certain type
  | 'returns'         // Function returns a type
  | 'parameterOf';    // Parameter belongs to a function

/**
 * An edge (relationship) between two symbols
 */
export interface SymbolEdge {
  /** Unique identifier */
  id: string;
  
  /** Source symbol ID */
  source: string;
  
  /** Target symbol ID */
  target: string;
  
  /** Type of relationship */
  type: EdgeType;
  
  /** Weight/importance of the relationship (1-10) */
  weight?: number;
  
  /** Line number where the relationship occurs */
  line?: number;
  
  /** Additional context or metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Statistics about the symbol graph
 */
export interface GraphStats {
  totalNodes: number;
  totalEdges: number;
  nodesByType: Record<SymbolType, number>;
  edgesByType: Record<EdgeType, number>;
  fileCount: number;
  exportedSymbols: number;
}

/**
 * File information in the graph
 */
export interface FileInfo {
  path: string;
  symbolCount: number;
  imports: string[];
  exports: string[];
  lastModified?: Date;
}

/**
 * Query options for searching the graph
 */
export interface QueryOptions {
  /** Filter by symbol type */
  types?: SymbolType[];
  
  /** Filter by file path (glob pattern) */
  filePath?: string;
  
  /** Filter exported only */
  exportedOnly?: boolean;
  
  /** Maximum results */
  limit?: number;
  
  /** Include edges */
  includeEdges?: boolean;
}

/**
 * Query result
 */
export interface QueryResult {
  nodes: SymbolNode[];
  edges?: SymbolEdge[];
  totalCount: number;
}
