'use client';

import React, { useEffect, useCallback } from 'react';

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description?: string;
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  shortcuts: KeyboardShortcut[];
}

// Hook for registering keyboard shortcuts
export function useKeyboardShortcuts({ enabled = true, shortcuts }: UseKeyboardShortcutsOptions) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in input/textarea
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      // Allow some shortcuts even in inputs
      if (!e.ctrlKey && !e.metaKey) return;
    }

    for (const shortcut of shortcuts) {
      const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();
      const ctrlMatch = shortcut.ctrl ? (e.ctrlKey || e.metaKey) : !(e.ctrlKey || e.metaKey);
      const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
      const altMatch = shortcut.alt ? e.altKey : !e.altKey;

      if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
        e.preventDefault();
        e.stopPropagation();
        shortcut.action();
        return;
      }
    }
  }, [shortcuts]);

  useEffect(() => {
    if (!enabled) return;
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleKeyDown]);
}

// Component wrapper for keyboard shortcuts
interface KeyboardShortcutsProviderProps {
  children: React.ReactNode;
  shortcuts: KeyboardShortcut[];
  enabled?: boolean;
}

export function KeyboardShortcutsProvider({ 
  children, 
  shortcuts, 
  enabled = true 
}: KeyboardShortcutsProviderProps) {
  useKeyboardShortcuts({ enabled, shortcuts });
  return <>{children}</>;
}

// Pre-defined shortcut factories
export const createEditorShortcuts = (handlers: {
  onSave?: () => void;
  onQuickOpen?: () => void;
  onCommandPalette?: () => void;
  onFindInFiles?: () => void;
  onToggleSidebar?: () => void;
  onToggleAI?: () => void;
  onCloseTab?: () => void;
  onNextTab?: () => void;
  onPrevTab?: () => void;
  onGoToLine?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
}): KeyboardShortcut[] => [
  { key: 's', ctrl: true, action: handlers.onSave || (() => {}), description: 'Save' },
  { key: 'p', ctrl: true, action: handlers.onQuickOpen || (() => {}), description: 'Quick Open' },
  { key: 'p', ctrl: true, shift: true, action: handlers.onCommandPalette || (() => {}), description: 'Command Palette' },
  { key: 'f', ctrl: true, shift: true, action: handlers.onFindInFiles || (() => {}), description: 'Find in Files' },
  { key: 'b', ctrl: true, action: handlers.onToggleSidebar || (() => {}), description: 'Toggle Sidebar' },
  { key: 'a', ctrl: true, shift: true, action: handlers.onToggleAI || (() => {}), description: 'Toggle AI' },
  { key: 'w', ctrl: true, action: handlers.onCloseTab || (() => {}), description: 'Close Tab' },
  { key: 'Tab', ctrl: true, action: handlers.onNextTab || (() => {}), description: 'Next Tab' },
  { key: 'Tab', ctrl: true, shift: true, action: handlers.onPrevTab || (() => {}), description: 'Previous Tab' },
  { key: 'g', ctrl: true, action: handlers.onGoToLine || (() => {}), description: 'Go to Line' },
  { key: 'z', ctrl: true, action: handlers.onUndo || (() => {}), description: 'Undo' },
  { key: 'z', ctrl: true, shift: true, action: handlers.onRedo || (() => {}), description: 'Redo' },
];

export default KeyboardShortcutsProvider;
