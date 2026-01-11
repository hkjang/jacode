'use client';

import React, { useState } from 'react';
import { AlertCircle, AlertTriangle, Info, ChevronDown, ChevronRight, File, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type ProblemSeverity = 'error' | 'warning' | 'info';

interface Problem {
  id: string;
  severity: ProblemSeverity;
  message: string;
  source?: string;
  file: string;
  line: number;
  column?: number;
}

interface ProblemsGrouped {
  path: string;
  name: string;
  problems: Problem[];
}

interface ProblemsPanelProps {
  problems: Problem[];
  isOpen: boolean;
  onClose: () => void;
  onProblemClick: (problem: Problem) => void;
  className?: string;
}

const severityIcon = {
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const severityColor = {
  error: 'text-red-500',
  warning: 'text-yellow-500',
  info: 'text-blue-500',
};

export function ProblemsPanel({
  problems,
  isOpen,
  onClose,
  onProblemClick,
  className,
}: ProblemsPanelProps) {
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

  // Group problems by file
  const grouped = problems.reduce<Record<string, ProblemsGrouped>>((acc, problem) => {
    if (!acc[problem.file]) {
      acc[problem.file] = {
        path: problem.file,
        name: problem.file.split('/').pop() || problem.file,
        problems: [],
      };
    }
    acc[problem.file].problems.push(problem);
    return acc;
  }, {});

  const groupedList = Object.values(grouped);

  // Count by severity
  const errorCount = problems.filter(p => p.severity === 'error').length;
  const warningCount = problems.filter(p => p.severity === 'warning').length;
  const infoCount = problems.filter(p => p.severity === 'info').length;

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

  // Start with all expanded
  React.useEffect(() => {
    setExpandedFiles(new Set(groupedList.map(g => g.path)));
  }, [problems]);

  if (!isOpen) return null;

  return (
    <div className={cn('flex flex-col h-48 border-t bg-background', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b bg-muted/30">
        <div className="flex items-center gap-4 text-xs">
          <span className="font-medium">Problems</span>
          <div className="flex items-center gap-3 text-muted-foreground">
            <span className="flex items-center gap-1">
              <AlertCircle className={cn('h-3 w-3', severityColor.error)} />
              {errorCount}
            </span>
            <span className="flex items-center gap-1">
              <AlertTriangle className={cn('h-3 w-3', severityColor.warning)} />
              {warningCount}
            </span>
            <span className="flex items-center gap-1">
              <Info className={cn('h-3 w-3', severityColor.info)} />
              {infoCount}
            </span>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={onClose}>
          <X className="h-3 w-3" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {problems.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            No problems detected
          </div>
        ) : (
          <div className="py-1">
            {groupedList.map((group) => (
              <div key={group.path}>
                <button
                  className="w-full flex items-center gap-1 px-2 py-1 text-xs hover:bg-accent/50 transition-colors"
                  onClick={() => toggleFile(group.path)}
                >
                  {expandedFiles.has(group.path) ? (
                    <ChevronDown className="h-3 w-3 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="h-3 w-3 flex-shrink-0" />
                  )}
                  <File className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                  <span className="truncate flex-1 text-left">{group.name}</span>
                  <span className="text-muted-foreground">{group.problems.length}</span>
                </button>

                {expandedFiles.has(group.path) && (
                  <div className="ml-6">
                    {group.problems.map((problem) => {
                      const Icon = severityIcon[problem.severity];
                      return (
                        <button
                          key={problem.id}
                          className="w-full flex items-start gap-2 px-2 py-1 text-[11px] hover:bg-accent/50 transition-colors text-left"
                          onClick={() => onProblemClick(problem)}
                        >
                          <Icon className={cn('h-3 w-3 flex-shrink-0 mt-0.5', severityColor[problem.severity])} />
                          <div className="flex-1 min-w-0">
                            <div className="truncate">{problem.message}</div>
                            <div className="text-muted-foreground">
                              [{problem.line}, {problem.column || 1}]
                              {problem.source && <span className="ml-1">({problem.source})</span>}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProblemsPanel;
