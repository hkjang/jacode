import { ASTNode, NodeType, Location } from '../types/ast-node';

/**
 * Traversal callback function
 */
export type TraversalCallback = (
  node: ASTNode,
  parent: ASTNode | undefined,
  depth: number
) => boolean | void; // Return false to stop traversal

/**
 * Traverse AST in depth-first order
 */
export function traverse(
  node: ASTNode,
  callback: TraversalCallback,
  parent?: ASTNode,
  depth: number = 0
): void {
  const shouldContinue = callback(node, parent, depth);
  
  if (shouldContinue === false) return;
  
  for (const child of node.children) {
    traverse(child, callback, node, depth + 1);
  }
}

/**
 * Traverse AST in breadth-first order
 */
export function traverseBFS(
  root: ASTNode,
  callback: TraversalCallback
): void {
  const queue: { node: ASTNode; parent?: ASTNode; depth: number }[] = [
    { node: root, parent: undefined, depth: 0 }
  ];

  while (queue.length > 0) {
    const { node, parent, depth } = queue.shift()!;
    const shouldContinue = callback(node, parent, depth);
    
    if (shouldContinue === false) continue;
    
    for (const child of node.children) {
      queue.push({ node: child, parent: node, depth: depth + 1 });
    }
  }
}

/**
 * Find all nodes matching a predicate
 */
export function findNodes(
  root: ASTNode,
  predicate: (node: ASTNode) => boolean
): ASTNode[] {
  const results: ASTNode[] = [];
  
  traverse(root, (node) => {
    if (predicate(node)) {
      results.push(node);
    }
  });
  
  return results;
}

/**
 * Find first node matching a predicate
 */
export function findNode(
  root: ASTNode,
  predicate: (node: ASTNode) => boolean
): ASTNode | undefined {
  let result: ASTNode | undefined;
  
  traverse(root, (node) => {
    if (predicate(node)) {
      result = node;
      return false; // Stop traversal
    }
  });
  
  return result;
}

/**
 * Find nodes by type
 */
export function findByType(root: ASTNode, type: NodeType): ASTNode[] {
  return findNodes(root, (node) => node.type === type);
}

/**
 * Find nodes by name
 */
export function findByName(root: ASTNode, name: string): ASTNode[] {
  return findNodes(root, (node) => node.name === name);
}

/**
 * Get all ancestors of a node (from parent to root)
 */
export function getAncestors(node: ASTNode): ASTNode[] {
  const ancestors: ASTNode[] = [];
  let current = node.parent;
  
  while (current) {
    ancestors.push(current);
    current = current.parent;
  }
  
  return ancestors;
}

/**
 * Get all descendants of a node
 */
export function getDescendants(node: ASTNode): ASTNode[] {
  const descendants: ASTNode[] = [];
  
  for (const child of node.children) {
    descendants.push(child);
    descendants.push(...getDescendants(child));
  }
  
  return descendants;
}

/**
 * Get siblings of a node
 */
export function getSiblings(node: ASTNode): ASTNode[] {
  if (!node.parent) return [];
  return node.parent.children.filter((n) => n.id !== node.id);
}

/**
 * Get next sibling
 */
export function getNextSibling(node: ASTNode): ASTNode | undefined {
  if (!node.parent) return undefined;
  const siblings = node.parent.children;
  const index = siblings.findIndex((n) => n.id === node.id);
  return index >= 0 && index < siblings.length - 1 ? siblings[index + 1] : undefined;
}

/**
 * Get previous sibling
 */
export function getPreviousSibling(node: ASTNode): ASTNode | undefined {
  if (!node.parent) return undefined;
  const siblings = node.parent.children;
  const index = siblings.findIndex((n) => n.id === node.id);
  return index > 0 ? siblings[index - 1] : undefined;
}

/**
 * Get the depth of a node in the tree
 */
export function getNodeDepth(node: ASTNode): number {
  let depth = 0;
  let current = node.parent;
  
  while (current) {
    depth++;
    current = current.parent;
  }
  
  return depth;
}

/**
 * Find node at a specific location
 */
export function findNodeAtLocation(
  root: ASTNode,
  line: number,
  column: number
): ASTNode | undefined {
  let result: ASTNode | undefined;
  
  traverse(root, (node) => {
    const loc = node.location;
    if (
      line >= loc.startLine &&
      line <= loc.endLine &&
      (line !== loc.startLine || column >= loc.startColumn) &&
      (line !== loc.endLine || column <= loc.endColumn)
    ) {
      // Keep the most specific (deepest) node
      result = node;
    }
  });
  
  return result;
}

/**
 * Get the scope chain for a node
 */
export function getScopeChain(node: ASTNode): ASTNode[] {
  const scopeTypes: NodeType[] = ['function', 'arrow_function', 'method', 'class', 'block', 'program'];
  const chain: ASTNode[] = [];
  
  let current: ASTNode | undefined = node;
  while (current) {
    if (scopeTypes.includes(current.type)) {
      chain.push(current);
    }
    current = current.parent;
  }
  
  return chain;
}
