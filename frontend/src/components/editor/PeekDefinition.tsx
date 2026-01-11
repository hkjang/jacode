'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronDown, ChevronUp, ExternalLink, FileCode } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface PeekDefinition {
  path: string;
  name: string;
  line: number;
  content: string;
  language?: string;
}

interface PeekDefinitionProps {
  isOpen: boolean;
  position: { x: number; y: number };
  definitions: PeekDefinition[];
  onClose: () => void;
  onOpenFile: (path: string, line: number) => void;
  className?: string;
}

export function PeekDefinitionPopup({
  isOpen,
  position,
  definitions,
  onClose,
  onOpenFile,
  className,
}: PeekDefinitionProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowDown':
          e.preventDefault();
          setActiveIndex(prev => Math.min(prev + 1, definitions.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setActiveIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (definitions[activeIndex]) {
            onOpenFile(definitions[activeIndex].path, definitions[activeIndex].line);
            onClose();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeIndex, definitions, onOpenFile, onClose]);

  // Reset on open
  useEffect(() => {
    if (isOpen) setActiveIndex(0);
  }, [isOpen, definitions]);

  if (!isOpen || definitions.length === 0) return null;

  const activeDef = definitions[activeIndex];

  return (
    <div
      ref={ref}
      className={cn(
        'fixed z-50 w-[500px] bg-background border rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95',
        className
      )}
      style={{ left: position.x, top: position.y }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b">
        <div className="flex items-center gap-2">
          <FileCode className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            {definitions.length} definition{definitions.length > 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {definitions.length > 1 && (
            <div className="flex items-center gap-0.5 mr-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0"
                onClick={() => setActiveIndex(prev => Math.max(prev - 1, 0))}
                disabled={activeIndex === 0}
              >
                <ChevronUp className="h-3 w-3" />
              </Button>
              <span className="text-xs text-muted-foreground min-w-[40px] text-center">
                {activeIndex + 1} / {definitions.length}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0"
                onClick={() => setActiveIndex(prev => Math.min(prev + 1, definitions.length - 1))}
                disabled={activeIndex === definitions.length - 1}
              >
                <ChevronDown className="h-3 w-3" />
              </Button>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0"
            onClick={() => {
              onOpenFile(activeDef.path, activeDef.line);
              onClose();
            }}
            title="Go to definition"
          >
            <ExternalLink className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0"
            onClick={onClose}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* File path */}
      <div className="px-3 py-1.5 bg-muted/30 border-b">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground truncate flex-1">{activeDef.path}</span>
          <span className="text-muted-foreground">:{activeDef.line}</span>
        </div>
      </div>

      {/* Code preview */}
      <div className="max-h-[300px] overflow-auto">
        <pre className="p-3 text-xs font-mono bg-zinc-900 text-zinc-100 whitespace-pre-wrap">
          {activeDef.content}
        </pre>
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 border-t bg-muted/30 text-[10px] text-muted-foreground flex items-center gap-4">
        <span><kbd className="px-1 bg-muted rounded">↑↓</kbd> navigate</span>
        <span><kbd className="px-1 bg-muted rounded">Enter</kbd> go to</span>
        <span><kbd className="px-1 bg-muted rounded">Esc</kbd> close</span>
      </div>
    </div>
  );
}

export default PeekDefinitionPopup;
