import { v4 as uuidv4 } from 'uuid';
import {
  SymbolNode,
  SymbolEdge,
  SymbolType,
  EdgeType,
  GraphStats,
  FileInfo,
  QueryOptions,
  QueryResult,
} from '../types/symbol';

/**
 * In-memory symbol graph for code analysis
 */
export class SymbolGraph {
  private nodes: Map<string, SymbolNode> = new Map();
  private edges: Map<string, SymbolEdge> = new Map();
  private fileIndex: Map<string, Set<string>> = new Map(); // filePath -> node IDs
  private nameIndex: Map<string, Set<string>> = new Map(); // name -> node IDs
  private typeIndex: Map<SymbolType, Set<string>> = new Map();

  /**
   * Add a symbol node to the graph
   */
  addNode(node: Omit<SymbolNode, 'id'>): SymbolNode {
    const id = uuidv4();
    const fullNode: SymbolNode = { ...node, id };
    
    this.nodes.set(id, fullNode);
    this.indexNode(fullNode);
    
    return fullNode;
  }

  /**
   * Add a symbol node with a specific ID
   */
  addNodeWithId(node: SymbolNode): SymbolNode {
    this.nodes.set(node.id, node);
    this.indexNode(node);
    return node;
  }

  /**
   * Add an edge between two symbols
   */
  addEdge(edge: Omit<SymbolEdge, 'id'>): SymbolEdge {
    // Validate source and target exist
    if (!this.nodes.has(edge.source)) {
      throw new Error(`Source node not found: ${edge.source}`);
    }
    if (!this.nodes.has(edge.target)) {
      throw new Error(`Target node not found: ${edge.target}`);
    }

    const id = uuidv4();
    const fullEdge: SymbolEdge = { ...edge, id };
    
    this.edges.set(id, fullEdge);
    
    return fullEdge;
  }

  /**
   * Get a node by ID
   */
  getNode(id: string): SymbolNode | undefined {
    return this.nodes.get(id);
  }

  /**
   * Get nodes by name
   */
  getNodesByName(name: string): SymbolNode[] {
    const ids = this.nameIndex.get(name);
    if (!ids) return [];
    
    return Array.from(ids)
      .map(id => this.nodes.get(id))
      .filter((n): n is SymbolNode => n !== undefined);
  }

  /**
   * Get nodes by type
   */
  getNodesByType(type: SymbolType): SymbolNode[] {
    const ids = this.typeIndex.get(type);
    if (!ids) return [];
    
    return Array.from(ids)
      .map(id => this.nodes.get(id))
      .filter((n): n is SymbolNode => n !== undefined);
  }

  /**
   * Get nodes in a file
   */
  getNodesInFile(filePath: string): SymbolNode[] {
    const ids = this.fileIndex.get(filePath);
    if (!ids) return [];
    
    return Array.from(ids)
      .map(id => this.nodes.get(id))
      .filter((n): n is SymbolNode => n !== undefined);
  }

  /**
   * Get edges originating from a node
   */
  getOutgoingEdges(nodeId: string): SymbolEdge[] {
    return Array.from(this.edges.values())
      .filter(edge => edge.source === nodeId);
  }

  /**
   * Get edges pointing to a node
   */
  getIncomingEdges(nodeId: string): SymbolEdge[] {
    return Array.from(this.edges.values())
      .filter(edge => edge.target === nodeId);
  }

  /**
   * Get all edges for a node (both incoming and outgoing)
   */
  getEdges(nodeId: string): SymbolEdge[] {
    return Array.from(this.edges.values())
      .filter(edge => edge.source === nodeId || edge.target === nodeId);
  }

  /**
   * Get edges by type
   */
  getEdgesByType(type: EdgeType): SymbolEdge[] {
    return Array.from(this.edges.values())
      .filter(edge => edge.type === type);
  }

  /**
   * Get all callers of a function/method
   */
  getCallers(nodeId: string): SymbolNode[] {
    const callerEdges = Array.from(this.edges.values())
      .filter(edge => edge.target === nodeId && edge.type === 'calls');
    
    return callerEdges
      .map(edge => this.nodes.get(edge.source))
      .filter((n): n is SymbolNode => n !== undefined);
  }

  /**
   * Get all functions/methods called by a node
   */
  getCallees(nodeId: string): SymbolNode[] {
    const calleeEdges = Array.from(this.edges.values())
      .filter(edge => edge.source === nodeId && edge.type === 'calls');
    
    return calleeEdges
      .map(edge => this.nodes.get(edge.target))
      .filter((n): n is SymbolNode => n !== undefined);
  }

  /**
   * Find a symbol by qualified name
   */
  findByQualifiedName(qualifiedName: string): SymbolNode | undefined {
    return Array.from(this.nodes.values())
      .find(node => node.qualifiedName === qualifiedName);
  }

  /**
   * Query the graph with options
   */
  query(options: QueryOptions): QueryResult {
    let nodes = Array.from(this.nodes.values());

    // Filter by type
    if (options.types && options.types.length > 0) {
      nodes = nodes.filter(n => options.types!.includes(n.type));
    }

    // Filter by file path
    if (options.filePath) {
      const pattern = options.filePath;
      nodes = nodes.filter(n => this.matchGlob(n.filePath, pattern));
    }

    // Filter exported only
    if (options.exportedOnly) {
      nodes = nodes.filter(n => n.exported);
    }

    const totalCount = nodes.length;

    // Apply limit
    if (options.limit && options.limit > 0) {
      nodes = nodes.slice(0, options.limit);
    }

    const result: QueryResult = {
      nodes,
      totalCount,
    };

    // Include edges if requested
    if (options.includeEdges) {
      const nodeIds = new Set(nodes.map(n => n.id));
      result.edges = Array.from(this.edges.values())
        .filter(e => nodeIds.has(e.source) || nodeIds.has(e.target));
    }

    return result;
  }

