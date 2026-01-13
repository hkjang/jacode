import { DefaultASTManipulator } from '../ast-manipulator';
import { ASTNode, Location } from '../../types/ast-node';
import { Change } from '../../types/manipulator';

describe('DefaultASTManipulator', () => {
  let manipulator: DefaultASTManipulator;

  beforeEach(() => {
    manipulator = new DefaultASTManipulator();
  });

  const createMockNode = (
    startIndex: number,
    endIndex: number,
    name?: string
  ): ASTNode => ({
    id: 'test-id',
    type: 'function',
    name,
    location: {
      startLine: 1,
      startColumn: startIndex + 1,
      endLine: 1,
      endColumn: endIndex + 1,
      startIndex,
      endIndex,
    },
    children: [],
    text: 'test content',
  });

  describe('insertBefore', () => {
    it('should create an insert change before the target', () => {
      const node = createMockNode(10, 20, 'testFn');
      const change = manipulator.insertBefore(node, 'new code');

      expect(change.type).toBe('insert');
      expect(change.location.startIndex).toBe(10);
      expect(change.newContent).toContain('new code');
    });
  });

  describe('insertAfter', () => {
    it('should create an insert change after the target', () => {
      const node = createMockNode(10, 20, 'testFn');
      const change = manipulator.insertAfter(node, 'new code');

      expect(change.type).toBe('insert');
      expect(change.location.startIndex).toBe(20);
      expect(change.newContent).toContain('new code');
    });
  });

  describe('replace', () => {
    it('should create a replace change', () => {
      const node = createMockNode(10, 20, 'testFn');
      const change = manipulator.replace(node, 'replacement');

      expect(change.type).toBe('replace');
      expect(change.location.startIndex).toBe(10);
      expect(change.location.endIndex).toBe(20);
      expect(change.newContent).toBe('replacement');
    });
  });

  describe('delete', () => {
    it('should create a delete change', () => {
      const node = createMockNode(10, 20, 'testFn');
      const change = manipulator.delete(node);

      expect(change.type).toBe('delete');
      expect(change.location.startIndex).toBe(10);
      expect(change.location.endIndex).toBe(20);
    });
  });

  describe('apply', () => {
    it('should apply insert changes', () => {
      const source = 'hello world';
      const changes: Change[] = [
        {
          type: 'insert',
          location: {
            startLine: 1,
            startColumn: 6,
            endLine: 1,
            endColumn: 6,
            startIndex: 5,
            endIndex: 5,
          },
          newContent: ' beautiful',
        },
      ];

      const result = manipulator.apply(source, changes);

      expect(result.success).toBe(true);
      expect(result.newSource).toBe('hello beautiful world');
    });

    it('should apply replace changes', () => {
      const source = 'hello world';
      const changes: Change[] = [
        {
          type: 'replace',
          location: {
            startLine: 1,
            startColumn: 7,
            endLine: 1,
            endColumn: 12,
            startIndex: 6,
            endIndex: 11,
          },
          newContent: 'universe',
        },
      ];

      const result = manipulator.apply(source, changes);

      expect(result.success).toBe(true);
      expect(result.newSource).toBe('hello universe');
    });

    it('should apply delete changes', () => {
      const source = 'hello beautiful world';
      const changes: Change[] = [
        {
          type: 'delete',
          location: {
            startLine: 1,
            startColumn: 6,
            endLine: 1,
            endColumn: 16,
            startIndex: 5,
            endIndex: 15,
          },
        },
      ];

      const result = manipulator.apply(source, changes);

      expect(result.success).toBe(true);
      expect(result.newSource).toBe('hello world');
    });

    it('should apply multiple non-overlapping changes', () => {
      const source = 'function foo() { return 1; }';
      const changes: Change[] = [
        {
          type: 'replace',
          location: {
            startLine: 1,
            startColumn: 10,
            endLine: 1,
            endColumn: 13,
            startIndex: 9,
            endIndex: 12,
          },
          newContent: 'bar',
        },
        {
          type: 'replace',
          location: {
            startLine: 1,
            startColumn: 25,
            endLine: 1,
            endColumn: 26,
            startIndex: 24,
            endIndex: 25,
          },
          newContent: '42',
        },
      ];

      const result = manipulator.apply(source, changes);

      expect(result.success).toBe(true);
      expect(result.newSource).toBe('function bar() { return 42; }');
    });
  });

  describe('validate', () => {
    it('should reject overlapping changes', () => {
      const source = 'hello world';
      const changes: Change[] = [
        {
          type: 'replace',
          location: {
            startLine: 1,
            startColumn: 1,
            endLine: 1,
            endColumn: 8,
            startIndex: 0,
            endIndex: 7,
          },
          newContent: 'hi',
          description: 'change1',
        },
        {
          type: 'replace',
          location: {
            startLine: 1,
            startColumn: 5,
            endLine: 1,
            endColumn: 12,
            startIndex: 4,
            endIndex: 11,
          },
          newContent: 'universe',
          description: 'change2',
        },
      ];

      const result = manipulator.validate(source, changes);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Overlapping changes detected: change1 and change2');
    });

    it('should accept non-overlapping changes', () => {
      const source = 'hello world';
      const changes: Change[] = [
        {
          type: 'replace',
          location: {
            startLine: 1,
            startColumn: 1,
            endLine: 1,
            endColumn: 6,
            startIndex: 0,
            endIndex: 5,
          },
          newContent: 'hi',
        },
        {
          type: 'replace',
          location: {
            startLine: 1,
            startColumn: 7,
            endLine: 1,
            endColumn: 12,
            startIndex: 6,
            endIndex: 11,
          },
          newContent: 'universe',
        },
      ];

      const result = manipulator.validate(source, changes);

      expect(result.valid).toBe(true);
    });
  });
});
