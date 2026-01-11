'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';

// Import all editor components
import { ActivityBar } from './ActivityBar';
import { FileExplorer, FileTreeNode } from './FileExplorer';
import { EditorTabs } from './EditorTabs';
import { Breadcrumbs } from './Breadcrumbs';
import { StatusBar } from './StatusBar';
import { CommandPalette, useDefaultCommands } from './CommandPalette';
import { QuickOpen } from './QuickOpen';
import { GoToLineDialog } from './GoToLineDialog';
import { FindInFiles } from './FindInFiles';
import { OutlineView } from './OutlineView';
import { ProblemsPanel } from './ProblemsPanel';
import { IntegratedTerminal } from './IntegratedTerminal';
import { GitPanel } from './GitPanel';
import { SettingsPanel } from './SettingsPanel';
import { WelcomePage } from './WelcomePage';
import { Minimap } from './Minimap';
import { useKeyboardShortcuts, createEditorShortcuts } from './KeyboardShortcuts';

// Types
interface EditorFile {
  id: string;
  path: string;
  name: string;
  content: string;
  language?: string;
  isDirty?: boolean;
}

interface EditorLayoutProps {
  projectId?: string;
  files: FileTreeNode[];
  onFileOpen?: (path: string) => Promise<string>;
  onFileSave?: (path: string, content: string) => Promise<void>;
  onFileCreate?: (path: string, name: string, isDir: boolean) => Promise<void>;
  onFileDelete?: (path: string) => Promise<void>;
  onFileRename?: (path: string, newName: string) => Promise<void>;
  renderEditor?: (file: EditorFile, onChange: (content: string) => void) => React.ReactNode;
  className?: string;
}

// Default settings
const defaultSettings = {
  theme: 'dark' as const,
  fontSize: 14,
  tabSize: 2,
  wordWrap: true,
  minimap: true,
  lineNumbers: true,
  autoSave: true,
  formatOnSave: true,
  aiEnabled: true,
};

