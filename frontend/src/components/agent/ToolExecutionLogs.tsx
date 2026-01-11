'use client';

import { useState } from 'react';
import {
  Wrench,
  Clock,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ToolExecution {
  id: string;
  stepNumber: number;
  toolName: string;
  toolInput: Record<string, any>;
  toolOutput: string;
  durationMs: number;
  success: boolean;
  error?: string;
  createdAt: string;
}

interface ToolExecutionLogsProps {
  executions: ToolExecution[];
  isLoading?: boolean;
}

export function ToolExecutionLogs({ executions, isLoading }: ToolExecutionLogsProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  const copyOutput = async (id: string, output: string) => {
    try {
      await navigator.clipboard.writeText(output);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {[1, 2].map(i => (
          <div key={i} className="animate-pulse">
            <div className="h-12 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (executions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Wrench className="h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm">No tool executions yet</p>
      </div>
    );
  }

  return (
    <div className="divide-y">
      {executions.map(exec => {
        const isExpanded = expandedIds.has(exec.id);
        const isCopied = copiedId === exec.id;

        return (
          <div key={exec.id} className="p-3">
            {/* Header */}
            <button
              onClick={() => toggleExpand(exec.id)}
              className="flex items-center gap-2 w-full text-left"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              
              <div className={cn(
                'flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium',
                exec.success 
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
              )}>
                <Wrench className="h-3 w-3" />
                {exec.toolName}
              </div>

              <span className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                {exec.success ? (
                  <CheckCircle className="h-3 w-3 text-green-500" />
                ) : (
                  <XCircle className="h-3 w-3 text-red-500" />
                )}
                <Clock className="h-3 w-3" />
                {exec.durationMs}ms
              </span>
            </button>

            {/* Expanded content */}
            {isExpanded && (
              <div className="mt-3 space-y-3 ml-6">
                {/* Input */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Input</p>
                  <pre className="text-xs bg-muted rounded p-2 overflow-x-auto">
                    {JSON.stringify(exec.toolInput, null, 2)}
                  </pre>
                </div>

                {/* Output */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-medium text-muted-foreground">Output</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2"
                      onClick={() => copyOutput(exec.id, exec.toolOutput)}
                    >
                      {isCopied ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                  <pre className={cn(
                    'text-xs rounded p-2 overflow-x-auto max-h-60 whitespace-pre-wrap',
                    exec.success ? 'bg-muted' : 'bg-red-100 dark:bg-red-900/20'
                  )}>
                    {exec.error || exec.toolOutput.slice(0, 3000)}
                    {!exec.error && exec.toolOutput.length > 3000 && '...'}
                  </pre>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
