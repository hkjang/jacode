'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { DiffEditor, Monaco } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { useTheme } from 'next-themes';
import { 
  Check, 
  X, 
  ChevronDown, 
  ChevronRight, 
  FileCode, 
  Columns, 
  AlignJustify,
  ChevronUp,
  Loader2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface DiffViewerProps {
  title: string;
  filePath: string;
  oldContent: string;
  newContent: string;
  language?: string;
  onApprove?: () => void;
  onReject?: () => void;
  readOnly?: boolean;
  mode?: 'sideBySide' | 'inline';
  showMinimap?: boolean;
  height?: string | number;
}

// Compute diff statistics
function computeDiffStats(oldContent: string, newContent: string) {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');
  
  let addedLines = 0;
  let removedLines = 0;
  
  const oldSet = new Set(oldLines);
  const newSet = new Set(newLines);
  
  for (const line of newLines) {
    if (!oldSet.has(line)) addedLines++;
  }
  for (const line of oldLines) {
    if (!newSet.has(line)) removedLines++;
  }
  
  return { addedLines, removedLines, totalChanges: addedLines + removedLines };
}

export function DiffViewer({
  title,
  filePath,
  oldContent,
  newContent,
  language,
  onApprove,
  onReject,
  readOnly = false,
  mode: initialMode = 'sideBySide',
  showMinimap = false,
  height = 400,
}: DiffViewerProps) {
  const { resolvedTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [mode, setMode] = useState<'sideBySide' | 'inline'>(initialMode);
  const [isReady, setIsReady] = useState(false);
  const diffEditorRef = useRef<monaco.editor.IStandaloneDiffEditor | null>(null);
  const [currentChangeIndex, setCurrentChangeIndex] = useState(0);
  const [totalChanges, setTotalChanges] = useState(0);

  // Compute stats
  const stats = useMemo(() => computeDiffStats(oldContent, newContent), [oldContent, newContent]);

  // Detect language from file path
  const detectedLanguage = useMemo(() => {
    if (language) return language;
    const ext = filePath.split('.').pop()?.toLowerCase();
    const langMap: Record<string, string> = {
      ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
      py: 'python', java: 'java', go: 'go', rs: 'rust',
      html: 'html', css: 'css', json: 'json', md: 'markdown',
      yaml: 'yaml', yml: 'yaml', sql: 'sql', sh: 'shell',
    };
    return langMap[ext || ''] || 'plaintext';
  }, [filePath, language]);

  const editorTheme = resolvedTheme === 'dark' ? 'vs-dark' : 'vs';

  // Handle diff editor mount
  const handleEditorMount = (editor: monaco.editor.IStandaloneDiffEditor) => {
    diffEditorRef.current = editor;
    setIsReady(true);

    // Get line changes for navigation
    const updateLineChanges = () => {
      const lineChanges = editor.getLineChanges();
      setTotalChanges(lineChanges?.length || 0);
    };

    // Update after a short delay to ensure diff is computed
    setTimeout(updateLineChanges, 100);
  };

  // Navigate to change
  const navigateToChange = (direction: 'prev' | 'next') => {
    if (!diffEditorRef.current) return;
    
    const lineChanges = diffEditorRef.current.getLineChanges();
    if (!lineChanges || lineChanges.length === 0) return;

    let newIndex = currentChangeIndex;
    if (direction === 'next') {
      newIndex = (currentChangeIndex + 1) % lineChanges.length;
    } else {
      newIndex = (currentChangeIndex - 1 + lineChanges.length) % lineChanges.length;
    }
    
    setCurrentChangeIndex(newIndex);
    
    // Scroll to the change
    const change = lineChanges[newIndex];
    if (change) {
      const modifiedEditor = diffEditorRef.current.getModifiedEditor();
      modifiedEditor.revealLineInCenter(change.modifiedStartLineNumber);
    }
  };

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
            <span className="text-xs text-green-500">+{stats.addedLines}</span>
            <span className="text-xs text-red-500">-{stats.removedLines}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Mode toggle */}
          <div className="flex items-center border rounded-md overflow-hidden">
            <button
              onClick={() => setMode('sideBySide')}
              className={`p-1.5 ${mode === 'sideBySide' ? 'bg-accent' : 'hover:bg-accent/50'}`}
              title="Side by side"
            >
              <Columns className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setMode('inline')}
              className={`p-1.5 ${mode === 'inline' ? 'bg-accent' : 'hover:bg-accent/50'}`}
              title="Inline"
            >
              <AlignJustify className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Change navigation */}
          {totalChanges > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <button
                onClick={() => navigateToChange('prev')}
                className="p-1 hover:bg-accent rounded"
                title="Previous change"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <span>{currentChangeIndex + 1}/{totalChanges}</span>
              <button
                onClick={() => navigateToChange('next')}
                className="p-1 hover:bg-accent rounded"
                title="Next change"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Action buttons */}
          {!readOnly && (onApprove || onReject) && (
            <>
              {onApprove && (
                <Button size="sm" variant="default" onClick={onApprove} className="bg-green-600 hover:bg-green-700">
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
            </>
          )}
        </div>
      </div>

      {/* Diff Content */}
      {!collapsed && (
        <div style={{ height: typeof height === 'number' ? `${height}px` : height }}>
          <DiffEditor
            original={oldContent}
            modified={newContent}
            language={detectedLanguage}
            theme={editorTheme}
            onMount={handleEditorMount}
            options={{
              readOnly: true,
              renderSideBySide: mode === 'sideBySide',
              minimap: { enabled: showMinimap },
              scrollBeyondLastLine: false,
              fontSize: 13,
              lineNumbers: 'on',
              renderOverviewRuler: true,
              diffWordWrap: 'on',
              ignoreTrimWhitespace: false,
              renderIndicators: true,
              originalEditable: false,
            }}
            loading={
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                Loading diff...
              </div>
            }
          />
        </div>
      )}
    </div>
  );
}

