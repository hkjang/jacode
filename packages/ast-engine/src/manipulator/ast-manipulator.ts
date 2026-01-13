import { v4 as uuidv4 } from 'uuid';
import { ASTNode, Location } from '../types/ast-node';
import {
  ASTManipulator,
  Change,
  ChangeResult,
  ChangeSet,
} from '../types/manipulator';

/**
 * Default AST Manipulator implementation
 * 
 * Applies AST changes to source code by manipulating text based on locations.
 * Changes are sorted and applied in reverse order to maintain position accuracy.
 */
export class DefaultASTManipulator implements ASTManipulator {
  
  insertBefore(target: ASTNode, newContent: string): Change {
    return {
      type: 'insert',
      location: {
        ...target.location,
        endLine: target.location.startLine,
        endColumn: target.location.startColumn,
        endIndex: target.location.startIndex,
      },
      newContent: newContent + '\n',
      description: `Insert before ${target.name || target.type}`,
    };
  }

  insertAfter(target: ASTNode, newContent: string): Change {
    return {
      type: 'insert',
      location: {
        startLine: target.location.endLine,
        startColumn: target.location.endColumn,
        startIndex: target.location.endIndex,
        endLine: target.location.endLine,
        endColumn: target.location.endColumn,
        endIndex: target.location.endIndex,
      },
      newContent: '\n' + newContent,
      description: `Insert after ${target.name || target.type}`,
    };
  }

  insertAt(location: Location, content: string): Change {
    return {
      type: 'insert',
      location: {
        ...location,
        endLine: location.startLine,
        endColumn: location.startColumn,
        endIndex: location.startIndex,
      },
      newContent: content,
      description: `Insert at line ${location.startLine}`,
    };
  }

  replace(target: ASTNode, newContent: string): Change {
    return {
      type: 'replace',
      location: target.location,
      targetNode: target,
      newContent,
      description: `Replace ${target.name || target.type}`,
    };
  }

  delete(target: ASTNode): Change {
    return {
      type: 'delete',
      location: target.location,
      targetNode: target,
      description: `Delete ${target.name || target.type}`,
    };
  }

  apply(source: string, changes: Change[]): ChangeResult {
    const changeSetId = uuidv4();
    
    try {
      const validation = this.validate(source, changes);
      if (!validation.valid) {
        return {
          success: false,
          errors: validation.errors,
          changeSetId,
        };
      }

      // Sort changes by position (descending) to maintain accuracy when applying
      const sortedChanges = [...changes].sort((a, b) => 
        b.location.startIndex - a.location.startIndex
      );

      let result = source;

      for (const change of sortedChanges) {
        result = this.applyChange(result, change);
      }

      return {
        success: true,
        newSource: result,
        changeSetId,
      };
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : String(error)],
        changeSetId,
      };
    }
  }

  validate(source: string, changes: Change[]): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];
    const sourceLength = source.length;

    for (const change of changes) {
      const loc = change.location;
      
      // Validate location bounds
      if (loc.startIndex < 0 || loc.startIndex > sourceLength) {
        errors.push(`Invalid start index: ${loc.startIndex}`);
      }
      if (loc.endIndex < loc.startIndex || loc.endIndex > sourceLength) {
        errors.push(`Invalid end index: ${loc.endIndex}`);
      }
      
      // Validate change type requirements
      if (change.type === 'insert' && !change.newContent) {
        errors.push('Insert change requires newContent');
      }
      if (change.type === 'replace' && !change.newContent) {
        errors.push('Replace change requires newContent');
      }
    }

    // Check for overlapping changes
    const sortedChanges = [...changes].sort((a, b) => 
      a.location.startIndex - b.location.startIndex
    );
    
    for (let i = 0; i < sortedChanges.length - 1; i++) {
      const current = sortedChanges[i];
      const next = sortedChanges[i + 1];
      
      if (current.location.endIndex > next.location.startIndex) {
        errors.push(
          `Overlapping changes detected: ${current.description} and ${next.description}`
        );
      }
    }

    return { valid: errors.length === 0, errors };
  }

  private applyChange(source: string, change: Change): string {
    const { startIndex, endIndex } = change.location;
    const before = source.slice(0, startIndex);
    const after = source.slice(endIndex);

    switch (change.type) {
      case 'insert':
        return before + (change.newContent || '') + source.slice(startIndex);
      case 'replace':
        return before + (change.newContent || '') + after;
      case 'delete':
        return before + after;
      default:
        return source;
    }
  }

  /**
   * Create a changeset for atomic operations
   */
  createChangeSet(filePath: string, source: string, changes: Change[]): ChangeSet {
    return {
      id: uuidv4(),
      filePath,
      changes,
      originalSource: source,
      createdAt: new Date(),
    };
  }
}
