'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GoToLineDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onGoToLine: (line: number, column?: number) => void;
  maxLine?: number;
  currentLine?: number;
  className?: string;
}

export function GoToLineDialog({
  isOpen,
  onClose,
  onGoToLine,
  maxLine = 9999,
  currentLine = 1,
  className,
}: GoToLineDialogProps) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setValue(String(currentLine));
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isOpen, currentLine]);

  const handleSubmit = () => {
    const parts = value.split(':');
    const line = parseInt(parts[0], 10);
    const column = parts[1] ? parseInt(parts[1], 10) : undefined;

    if (!isNaN(line) && line >= 1 && line <= maxLine) {
      onGoToLine(line, column);
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      
      {/* Dialog */}
      <div 
        className={cn(
          'relative w-full max-w-md bg-popover border rounded-lg shadow-2xl overflow-hidden',
          className
        )}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-3 py-2">
          <span className="text-xs text-muted-foreground">:</span>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Go to line[:column]"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <span className="text-[10px] text-muted-foreground">
            of {maxLine}
          </span>
        </div>
        <div className="px-3 py-1.5 border-t bg-muted/30 text-[10px] text-muted-foreground">
          Type a line number and press Enter. Use "line:column" format for specific column.
        </div>
      </div>
    </div>
  );
}

export default GoToLineDialog;