export function EditorLayout({
  projectId,
  files,
  onFileOpen,
  onFileSave,
  onFileCreate,
  onFileDelete,
  onFileRename,
  renderEditor,
  className,
}: EditorLayoutProps) {
  // State
  const [activePanel, setActivePanel] = useState<string>('explorer');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [openFiles, setOpenFiles] = useState<EditorFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
  const [settings, setSettings] = useState(defaultSettings);
  
  // Dialogs
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showQuickOpen, setShowQuickOpen] = useState(false);
  const [showGoToLine, setShowGoToLine] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Panels
  const [showProblems, setShowProblems] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  const [showFindInFiles, setShowFindInFiles] = useState(false);
  
  // Get current file
  const activeFile = useMemo(() => 
    openFiles.find(f => f.id === activeFileId), 
    [openFiles, activeFileId]
  );

  // Recent files for quick open
  const recentFiles = useMemo(() => 
    openFiles.map(f => f.path).slice(0, 5),
    [openFiles]
  );

  // Open file handler
  const handleOpenFile = useCallback(async (path: string) => {
    // Check if already open
    const existing = openFiles.find(f => f.path === path);
    if (existing) {
      setActiveFileId(existing.id);
      return;
    }

    // Load file content
    let content = '';
    if (onFileOpen) {
      try {
        content = await onFileOpen(path);
      } catch (e) {
        console.error('Failed to open file:', e);
        return;
      }
    }

    const name = path.split('/').pop() || path;
    const ext = name.split('.').pop()?.toLowerCase();
    const newFile: EditorFile = {
      id: path,
      path,
      name,
      content,
      language: ext,
      isDirty: false,
    };

    setOpenFiles(prev => [...prev, newFile]);
    setActiveFileId(path);
  }, [openFiles, onFileOpen]);

  // Close file handler
  const handleCloseFile = useCallback((id: string) => {
    const index = openFiles.findIndex(f => f.id === id);
    setOpenFiles(prev => prev.filter(f => f.id !== id));
    
    if (activeFileId === id) {
      // Switch to adjacent tab
      const newActive = openFiles[index - 1] || openFiles[index + 1];
      setActiveFileId(newActive?.id || null);
    }
  }, [openFiles, activeFileId]);

  // Save file handler
  const handleSaveFile = useCallback(async () => {
    if (!activeFile || !onFileSave) return;
    
    try {
      await onFileSave(activeFile.path, activeFile.content);
      setOpenFiles(prev => prev.map(f => 
        f.id === activeFile.id ? { ...f, isDirty: false } : f
      ));
    } catch (e) {
      console.error('Failed to save file:', e);
    }
  }, [activeFile, onFileSave]);

  // Content change handler
  const handleContentChange = useCallback((content: string) => {
    if (!activeFileId) return;
    
    setOpenFiles(prev => prev.map(f => 
      f.id === activeFileId ? { ...f, content, isDirty: true } : f
    ));
  }, [activeFileId]);

  // Go to line handler
  const handleGoToLine = useCallback((line: number, column?: number) => {
    setCursorPosition({ line, column: column || 1 });
    // Editor should handle this via ref or callback
  }, []);

  // Setting change handler
  const handleSettingChange = useCallback((key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    localStorage.setItem('editor-settings', JSON.stringify({ ...settings, [key]: value }));
  }, [settings]);

  // Load settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('editor-settings');
    if (saved) {
      try {
        setSettings({ ...defaultSettings, ...JSON.parse(saved) });
      } catch (e) {}
    }
  }, []);

  // Command palette commands
  const commands = useDefaultCommands({
    onSave: handleSaveFile,
    onOpenSettings: () => setShowSettings(true),
    onToggleAI: () => setActivePanel(activePanel === 'ai' ? 'explorer' : 'ai'),
    onToggleTerminal: () => setShowTerminal(!showTerminal),
    onGoToLine: () => setShowGoToLine(true),
    onFindInFiles: () => setShowFindInFiles(true),
  });

  // Keyboard shortcuts
  useKeyboardShortcuts({
    shortcuts: createEditorShortcuts({
      onSave: handleSaveFile,
      onQuickOpen: () => setShowQuickOpen(true),
      onCommandPalette: () => setShowCommandPalette(true),
      onFindInFiles: () => setShowFindInFiles(true),
      onToggleSidebar: () => setSidebarCollapsed(!sidebarCollapsed),
      onToggleAI: () => setActivePanel(activePanel === 'ai' ? 'explorer' : 'ai'),
      onCloseTab: () => activeFileId && handleCloseFile(activeFileId),
      onGoToLine: () => setShowGoToLine(true),
    }),
  });

  // Find in files mock handler
  const handleSearch = useCallback(async (query: string, options: any) => {
    // This should be implemented via API
    return [];
  }, []);

  return (
    <div className={cn('flex flex-col h-screen bg-background', className)}>
      {/* Main container */}
      <div className="flex flex-1 overflow-hidden">
        {/* Activity Bar */}
        <ActivityBar
          activeItem={activePanel}
          onItemClick={(id) => {
            if (id === 'settings') {
              setShowSettings(true);
            } else if (id === 'search') {
              setShowFindInFiles(true);
            } else {
              setActivePanel(id);
              if (sidebarCollapsed) setSidebarCollapsed(false);
            }
          }}
        />

        {/* Sidebar */}
        {!sidebarCollapsed && (
          <div className="w-64 border-r flex flex-col overflow-hidden">
            {activePanel === 'explorer' && (
              <div className="flex-1 overflow-hidden flex flex-col">
                <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">
                  Explorer
                </div>
                <FileExplorer
                  files={files}
                  selectedPath={activeFile?.path}
                  onSelectFile={(node) => !node.isDirectory && handleOpenFile(node.path)}
                  onCreateFile={onFileCreate}
                  onDeleteFile={(node) => onFileDelete?.(node.path)}
                  onRenameFile={(node, name) => onFileRename?.(node.path, name)}
                  className="flex-1"
                />
              </div>
            )}

            {activePanel === 'ai' && (
              <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                AI Panel - Integrate AIChat here
              </div>
            )}

            {activePanel === 'git' && (
              <GitPanel
                branch="main"
                changes={[]}
                onFileClick={handleOpenFile}
                className="flex-1"
              />
            )}

            {activePanel === 'debug' && (
              <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                Debug Panel
              </div>
            )}

            {activePanel === 'extensions' && (
              <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                Extensions Panel
              </div>
            )}
          </div>
        )}

        {/* Main Editor Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {openFiles.length === 0 ? (
            <WelcomePage
              onNewProject={() => {}}
              onOpenFolder={() => {}}
              onOpenAI={() => setActivePanel('ai')}
            />
          ) : (
            <>
              {/* Tabs */}
              <EditorTabs
                tabs={openFiles.map(f => ({
                  id: f.id,
                  path: f.path,
                  name: f.name,
                  isDirty: f.isDirty,
                  language: f.language,
                }))}
                activeTabId={activeFileId || undefined}
                onSelectTab={setActiveFileId}
                onCloseTab={handleCloseFile}
              />

              {/* Breadcrumbs */}
              {activeFile && (
                <Breadcrumbs
                  path={activeFile.path}
                  onNavigate={(path) => {
                    // Navigate to folder in explorer
                  }}
                />
              )}

              {/* Editor + Minimap */}
              <div className="flex-1 flex overflow-hidden">
                {/* Editor Content */}
                <div className="flex-1 overflow-hidden">
                  {activeFile && renderEditor ? (
                    renderEditor(activeFile, handleContentChange)
                  ) : (
                    <div className="flex-1 p-4 font-mono text-sm whitespace-pre-wrap overflow-auto">
                      {activeFile?.content || 'No file open'}
                    </div>
                  )}
                </div>

                {/* Minimap */}
                {settings.minimap && activeFile && (
                  <Minimap
                    code={activeFile.content}
                    visibleStartLine={1}
                    visibleEndLine={50}
                    currentLine={cursorPosition.line}
                    totalLines={activeFile.content.split('\n').length}
                    onClick={handleGoToLine}
                  />
                )}

                {/* Outline (optional right sidebar) */}
                {activePanel === 'outline' && (
                  <div className="w-48 border-l">
                    <OutlineView
                      symbols={[]}
                      currentLine={cursorPosition.line}
                      onSymbolClick={handleGoToLine}
                    />
                  </div>
                )}
              </div>
            </>
          )}

          {/* Problems Panel */}
          {showProblems && (
            <ProblemsPanel
              problems={[]}
              isOpen={showProblems}
              onClose={() => setShowProblems(false)}
              onProblemClick={(p) => {
                handleOpenFile(p.file);
                handleGoToLine(p.line, p.column);
              }}
            />
          )}

          {/* Terminal */}
          {showTerminal && (
            <IntegratedTerminal
              isOpen={showTerminal}
              onClose={() => setShowTerminal(false)}
            />
          )}
        </div>

        {/* Find in Files Sidebar */}
        {showFindInFiles && (
          <FindInFiles
            isOpen={showFindInFiles}
            onClose={() => setShowFindInFiles(false)}
            onSearch={handleSearch}
            onResultClick={(path, line) => {
              handleOpenFile(path);
              handleGoToLine(line);
            }}
            className="w-72"
          />
        )}
      </div>

      {/* Status Bar */}
      <StatusBar
        line={cursorPosition.line}
        column={cursorPosition.column}
        language={activeFile?.language || 'plaintext'}
        aiConnected={settings.aiEnabled}
        onLanguageClick={() => {}}
        onProblemsClick={() => setShowProblems(!showProblems)}
        onAIClick={() => setActivePanel('ai')}
      />

      {/* Dialogs */}
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        commands={commands}
      />

      <QuickOpen
        isOpen={showQuickOpen}
        onClose={() => setShowQuickOpen(false)}
        files={files}
        recentFiles={recentFiles}
        onSelectFile={handleOpenFile}
      />

      <GoToLineDialog
        isOpen={showGoToLine}
        onClose={() => setShowGoToLine(false)}
        onGoToLine={handleGoToLine}
        maxLine={activeFile?.content.split('\n').length || 1}
        currentLine={cursorPosition.line}
      />

      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onSettingChange={handleSettingChange}
      />
    </div>
  );
}

export default EditorLayout;
