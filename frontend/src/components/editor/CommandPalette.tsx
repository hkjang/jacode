'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Search, 
  File, 
  Settings, 
  Code, 
  Save, 
  FolderOpen,
  Sparkles,
  Terminal,
  GitBranch,
  Palette,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Command {
  id: string;
  label: string;
  shortcut?: string;
  icon?: React.ElementType;
  category?: string;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  commands: Command[];
}

export function CommandPalette({ isOpen, onClose, commands }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter commands based on query
  const filteredCommands = commands.filter(cmd => 
    cmd.label.toLowerCase().includes(query.toLowerCase()) ||
    cmd.category?.toLowerCase().includes(query.toLowerCase())
  );

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
        setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
          onClose();
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  }, [filteredCommands, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      
      {/* Palette */}
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
            placeholder="Type a command..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="px-1.5 py-0.5 text-[10px] bg-muted rounded font-mono">ESC</kbd>
        </div>

        {/* Command List */}
        <div ref={listRef} className="max-h-80 overflow-auto py-1">
          {filteredCommands.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              No commands found
            </div>
          ) : (
            filteredCommands.map((cmd, index) => {
              const Icon = cmd.icon || Code;
              return (
                <div
                  key={cmd.id}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors',
                    index === selectedIndex ? 'bg-accent' : 'hover:bg-accent/50'
                  )}
                  onClick={() => {
                    cmd.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    {cmd.category && (
                      <span className="text-muted-foreground text-xs mr-1">{cmd.category}:</span>
                    )}
                    <span className="text-sm">{cmd.label}</span>
                  </div>
                  {cmd.shortcut && (
                    <kbd className="px-1.5 py-0.5 text-[10px] bg-muted rounded font-mono">
                      {cmd.shortcut}
                    </kbd>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// Default commands factory
export function useDefaultCommands(handlers: {
  onNewFile?: () => void;
  onSave?: () => void;
  onOpenFile?: () => void;
  onOpenSettings?: () => void;
  onToggleAI?: () => void;
  onToggleTerminal?: () => void;
  onFormatDocument?: () => void;
  onGoToLine?: () => void;
  onFindInFiles?: () => void;
}): Command[] {
  return [
    {
      id: 'new-file',
      label: 'New File',
      shortcut: 'Ctrl+N',
      icon: File,
      category: 'File',
      action: handlers.onNewFile || (() => {}),
    },
    {
      id: 'save',
      label: 'Save',
      shortcut: 'Ctrl+S',
      icon: Save,
      category: 'File',
      action: handlers.onSave || (() => {}),
    },
    {
      id: 'open-file',
      label: 'Open File',
      shortcut: 'Ctrl+O',
      icon: FolderOpen,
      category: 'File',
      action: handlers.onOpenFile || (() => {}),
    },
    {
      id: 'settings',
      label: 'Open Settings',
      shortcut: 'Ctrl+,',
      icon: Settings,
      category: 'Preferences',
      action: handlers.onOpenSettings || (() => {}),
    },
    {
      id: 'toggle-ai',
      label: 'Toggle AI Chat',
      shortcut: 'Ctrl+Shift+A',
      icon: Sparkles,
      category: 'View',
      action: handlers.onToggleAI || (() => {}),
    },
    {
      id: 'toggle-terminal',
      label: 'Toggle Terminal',
      shortcut: 'Ctrl+`',
      icon: Terminal,
      category: 'View',
      action: handlers.onToggleTerminal || (() => {}),
    },
    {
      id: 'format-document',
      label: 'Format Document',
      shortcut: 'Shift+Alt+F',
      icon: Palette,
      category: 'Edit',
      action: handlers.onFormatDocument || (() => {}),
    },
    {
      id: 'go-to-line',
      label: 'Go to Line',
      shortcut: 'Ctrl+G',
      icon: Code,
      category: 'Go',
      action: handlers.onGoToLine || (() => {}),
    },
    {
      id: 'find-in-files',
      label: 'Find in Files',
      shortcut: 'Ctrl+Shift+F',
      icon: Search,
      category: 'Search',
      action: handlers.onFindInFiles || (() => {}),
    },
  ];
}

export default CommandPalette;
