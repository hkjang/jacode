import { SymbolGraph } from './symbol-graph';
import { SymbolNode, SymbolEdge, EdgeType } from '../types/symbol';

/**
 * Traversal callback type
 */
export type TraversalCallback = (
  node: SymbolNode,
  depth: number,
  path: string[]
) => boolean | void;

/**
 * Traversal options
 */
export interface TraversalOptions {
  /** Maximum depth to traverse */
  maxDepth?: number;
  
  /** Edge types to follow */
  edgeTypes?: EdgeType[];
  
  /** Direction of traversal */
  direction?: 'outgoing' | 'incoming' | 'both';
  
  /** Filter to apply to visited nodes */
  filter?: (node: SymbolNode) => boolean;
}

const DEFAULT_TRAVERSAL_OPTIONS: TraversalOptions = {
  maxDepth: 10,
  direction: 'outgoing',
};

/**
 * Graph traversal utilities for SymbolGraph
 */
export class GraphTraversal {
  private graph: SymbolGraph;

  constructor(graph: SymbolGraph) {
    this.graph = graph;
  }

  /**
   * Depth-first traversal starting from a node
   */
  depthFirst(
    startNodeId: string,
    callback: TraversalCallback,
    options: TraversalOptions = {}
  ): void {
    const opts = { ...DEFAULT_TRAVERSAL_OPTIONS, ...options };
    const visited = new Set<string>();
    
    this.dfs(startNodeId, callback, opts, visited, 0, []);
  }

