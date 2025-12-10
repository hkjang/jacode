'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import Editor, { Monaco, OnMount } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { useTheme } from 'next-themes';
import { Loader2 } from 'lucide-react';

export interface MonacoEditorProps {
  value?: string;
  language?: string;
  path?: string;
  onChange?: (value: string | undefined) => void;
  onSave?: (value: string) => void;
  readOnly?: boolean;
  className?: string;
  options?: monaco.editor.IStandaloneEditorConstructionOptions;
  autoSave?: boolean;
  autoSaveDelay?: number;
}

// Large file threshold (1MB)
const LARGE_FILE_THRESHOLD = 1024 * 1024;

export function MonacoEditor({
  value = '',
  language = 'typescript',
  path,
  onChange,
  onSave,
  readOnly = false,
  className,
  options,
  autoSave = true,
  autoSaveDelay = 2000,
}: MonacoEditorProps) {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { resolvedTheme } = useTheme();
  const [isReady, setIsReady] = useState(false);
  const [isDomReady, setIsDomReady] = useState(false);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedValueRef = useRef<string>(value);

  // Check DOM readiness
  useEffect(() => {
    if (containerRef.current) {
      const observer = new ResizeObserver(() => {
        if (containerRef.current && containerRef.current.offsetHeight > 0) {
          setIsDomReady(true);
        }
      });
      observer.observe(containerRef.current);
      
      // Initial check
      if (containerRef.current.offsetHeight > 0) {
        setIsDomReady(true);
      }
      
      return () => observer.disconnect();
    }
  }, []);

  // Handle theme changes - call layout() to fix UI
  useEffect(() => {
    if (editorRef.current && isReady) {
      // Apply new theme
      const theme = resolvedTheme === 'dark' ? 'jacode-dark' : 'jacode-light';
      monacoRef.current?.editor.setTheme(theme);
      
      // Force layout recalculation
      requestAnimationFrame(() => {
        editorRef.current?.layout();
      });
    }
  }, [resolvedTheme, isReady]);

  // Auto-save functionality
  const handleAutoSave = useCallback((newValue: string) => {
    if (!autoSave || !onSave || readOnly) return;
    
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    
    autoSaveTimerRef.current = setTimeout(() => {
      if (newValue !== lastSavedValueRef.current) {
        onSave(newValue);
        lastSavedValueRef.current = newValue;
      }
    }, autoSaveDelay);
  }, [autoSave, autoSaveDelay, onSave, readOnly]);

  // Cleanup auto-save timer
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  // Check if file is large
  const isLargeFile = value.length > LARGE_FILE_THRESHOLD;

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    setIsReady(true);

    // Add keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      if (onSave) {
        const currentValue = editor.getValue();
        onSave(currentValue);
        lastSavedValueRef.current = currentValue;
      }
    });

    // Undo/Redo shortcuts are built-in, but we can customize
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyZ, () => {
      editor.trigger('keyboard', 'undo', null);
    });
    
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyZ, () => {
      editor.trigger('keyboard', 'redo', null);
    });

    // Format on paste (if not large file)
    if (!isLargeFile) {
      editor.onDidPaste(() => {
        setTimeout(() => {
          editor.getAction('editor.action.formatDocument')?.run();
        }, 100);
      });
    }

    // Handle window resize
    const handleResize = () => {
      requestAnimationFrame(() => {
        editor.layout();
      });
    };
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    editor.onDidDispose(() => {
      window.removeEventListener('resize', handleResize);
    });
  };

  const handleBeforeMount = (monaco: Monaco) => {
    // Register custom themes
    monaco.editor.defineTheme('jacode-dark', {
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
      },
    });

    monaco.editor.defineTheme('jacode-light', {
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
      },
    });
  };

  // Handle value changes with auto-save
  const handleChange = useCallback((newValue: string | undefined) => {
    onChange?.(newValue);
    if (newValue) {
      handleAutoSave(newValue);
    }
  }, [onChange, handleAutoSave]);

  // Detect language from file extension
  const getLanguage = (filePath?: string, defaultLang = 'typescript') => {
    if (!filePath) return defaultLang;
    
    const ext = filePath.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      js: 'javascript',
      jsx: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      json: 'json',
      html: 'html',
      css: 'css',
      scss: 'scss',
      less: 'less',
      md: 'markdown',
      py: 'python',
      java: 'java',
      go: 'go',
      rs: 'rust',
      c: 'c',
      cpp: 'cpp',
      h: 'c',
      hpp: 'cpp',
      sql: 'sql',
      yaml: 'yaml',
      yml: 'yaml',
      xml: 'xml',
      sh: 'shell',
      bash: 'shell',
      dockerfile: 'dockerfile',
    };

    return languageMap[ext || ''] || defaultLang;
  };

  const detectedLanguage = path ? getLanguage(path, language) : language;
  const editorTheme = resolvedTheme === 'dark' ? 'jacode-dark' : 'jacode-light';

  // Large file optimizations
  const largeFileOptions: monaco.editor.IStandaloneEditorConstructionOptions = isLargeFile
    ? {
        minimap: { enabled: false },
        wordWrap: 'off',
        folding: false,
        renderLineHighlight: 'none',
        occurrencesHighlight: 'off',
        selectionHighlight: false,
        formatOnPaste: false,
        formatOnType: false,
        quickSuggestions: false,
        parameterHints: { enabled: false },
        suggestOnTriggerCharacters: false,
      }
    : {};

  return (
    <div 
      ref={containerRef}
      className={`w-full h-full min-h-[200px] ${className || ''}`}
    >
      {!isDomReady ? (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Preparing editor...
        </div>
      ) : (
        <Editor
          height="100%"
          language={detectedLanguage}
          value={value}
          theme={editorTheme}
          onChange={handleChange}
          onMount={handleEditorMount}
          beforeMount={handleBeforeMount}
          path={path}
          options={{
            readOnly,
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            fontLigatures: true,
            minimap: { enabled: true, scale: 1 },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            lineNumbers: 'on',
            renderLineHighlight: 'all',
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            smoothScrolling: true,
            padding: { top: 16, bottom: 16 },
            tabSize: 2,
            insertSpaces: true,
            formatOnPaste: true,
            formatOnType: true,
            autoClosingBrackets: 'always',
            autoClosingQuotes: 'always',
            autoIndent: 'full',
            folding: true,
            foldingHighlight: true,
            bracketPairColorization: { enabled: true },
            guides: {
              bracketPairs: true,
              indentation: true,
            },
            ...largeFileOptions,
            ...options,
          }}
          loading={
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Loading editor...
            </div>
          }
        />
      )}
    </div>
  );
}

export default MonacoEditor;

