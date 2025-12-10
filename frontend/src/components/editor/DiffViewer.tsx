'use client';

import { useState } from 'react';
import { Check, X, ChevronDown, ChevronRight, FileCode } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  changes: DiffChange[];
}

interface DiffChange {
  type: 'add' | 'remove' | 'context';
  content: string;
  oldLine?: number;
  newLine?: number;
}

interface DiffViewerProps {
  title: string;
  filePath: string;
  oldContent: string;
  newContent: string;
  onApprove?: () => void;
  onReject?: () => void;
  readOnly?: boolean;
}

function computeDiff(oldText: string, newText: string): DiffHunk[] {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const changes: DiffChange[] = [];
  
  let oldIdx = 0;
  let newIdx = 0;
  
  while (oldIdx < oldLines.length || newIdx < newLines.length) {
    if (oldIdx >= oldLines.length) {
      changes.push({ type: 'add', content: newLines[newIdx], newLine: newIdx + 1 });
      newIdx++;
    } else if (newIdx >= newLines.length) {
      changes.push({ type: 'remove', content: oldLines[oldIdx], oldLine: oldIdx + 1 });
      oldIdx++;
    } else if (oldLines[oldIdx] === newLines[newIdx]) {
      changes.push({ type: 'context', content: oldLines[oldIdx], oldLine: oldIdx + 1, newLine: newIdx + 1 });
      oldIdx++;
      newIdx++;
    } else {
      // Simple diff: mark as remove then add
      changes.push({ type: 'remove', content: oldLines[oldIdx], oldLine: oldIdx + 1 });
      changes.push({ type: 'add', content: newLines[newIdx], newLine: newIdx + 1 });
      oldIdx++;
      newIdx++;
    }
  }

  return [{
    oldStart: 1,
    oldLines: oldLines.length,
    newStart: 1,
    newLines: newLines.length,
    changes,
  }];
}

export function DiffViewer({
  title,
  filePath,
  oldContent,
  newContent,
  onApprove,
  onReject,
  readOnly = false,
}: DiffViewerProps) {
  const [collapsed, setCollapsed] = useState(false);
  const hunks = computeDiff(oldContent, newContent);
  
  const addedLines = hunks.reduce(
    (acc, hunk) => acc + hunk.changes.filter((c) => c.type === 'add').length,
    0
  );
  const removedLines = hunks.reduce(
    (acc, hunk) => acc + hunk.changes.filter((c) => c.type === 'remove').length,
    0
  );

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      {/* Header */}
      <div className="p-3 border-b bg-muted/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-0.5 hover:bg-accent rounded"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          <FileCode className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">{filePath}</span>
          <div className="flex items-center gap-2 ml-4">
            <span className="text-xs text-green-500">+{addedLines}</span>
            <span className="text-xs text-red-500">-{removedLines}</span>
          </div>
        </div>
        {!readOnly && (onApprove || onReject) && (
          <div className="flex items-center gap-2">
            {onApprove && (
              <Button size="sm" variant="success" onClick={onApprove}>
                <Check className="h-3 w-3 mr-1" />
                Apply
              </Button>
            )}
            {onReject && (
              <Button size="sm" variant="outline" onClick={onReject}>
                <X className="h-3 w-3 mr-1" />
                Discard
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Diff Content */}
      {!collapsed && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <tbody>
              {hunks.map((hunk, hunkIdx) =>
                hunk.changes.map((change, changeIdx) => (
                  <tr
                    key={`${hunkIdx}-${changeIdx}`}
                    className={
                      change.type === 'add'
                        ? 'bg-green-500/10'
                        : change.type === 'remove'
                        ? 'bg-red-500/10'
                        : ''
                    }
                  >
                    <td className="w-10 text-right pr-2 text-muted-foreground select-none border-r">
                      {change.oldLine || ''}
                    </td>
                    <td className="w-10 text-right pr-2 text-muted-foreground select-none border-r">
                      {change.newLine || ''}
                    </td>
                    <td className="w-6 text-center select-none">
                      {change.type === 'add' ? (
                        <span className="text-green-500">+</span>
                      ) : change.type === 'remove' ? (
                        <span className="text-red-500">-</span>
                      ) : (
                        ''
                      )}
                    </td>
                    <td className="pl-2 pr-4 whitespace-pre">
                      {change.content}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

interface MultiFileDiffProps {
  title: string;
  diffs: {
    path: string;
    oldContent: string;
    newContent: string;
  }[];
  onApproveAll?: () => void;
  onRejectAll?: () => void;
}

export function MultiFileDiff({
  title,
  diffs,
  onApproveAll,
  onRejectAll,
}: MultiFileDiffProps) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{title}</h3>
        <div className="flex items-center gap-2">
          {onApproveAll && (
            <Button size="sm" variant="success" onClick={onApproveAll}>
              <Check className="h-3 w-3 mr-1" />
              Apply All
            </Button>
          )}
          {onRejectAll && (
            <Button size="sm" variant="outline" onClick={onRejectAll}>
              <X className="h-3 w-3 mr-1" />
              Discard All
            </Button>
          )}
        </div>
      </div>

      {/* Diffs */}
      <div className="space-y-4">
        {diffs.map((diff, idx) => (
          <DiffViewer
            key={idx}
            title={`File ${idx + 1}`}
            filePath={diff.path}
            oldContent={diff.oldContent}
            newContent={diff.newContent}
            readOnly
          />
        ))}
      </div>
    </div>
  );
}
