'use client';

import { useState } from 'react';
import {
  Brain,
  Wrench,
  Eye,
  FileCode,
  Lightbulb,
  Clock,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AgentStep {
  id: string;
  stepNumber: number;
  type: 'REASON' | 'ACT' | 'OBSERVE' | 'PLAN' | 'REFLECT';
  thought?: string;
  toolName?: string;
  toolInput?: Record<string, any>;
  toolOutput?: string;
  observation?: string;
  durationMs: number;
  error?: string;
  createdAt: string;
}

interface AgentStepTimelineProps {
  steps: AgentStep[];
  isLoading?: boolean;
}

const STEP_CONFIG: Record<string, { icon: any; color: string; bgColor: string; label: string }> = {
  REASON: { icon: Brain, color: 'text-purple-500', bgColor: 'bg-purple-100 dark:bg-purple-900/30', label: 'Thinking' },
  ACT: { icon: Wrench, color: 'text-blue-500', bgColor: 'bg-blue-100 dark:bg-blue-900/30', label: 'Action' },
  OBSERVE: { icon: Eye, color: 'text-green-500', bgColor: 'bg-green-100 dark:bg-green-900/30', label: 'Observation' },
  PLAN: { icon: FileCode, color: 'text-orange-500', bgColor: 'bg-orange-100 dark:bg-orange-900/30', label: 'Planning' },
  REFLECT: { icon: Lightbulb, color: 'text-yellow-500', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30', label: 'Reflect' },
};

export function AgentStepTimeline({ steps, isLoading }: AgentStepTimelineProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  const toggleStep = (stepId: string) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-1/3" />
              <div className="h-3 bg-muted rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (steps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Clock className="h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm">No execution steps yet</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-border" />

      <div className="space-y-3 p-4">
        {steps.map((step, index) => {
          const config = STEP_CONFIG[step.type] || STEP_CONFIG.REASON;
          const Icon = config.icon;
          const isExpanded = expandedSteps.has(step.id);
          const hasError = !!step.error;

          return (
            <div key={step.id} className="relative flex gap-3">
              {/* Step icon */}
              <div
                className={cn(
                  'relative z-10 flex items-center justify-center w-8 h-8 rounded-full shrink-0',
                  config.bgColor,
                  hasError && 'bg-red-100 dark:bg-red-900/30'
                )}
              >
                {hasError ? (
                  <XCircle className="h-4 w-4 text-red-500" />
                ) : (
                  <Icon className={cn('h-4 w-4', config.color)} />
                )}
              </div>

              {/* Step content */}
              <div className="flex-1 min-w-0">
                {/* Header */}
                <button
                  onClick={() => toggleStep(step.id)}
                  className="flex items-center gap-2 w-full text-left hover:bg-accent/50 rounded p-1 -m-1"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                  )}
                  <span className={cn('text-xs font-medium', hasError ? 'text-red-500' : config.color)}>
                    {config.label}
                    {step.toolName && ` - ${step.toolName}`}
                  </span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {step.durationMs}ms
                  </span>
                </button>

                {/* Collapsed preview */}
                {!isExpanded && (
                  <p className="text-xs text-muted-foreground truncate mt-1">
                    {step.thought || step.observation || step.toolOutput?.slice(0, 100) || 'No details'}
                  </p>
                )}

                {/* Expanded content */}
                {isExpanded && (
                  <div className="mt-2 space-y-2 text-sm">
                    {step.thought && (
                      <div className="bg-muted/50 rounded p-2">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Thought</p>
                        <p className="text-sm whitespace-pre-wrap">{step.thought}</p>
                      </div>
                    )}

                    {step.toolName && step.toolInput && (
                      <div className="bg-muted/50 rounded p-2">
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          Tool: {step.toolName}
                        </p>
                        <pre className="text-xs bg-background rounded p-2 overflow-x-auto">
                          {JSON.stringify(step.toolInput, null, 2)}
                        </pre>
                      </div>
                    )}

                    {step.toolOutput && (
                      <div className="bg-muted/50 rounded p-2">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Output</p>
                        <pre className="text-xs bg-background rounded p-2 overflow-x-auto max-h-40 whitespace-pre-wrap">
                          {step.toolOutput.slice(0, 2000)}
                          {step.toolOutput.length > 2000 && '...'}
                        </pre>
                      </div>
                    )}

                    {step.observation && (
                      <div className="bg-muted/50 rounded p-2">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Observation</p>
                        <p className="text-sm whitespace-pre-wrap">{step.observation}</p>
                      </div>
                    )}

                    {step.error && (
                      <div className="bg-red-100 dark:bg-red-900/20 rounded p-2 border border-red-200 dark:border-red-800">
                        <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">Error</p>
                        <p className="text-sm text-red-700 dark:text-red-300">{step.error}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
