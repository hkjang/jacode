import { TypeScriptParser } from '../typescript-parser';
import { ASTNode } from '../../types/ast-node';

describe('TypeScriptParser', () => {
  let parser: TypeScriptParser;

  beforeEach(() => {
    parser = new TypeScriptParser();
  });

  describe('supports', () => {
    it('should support TypeScript files', () => {
      expect(parser.supports('test.ts')).toBe(true);
      expect(parser.supports('test.tsx')).toBe(true);
      expect(parser.supports('test.mts')).toBe(true);
    });

    it('should support JavaScript files', () => {
      expect(parser.supports('test.js')).toBe(true);
      expect(parser.supports('test.jsx')).toBe(true);
      expect(parser.supports('test.mjs')).toBe(true);
    });

    it('should not support unsupported files', () => {
      expect(parser.supports('test.py')).toBe(false);
      expect(parser.supports('test.go')).toBe(false);
    });
  });

  describe('parse', () => {
    it('should parse a simple function', async () => {
      const source = `
function greet(name: string): string {
  return \`Hello, \${name}!\`;
}
      `.trim();

      const result = await parser.parse(source, 'test.ts');

      expect(result.language).toBe('typescript');
      expect(result.root.type).toBe('program');
      expect(result.errors).toHaveLength(0);
    });

    it('should parse a class', async () => {
      const source = `
class Person {
  name: string;
  
  constructor(name: string) {
    this.name = name;
  }
  
  greet(): string {
    return \`Hello, I'm \${this.name}\`;
  }
}
      `.trim();

      const result = await parser.parse(source, 'test.ts');

      expect(result.root.type).toBe('program');
      
      // Find class node
      const classNode = findNodeByType(result.root, 'class');
      expect(classNode).toBeDefined();
      expect(classNode?.name).toBe('Person');
    });

    it('should parse imports', async () => {
      const source = `
import { Injectable } from '@nestjs/common';
import * as path from 'path';
import fs from 'fs';
      `.trim();

      const result = await parser.parse(source, 'test.ts');
      const imports = parser.extractImports(result.root);

      expect(imports).toHaveLength(3);
      expect(imports[0].source).toBe('@nestjs/common');
      expect(imports[0].imports[0].name).toBe('Injectable');
    });

    it('should extract symbols', async () => {
      const source = `
export function calculateTax(amount: number): number {
  return amount * 0.1;
}

export class Calculator {
  add(a: number, b: number): number {
    return a + b;
  }
}
      `.trim();

      const result = await parser.parse(source, 'test.ts');
      const symbols = parser.extractSymbols(result.root);

      expect(symbols.length).toBeGreaterThan(0);
      
      const taxFn = symbols.find(s => s.name === 'calculateTax');
      expect(taxFn).toBeDefined();
      expect(taxFn?.type).toBe('function');
      expect(taxFn?.exported).toBe(true);

      const calculator = symbols.find(s => s.name === 'Calculator');
      expect(calculator).toBeDefined();
      expect(calculator?.type).toBe('class');
    });

    it('should handle async functions', async () => {
      const source = `
async function fetchData(): Promise<string> {
  return 'data';
}
      `.trim();

      const result = await parser.parse(source, 'test.ts');
      const symbols = parser.extractSymbols(result.root);

      const asyncFn = symbols.find(s => s.name === 'fetchData');
      expect(asyncFn).toBeDefined();
      expect(asyncFn?.async).toBe(true);
    });
  });

  describe('serialize', () => {
    it('should return original text for nodes', async () => {
      const source = 'const x = 1;';
      const result = await parser.parse(source, 'test.ts');

      const serialized = parser.serialize(result.root);
      expect(serialized).toContain('const x = 1');
    });
  });
});

// Helper function
function findNodeByType(node: ASTNode, type: string): ASTNode | undefined {
  if (node.type === type) return node;
  
  for (const child of node.children) {
    const found = findNodeByType(child, type);
    if (found) return found;
  }
  
  return undefined;
}
