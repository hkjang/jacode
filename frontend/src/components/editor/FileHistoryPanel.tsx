'use client';

import React, { useState } from 'react';
import { 
  History, 
  Clock, 
  RotateCcw, 
  ChevronDown, 
  ChevronRight,
  Tag,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface HistoryEntry {
  id: string;
  type: 'save' | 'autosave' | 'checkpoint' | 'external';
  timestamp: Date;
  label?: string;
  author?: string;
  preview?: string;
}

interface FileHistoryPanelProps {
  filePath: string;
  history: HistoryEntry[];
  currentVersion?: string;
  onRestore: (id: string) => void;
  onCompare?: (id: string) => void;
  onCreateCheckpoint?: (label: string) => void;
  className?: string;
}

const typeConfig = {
  save: { icon: Clock, color: 'text-blue-500', label: 'Saved' },
  autosave: { icon: Clock, color: 'text-muted-foreground', label: 'Auto-saved' },
  checkpoint: { icon: Tag, color: 'text-green-500', label: 'Checkpoint' },
  external: { icon: User, color: 'text-orange-500', label: 'External change' },
};

export function FileHistoryPanel({
  filePath,
  history,
  currentVersion,
  onRestore,
  onCompare,
  onCreateCheckpoint,
  className,
}: FileHistoryPanelProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [checkpointLabel, setCheckpointLabel] = useState('');

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Group by date
  const groupedHistory = history.reduce<Record<string, HistoryEntry[]>>((acc, entry) => {
    const dateKey = entry.timestamp.toDateString();
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(entry);
    return acc;
  }, {});

  const fileName = filePath.split('/').pop() || filePath;

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b">
        <History className="h-4 w-4 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium">File History</div>
          <div className="text-[10px] text-muted-foreground truncate">{fileName}</div>
        </div>
      </div>

      {/* Create Checkpoint */}
      {onCreateCheckpoint && (
        <div className="px-3 py-2 border-b">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={checkpointLabel}
              onChange={(e) => setCheckpointLabel(e.target.value)}
              placeholder="Checkpoint label..."
              className="flex-1 h-7 px-2 text-xs bg-muted border rounded focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <Button
              size="sm"
              className="h-7 text-xs"
              disabled={!checkpointLabel.trim()}
              onClick={() => {
                onCreateCheckpoint(checkpointLabel.trim());
                setCheckpointLabel('');
              }}
            >
              <Tag className="h-3 w-3 mr-1" />
              Save
            </Button>
          </div>
        </div>
      )}

      {/* History List */}
      <div className="flex-1 overflow-auto">
        {history.length === 0 ? (
          <div className="px-3 py-8 text-center text-xs text-muted-foreground">
            <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No history yet</p>
            <p className="text-[10px] mt-1">Changes will appear here</p>
          </div>
        ) : (
          Object.entries(groupedHistory)
            .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
            .map(([dateKey, entries]) => (
              <div key={dateKey}>
                <div className="px-3 py-1.5 text-[10px] text-muted-foreground font-medium uppercase bg-muted/30 sticky top-0">
                  {dateKey === new Date().toDateString() ? 'Today' :
                   dateKey === new Date(Date.now() - 86400000).toDateString() ? 'Yesterday' :
                   dateKey}
                </div>
                
                {entries
                  .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
                  .map(entry => {
                    const config = typeConfig[entry.type];
                    const Icon = config.icon;
                    const isExpanded = expanded.has(entry.id);
                    const isCurrent = entry.id === currentVersion;

                    return (
                      <div key={entry.id} className="border-b last:border-b-0">
                        <div
                          className={cn(
                            'flex items-center gap-2 px-3 py-2 hover:bg-accent/50 cursor-pointer transition-colors',
                            isCurrent && 'bg-accent'
                          )}
                          onClick={() => toggleExpand(entry.id)}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-3 w-3 flex-shrink-0" />
                          ) : (
                            <ChevronRight className="h-3 w-3 flex-shrink-0" />
                          )}
                          <Icon className={cn('h-3.5 w-3.5 flex-shrink-0', config.color)} />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs flex items-center gap-2">
                              <span>{entry.label || config.label}</span>
                              {isCurrent && (
                                <span className="text-[9px] px-1 bg-primary/20 text-primary rounded">
                                  Current
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {formatTime(entry.timestamp)}
                              {entry.author && ` · ${entry.author}`}
                            </div>
                          </div>
                        </div>

                        {/* Expanded content */}
                        {isExpanded && (
                          <div className="px-3 pb-2 ml-8">
                            {entry.preview && (
                              <pre className="p-2 text-[10px] bg-muted rounded font-mono overflow-x-auto max-h-20">
                                {entry.preview}
                              </pre>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 text-[10px]"
                                onClick={() => onRestore(entry.id)}
                                disabled={isCurrent}
                              >
                                <RotateCcw className="h-3 w-3 mr-1" />
                                Restore
                              </Button>
                              {onCompare && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-6 text-[10px]"
                                  onClick={() => onCompare(entry.id)}
                                >
                                  Compare
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            ))
        )}
      </div>
    </div>
  );
}

export default FileHistoryPanel;