// Multi-file diff component
export interface MultiFileDiffProps {
  title: string;
  diffs: {
    path: string;
    oldContent: string;
    newContent: string;
    language?: string;
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
  const [defaultMode, setDefaultMode] = useState<'sideBySide' | 'inline'>('sideBySide');

  // Calculate total stats
  const totalStats = useMemo(() => {
    return diffs.reduce(
      (acc, diff) => {
        const stats = computeDiffStats(diff.oldContent, diff.newContent);
        return {
          addedLines: acc.addedLines + stats.addedLines,
          removedLines: acc.removedLines + stats.removedLines,
          filesChanged: acc.filesChanged + 1,
        };
      },
      { addedLines: 0, removedLines: 0, filesChanged: 0 }
    );
  }, [diffs]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="font-semibold">{title}</h3>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>{totalStats.filesChanged} files</span>
            <span className="text-green-500">+{totalStats.addedLines}</span>
            <span className="text-red-500">-{totalStats.removedLines}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Global mode toggle */}
          <div className="flex items-center border rounded-md overflow-hidden mr-2">
            <button
              onClick={() => setDefaultMode('sideBySide')}
              className={`p-1.5 ${defaultMode === 'sideBySide' ? 'bg-accent' : 'hover:bg-accent/50'}`}
              title="Side by side (all)"
            >
              <Columns className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setDefaultMode('inline')}
              className={`p-1.5 ${defaultMode === 'inline' ? 'bg-accent' : 'hover:bg-accent/50'}`}
              title="Inline (all)"
            >
              <AlignJustify className="h-3.5 w-3.5" />
            </button>
          </div>

          {onApproveAll && (
            <Button size="sm" variant="default" onClick={onApproveAll} className="bg-green-600 hover:bg-green-700">
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
            language={diff.language}
            mode={defaultMode}
            readOnly
            height={300}
          />
        ))}
      </div>
    </div>
  );
}

export default DiffViewer;
