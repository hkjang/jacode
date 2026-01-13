import { v4 as uuidv4 } from 'uuid';
import {
  ParsedFile,
  ASTNode,
  TypeScriptParser,
  findByType,
  traverse,
} from '@jacode/ast-engine';
import { SymbolGraph } from './symbol-graph';
import { SymbolNode, SymbolType, EdgeType } from '../types/symbol';

/**
 * Options for building a symbol graph
 */
export interface GraphBuilderOptions {
  /** Include private/internal symbols */
  includePrivate?: boolean;
  
  /** Build call graph edges */
  buildCallGraph?: boolean;
  
  /** Build type reference edges */
  buildTypeRefs?: boolean;
  
  /** Maximum depth for analyzing nested structures */
  maxDepth?: number;
}

const DEFAULT_OPTIONS: GraphBuilderOptions = {
  includePrivate: true,
  buildCallGraph: true,
  buildTypeRefs: true,
  maxDepth: 10,
};

/**
 * Builds a SymbolGraph from parsed AST files
 */
export class GraphBuilder {
  private graph: SymbolGraph;
  private options: GraphBuilderOptions;
  private parser: TypeScriptParser;
  private symbolMap: Map<string, string> = new Map(); // qualifiedName -> nodeId

  constructor(options: GraphBuilderOptions = {}) {
    this.graph = new SymbolGraph();
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.parser = new TypeScriptParser();
  }

  /**
   * Build graph from multiple parsed files
   */
  async buildFromFiles(files: ParsedFile[]): Promise<SymbolGraph> {
    // First pass: collect all symbols
    for (const file of files) {
      await this.collectSymbols(file);
    }

    // Second pass: build relationships
    if (this.options.buildCallGraph || this.options.buildTypeRefs) {
      for (const file of files) {
        await this.buildRelationships(file);
      }
    }

    return this.graph;
  }

  /**
   * Build graph from source code strings
   */
  async buildFromSource(sources: { code: string; filePath: string }[]): Promise<SymbolGraph> {
    const parsedFiles: ParsedFile[] = [];
    
    for (const { code, filePath } of sources) {
      if (this.parser.supports(filePath)) {
        const parsed = await this.parser.parse(code, filePath);
        parsedFiles.push(parsed);
      }
    }

    return this.buildFromFiles(parsedFiles);
  }

  /**
   * Add a single file to the existing graph
   */
  async addFile(file: ParsedFile): Promise<void> {
    // Remove existing symbols for this file
    this.graph.removeFile(file.filePath);
    
    // Collect symbols
    await this.collectSymbols(file);
    
    // Build relationships
    if (this.options.buildCallGraph || this.options.buildTypeRefs) {
      await this.buildRelationships(file);
    }
  }

  /**
   * Get the built graph
   */
  getGraph(): SymbolGraph {
    return this.graph;
  }

  private async collectSymbols(file: ParsedFile): Promise<void> {
    const symbols = this.parser.extractSymbols(file.root);
    
    for (const extracted of symbols) {
      // Skip private symbols if option is disabled
      if (!this.options.includePrivate && extracted.visibility === 'private') {
        continue;
      }

      const symbolNode: Omit<SymbolNode, 'id'> = {
        type: this.mapSymbolType(extracted.type),
        name: extracted.name,
        qualifiedName: this.buildQualifiedName(file.filePath, extracted.name),
        filePath: file.filePath,
        location: extracted.location,
        signature: extracted.signature,
        docstring: extracted.docstring,
        exported: extracted.exported,
        visibility: extracted.visibility,
        async: extracted.async,
        static: extracted.static,
        parameterCount: extracted.parameters?.length,
      };

      const node = this.graph.addNode(symbolNode);
      this.symbolMap.set(symbolNode.qualifiedName, node.id);
    }

    // Add imports as edges
    const imports = this.parser.extractImports(file.root);
    for (const importInfo of imports) {
      // We'll connect these in the relationship pass
    }
  }

  private async buildRelationships(file: ParsedFile): Promise<void> {
    // Build containment relationships
    this.buildContainmentEdges(file);

    // Build call graph
    if (this.options.buildCallGraph) {
      this.buildCallEdges(file);
    }

    // Build inheritance relationships
    this.buildInheritanceEdges(file);
  }