  /**
   * Get graph statistics
   */
  getStats(): GraphStats {
    const nodesByType: Partial<Record<SymbolType, number>> = {};
    const edgesByType: Partial<Record<EdgeType, number>> = {};
    let exportedSymbols = 0;
    const files = new Set<string>();

    for (const node of this.nodes.values()) {
      nodesByType[node.type] = (nodesByType[node.type] || 0) + 1;
      if (node.exported) exportedSymbols++;
      files.add(node.filePath);
    }

    for (const edge of this.edges.values()) {
      edgesByType[edge.type] = (edgesByType[edge.type] || 0) + 1;
    }

    return {
      totalNodes: this.nodes.size,
      totalEdges: this.edges.size,
      nodesByType: nodesByType as Record<SymbolType, number>,
      edgesByType: edgesByType as Record<EdgeType, number>,
      fileCount: files.size,
      exportedSymbols,
    };
  }

  /**
   * Get information about all files in the graph
   */
  getFiles(): FileInfo[] {
    const files: Map<string, FileInfo> = new Map();

    for (const node of this.nodes.values()) {
      if (!files.has(node.filePath)) {
        files.set(node.filePath, {
          path: node.filePath,
          symbolCount: 0,
          imports: [],
          exports: [],
        });
      }

      const info = files.get(node.filePath)!;
      info.symbolCount++;
      if (node.exported && node.name) {
        info.exports.push(node.name);
      }
    }

    // Add import information from edges
    for (const edge of this.edges.values()) {
      if (edge.type === 'imports') {
        const sourceNode = this.nodes.get(edge.source);
        const targetNode = this.nodes.get(edge.target);
        if (sourceNode && targetNode && files.has(sourceNode.filePath)) {
          const info = files.get(sourceNode.filePath)!;
          if (!info.imports.includes(targetNode.filePath)) {
            info.imports.push(targetNode.filePath);
          }
        }
      }
    }

    return Array.from(files.values());
  }

  /**
   * Remove a node and its edges
   */
  removeNode(id: string): boolean {
    const node = this.nodes.get(id);
    if (!node) return false;

    // Remove from indexes
    this.removeFromIndexes(node);

    // Remove related edges
    const edgesToRemove = Array.from(this.edges.entries())
      .filter(([_, edge]) => edge.source === id || edge.target === id)
      .map(([id]) => id);
    
    for (const edgeId of edgesToRemove) {
      this.edges.delete(edgeId);
    }

    // Remove node
    this.nodes.delete(id);
    return true;
  }

  /**
   * Remove all nodes and edges for a file
   */
  removeFile(filePath: string): number {
    const ids = this.fileIndex.get(filePath);
    if (!ids) return 0;

    let removed = 0;
    for (const id of ids) {
      if (this.removeNode(id)) removed++;
    }

    return removed;
  }

  /**
   * Clear the entire graph
   */
  clear(): void {
    this.nodes.clear();
    this.edges.clear();
    this.fileIndex.clear();
    this.nameIndex.clear();
    this.typeIndex.clear();
  }

  /**
   * Export graph to JSON
   */
  toJSON(): { nodes: SymbolNode[]; edges: SymbolEdge[] } {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: Array.from(this.edges.values()),
    };
  }

  /**
   * Import graph from JSON
   */
  fromJSON(data: { nodes: SymbolNode[]; edges: SymbolEdge[] }): void {
    this.clear();
    
    for (const node of data.nodes) {
      this.addNodeWithId(node);
    }
    
    for (const edge of data.edges) {
      this.edges.set(edge.id, edge);
    }
  }

  // Private helper methods

  private indexNode(node: SymbolNode): void {
    // File index
    if (!this.fileIndex.has(node.filePath)) {
      this.fileIndex.set(node.filePath, new Set());
    }
    this.fileIndex.get(node.filePath)!.add(node.id);

    // Name index
    if (!this.nameIndex.has(node.name)) {
      this.nameIndex.set(node.name, new Set());
    }
    this.nameIndex.get(node.name)!.add(node.id);

    // Type index
    if (!this.typeIndex.has(node.type)) {
      this.typeIndex.set(node.type, new Set());
    }
    this.typeIndex.get(node.type)!.add(node.id);
  }

  private removeFromIndexes(node: SymbolNode): void {
    this.fileIndex.get(node.filePath)?.delete(node.id);
    this.nameIndex.get(node.name)?.delete(node.id);
    this.typeIndex.get(node.type)?.delete(node.id);
  }

  private matchGlob(path: string, pattern: string): boolean {
    // Simple glob matching - supports * and **
    const regex = pattern
      .replace(/\*\*/g, '<<<DOUBLESTAR>>>')
      .replace(/\*/g, '[^/]*')
      .replace(/<<<DOUBLESTAR>>>/g, '.*')
      .replace(/\//g, '\\/');
    
    return new RegExp(`^${regex}$`).test(path);
  }
}
