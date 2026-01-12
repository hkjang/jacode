'use client';

import React, { useRef, useEffect, useState } from 'react';
import { DiffEditor, Monaco, loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

// Configure loader to use local files
loader.config({ paths: { vs: '/monaco/vs' } });
import { useTheme } from 'next-themes';
import { Loader2 } from 'lucide-react';

export interface MonacoDiffEditorProps {
  original?: string;
  modified?: string;
  language?: string; // "typescript", "javascript", etc.
  theme?: string;
  className?: string;
  options?: monaco.editor.IDiffEditorConstructionOptions;
  readOnly?: boolean;
}

export function MonacoDiffEditor({
  original = '',
  modified = '',
  language = 'typescript',
  className,
  options,
  readOnly = true,
}: MonacoDiffEditorProps) {
  const diffEditorRef = useRef<monaco.editor.IStandaloneDiffEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const { resolvedTheme } = useTheme();
  const [isReady, setIsReady] = useState(false);

  // Handle theme changes
  useEffect(() => {
    if (monacoRef.current && isReady) {
      const theme = resolvedTheme === 'dark' ? 'jacode-dark' : 'jacode-light';
      monacoRef.current.editor.setTheme(theme);
    }
  }, [resolvedTheme, isReady]);

  const handleEditorMount = (editor: monaco.editor.IStandaloneDiffEditor, monacoInstance: Monaco) => {
    diffEditorRef.current = editor;
    monacoRef.current = monacoInstance;
    setIsReady(true);
  };

  const handleBeforeMount = (monacoInstance: Monaco) => {
    // Defin themes (same as MonacoEditor)
    monacoInstance.editor.defineTheme('jacode-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'C586C0' },
        { token: 'string', foreground: 'CE9178' },
        { token: 'number', foreground: 'B5CEA8' },
        { token: 'type', foreground: '4EC9B0' },
        { token: 'function', foreground: 'DCDCAA' },
        { token: 'variable', foreground: '9CDCFE' },
      ],
      colors: {
        'editor.background': '#0d1117',
        'editor.foreground': '#c9d1d9',
        'editor.lineHighlightBackground': '#161b22',
        'editor.selectionBackground': '#3392FF44',
        'editorCursor.foreground': '#58a6ff',
        'editorLineNumber.foreground': '#484f58',
        'editorLineNumber.activeForeground': '#c9d1d9',
        'diffEditor.insertedTextBackground': '#2ea04333',
        'diffEditor.removedTextBackground': '#da363333',
      },
    });

    monacoInstance.editor.defineTheme('jacode-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '008000', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'AF00DB' },
        { token: 'string', foreground: 'A31515' },
        { token: 'number', foreground: '098658' },
        { token: 'type', foreground: '267F99' },
        { token: 'function', foreground: '795E26' },
        { token: 'variable', foreground: '001080' },
      ],
      colors: {
        'editor.background': '#ffffff',
        'editor.foreground': '#24292f',
        'editor.lineHighlightBackground': '#f6f8fa',
        'editor.selectionBackground': '#0969da33',
        'diffEditor.insertedTextBackground': '#2ea04333',
        'diffEditor.removedTextBackground': '#da363333',
      },
    });
  };

  const currentTheme = resolvedTheme === 'dark' ? 'jacode-dark' : 'jacode-light';

  return (
    <div className={`w-full h-full min-h-[300px] ${className || ''}`}>
      <DiffEditor
        height="100%"
        language={language}
        original={original}
        modified={modified}
        theme={currentTheme}
        onMount={handleEditorMount}
        beforeMount={handleBeforeMount}
        options={{
          readOnly,
          originalEditable: false,
          fontSize: 14,
          fontFamily: "var(--font-mono), 'JetBrains Mono', 'Fira Code', monospace",
          letterSpacing: 0,
          lineHeight: 21,
          minimap: { enabled: false },
          renderSideBySide: true,
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          diffWordWrap: 'on',
          ...options,
        }}
        loading={
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Loading diff editor...
          </div>
        }
      />
    </div>
  );
}
