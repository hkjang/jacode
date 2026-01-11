'use client';

import React from 'react';
import { X, FileCode } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Tab {
  id: string;
  path: string;
  name: string;
  isDirty?: boolean;
  language?: string;
}

interface EditorTabsProps {
  tabs: Tab[];
  activeTabId?: string;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onCloseOtherTabs?: (id: string) => void;
  onCloseAllTabs?: () => void;
  className?: string;
}

// Get icon color based on extension
const getTabColor = (name: string) => {
  const ext = name.split('.').pop()?.toLowerCase();
  const colorMap: Record<string, string> = {
    ts: 'text-blue-500',
    tsx: 'text-blue-500',
    js: 'text-yellow-500',
    jsx: 'text-yellow-500',
    json: 'text-yellow-600',
    css: 'text-blue-400',
    scss: 'text-pink-500',
    html: 'text-orange-500',
    md: 'text-gray-400',
    py: 'text-green-500',
  };
  return colorMap[ext || ''] || 'text-muted-foreground';
};

export function EditorTabs({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onCloseOtherTabs,
  onCloseAllTabs,
  className,
}: EditorTabsProps) {
  if (tabs.length === 0) return null;

  return (
    <div className={cn(
      'flex items-center bg-muted/30 border-b overflow-x-auto',
      className
    )}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        const iconColor = getTabColor(tab.name);
        
        return (
          <div
            key={tab.id}
            className={cn(
              'group flex items-center gap-1.5 px-3 py-1.5 border-r cursor-pointer transition-colors min-w-0',
              isActive 
                ? 'bg-background border-t-2 border-t-primary' 
                : 'hover:bg-accent/50'
            )}
            onClick={() => onSelectTab(tab.id)}
            onContextMenu={(e) => {
              e.preventDefault();
              // Could add context menu here
            }}
          >
            <FileCode className={cn('h-3.5 w-3.5 flex-shrink-0', iconColor)} />
            <span className={cn(
              'text-xs truncate max-w-[120px]',
              isActive ? 'text-foreground' : 'text-muted-foreground'
            )}>
              {tab.name}
            </span>
            
            {/* Dirty indicator or close button */}
            <button
              className={cn(
                'ml-1 p-0.5 rounded hover:bg-accent transition-all flex-shrink-0',
                tab.isDirty 
                  ? 'opacity-100' 
                  : 'opacity-0 group-hover:opacity-100'
              )}
              onClick={(e) => {
                e.stopPropagation();
                onCloseTab(tab.id);
              }}
              title={tab.isDirty ? 'Unsaved changes' : 'Close'}
            >
              {tab.isDirty ? (
                <span className="block w-2 h-2 rounded-full bg-primary" />
              ) : (
                <X className="h-3 w-3" />
              )}
            </button>
          </div>
        );
      })}
      
      {/* Spacer to fill remaining width */}
      <div className="flex-1 min-w-4" />
    </div>
  );
}

export default EditorTabs;
