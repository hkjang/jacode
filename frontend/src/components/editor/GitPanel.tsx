'use client';

import React, { useState, useCallback } from 'react';
import { 
  GitBranch, 
  GitCommit, 
  Plus, 
  Minus, 
  Edit3,
  RefreshCw,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  MoreHorizontal
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type ChangeType = 'added' | 'modified' | 'deleted' | 'renamed';

interface GitChange {
  path: string;
  name: string;
  type: ChangeType;
  staged: boolean;
}

interface GitPanelProps {
  branch?: string;
  changes: GitChange[];
  onStageFile?: (path: string) => void;
  onUnstageFile?: (path: string) => void;
  onStageAll?: () => void;
  onUnstageAll?: () => void;
  onDiscardFile?: (path: string) => void;
  onCommit?: (message: string) => void;
  onRefresh?: () => void;
  onFileClick?: (path: string) => void;
  className?: string;
}

const changeIcon = {
  added: Plus,
  modified: Edit3,
  deleted: Minus,
  renamed: Edit3,
};

const changeColor = {
  added: 'text-green-500',
  modified: 'text-yellow-500',
  deleted: 'text-red-500',
  renamed: 'text-blue-500',
};

const changeLetter = {
  added: 'A',
  modified: 'M',
  deleted: 'D',
  renamed: 'R',
};

export function GitPanel({
  branch = 'main',
  changes,
  onStageFile,
  onUnstageFile,
  onStageAll,
  onUnstageAll,
  onDiscardFile,
  onCommit,
  onRefresh,
  onFileClick,
  className,
}: GitPanelProps) {
  const [commitMessage, setCommitMessage] = useState('');
  const [stagedExpanded, setStagedExpanded] = useState(true);
  const [changesExpanded, setChangesExpanded] = useState(true);

  const stagedChanges = changes.filter(c => c.staged);
  const unstagedChanges = changes.filter(c => !c.staged);

  const handleCommit = () => {
    if (commitMessage.trim() && stagedChanges.length > 0 && onCommit) {
      onCommit(commitMessage);
      setCommitMessage('');
    }
  };

  const renderFile = (change: GitChange, isStaged: boolean) => {
    const Icon = changeIcon[change.type];
    const color = changeColor[change.type];
    const letter = changeLetter[change.type];

    return (
      <div
        key={change.path}
        className="group flex items-center gap-2 px-2 py-1 hover:bg-accent/50 transition-colors cursor-pointer"
        onClick={() => onFileClick?.(change.path)}
      >
        <span className={cn('text-[10px] font-mono w-3', color)}>{letter}</span>
        <span className="flex-1 text-xs truncate">{change.name}</span>
        
        {/* Actions */}
        <div className="hidden group-hover:flex items-center gap-0.5">
          {isStaged ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0"
              onClick={(e) => { e.stopPropagation(); onUnstageFile?.(change.path); }}
              title="Unstage"
            >
              <Minus className="h-3 w-3" />
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0"
                onClick={(e) => { e.stopPropagation(); onStageFile?.(change.path); }}
                title="Stage"
              >
                <Plus className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 text-destructive"
                onClick={(e) => { e.stopPropagation(); onDiscardFile?.(change.path); }}
                title="Discard changes"
              >
                <X className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4" />
          <span className="text-xs font-medium">{branch}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={onRefresh}
          title="Refresh"
        >
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>

      {/* Commit Message */}
      <div className="p-2 border-b space-y-2">
        <textarea
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          placeholder="Message (press Ctrl+Enter to commit)"
          className="w-full h-16 px-2 py-1 text-xs bg-muted border rounded resize-none focus:outline-none focus:ring-1 focus:ring-primary"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
              handleCommit();
            }
          }}
        />
        <Button
          size="sm"
          className="w-full h-7 text-xs"
          disabled={!commitMessage.trim() || stagedChanges.length === 0}
          onClick={handleCommit}
        >
          <Check className="h-3 w-3 mr-1" />
          Commit ({stagedChanges.length})
        </Button>
      </div>

      {/* Changes */}
      <div className="flex-1 overflow-auto">
        {/* Staged */}
        {stagedChanges.length > 0 && (
          <div>
            <button
              className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-medium hover:bg-accent/50 transition-colors"
              onClick={() => setStagedExpanded(!stagedExpanded)}
            >
              <div className="flex items-center gap-1">
                {stagedExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                <span>Staged Changes</span>
                <span className="text-muted-foreground">({stagedChanges.length})</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0"
                onClick={(e) => { e.stopPropagation(); onUnstageAll?.(); }}
                title="Unstage all"
              >
                <Minus className="h-3 w-3" />
              </Button>
            </button>
            {stagedExpanded && stagedChanges.map(c => renderFile(c, true))}
          </div>
        )}

        {/* Unstaged */}
        {unstagedChanges.length > 0 && (
          <div>
            <button
              className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-medium hover:bg-accent/50 transition-colors"
              onClick={() => setChangesExpanded(!changesExpanded)}
            >
              <div className="flex items-center gap-1">
                {changesExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                <span>Changes</span>
                <span className="text-muted-foreground">({unstagedChanges.length})</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0"
                onClick={(e) => { e.stopPropagation(); onStageAll?.(); }}
                title="Stage all"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </button>
            {changesExpanded && unstagedChanges.map(c => renderFile(c, false))}
          </div>
        )}

        {/* Empty state */}
        {changes.length === 0 && (
          <div className="px-3 py-8 text-center text-xs text-muted-foreground">
            <GitCommit className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No changes</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default GitPanel;
