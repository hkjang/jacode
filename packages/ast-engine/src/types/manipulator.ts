import { ASTNode, Location } from './ast-node';

/**
 * Change types for AST manipulation
 */
export type ChangeType = 'insert' | 'replace' | 'delete' | 'move';

/**
 * Single change operation
 */
export interface Change {
  /** Type of change */
  type: ChangeType;
  
  /** Target location in source */
  location: Location;
  
  /** Target node (for replace/delete/move operations) */
  targetNode?: ASTNode;
  
  /** New content or node (for insert/replace operations) */
  newContent?: string;
  newNode?: ASTNode;
  
  /** Description of the change for logging */
  description?: string;
}

/**
 * Changeset containing multiple changes to apply atomically
 */
export interface ChangeSet {
  /** File path being modified */
  filePath: string;
  
  /** List of changes to apply */
  changes: Change[];
  
  /** Original source for rollback */
  originalSource: string;
  
  /** Timestamp of changeset creation */
  createdAt: Date;
  
  /** Unique identifier for this changeset */
  id: string;
}

/**
 * Result of applying a changeset
 */
export interface ChangeResult {
  /** Whether the changes were applied successfully */
  success: boolean;
  
  /** New source code after changes */
  newSource?: string;
  
  /** Errors if any */
  errors?: string[];
  
  /** Changeset ID for rollback */
  changeSetId: string;
}

/**
 * AST Manipulator interface for modifying AST nodes
 */
export interface ASTManipulator {
  /**
   * Insert a new node before the target node
   */
  insertBefore(target: ASTNode, newContent: string): Change;
  
  /**
   * Insert a new node after the target node
   */
  insertAfter(target: ASTNode, newContent: string): Change;
  
  /**
   * Insert content at a specific location
   */
  insertAt(location: Location, content: string): Change;
  
  /**
   * Replace a node with new content
   */
  replace(target: ASTNode, newContent: string): Change;
  
  /**
   * Delete a node
   */
  delete(target: ASTNode): Change;
  
  /**
   * Apply a changeset to source code
   */
  apply(source: string, changes: Change[]): ChangeResult;
  
  /**
   * Validate that changes can be applied
   */
  validate(source: string, changes: Change[]): { valid: boolean; errors?: string[] };
}

/**
 * Position adjustment for applying multiple changes
 */
export interface PositionDelta {
  line: number;
  column: number;
  index: number;
}
