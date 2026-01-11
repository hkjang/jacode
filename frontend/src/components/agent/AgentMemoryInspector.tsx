'use client';

import { useState } from 'react';
import {
  Brain,
  MessageSquare,
  FileText,
  Clock,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AgentMemory {
  id: string;
  type: 'CONVERSATION' | 'WORKING' | 'SUMMARY';
  content: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

interface AgentMemoryInspectorProps {
  memories: AgentMemory[];
  isLoading?: boolean;
}

const MEMORY_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  CONVERSATION: { icon: MessageSquare, color: 'text-blue-500', label: 'Conversation History' },
  WORKING: { icon: Brain, color: 'text-purple-500', label: 'Working Memory' },
  SUMMARY: { icon: FileText, color: 'text-green-500', label: 'Summary' },
};

export function AgentMemoryInspector({ memories, isLoading }: AgentMemoryInspectorProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {[1, 2].map(i => (
          <div key={i} className="animate-pulse">
            <div className="h-10 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (memories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Brain className="h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm">No memory entries</p>
      </div>
    );
  }

  return (
    <div className="divide-y">
      {memories.map(memory => {
        const config = MEMORY_CONFIG[memory.type] || MEMORY_CONFIG.WORKING;
        const Icon = config.icon;
        const isExpanded = expandedIds.has(memory.id);
        
        let parsedContent: any = null;
        try {
          parsedContent = JSON.parse(memory.content);
        } catch {
          // Not JSON, keep as string
        }

        return (
          <div key={memory.id} className="p-3">
            {/* Header */}
            <button
              onClick={() => toggleExpand(memory.id)}
              className="flex items-center gap-2 w-full text-left"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              
              <Icon className={cn('h-4 w-4', config.color)} />
              <span className="text-sm font-medium">{config.label}</span>

              <span className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                <Clock className="h-3 w-3" />
                {formatDate(memory.createdAt)}
              </span>
            </button>

            {/* Preview */}
            {!isExpanded && (
              <p className="text-xs text-muted-foreground truncate mt-1 ml-6">
                {parsedContent
                  ? (Array.isArray(parsedContent) 
                      ? `${parsedContent.length} entries` 
                      : `${Object.keys(parsedContent).length} keys`)
                  : memory.content.slice(0, 100)}
              </p>
            )}

            {/* Expanded content */}
            {isExpanded && (
              <div className="mt-3 ml-6">
                {memory.type === 'CONVERSATION' && Array.isArray(parsedContent) ? (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {parsedContent.slice(-10).map((msg: any, i: number) => (
                      <div
                        key={i}
                        className={cn(
                          'text-xs p-2 rounded',
                          msg.role === 'user' && 'bg-blue-100 dark:bg-blue-900/30',
                          msg.role === 'assistant' && 'bg-muted',
                          msg.role === 'system' && 'bg-yellow-100 dark:bg-yellow-900/30',
                          msg.role === 'tool' && 'bg-green-100 dark:bg-green-900/30'
                        )}
                      >
                        <p className="font-medium mb-1 capitalize">{msg.role}</p>
                        <p className="whitespace-pre-wrap">{msg.content?.slice(0, 500)}</p>
                      </div>
                    ))}
                  </div>
                ) : memory.type === 'WORKING' && parsedContent ? (
                  <div className="space-y-2">
                    {Object.entries(parsedContent).map(([key, value]) => (
                      <div key={key} className="text-xs">
                        <span className="font-medium text-muted-foreground">{key}:</span>
                        <pre className="bg-muted rounded p-2 mt-1 overflow-x-auto">
                          {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                        </pre>
                      </div>
                    ))}
                  </div>
                ) : (
                  <pre className="text-xs bg-muted rounded p-2 overflow-x-auto max-h-60 whitespace-pre-wrap">
                    {memory.content.slice(0, 2000)}
                  </pre>
                )}

                {/* Metadata */}
                {memory.metadata && Object.keys(memory.metadata).length > 0 && (
                  <div className="mt-2 pt-2 border-t">
                    <p className="text-xs text-muted-foreground mb-1">Metadata</p>
                    <pre className="text-xs bg-muted rounded p-2">
                      {JSON.stringify(memory.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
