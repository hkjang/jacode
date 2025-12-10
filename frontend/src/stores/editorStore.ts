import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FileTab } from '@/components/editor/FileTabs';
import type { FileTreeNode } from '@/components/editor/FileExplorer';

interface EditorFile {
  id: string;
  path: string;
  name: string;
  content: string;
  language?: string;
  isDirty: boolean;
  originalContent: string;
}

interface EditorState {
  // File management
  files: Map<string, EditorFile>;
  fileTree: FileTreeNode[];

  // Tab management
  openTabs: FileTab[];
  activeTabId: string | null;

  // Project
  currentProjectId: string | null;

  // Actions
  setCurrentProject: (projectId: string) => void;
  setFileTree: (tree: FileTreeNode[]) => void;

  openFile: (file: { id: string; path: string; name: string; content: string; language?: string }) => void;
  closeFile: (id: string) => void;
  updateFileContent: (id: string, content: string) => void;
  saveFile: (id: string) => void;
  setActiveTab: (id: string) => void;

  // File tree operations
  addFileToTree: (parentPath: string, file: FileTreeNode) => void;
  removeFileFromTree: (path: string) => void;
  renameFileInTree: (path: string, newName: string) => void;
}

export const useEditorStore = create<EditorState>()(
  persist(
    (set, get) => ({
      files: new Map(),
      fileTree: [],
      openTabs: [],
      activeTabId: null,
      currentProjectId: null,

      setCurrentProject: (projectId) => {
        set({
          currentProjectId: projectId,
          files: new Map(),
          openTabs: [],
          activeTabId: null,
          fileTree: [],
        });
      },

      setFileTree: (tree) => {
        set({ fileTree: tree });
      },

      openFile: (file) => {
        const { files, openTabs } = get();

        // Check if file is already open
        const existingTab = openTabs.find((t) => t.id === file.id);
        if (existingTab) {
          set({ activeTabId: file.id });
          return;
        }

        // Add to files
        const newFiles = new Map(files);
        newFiles.set(file.id, {
          ...file,
          isDirty: false,
          originalContent: file.content,
        });

        // Add tab
        const newTab: FileTab = {
          id: file.id,
          name: file.name,
          path: file.path,
          language: file.language,
          isDirty: false,
        };

        set({
          files: newFiles,
          openTabs: [...openTabs, newTab],
          activeTabId: file.id,
        });
      },

      closeFile: (id) => {
        const { files, openTabs, activeTabId } = get();

        const newFiles = new Map(files);
        newFiles.delete(id);

        const newTabs = openTabs.filter((t) => t.id !== id);
        let newActiveTabId = activeTabId;

        if (activeTabId === id) {
          // Switch to another tab
          const closedIndex = openTabs.findIndex((t) => t.id === id);
          if (newTabs.length > 0) {
            newActiveTabId = newTabs[Math.min(closedIndex, newTabs.length - 1)].id;
          } else {
            newActiveTabId = null;
          }
        }

        set({
          files: newFiles,
          openTabs: newTabs,
          activeTabId: newActiveTabId,
        });
      },

      updateFileContent: (id, content) => {
        const { files, openTabs } = get();
        const file = files.get(id);
        if (!file) return;

        const isDirty = content !== file.originalContent;

        const newFiles = new Map(files);
        newFiles.set(id, { ...file, content, isDirty });

        const newTabs = openTabs.map((t) =>
          t.id === id ? { ...t, isDirty } : t,
        );

        set({ files: newFiles, openTabs: newTabs });
      },

      saveFile: (id) => {
        const { files, openTabs } = get();
        const file = files.get(id);
        if (!file) return;

        const newFiles = new Map(files);
        newFiles.set(id, {
          ...file,
          isDirty: false,
          originalContent: file.content,
        });

        const newTabs = openTabs.map((t) =>
          t.id === id ? { ...t, isDirty: false } : t,
        );

        set({ files: newFiles, openTabs: newTabs });
      },

      setActiveTab: (id) => {
        set({ activeTabId: id });
      },

      addFileToTree: (parentPath, file) => {
        const { fileTree } = get();

        const addToNode = (nodes: FileTreeNode[]): FileTreeNode[] => {
          return nodes.map((node) => {
            if (node.path === parentPath && node.isDirectory && node.children) {
              return {
                ...node,
                children: [...node.children, file].sort((a, b) => {
                  if (a.isDirectory !== b.isDirectory) {
                    return a.isDirectory ? -1 : 1;
                  }
                  return a.name.localeCompare(b.name);
                }),
              };
            }
            if (node.children) {
              return { ...node, children: addToNode(node.children) };
            }
            return node;
          });
        };

        set({ fileTree: parentPath ? addToNode(fileTree) : [...fileTree, file] });
      },

      removeFileFromTree: (path) => {
        const { fileTree } = get();

        const removeFromNode = (nodes: FileTreeNode[]): FileTreeNode[] => {
          return nodes
            .filter((node) => node.path !== path)
            .map((node) => {
              if (node.children) {
                return { ...node, children: removeFromNode(node.children) };
              }
              return node;
            });
        };

        set({ fileTree: removeFromNode(fileTree) });
      },

      renameFileInTree: (path, newName) => {
        const { fileTree } = get();

        const renameInNode = (nodes: FileTreeNode[]): FileTreeNode[] => {
          return nodes.map((node) => {
            if (node.path === path) {
              const newPath = path.replace(/[^/]+$/, newName);
              return { ...node, name: newName, path: newPath };
            }
            if (node.children) {
              return { ...node, children: renameInNode(node.children) };
            }
            return node;
          });
        };

        set({ fileTree: renameInNode(fileTree) });
      },
    }),
    {
      name: 'jacode-editor-store',
      partialize: (state) => ({
        currentProjectId: state.currentProjectId,
      }),
    },
  ),
);