  /**
   * Breadth-first traversal starting from a node
   */
  breadthFirst(
    startNodeId: string,
    callback: TraversalCallback,
    options: TraversalOptions = {}
  ): void {
    const opts = { ...DEFAULT_TRAVERSAL_OPTIONS, ...options };
    const visited = new Set<string>();
    const queue: { nodeId: string; depth: number; path: string[] }[] = [
      { nodeId: startNodeId, depth: 0, path: [] }
    ];

    while (queue.length > 0) {
      const { nodeId, depth, path } = queue.shift()!;
      
      if (visited.has(nodeId)) continue;
      if (opts.maxDepth !== undefined && depth > opts.maxDepth) continue;
      
      visited.add(nodeId);
      
      const node = this.graph.getNode(nodeId);
      if (!node) continue;
      
      // Apply filter
      if (opts.filter && !opts.filter(node)) continue;
      
      const currentPath = [...path, node.name];
      const shouldContinue = callback(node, depth, currentPath);
      
      if (shouldContinue === false) continue;
      
      // Get neighbors
      const neighbors = this.getNeighbors(nodeId, opts);
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor.id)) {
          queue.push({ nodeId: neighbor.id, depth: depth + 1, path: currentPath });
        }
      }
    }
  }

  /**
   * Find all paths between two nodes
   */
  findPaths(
    sourceId: string,
    targetId: string,
    options: TraversalOptions = {}
  ): SymbolNode[][] {
    const opts = { ...DEFAULT_TRAVERSAL_OPTIONS, ...options };
    const paths: SymbolNode[][] = [];
    const visited = new Set<string>();
    
    this.findPathsDFS(sourceId, targetId, opts, visited, [], paths);
    
    return paths;
  }

  /**
   * Find the shortest path between two nodes
   */
  shortestPath(
    sourceId: string,
    targetId: string,
    options: TraversalOptions = {}
  ): SymbolNode[] | null {
    const opts = { ...DEFAULT_TRAVERSAL_OPTIONS, ...options };
    const visited = new Set<string>();
    const queue: { nodeId: string; path: SymbolNode[] }[] = [];
    
    const startNode = this.graph.getNode(sourceId);
    if (!startNode) return null;
    
    queue.push({ nodeId: sourceId, path: [startNode] });
    visited.add(sourceId);

    while (queue.length > 0) {
      const { nodeId, path } = queue.shift()!;
      
      if (nodeId === targetId) {
        return path;
      }
      
      if (opts.maxDepth !== undefined && path.length > opts.maxDepth) continue;
      
      const neighbors = this.getNeighbors(nodeId, opts);
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor.id)) {
          visited.add(neighbor.id);
          queue.push({ nodeId: neighbor.id, path: [...path, neighbor] });
        }
      }
    }
    
    return null;
  }

  /**
   * Get all nodes reachable from a starting node
   */
  getReachable(
    startNodeId: string,
    options: TraversalOptions = {}
  ): SymbolNode[] {
    const reachable: SymbolNode[] = [];
    
    this.breadthFirst(startNodeId, (node, depth) => {
      if (depth > 0) { // Exclude start node
        reachable.push(node);
      }
    }, options);
    
    return reachable;
  }

  /**
   * Detect cycles in the graph starting from a node
   */
  findCycles(startNodeId: string, edgeTypes?: EdgeType[]): SymbolNode[][] {
    const cycles: SymbolNode[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: SymbolNode[] = [];
    
    this.detectCycles(startNodeId, visited, recursionStack, path, cycles, edgeTypes);
    
    return cycles;
  }

  /**
   * Calculate dependency depth (longest path from this node)
   */
  getDependencyDepth(nodeId: string, edgeTypes?: EdgeType[]): number {
    const visited = new Set<string>();
    return this.calculateDepth(nodeId, visited, edgeTypes);
  }

  /**
   * Get all leaf nodes (nodes with no outgoing edges)
   */
  getLeafNodes(edgeTypes?: EdgeType[]): SymbolNode[] {
    const stats = this.graph.getStats();
    const leaves: SymbolNode[] = [];
    
    const allNodes = this.graph.query({ limit: stats.totalNodes }).nodes;
    
    for (const node of allNodes) {
      const outgoing = this.getNeighbors(node.id, {
        direction: 'outgoing',
        edgeTypes,
      });
      
      if (outgoing.length === 0) {
        leaves.push(node);
      }
    }
    
    return leaves;
  }

  /**
   * Get all root nodes (nodes with no incoming edges)
   */
  getRootNodes(edgeTypes?: EdgeType[]): SymbolNode[] {
    const stats = this.graph.getStats();
    const roots: SymbolNode[] = [];
    
    const allNodes = this.graph.query({ limit: stats.totalNodes }).nodes;
    
    for (const node of allNodes) {
      const incoming = this.getNeighbors(node.id, {
        direction: 'incoming',
        edgeTypes,
      });
      
      if (incoming.length === 0) {
        roots.push(node);
      }
    }
    
    return roots;
  }

  // Private helper methods

  private dfs(
    nodeId: string,
    callback: TraversalCallback,
    options: TraversalOptions,
    visited: Set<string>,
    depth: number,
    path: string[]
  ): void {
    if (visited.has(nodeId)) return;
    if (options.maxDepth !== undefined && depth > options.maxDepth) return;
    
    visited.add(nodeId);
    
    const node = this.graph.getNode(nodeId);
    if (!node) return;
    
    // Apply filter
    if (options.filter && !options.filter(node)) return;
    
    const currentPath = [...path, node.name];
    const shouldContinue = callback(node, depth, currentPath);
    
    if (shouldContinue === false) return;
    
    const neighbors = this.getNeighbors(nodeId, options);
    for (const neighbor of neighbors) {
      this.dfs(neighbor.id, callback, options, visited, depth + 1, currentPath);
    }
  }

  private findPathsDFS(
    currentId: string,
    targetId: string,
    options: TraversalOptions,
    visited: Set<string>,
    currentPath: SymbolNode[],
    allPaths: SymbolNode[][]
  ): void {
    if (options.maxDepth !== undefined && currentPath.length > options.maxDepth) return;
    
    const node = this.graph.getNode(currentId);
    if (!node) return;
    
    const newPath = [...currentPath, node];
    
    if (currentId === targetId) {
      allPaths.push(newPath);
      return;
    }
    
    visited.add(currentId);
    
    const neighbors = this.getNeighbors(currentId, options);
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor.id)) {
        this.findPathsDFS(neighbor.id, targetId, options, visited, newPath, allPaths);
      }
    }
    
    visited.delete(currentId);
  }

  private detectCycles(
    nodeId: string,
    visited: Set<string>,
    recursionStack: Set<string>,
    path: SymbolNode[],
    cycles: SymbolNode[][],
    edgeTypes?: EdgeType[]
  ): void {
    visited.add(nodeId);
    recursionStack.add(nodeId);
    
    const node = this.graph.getNode(nodeId);
    if (!node) return;
    
    const newPath = [...path, node];
    
    const neighbors = this.getNeighbors(nodeId, { direction: 'outgoing', edgeTypes });
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor.id)) {
        this.detectCycles(neighbor.id, visited, recursionStack, newPath, cycles, edgeTypes);
      } else if (recursionStack.has(neighbor.id)) {
        // Found a cycle
        const cycleStart = newPath.findIndex(n => n.id === neighbor.id);
        if (cycleStart !== -1) {
          cycles.push([...newPath.slice(cycleStart), neighbor]);
        }
      }
    }
    
    recursionStack.delete(nodeId);
  }

  private calculateDepth(
    nodeId: string,
    visited: Set<string>,
    edgeTypes?: EdgeType[]
  ): number {
    if (visited.has(nodeId)) return 0;
    visited.add(nodeId);
    
    const neighbors = this.getNeighbors(nodeId, { direction: 'outgoing', edgeTypes });
    
    if (neighbors.length === 0) return 0;
    
    let maxDepth = 0;
    for (const neighbor of neighbors) {
      const depth = this.calculateDepth(neighbor.id, new Set(visited), edgeTypes);
      maxDepth = Math.max(maxDepth, depth + 1);
    }
    
    return maxDepth;
  }

  private getNeighbors(nodeId: string, options: TraversalOptions): SymbolNode[] {
    const neighbors: SymbolNode[] = [];
    
    if (options.direction === 'outgoing' || options.direction === 'both') {
      const outgoing = this.graph.getOutgoingEdges(nodeId);
      for (const edge of outgoing) {
        if (!options.edgeTypes || options.edgeTypes.includes(edge.type)) {
          const target = this.graph.getNode(edge.target);
          if (target) neighbors.push(target);
        }
      }
    }
    
    if (options.direction === 'incoming' || options.direction === 'both') {
      const incoming = this.graph.getIncomingEdges(nodeId);
      for (const edge of incoming) {
        if (!options.edgeTypes || options.edgeTypes.includes(edge.type)) {
          const source = this.graph.getNode(edge.source);
          if (source) neighbors.push(source);
        }
      }
    }
    
    return neighbors;
  }
}
