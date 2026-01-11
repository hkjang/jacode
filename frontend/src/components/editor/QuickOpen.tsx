'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { File, Clock, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FileTreeNode } from './FileExplorer';

interface QuickOpenProps {
  isOpen: boolean;
  onClose: () => void;
  files: FileTreeNode[];
  recentFiles?: string[];
  onSelectFile: (path: string) => void;
}

// Flatten file tree to list
function flattenFiles(nodes: FileTreeNode[], result: { path: string; name: string }[] = []): { path: string; name: string }[] {
  for (const node of nodes) {
    if (!node.isDirectory) {
      result.push({ path: node.path, name: node.name });
    }
    if (node.children) {
      flattenFiles(node.children, result);
    }
  }
  return result;
}

// Simple fuzzy match scoring
function fuzzyScore(query: string, target: string): number {
  const lowerQuery = query.toLowerCase();
  const lowerTarget = target.toLowerCase();
  
  if (lowerTarget === lowerQuery) return 100;
  if (lowerTarget.includes(lowerQuery)) return 80;
  
  // Character-by-character match
  let score = 0;
  let queryIdx = 0;
  for (let i = 0; i < lowerTarget.length && queryIdx < lowerQuery.length; i++) {
    if (lowerTarget[i] === lowerQuery[queryIdx]) {
      score += 10;
      queryIdx++;
    }
  }
  
  return queryIdx === lowerQuery.length ? score : 0;
}

export function QuickOpen({ isOpen, onClose, files, recentFiles = [], onSelectFile }: QuickOpenProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Flatten and memoize file list
  const allFiles = useMemo(() => flattenFiles(files), [files]);

  // Filter and sort files by match score
  const filteredFiles = useMemo(() => {
    if (!query.trim()) {
      // Show recent files first, then other files
      const recentSet = new Set(recentFiles);
      const recent = allFiles.filter(f => recentSet.has(f.path));
      const others = allFiles.filter(f => !recentSet.has(f.path)).slice(0, 10);
      return [
        ...recent.map(f => ({ ...f, isRecent: true })),
        ...others.map(f => ({ ...f, isRecent: false }))
      ];
    }

    return allFiles
      .map(f => ({ ...f, score: fuzzyScore(query, f.name), isRecent: false }))
      .filter(f => f.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
  }, [allFiles, query, recentFiles]);

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && selectedIndex >= 0) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filteredFiles.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredFiles[selectedIndex]) {
          onSelectFile(filteredFiles[selectedIndex].path);
          onClose();
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  }, [filteredFiles, selectedIndex, onSelectFile, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      
      {/* Quick Open Dialog */}
      <div 
        className="relative w-full max-w-xl bg-popover border rounded-lg shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-2 px-3 py-2 border-b">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Go to file..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="px-1.5 py-0.5 text-[10px] bg-muted rounded font-mono">ESC</kbd>
        </div>

        {/* File List */}
        <div ref={listRef} className="max-h-80 overflow-auto py-1">
          {filteredFiles.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              No files found
            </div>
          ) : (
            filteredFiles.map((file, index) => (
              <div
                key={file.path}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors',
                  index === selectedIndex ? 'bg-accent' : 'hover:bg-accent/50'
                )}
                onClick={() => {
                  onSelectFile(file.path);
                  onClose();
                }}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                {file.isRecent ? (
                  <Clock className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <File className="h-4 w-4 text-muted-foreground" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{file.name}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{file.path}</div>
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* Footer hint */}
        <div className="px-3 py-1.5 border-t bg-muted/30 flex items-center gap-4 text-[10px] text-muted-foreground">
          <span><kbd className="px-1 bg-muted rounded">↑↓</kbd> to navigate</span>
          <span><kbd className="px-1 bg-muted rounded">Enter</kbd> to open</span>
        </div>
      </div>
    </div>
  );
}

export default QuickOpen;
