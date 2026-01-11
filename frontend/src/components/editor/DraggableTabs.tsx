'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, FileCode, MoreHorizontal, SplitSquareHorizontal, Pin, PinOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  ContextMenu, 
  ContextMenuContent, 
  ContextMenuItem, 
  ContextMenuSeparator, 
  ContextMenuTrigger 
} from '@/components/ui/context-menu';

interface Tab {
  id: string;
  path: string;
  name: string;
  isDirty?: boolean;
  language?: string;
  isPinned?: boolean;
}

interface DraggableTabsProps {
  tabs: Tab[];
  activeTabId?: string;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onCloseOtherTabs?: (id: string) => void;
  onCloseAllTabs?: () => void;
  onCloseTabsToRight?: (id: string) => void;
  onReorderTabs?: (fromIndex: number, toIndex: number) => void;
  onPinTab?: (id: string) => void;
  onUnpinTab?: (id: string) => void;
  onSplitTab?: (id: string) => void;
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
    prisma: 'text-indigo-500',
  };
  return colorMap[ext || ''] || 'text-muted-foreground';
};

export function DraggableTabs({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onCloseOtherTabs,
  onCloseAllTabs,
  onCloseTabsToRight,
  onReorderTabs,
  onPinTab,
  onUnpinTab,
  onSplitTab,
  className,
}: DraggableTabsProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Separate pinned and unpinned
  const pinnedTabs = tabs.filter(t => t.isPinned);
  const unpinnedTabs = tabs.filter(t => !t.isPinned);
  const orderedTabs = [...pinnedTabs, ...unpinnedTabs];

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      onReorderTabs?.(draggedIndex, dragOverIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  // Scroll active tab into view
  useEffect(() => {
    if (activeTabId && scrollRef.current) {
      const activeElement = scrollRef.current.querySelector(`[data-tab-id="${activeTabId}"]`);
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [activeTabId]);

  if (tabs.length === 0) return null;

  return (
    <div 
      ref={scrollRef}
      className={cn(
        'flex items-center bg-muted/30 border-b overflow-x-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent',
        className
      )}
    >
      {orderedTabs.map((tab, index) => {
        const isActive = tab.id === activeTabId;
        const iconColor = getTabColor(tab.name);
        const isDragOver = dragOverIndex === index;
        const isDragging = draggedIndex === index;
        
        return (
          <ContextMenu key={tab.id}>
            <ContextMenuTrigger asChild>
              <div
                data-tab-id={tab.id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                onDragLeave={handleDragLeave}
                className={cn(
                  'group flex items-center gap-1.5 px-3 py-1.5 border-r cursor-pointer transition-all min-w-0',
                  isActive 
                    ? 'bg-background border-t-2 border-t-primary' 
                    : 'hover:bg-accent/50',
                  isDragging && 'opacity-50',
                  isDragOver && 'border-l-2 border-l-primary',
                  tab.isPinned && 'bg-muted/50'
                )}
                onClick={() => onSelectTab(tab.id)}
              >
                {tab.isPinned && (
                  <Pin className="h-2.5 w-2.5 text-yellow-500 flex-shrink-0" />
                )}
                <FileCode className={cn('h-3.5 w-3.5 flex-shrink-0', iconColor)} />
                <span className={cn(
                  'text-xs truncate',
                  tab.isPinned ? 'max-w-[60px]' : 'max-w-[120px]',
                  isActive ? 'text-foreground' : 'text-muted-foreground'
                )}>
                  {tab.name}
                </span>
                
                {/* Dirty indicator or close button */}
                {!tab.isPinned && (
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
                )}
              </div>
            </ContextMenuTrigger>

            <ContextMenuContent className="w-48">
              <ContextMenuItem onClick={() => onSelectTab(tab.id)}>
                Open
              </ContextMenuItem>
              {onSplitTab && (
                <ContextMenuItem onClick={() => onSplitTab(tab.id)}>
                  <SplitSquareHorizontal className="h-4 w-4 mr-2" />
                  Split Right
                </ContextMenuItem>
              )}
              <ContextMenuSeparator />
              
              {tab.isPinned ? (
                onUnpinTab && (
                  <ContextMenuItem onClick={() => onUnpinTab(tab.id)}>
                    <PinOff className="h-4 w-4 mr-2" />
                    Unpin Tab
                  </ContextMenuItem>
                )
              ) : (
                onPinTab && (
                  <ContextMenuItem onClick={() => onPinTab(tab.id)}>
                    <Pin className="h-4 w-4 mr-2" />
                    Pin Tab
                  </ContextMenuItem>
                )
              )}
              
              <ContextMenuSeparator />
              <ContextMenuItem 
                onClick={() => onCloseTab(tab.id)}
                disabled={tab.isPinned}
              >
                Close
              </ContextMenuItem>
              {onCloseOtherTabs && (
                <ContextMenuItem onClick={() => onCloseOtherTabs(tab.id)}>
                  Close Others
                </ContextMenuItem>
              )}
              {onCloseTabsToRight && (
                <ContextMenuItem onClick={() => onCloseTabsToRight(tab.id)}>
                  Close to the Right
                </ContextMenuItem>
              )}
              {onCloseAllTabs && (
                <ContextMenuItem onClick={onCloseAllTabs}>
                  Close All
                </ContextMenuItem>
              )}

              <ContextMenuSeparator />
              <ContextMenuItem onClick={() => {
                navigator.clipboard.writeText(tab.path);
              }}>
                Copy Path
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        );
      })}
      
      {/* Spacer to fill remaining width */}
      <div className="flex-1 min-w-4" />
    </div>
  );
}

export default DraggableTabs;
