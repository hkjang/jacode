'use client';

import React, { useState } from 'react';
import { 
  Bookmark, 
  BookmarkPlus, 
  ChevronDown, 
  ChevronRight, 
  Trash2,
  Star,
  StarOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface Bookmark {
  id: string;
  path: string;
  name: string;
  line: number;
  label?: string;
  starred?: boolean;
}

interface BookmarksPanelProps {
  bookmarks: Bookmark[];
  onNavigate: (path: string, line: number) => void;
  onRemove: (id: string) => void;
  onToggleStar: (id: string) => void;
  onAdd?: () => void;
  className?: string;
}

export function BookmarksPanel({
  bookmarks,
  onNavigate,
  onRemove,
  onToggleStar,
  onAdd,
  className,
}: BookmarksPanelProps) {
  const [showStarredOnly, setShowStarredOnly] = useState(false);

  const filteredBookmarks = showStarredOnly 
    ? bookmarks.filter(b => b.starred) 
    : bookmarks;

  // Group by file
  const groupedByFile = filteredBookmarks.reduce<Record<string, Bookmark[]>>((acc, bookmark) => {
    if (!acc[bookmark.path]) acc[bookmark.path] = [];
    acc[bookmark.path].push(bookmark);
    return acc;
  }, {});

  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set(Object.keys(groupedByFile)));

  const toggleFile = (path: string) => {
    setExpandedFiles(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <div className="flex items-center gap-2">
          <Bookmark className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium">Bookmarks ({bookmarks.length})</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant={showStarredOnly ? 'default' : 'ghost'}
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setShowStarredOnly(!showStarredOnly)}
            title={showStarredOnly ? 'Show all' : 'Show starred only'}
          >
            <Star className={cn('h-3 w-3', showStarredOnly && 'fill-current')} />
          </Button>
          {onAdd && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={onAdd}
              title="Add bookmark"
            >
              <BookmarkPlus className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto py-1">
        {Object.keys(groupedByFile).length === 0 ? (
          <div className="px-3 py-8 text-center text-xs text-muted-foreground">
            <Bookmark className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No bookmarks</p>
            <p className="text-[10px] mt-1">Use Ctrl+Shift+B to bookmark a line</p>
          </div>
        ) : (
          Object.entries(groupedByFile).map(([path, fileBookmarks]) => {
            const fileName = path.split('/').pop() || path;
            const isExpanded = expandedFiles.has(path);

            return (
              <div key={path}>
                <button
                  className="w-full flex items-center gap-1 px-2 py-1.5 text-xs font-medium hover:bg-accent/50 transition-colors"
                  onClick={() => toggleFile(path)}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3 w-3 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="h-3 w-3 flex-shrink-0" />
                  )}
                  <span className="truncate flex-1 text-left">{fileName}</span>
                  <span className="text-muted-foreground">{fileBookmarks.length}</span>
                </button>

                {isExpanded && (
                  <div className="ml-4">
                    {fileBookmarks.sort((a, b) => a.line - b.line).map((bookmark) => (
                      <div
                        key={bookmark.id}
                        className="group flex items-center gap-2 px-2 py-1 hover:bg-accent/50 transition-colors cursor-pointer"
                        onClick={() => onNavigate(bookmark.path, bookmark.line)}
                      >
                        <Bookmark className={cn(
                          'h-3 w-3 flex-shrink-0',
                          bookmark.starred ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'
                        )} />
                        <span className="text-xs text-muted-foreground">Ln {bookmark.line}</span>
                        <span className="flex-1 text-xs truncate">
                          {bookmark.label || 'Bookmark'}
                        </span>
                        
                        {/* Actions */}
                        <div className="hidden group-hover:flex items-center gap-0.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleStar(bookmark.id);
                            }}
                          >
                            {bookmark.starred ? (
                              <StarOff className="h-3 w-3" />
                            ) : (
                              <Star className="h-3 w-3" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0 text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemove(bookmark.id);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default BookmarksPanel;
