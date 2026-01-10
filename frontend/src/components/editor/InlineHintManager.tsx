'use client';

import React from 'react';
import * as monaco from 'monaco-editor';
import { Lightbulb, Sparkles } from 'lucide-react';

export interface InlineHintConfig {
  line: number;
  message: string;
  type: 'suggestion' | 'explanation' | 'warning';
  details?: string;
}

export class InlineHintManager {
  private editor: monaco.editor.IStandaloneCodeEditor;
  private decorations: string[] = [];
  private widgets: monaco.editor.IContentWidget[] = [];

  constructor(editor: monaco.editor.IStandaloneCodeEditor) {
    this.editor = editor;
  }

  /**
   * Add inline hints to the editor
   */
  addHints(hints: InlineHintConfig[]): void {
    // Clear existing hints
    this.clearHints();

    const newDecorations: monaco.editor.IModelDeltaDecoration[] = [];

    hints.forEach((hint) => {
      // Add glyph margin decoration
      newDecorations.push({
        range: new monaco.Range(hint.line, 1, hint.line, 1),
        options: {
          glyphMarginClassName: this.getGlyphClassName(hint.type),
          glyphMarginHoverMessage: {
            value: `**${hint.type === 'suggestion' ? '💡 AI Suggestion' : hint.type === 'explanation' ? '✨ AI Explanation' : '⚠️ AI Warning'}**\n\n${hint.message}${hint.details ? `\n\n---\n\n${hint.details}` : ''}`,
          },
          stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
        },
      });

      // Add inline decoration for emphasis
      newDecorations.push({
        range: new monaco.Range(hint.line, 1, hint.line, Number.MAX_VALUE),
        options: {
          isWholeLine: true,
          className: this.getLineClassName(hint.type),
          hoverMessage: {
            value: hint.message,
          },
        },
      });
    });

    this.decorations = this.editor.deltaDecorations(this.decorations, newDecorations);
  }

  /**
   * Clear all hints
   */
  clearHints(): void {
    this.decorations = this.editor.deltaDecorations(this.decorations, []);
    
    // Remove all widgets
    this.widgets.forEach((widget) => {
      this.editor.removeContentWidget(widget);
    });
    this.widgets = [];
  }

  /**
   * Add floating widget hint
   */
  addFloatingHint(line: number, column: number, message: string, type: InlineHintConfig['type']): void {
    const widget: monaco.editor.IContentWidget = {
      getId: () => `ai-hint-${Date.now()}-${Math.random()}`,
      getDomNode: () => {
        const node = document.createElement('div');
        node.className = `ai-inline-hint ai-hint-${type}`;
        node.style.cssText = `
          background: ${type === 'warning' ? '#fef3c7' : type === 'suggestion' ? '#dbeafe' : '#f3e8ff'};
          border: 1px solid ${type === 'warning' ? '#fbbf24' : type === 'suggestion' ? '#3b82f6' : '#a855f7'};
          color: ${type === 'warning' ? '#92400e' : type === 'suggestion' ? '#1e3a8a' : '#581c87'};
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          max-width: 300px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          z-index: 100;
        `;
        node.textContent = message;
        return node;
      },
      getPosition: () => ({
        position: { lineNumber: line, column },
        preference: [
          monaco.editor.ContentWidgetPositionPreference.ABOVE,
          monaco.editor.ContentWidgetPositionPreference.BELOW,
        ],
      }),
    };

    this.editor.addContentWidget(widget);
    this.widgets.push(widget);
  }

  /**
   * Get glyph margin CSS class
   */
  private getGlyphClassName(type: InlineHintConfig['type']): string {
    const baseClass = 'ai-hint-glyph';
    
    switch (type) {
      case 'suggestion':
        return `${baseClass} ai-hint-glyph-suggestion`;
      case 'explanation':
        return `${baseClass} ai-hint-glyph-explanation`;
      case 'warning':
        return `${baseClass} ai-hint-glyph-warning`;
      default:
        return baseClass;
    }
  }

  /**
   * Get line decoration CSS class
   */
  private getLineClassName(type: InlineHintConfig['type']): string {
    switch (type) {
      case 'suggestion':
        return 'ai-hint-line-suggestion';
      case 'explanation':
        return 'ai-hint-line-explanation';
      case 'warning':
        return 'ai-hint-line-warning';
      default:
        return '';
    }
  }

  /**
   * Dispose and cleanup
   */
  dispose(): void {
    this.clearHints();
  }
}

/**
 * React component for managing inline hints
 */
export interface InlineHintProviderProps {
  hints: InlineHintConfig[];
  onHintClick?: (hint: InlineHintConfig) => void;
}

export function InlineHintProvider({ hints, onHintClick }: InlineHintProviderProps) {
  return (
    <>
      {/* CSS Styles */}
      <style jsx global>{`
        .ai-hint-glyph {
          width: 16px !important;
          height: 16px !important;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        
        .ai-hint-glyph-suggestion::before {
          content: '💡';
          font-size: 14px;
        }
        
        .ai-hint-glyph-explanation::before {
          content: '✨';
          font-size: 14px;
        }
        
        .ai-hint-glyph-warning::before {
          content: '⚠️';
          font-size: 14px;
        }
        
        .ai-hint-line-suggestion {
          background: rgba(59, 130, 246, 0.05);
          border-left: 2px solid rgb(59, 130, 246);
        }
        
        .ai-hint-line-explanation {
          background: rgba(168, 85, 247, 0.05);
          border-left: 2px solid rgb(168, 85, 247);
        }
        
        .ai-hint-line-warning {
          background: rgba(251, 191, 36, 0.05);
          border-left: 2px solid rgb(251, 191, 36);
        }
        
        /* Dark mode */
        .dark .ai-hint-line-suggestion {
          background: rgba(96, 165, 250, 0.1);
        }
        
        .dark .ai-hint-line-explanation {
          background: rgba(192, 132, 252, 0.1);
        }
        
        .dark .ai-hint-line-warning {
          background: rgba(252, 211, 77, 0.1);
        }
      `}</style>
    </>
  );
}

export default InlineHintManager;
