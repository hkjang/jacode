'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface EditorFile {
  id: string;
  path: string;
  name: string;
  content: string;
  language?: string;
  isDirty?: boolean;
}

interface EditorSettings {
  theme: 'light' | 'dark' | 'system';
  fontSize: number;
  tabSize: number;
  wordWrap: boolean;
  minimap: boolean;
  lineNumbers: boolean;
  autoSave: boolean;
  formatOnSave: boolean;
  aiEnabled: boolean;
  sidebarWidth: number;
  terminalHeight: number;
}

interface EditorState {
  // Files
  openFiles: EditorFile[];
  activeFileId: string | null;
  recentFiles: string[];
  
  // UI State
  activePanel: string;
  sidebarCollapsed: boolean;
  showTerminal: boolean;
  showProblems: boolean;
  showMinimap: boolean;
  
  // Cursor
  cursorLine: number;
  cursorColumn: number;
  
  // Settings
  settings: EditorSettings;
  
  // Actions - Files
  openFile: (file: EditorFile) => void;
  closeFile: (id: string) => void;
  closeAllFiles: () => void;
  closeOtherFiles: (id: string) => void;
  setActiveFile: (id: string) => void;
  updateFileContent: (id: string, content: string) => void;
  markFileSaved: (id: string) => void;
  
  // Actions - UI
  setActivePanel: (panel: string) => void;
  toggleSidebar: () => void;
  toggleTerminal: () => void;
  toggleProblems: () => void;
  toggleMinimap: () => void;
  
  // Actions - Cursor
  setCursor: (line: number, column: number) => void;
  
  // Actions - Settings
  updateSettings: (partial: Partial<EditorSettings>) => void;
}

const defaultSettings: EditorSettings = {
  theme: 'dark',
  fontSize: 14,
  tabSize: 2,
  wordWrap: true,
  minimap: true,
  lineNumbers: true,
  autoSave: true,
  formatOnSave: true,
  aiEnabled: true,
  sidebarWidth: 256,
  terminalHeight: 200,
};

export const useEditorStore = create<EditorState>()(
  persist(
    (set, get) => ({
      // Initial state
      openFiles: [],
      activeFileId: null,
      recentFiles: [],
      activePanel: 'explorer',
      sidebarCollapsed: false,
      showTerminal: false,
      showProblems: false,
      showMinimap: true,
      cursorLine: 1,
      cursorColumn: 1,
      settings: defaultSettings,
      
      // File actions
      openFile: (file) => set((state) => {
        // Check if already open
        const existing = state.openFiles.find(f => f.path === file.path);
        if (existing) {
          return { activeFileId: existing.id };
        }
        
        // Add to recent files
        const recentFiles = [file.path, ...state.recentFiles.filter(p => p !== file.path)].slice(0, 10);
        
        return {
          openFiles: [...state.openFiles, file],
          activeFileId: file.id,
          recentFiles,
        };
      }),
      
      closeFile: (id) => set((state) => {
        const index = state.openFiles.findIndex(f => f.id === id);
        const newFiles = state.openFiles.filter(f => f.id !== id);
        
        let newActiveId = state.activeFileId;
        if (state.activeFileId === id) {
          newActiveId = newFiles[index - 1]?.id || newFiles[index]?.id || null;
        }
        
        return {
          openFiles: newFiles,
          activeFileId: newActiveId,
        };
      }),
      
      closeAllFiles: () => set({ openFiles: [], activeFileId: null }),
      
      closeOtherFiles: (id) => set((state) => ({
        openFiles: state.openFiles.filter(f => f.id === id),
        activeFileId: id,
      })),
      
      setActiveFile: (id) => set({ activeFileId: id }),
      
      updateFileContent: (id, content) => set((state) => ({
        openFiles: state.openFiles.map(f => 
          f.id === id ? { ...f, content, isDirty: true } : f
        ),
      })),
      
      markFileSaved: (id) => set((state) => ({
        openFiles: state.openFiles.map(f => 
          f.id === id ? { ...f, isDirty: false } : f
        ),
      })),
      
      // UI actions
      setActivePanel: (panel) => set({ activePanel: panel }),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      toggleTerminal: () => set((state) => ({ showTerminal: !state.showTerminal })),
      toggleProblems: () => set((state) => ({ showProblems: !state.showProblems })),
      toggleMinimap: () => set((state) => ({ showMinimap: !state.showMinimap })),
      
      // Cursor
      setCursor: (line, column) => set({ cursorLine: line, cursorColumn: column }),
      
      // Settings
      updateSettings: (partial) => set((state) => ({
        settings: { ...state.settings, ...partial },
      })),
    }),
    {
      name: 'editor-store',
      partialize: (state) => ({
        settings: state.settings,
        recentFiles: state.recentFiles,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);

// Selector hooks for optimization
export const useActiveFile = () => useEditorStore((state) => 
  state.openFiles.find(f => f.id === state.activeFileId)
);

export const useOpenFiles = () => useEditorStore((state) => state.openFiles);
export const useEditorSettings = () => useEditorStore((state) => state.settings);
export const useRecentFiles = () => useEditorStore((state) => state.recentFiles);

export default useEditorStore;
