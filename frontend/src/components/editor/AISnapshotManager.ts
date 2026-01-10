'use client';

import * as monaco from 'monaco-editor';

export interface AISnapshot {
  id: string;
  timestamp: number;
  content: string;
  cursorPosition?: monaco.Position;
  description: string;
  agentTaskId?: string;
}

export class AISnapshotManager {
  private snapshots: AISnapshot[] = [];
  private maxSnapshots: number = 50;
  private currentIndex: number = -1;

  /**
   * Take a snapshot of current editor state
   */
  takeSnapshot(
    editor: monaco.editor.IStandaloneCodeEditor,
    description: string,
    agentTaskId?: string
  ): AISnapshot {
    const content = editor.getValue();
    const position = editor.getPosition();

    const snapshot: AISnapshot = {
      id: `snapshot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      content,
      cursorPosition: position || undefined,
      description,
      agentTaskId,
    };

    // Add new snapshot
    if (this.currentIndex < this.snapshots.length - 1) {
      // Remove snapshots after current if we're not at the end
      this.snapshots = this.snapshots.slice(0, this.currentIndex + 1);
    }

    this.snapshots.push(snapshot);
    this.currentIndex = this.snapshots.length - 1;

    // Limit history size
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
      this.currentIndex--;
    }

    return snapshot;
  }

  /**
   * Restore a snapshot to the editor
   */
  restoreSnapshot(
    editor: monaco.editor.IStandaloneCodeEditor,
    snapshotId: string
  ): boolean {
    const snapshot = this.snapshots.find(s => s.id === snapshotId);
    
    if (!snapshot) {
      return false;
    }

    // Set content
    editor.setValue(snapshot.content);

    // Restore cursor position
    if (snapshot.cursorPosition) {
      editor.setPosition(snapshot.cursorPosition);
      editor.revealPositionInCenter(snapshot.cursorPosition);
    }

    // Update current index
    this.currentIndex = this.snapshots.indexOf(snapshot);

    return true;
  }

  /**
   * Undo to previous snapshot
   */
  undo(editor: monaco.editor.IStandaloneCodeEditor): boolean {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      const snapshot = this.snapshots[this.currentIndex];
      
      editor.setValue(snapshot.content);
      if (snapshot.cursorPosition) {
        editor.setPosition(snapshot.cursorPosition);
      }
      
      return true;
    }
    return false;
  }

  /**
   * Redo to next snapshot
   */
  redo(editor: monaco.editor.IStandaloneCodeEditor): boolean {
    if (this.currentIndex < this.snapshots.length - 1) {
      this.currentIndex++;
      const snapshot = this.snapshots[this.currentIndex];
      
      editor.setValue(snapshot.content);
      if (snapshot.cursorPosition) {
        editor.setPosition(snapshot.cursorPosition);
      }
      
      return true;
    }
    return false;
  }

  /**
   * Get all snapshots
   */
  getAllSnapshots(): AISnapshot[] {
    return [...this.snapshots];
  }

  /**
   * Get snapshots for a specific task
   */
  getSnapshotsByTask(agentTaskId: string): AISnapshot[] {
    return this.snapshots.filter(s => s.agentTaskId === agentTaskId);
  }

  /**
   * Get current snapshot
   */
  getCurrentSnapshot(): AISnapshot | null {
    if (this.currentIndex >= 0 && this.currentIndex < this.snapshots.length) {
      return this.snapshots[this.currentIndex];
    }
    return null;
  }

  /**
   * Check if can undo
   */
  canUndo(): boolean {
    return this.currentIndex > 0;
  }

  /**
   * Check if can redo
   */
  canRedo(): boolean {
    return this.currentIndex < this.snapshots.length - 1;
  }

  /**
   * Clear all snapshots
   */
  clear(): void {
    this.snapshots = [];
    this.currentIndex = -1;
  }

  /**
   * Get history stats
   */
  getStats() {
    return {
      totalSnapshots: this.snapshots.length,
      currentIndex: this.currentIndex,
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      oldestSnapshot: this.snapshots[0],
      newestSnapshot: this.snapshots[this.snapshots.length - 1],
    };
  }
}

export default AISnapshotManager;
