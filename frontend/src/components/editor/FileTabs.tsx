'use client';

import React from 'react';
import { X, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FileTab {
  id: string;
  name: string;
  path: string;
  language?: string;
  isDirty?: boolean;
}

interface FileTabsProps {
  tabs: FileTab[];
  activeTabId?: string;
  onSelectTab: (tab: FileTab) => void;
  onCloseTab: (tab: FileTab) => void;
  className?: string;
}

// File type icons based on extension
const getTabIcon = (name: string) => {
  const ext = name.split('.').pop()?.toLowerCase();
  const iconColors: Record<string, string> = {
    ts: 'bg-blue-500',
    tsx: 'bg-blue-500',
    js: 'bg-yellow-500',
    jsx: 'bg-yellow-500',
    json: 'bg-yellow-600',
    css: 'bg-blue-400',
    html: 'bg-orange-500',
    md: 'bg-gray-400',
    py: 'bg-green-500',
    go: 'bg-cyan-500',
  };
  return iconColors[ext || ''] || 'bg-muted-foreground';
};

export function FileTabs({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  className,
}: FileTabsProps) {
  return (
    <div className={cn('flex items-center border-b bg-muted/30 overflow-x-auto', className)}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        const iconColor = getTabIcon(tab.name);

        return (
          <div
            key={tab.id}
            className={cn(
              'group flex items-center gap-2 px-3 py-2 border-r cursor-pointer transition-colors min-w-[120px] max-w-[200px]',
              isActive
                ? 'bg-background border-b-2 border-b-primary text-foreground'
                : 'text-muted-foreground hover:bg-accent/50',
            )}
            onClick={() => onSelectTab(tab)}
          >
            {/* File type indicator */}
            <span className={cn('w-2 h-2 rounded-full shrink-0', iconColor)} />

            {/* Dirty indicator or file name */}
            <span className="flex-1 truncate text-sm">
              {tab.name}
            </span>

            {/* Dirty dot or close button */}
            <div className="shrink-0 w-4 h-4 flex items-center justify-center">
              {tab.isDirty ? (
                <Circle className="h-2 w-2 fill-current text-foreground" />
              ) : (
                <button
                  className={cn(
                    'hidden group-hover:flex items-center justify-center rounded hover:bg-accent',
                    isActive && 'flex',
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(tab);
                  }}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default FileTabs;
