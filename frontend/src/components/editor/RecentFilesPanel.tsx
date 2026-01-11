'use client';

import React from 'react';
import { Clock, X, File, FolderOpen, Star, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface RecentFile {
  path: string;
  name: string;
  openedAt: Date;
  projectName?: string;
}

interface RecentFilesPanelProps {
  recentFiles: RecentFile[];
  pinnedFiles?: string[];
  onOpenFile: (path: string) => void;
  onRemoveFromRecent: (path: string) => void;
  onPinFile?: (path: string) => void;
  onUnpinFile?: (path: string) => void;
  onClearAll?: () => void;
  maxItems?: number;
  className?: string;
}

export function RecentFilesPanel({
  recentFiles,
  pinnedFiles = [],
  onOpenFile,
  onRemoveFromRecent,
  onPinFile,
  onUnpinFile,
  onClearAll,
  maxItems = 20,
  className,
}: RecentFilesPanelProps) {
  // Split into pinned and regular
  const pinned = recentFiles.filter(f => pinnedFiles.includes(f.path));
  const regular = recentFiles.filter(f => !pinnedFiles.includes(f.path)).slice(0, maxItems);

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const renderFile = (file: RecentFile, isPinned: boolean) => (
    <div
      key={file.path}
      className="group flex items-center gap-2 px-3 py-2 hover:bg-accent/50 transition-colors cursor-pointer"
      onClick={() => onOpenFile(file.path)}
    >
      <File className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-sm truncate">{file.name}</div>
        <div className="text-[10px] text-muted-foreground truncate flex items-center gap-2">
          <span>{file.projectName || file.path}</span>
          <span>·</span>
          <span>{formatTime(file.openedAt)}</span>
        </div>
      </div>
      
      {/* Actions */}
      <div className="hidden group-hover:flex items-center gap-0.5">
        {onPinFile && onUnpinFile && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={(e) => {
              e.stopPropagation();
              isPinned ? onUnpinFile(file.path) : onPinFile(file.path);
            }}
            title={isPinned ? 'Unpin' : 'Pin'}
          >
            <Star className={cn('h-3 w-3', isPinned && 'fill-yellow-500 text-yellow-500')} />
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={(e) => {
            e.stopPropagation();
            onRemoveFromRecent(file.path);
          }}
          title="Remove from recent"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium">Recent Files</span>
          <span className="text-[10px] text-muted-foreground">({recentFiles.length})</span>
        </div>
        {onClearAll && recentFiles.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[10px]"
            onClick={onClearAll}
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Clear All
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {recentFiles.length === 0 ? (
          <div className="px-3 py-8 text-center text-xs text-muted-foreground">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No recent files</p>
            <p className="text-[10px] mt-1">Files you open will appear here</p>
          </div>
        ) : (
          <>
            {/* Pinned Section */}
            {pinned.length > 0 && (
              <div>
                <div className="px-3 py-1.5 text-[10px] text-muted-foreground font-medium uppercase bg-muted/30">
                  <Star className="h-3 w-3 inline mr-1 fill-yellow-500 text-yellow-500" />
                  Pinned
                </div>
                {pinned.map(f => renderFile(f, true))}
              </div>
            )}

            {/* Recent Section */}
            {regular.length > 0 && (
              <div>
                {pinned.length > 0 && (
                  <div className="px-3 py-1.5 text-[10px] text-muted-foreground font-medium uppercase bg-muted/30">
                    Recent
                  </div>
                )}
                {regular.map(f => renderFile(f, false))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default RecentFilesPanel;
