'use client';

import React, { useState } from 'react';
import { DiffEditor } from '@monaco-editor/react';
import { useTheme } from 'next-themes';
import { Check, X, Info, ChevronDown, ChevronUp } from 'lucide-react';

export interface AIDiffViewerProps {
  original: string;
  modified: string;
  language?: string;
  explanation?: string;
  design?: any;
  validation?: any;
  confidenceScore?: number;
  onApprove?: () => void;
  onReject?: () => void;
  onEdit?: (content: string) => void;
}

export function AIDiffViewer({
  original,
  modified,
  language = 'typescript',
  explanation,
  design,
  validation,
  confidenceScore,
  onApprove,
  onReject,
  onEdit,
}: AIDiffViewerProps) {
  const { resolvedTheme } = useTheme();
  const [showDetails, setShowDetails] = useState(false);
  const [activeTab, setActiveTab] = useState<'explanation' | 'design' | 'validation'>('explanation');

  const theme = resolvedTheme === 'dark' ? 'jacode-dark' : 'jacode-light';

  // Calculate change statistics
  const originalLines = original.split('\n').length;
  const modifiedLines = modified.split('\n').length;
  const linesAdded = Math.max(0, modifiedLines - originalLines);
  const linesRemoved = Math.max(0, originalLines - modifiedLines);

  return (
    <div className="flex flex-col h-full bg-background border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/50">
        <div className="flex items-center gap-4">
          <h3 className="font-semibold text-lg">AI Code Changes</h3>
          
          {/* Change Stats */}
          <div className="flex items-center gap-2 text-sm">
            {linesAdded > 0 && (
              <span className="text-green-600 dark:text-green-400">
                +{linesAdded}
              </span>
            )}
            {linesRemoved > 0 && (
              <span className="text-red-600 dark:text-red-400">
                -{linesRemoved}
              </span>
            )}
          </div>

          {/* Confidence Score */}
          {confidenceScore !== undefined && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Confidence:</span>
              <div className="flex items-center gap-1">
                <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      confidenceScore >= 0.8
                        ? 'bg-green-500'
                        : confidenceScore >= 0.6
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${confidenceScore * 100}%` }}
                  />
                </div>
                <span className="text-xs font-medium">
                  {(confidenceScore * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="px-3 py-1.5 text-sm rounded-md hover:bg-muted flex items-center gap-1"
          >
            <Info className="h-4 w-4" />
            Details
            {showDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          
          {onReject && (
            <button
              onClick={onReject}
              className="px-4 py-1.5 text-sm rounded-md bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 flex items-center gap-1"
            >
              <X className="h-4 w-4" />
              Reject
            </button>
          )}
          
          {onApprove && (
            <button
              onClick={onApprove}
              className="px-4 py-1.5 text-sm rounded-md bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20 flex items-center gap-1"
            >
              <Check className="h-4 w-4" />
              Apply Changes
            </button>
          )}
        </div>
      </div>

      {/* Details Panel */}
      {showDetails && (
        <div className="border-b bg-muted/30 p-4">
          {/* Tabs */}
          <div className="flex gap-2 mb-3 border-b">
            <button
              onClick={() => setActiveTab('explanation')}
              className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'explanation'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Explanation
            </button>
            {design && (
              <button
                onClick={() => setActiveTab('design')}
                className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'design'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Design Plan
              </button>
            )}
            {validation && (
              <button
                onClick={() => setActiveTab('validation')}
                className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'validation'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Validation
              </button>
            )}
          </div>

          {/* Tab Content */}
          <div className="text-sm">
            {activeTab === 'explanation' && explanation && (
              <div className="prose dark:prose-invert max-w-none">
                <p>{explanation}</p>
              </div>
            )}

            {activeTab === 'design' && design && (
              <div className="space-y-3">
                <div>
                  <span className="font-medium">Approach:</span>
                  <p className="text-muted-foreground mt-1">{design.approach}</p>
                </div>
                {design.steps && design.steps.length > 0 && (
                  <div>
                    <span className="font-medium">Steps:</span>
                    <ol className="list-decimal list-inside mt-1 space-y-1 text-muted-foreground">
                      {design.steps.map((step: string, idx: number) => (
                        <li key={idx}>{step}</li>
                      ))}
                    </ol>
                  </div>
                )}
                {design.considerations && design.considerations.length > 0 && (
                  <div>
                    <span className="font-medium">Considerations:</span>
                    <ul className="list-disc list-inside mt-1 space-y-1 text-muted-foreground">
                      {design.considerations.map((item: string, idx: number) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'validation' && validation && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Status:</span>
                  <span
                    className={`px-2 py-0.5 rounded text-xs ${
                      validation.isValid
                        ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                        : 'bg-red-500/20 text-red-600 dark:text-red-400'
                    }`}
                  >
                    {validation.isValid ? 'Valid' : 'Has Issues'}
                  </span>
                </div>

                {validation.issues && validation.issues.length > 0 && (
                  <div>
                    <span className="font-medium">Issues:</span>
                    <div className="mt-2 space-y-2">
                      {validation.issues.map((issue: any, idx: number) => (
                        <div
                          key={idx}
                          className={`p-2 rounded text-sm ${
                            issue.severity === 'error'
                              ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                              : issue.severity === 'warning'
                              ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                              : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <span className="font-medium uppercase text-xs">
                              {issue.severity}
                            </span>
                            <span>{issue.message}</span>
                          </div>
                          {issue.line && (
                            <div className="text-xs opacity-70 mt-1">Line {issue.line}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {validation.suggestions && validation.suggestions.length > 0 && (
                  <div>
                    <span className="font-medium">Suggestions:</span>
                    <ul className="list-disc list-inside mt-1 space-y-1 text-muted-foreground">
                      {validation.suggestions.map((suggestion: string, idx: number) => (
                        <li key={idx}>{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Diff Editor */}
      <div className="flex-1 min-h-0">
        <DiffEditor
          original={original}
          modified={modified}
          language={language}
          theme={theme}
          options={{
            readOnly: false,
            renderSideBySide: true,
            enableSplitViewResizing: true,
            renderOverviewRuler: true,
            scrollBeyondLastLine: false,
            minimap: { enabled: false },
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            lineNumbers: 'on',
          }}
          onMount={(editor) => {
            // Listen for content changes in modified editor
            const modifiedEditor = editor.getModifiedEditor();
            modifiedEditor.onDidChangeModelContent(() => {
              const content = modifiedEditor.getValue();
              onEdit?.(content);
            });
          }}
        />
      </div>
    </div>
  );
}

export default AIDiffViewer;
