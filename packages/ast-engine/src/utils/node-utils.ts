import { ASTNode, NodeType, Location } from '../types/ast-node';

/**
 * Check if a node is of a specific type
 */
export function isType(node: ASTNode, type: NodeType): boolean {
  return node.type === type;
}

/**
 * Check if a node is a function-like node
 */
export function isFunction(node: ASTNode): boolean {
  return ['function', 'arrow_function', 'method'].includes(node.type);
}

/**
 * Check if a node is a class-like node
 */
export function isClass(node: ASTNode): boolean {
  return node.type === 'class' || node.type === 'interface';
}

/**
 * Check if a node is exported
 */
export function isExported(node: ASTNode): boolean {
  return node.text?.trimStart().startsWith('export') ?? false;
}

/**
 * Check if a node is a default export
 */
export function isDefaultExport(node: ASTNode): boolean {
  return node.text?.includes('export default') ?? false;
}

/**
 * Check if a function is async
 */
export function isAsync(node: ASTNode): boolean {
  if (!isFunction(node)) return false;
  return node.text?.includes('async ') ?? false;
}

/**
 * Get function parameters from a function node
 */
export function getFunctionParameters(node: ASTNode): ASTNode[] {
  if (!isFunction(node)) return [];
  return node.children.filter((child) => child.type === 'parameter');
}

/**
 * Get class methods from a class node
 */
export function getClassMethods(node: ASTNode): ASTNode[] {
  if (!isClass(node)) return [];
  return node.children.filter((child) => child.type === 'method');
}

/**
 * Get class properties from a class node
 */
export function getClassProperties(node: ASTNode): ASTNode[] {
  if (!isClass(node)) return [];
  return node.children.filter((child) => child.type === 'property');
}

/**
 * Clone a node (shallow)
 */
export function cloneNode(node: ASTNode): ASTNode {
  return {
    ...node,
    children: [...node.children],
    metadata: node.metadata ? { ...node.metadata } : undefined,
  };
}

/**
 * Clone a node (deep)
 */
export function deepCloneNode(node: ASTNode): ASTNode {
  return {
    ...node,
    children: node.children.map((child) => deepCloneNode(child)),
    metadata: node.metadata ? JSON.parse(JSON.stringify(node.metadata)) : undefined,
    parent: undefined, // Don't clone parent reference
  };
}

/**
 * Create a summary of the AST for LLM consumption
 */
export function createASTSummary(node: ASTNode, maxDepth: number = 3): ASTSummary {
  return summarizeNode(node, 0, maxDepth);
}

export interface ASTSummary {
  type: NodeType;
  name?: string;
  location: {
    start: number;
    end: number;
  };
  signature?: string;
  children?: ASTSummary[];
}

function summarizeNode(node: ASTNode, depth: number, maxDepth: number): ASTSummary {
  const summary: ASTSummary = {
    type: node.type,
    name: node.name,
    location: {
      start: node.location.startLine,
      end: node.location.endLine,
    },
  };

  // Add signature for function-like nodes
  if (isFunction(node) && node.text) {
    const lines = node.text.split('\n');
    summary.signature = lines[0].replace(/\{.*$/, '').trim();
  }

  // Add children if within depth limit
  if (depth < maxDepth && node.children.length > 0) {
    // Filter to only significant children
    const significantTypes: NodeType[] = [
      'function', 'arrow_function', 'method', 'class', 'interface', 
      'type_alias', 'variable', 'import', 'export'
    ];
    
    const significantChildren = node.children.filter(
      (child) => significantTypes.includes(child.type) || child.name
    );
    
    if (significantChildren.length > 0) {
      summary.children = significantChildren.map(
        (child) => summarizeNode(child, depth + 1, maxDepth)
      );
    }
  }

  return summary;
}

/**
 * Get the fully qualified name of a node
 */
export function getFullyQualifiedName(node: ASTNode): string {
  const parts: string[] = [];
  let current: ASTNode | undefined = node;
  
  while (current) {
    if (current.name && ['class', 'interface', 'module', 'function', 'method'].includes(current.type)) {
      parts.unshift(current.name);
    }
    current = current.parent;
  }
  
  return parts.join('.');
}

/**
 * Calculate the complexity of a node (simplified cyclomatic complexity)
 */
export function calculateComplexity(node: ASTNode): number {
  let complexity = 1;
  
  const complexityKeywords = [
    'if', 'else', 'while', 'for', 'case', 'catch', '&&', '||', '?'
  ];
  
  const text = node.text || '';
  for (const keyword of complexityKeywords) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'g');
    const matches = text.match(regex);
    complexity += matches?.length || 0;
  }
  
  return complexity;
}

/**
 * Get line count of a node
 */
export function getLineCount(node: ASTNode): number {
  return node.location.endLine - node.location.startLine + 1;
}

/**
 * Check if two locations overlap
 */
export function locationsOverlap(a: Location, b: Location): boolean {
  return !(a.endIndex <= b.startIndex || b.endIndex <= a.startIndex);
}

/**
 * Check if location A contains location B
 */
export function locationContains(a: Location, b: Location): boolean {
  return a.startIndex <= b.startIndex && a.endIndex >= b.endIndex;
}