  private buildContainmentEdges(file: ParsedFile): void {
    const classes = findByType(file.root, 'class');
    
    for (const classNode of classes) {
      if (!classNode.name) continue;
      
      const classQualifiedName = this.buildQualifiedName(file.filePath, classNode.name);
      const classId = this.symbolMap.get(classQualifiedName);
      
      if (!classId) continue;

      // Find methods and properties
      for (const child of classNode.children) {
        if ((child.type === 'method' || child.type === 'property') && child.name) {
          const memberQualifiedName = this.buildQualifiedName(
            file.filePath,
            `${classNode.name}.${child.name}`
          );
          const memberId = this.symbolMap.get(memberQualifiedName);
          
          if (memberId) {
            this.graph.addEdge({
              source: classId,
              target: memberId,
              type: 'contains',
            });
          }
        }
      }
    }
  }

  private buildCallEdges(file: ParsedFile): void {
    // Find all function/method definitions
    const functions = [
      ...findByType(file.root, 'function'),
      ...findByType(file.root, 'method'),
      ...findByType(file.root, 'arrow_function'),
    ];

    for (const func of functions) {
      if (!func.name) continue;
      
      const funcQualifiedName = this.buildQualifiedName(file.filePath, func.name);
      const funcId = this.symbolMap.get(funcQualifiedName);
      
      if (!funcId) continue;

      // Find call expressions within this function
      const calls = findByType(func, 'call_expression');
      
      for (const call of calls) {
        // Extract the called function name (simplified)
        const calledName = this.extractCalledName(call);
        if (!calledName) continue;

        // Try to find the target symbol
        const targetId = this.findSymbolByName(calledName, file.filePath);
        
        if (targetId) {
          this.graph.addEdge({
            source: funcId,
            target: targetId,
            type: 'calls',
            line: call.location.startLine,
          });
        }
      }
    }
  }

  private buildInheritanceEdges(file: ParsedFile): void {
    const classes = findByType(file.root, 'class');
    
    for (const classNode of classes) {
      if (!classNode.name || !classNode.text) continue;
      
      const classQualifiedName = this.buildQualifiedName(file.filePath, classNode.name);
      const classId = this.symbolMap.get(classQualifiedName);
      
      if (!classId) continue;

      // Check for extends clause
      const extendsMatch = classNode.text.match(/extends\s+(\w+)/);
      if (extendsMatch) {
        const parentName = extendsMatch[1];
        const parentId = this.findSymbolByName(parentName, file.filePath);
        
        if (parentId) {
          this.graph.addEdge({
            source: classId,
            target: parentId,
            type: 'extends',
          });
        }
      }

      // Check for implements clause
      const implementsMatch = classNode.text.match(/implements\s+([\w\s,]+)/);
      if (implementsMatch) {
        const interfaces = implementsMatch[1].split(',').map(s => s.trim());
        
        for (const interfaceName of interfaces) {
          const interfaceId = this.findSymbolByName(interfaceName, file.filePath);
          
          if (interfaceId) {
            this.graph.addEdge({
              source: classId,
              target: interfaceId,
              type: 'implements',
            });
          }
        }
      }
    }
  }

  private mapSymbolType(type: string): SymbolType {
    const typeMap: Record<string, SymbolType> = {
      function: 'function',
      method: 'method',
      class: 'class',
      interface: 'interface',
      type: 'type',
      variable: 'variable',
      constant: 'constant',
    };
    return typeMap[type] || 'variable';
  }

  private buildQualifiedName(filePath: string, name: string): string {
    // Create a qualified name from file path and symbol name
    const normalized = filePath.replace(/\\/g, '/');
    const fileName = normalized.split('/').pop()?.replace(/\.[^.]+$/, '') || '';
    return `${fileName}.${name}`;
  }

  private extractCalledName(callNode: ASTNode): string | undefined {
    // Simple extraction - in real impl would parse the call expression properly
    if (callNode.text) {
      const match = callNode.text.match(/^(\w+(?:\.\w+)*)\s*\(/);
      if (match) {
        return match[1];
      }
    }
    return undefined;
  }

  private findSymbolByName(name: string, currentFile: string): string | undefined {
    // First try exact match
    const nodes = this.graph.getNodesByName(name);
    
    if (nodes.length === 0) return undefined;
    
    // Prefer symbol from the same file
    const sameFileNode = nodes.find(n => n.filePath === currentFile);
    if (sameFileNode) return sameFileNode.id;
    
    // Return first match
    return nodes[0]?.id;
  }
}
