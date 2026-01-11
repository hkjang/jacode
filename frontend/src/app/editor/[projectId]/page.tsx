'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  PanelGroup,
  Panel,
  PanelResizeHandle,
} from 'react-resizable-panels';
import {
  Code2,
  FolderTree,
  Bot,
  MessageSquare,
  Settings,
  Play,
  Save,
  ChevronLeft,
  History,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MonacoEditor } from '@/components/editor/MonacoEditor';
import { FileExplorer, FileTreeNode } from '@/components/editor/FileExplorer';
import { FileTabs, FileTab } from '@/components/editor/FileTabs';
import { AIChat } from '@/components/ai/AIChat';
import { AgentPanel } from '@/components/agent/AgentPanel';
import { VersionHistory } from '@/components/version/VersionHistory';
import { useEditorStore } from '@/stores/editorStore';
import { fileApi, projectApi } from '@/lib/api';
import { SocketProvider, useSocket } from '@/providers/SocketProvider';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';



export default function EditorPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const {
    fileTree,
    openTabs,
    activeTabId,
    files,
    setCurrentProject,
    setFileTree,
    openFile,
    closeFile,
    updateFileContent,
    saveFile,
    setActiveTab,
    showAI,
    toggleAI,
    showAgents,
    toggleAgents,
    loadEditorSettings,
    editorSettings,
  } = useEditorStore();

  const [projectName, setProjectName] = useState('');
  const [loading, setLoading] = useState(true);
  // showAI and showAgents are now in editorStore
  const [showHistory, setShowHistory] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const activeFile = activeTabId ? files.get(activeTabId) : null;

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }
    loadProject();
    loadEditorSettings(); // Load system settings
  }, [projectId]);

  // Listen for policy updates
  const { socket } = useSocket();
  useEffect(() => {
    if (!socket) return;
    const handleEvent = (data: any) => {
       if (data.type === 'policy_update') {
          // Toast is handled by NotificationCenter, we just reload settings
          loadEditorSettings();
       }
    };
    socket.on('notification', handleEvent);
    return () => socket.off('notification', handleEvent);
  }, [socket, loadEditorSettings]);

  const loadProject = async () => {
    try {
      setCurrentProject(projectId);
      const [project, tree] = await Promise.all([
        projectApi.getOne(projectId),
        fileApi.getTree(projectId),
      ]);
      setProjectName(project.name);
      setFileTree(tree);
    } catch (error) {
      console.error('Failed to load project:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFile = async (node: FileTreeNode) => {
    if (node.isDirectory) return;
    
    try {
      const file = await fileApi.getContent(projectId, node.id);
      openFile({
        id: file.id,
        path: file.path,
        name: file.name,
        content: file.content || '',
        language: file.extension,
      });
    } catch (error) {
      console.error('Failed to load file:', error);
    }
  };

  const handleSaveFile = async (content: string) => {
    if (!activeFile) return;
    
    try {
      await fileApi.update(projectId, activeFile.id, { content });
      saveFile(activeFile.id);
    } catch (error) {
      console.error('Failed to save file:', error);
    }
  };

  const handleCreateFile = async (parentPath: string, name: string, isDirectory: boolean) => {
    try {
      const path = parentPath ? `${parentPath}/${name}` : name;
      await fileApi.create(projectId, { path, name, isDirectory });
      const tree = await fileApi.getTree(projectId);
      setFileTree(tree);
    } catch (error) {
      console.error('Failed to create file:', error);
    }
  };

  const handleDeleteFile = async (node: FileTreeNode) => {
    try {
      await fileApi.delete(projectId, node.id);
      const tree = await fileApi.getTree(projectId);
      setFileTree(tree);
    } catch (error) {
      console.error('Failed to delete file:', error);
    }
  };

  const handleUploadFile = async (file: File, parentPath?: string) => {
    try {
      await fileApi.upload(projectId, file, parentPath);
      const tree = await fileApi.getTree(projectId);
      setFileTree(tree);
    } catch (error) {
      console.error('Failed to upload file:', error);
    }
  };

  const handleDownloadFile = async (node: FileTreeNode) => {
    try {
      const response = await fileApi.download(projectId, node.id);
      
      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      // Use filename from node or header if possible, here using node.name
      link.setAttribute('download', node.name);
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download file:', error);
      // Optional: Add toast error here
    }
  };

  const handleMoveFile = async (source: FileTreeNode, target: FileTreeNode) => {
    try {
      // Find full source node from tree if needed, but we used ID in source
      // Actually we need source name to construct new path
      // Let's find the source node in fileTree
      const findNode = (nodes: FileTreeNode[], id: string): FileTreeNode | undefined => {
        for (const node of nodes) {
          if (node.id === id) return node;
          if (node.children) {
            const found = findNode(node.children, id);
            if (found) return found;
          }
        }
        return undefined;
      };

      const sourceNode = findNode(fileTree, source.id);
      if (!sourceNode) return;

      const newPath = `${target.path}/${sourceNode.name}`;
      
      // Check if moving to same parent
      const currentParent = sourceNode.path.split('/').slice(0, -1).join('/');
      if (currentParent === target.path) return;

      await fileApi.update(projectId, sourceNode.id, { path: newPath });
      const tree = await fileApi.getTree(projectId);
      setFileTree(tree);
    } catch (error) {
      console.error('Failed to move file:', error);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading project...</div>
      </div>
    );
  }

  return (
    <SocketProvider>
      <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="h-12 border-b bg-card flex items-center px-4 gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <Code2 className="h-5 w-5 text-primary" />
          <span className="font-semibold">{projectName}</span>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <Button
            variant={showAgents ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => toggleAgents()}
          >
            <Bot className="h-4 w-4 mr-1" />
            Agents
          </Button>
          <Button
            variant={showAI ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => toggleAI()}
          >
            <MessageSquare className="h-4 w-4 mr-1" />
            AI Chat
          </Button>
          <Button
            variant={showHistory ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setShowHistory(!showHistory)}
          >
            <History className="h-4 w-4 mr-1" />
            History
          </Button>
          <NotificationCenter />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <PanelGroup direction="horizontal">
          {/* Sidebar */}
          {!sidebarCollapsed && (
            <>
              <Panel defaultSize={20} minSize={15} maxSize={35}>
                <div className="h-full border-r bg-card flex flex-col">
                  <div className="p-2 border-b flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <FolderTree className="h-4 w-4" />
                      Explorer
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => setSidebarCollapsed(true)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex-1 overflow-auto">
                    <FileExplorer
                      files={fileTree}
                      selectedPath={activeFile?.path}
                      onSelectFile={handleSelectFile}
                      onCreateFile={handleCreateFile}
                      onDeleteFile={handleDeleteFile}
                      onUploadFile={handleUploadFile}
                      onDownloadFile={handleDownloadFile}
                      onMoveFile={handleMoveFile}
                    />
                  </div>
                </div>
              </Panel>
              <PanelResizeHandle className="w-1 bg-border hover:bg-primary/50 transition-colors" />
            </>
          )}

          {/* Editor Area */}
          <Panel>
            <div className="h-full flex flex-col">
              {/* File Tabs */}
              <FileTabs
                tabs={openTabs}
                activeTabId={activeTabId || undefined}
                onSelectTab={(tab) => setActiveTab(tab.id)}
                onCloseTab={(tab) => closeFile(tab.id)}
              />

              {/* Editor */}
              <div className="flex-1">
                {activeFile ? (
                  <MonacoEditor
                    value={activeFile.content}
                    path={activeFile.path}
                    onChange={(value) => updateFileContent(activeFile.id, value || '')}
                    onSave={handleSaveFile}
                    options={{
                      fontSize: editorSettings?.fontSize,
                      tabSize: editorSettings?.tabSize,
                      wordWrap: editorSettings?.wordWrap as any,
                      minimap: { enabled: editorSettings?.minimap },
                      // Theme is handled globally but we can enforce it if needed, 
                      // but MonacoEditor handles theme via next-themes.
                      // If we want to support 'editor.theme' from settings, we need to map it or pass it.
                    }}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <Code2 className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p>Select a file to start editing</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Panel>

          {/* AI Chat Panel */}
          {showAI && (
            <>
              <PanelResizeHandle className="w-1 bg-border hover:bg-primary/50 transition-colors" />
              <Panel defaultSize={30} minSize={20} maxSize={50}>
                <AIChat
                  projectId={projectId}
                  initialFile={activeFile}
                  onClose={() => toggleAI(false)}
                  onApplyCode={(code, mode) => {
                    if (activeFile) {
                      if (mode === 'replace') {
                        updateFileContent(activeFile.id, code);
                      } else if (mode === 'append') {
                        updateFileContent(activeFile.id, activeFile.content + '\n' + code);
                      }
                      // Auto-save after applying AI code
                      handleSaveFile(mode === 'replace' ? code : activeFile.content + '\n' + code);
                    }
                  }}
                />
              </Panel>
            </>
          )}

          {/* Agent Panel */}
          {showAgents && (
            <>
              <PanelResizeHandle className="w-1 bg-border hover:bg-primary/50 transition-colors" />
              <Panel defaultSize={30} minSize={20} maxSize={50}>
                <AgentPanel
                  projectId={projectId}
                  onClose={() => toggleAgents(false)}
                />
              </Panel>
            </>
          )}

          {/* Version History Panel */}
          {showHistory && (
            <>
              <PanelResizeHandle className="w-1 bg-border hover:bg-primary/50 transition-colors" />
              <Panel defaultSize={25} minSize={15} maxSize={40}>
                <VersionHistory
                  projectId={projectId}
                  onRollback={loadProject}
                />
              </Panel>
            </>
          )}
        </PanelGroup>
      </div>
    </div>
    </SocketProvider>
  );
}
