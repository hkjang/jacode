'use client';

import React from 'react';
import { 
  SplitSquareHorizontal, 
  SplitSquareVertical, 
  X, 
  Maximize2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface SplitPane {
  id: string;
  fileId?: string;
  fileName?: string;
}

interface SplitEditorProps {
  panes: SplitPane[];
  activePane?: string;
  orientation: 'horizontal' | 'vertical';
  onPaneSelect: (id: string) => void;
  onPaneClose: (id: string) => void;
  onSplitHorizontal?: () => void;
  onSplitVertical?: () => void;
  onMaximize?: (id: string) => void;
  renderContent: (pane: SplitPane) => React.ReactNode;
  className?: string;
}

export function SplitEditor({
  panes,
  activePane,
  orientation,
  onPaneSelect,
  onPaneClose,
  onSplitHorizontal,
  onSplitVertical,
  onMaximize,
  renderContent,
  className,
}: SplitEditorProps) {
  if (panes.length === 0) {
    return (
      <div className={cn('flex items-center justify-center h-full text-muted-foreground', className)}>
        No editor open
      </div>
    );
  }

  if (panes.length === 1) {
    return (
      <div className={cn('flex flex-col h-full', className)}>
        {/* Single pane header */}
        <div className="flex items-center justify-between px-2 py-1 bg-muted/30 border-b">
          <span className="text-xs font-medium truncate">
            {panes[0].fileName || 'Untitled'}
          </span>
          <div className="flex items-center gap-1">
            {onSplitHorizontal && (
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0"
                onClick={onSplitHorizontal}
                title="Split horizontally"
              >
                <SplitSquareHorizontal className="h-3 w-3" />
              </Button>
            )}
            {onSplitVertical && (
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0"
                onClick={onSplitVertical}
                title="Split vertically"
              >
                <SplitSquareVertical className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          {renderContent(panes[0])}
        </div>
      </div>
    );
  }

  // Multiple panes
  return (
    <div 
      className={cn(
        'flex h-full',
        orientation === 'horizontal' ? 'flex-row' : 'flex-col',
        className
      )}
    >
      {panes.map((pane, index) => (
        <React.Fragment key={pane.id}>
          {/* Pane */}
          <div 
            className={cn(
              'flex flex-col overflow-hidden',
              orientation === 'horizontal' ? 'flex-1' : 'flex-1',
              pane.id === activePane && 'ring-1 ring-primary ring-inset'
            )}
            onClick={() => onPaneSelect(pane.id)}
          >
            {/* Pane header */}
            <div className="flex items-center justify-between px-2 py-1 bg-muted/30 border-b">
              <span className="text-xs font-medium truncate">
                {pane.fileName || 'Untitled'}
              </span>
              <div className="flex items-center gap-1">
                {onMaximize && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 opacity-50 hover:opacity-100"
                    onClick={(e) => { e.stopPropagation(); onMaximize(pane.id); }}
                    title="Maximize"
                  >
                    <Maximize2 className="h-3 w-3" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 opacity-50 hover:opacity-100"
                  onClick={(e) => { e.stopPropagation(); onPaneClose(pane.id); }}
                  title="Close"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              {renderContent(pane)}
            </div>
          </div>
          
          {/* Divider */}
          {index < panes.length - 1 && (
            <div 
              className={cn(
                'bg-border hover:bg-primary/50 transition-colors cursor-col-resize',
                orientation === 'horizontal' ? 'w-1' : 'h-1'
              )}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export default SplitEditor;
