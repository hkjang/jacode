'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
  Plus,
  Trash2,
  Edit2,
  MoreHorizontal,
  Download,
  Search,
  FolderMinus,
  FolderPlus,
  RefreshCw,
  FileCode,
  FileJson,
  FileText,
  Image,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';

export interface FileTreeNode {
  id: string;
  name: string;
  path: string;
  isDirectory: boolean;
  extension?: string;
  children?: FileTreeNode[];
  isExpanded?: boolean;
}

interface FileExplorerProps {
  files: FileTreeNode[];
  selectedPath?: string;
  onSelectFile: (file: FileTreeNode) => void;
  onCreateFile?: (parentPath: string, name: string, isDirectory: boolean) => void;
  onDeleteFile?: (file: FileTreeNode) => void;
  onRenameFile?: (file: FileTreeNode, newName: string) => void;
  onUploadFile?: (file: File, parentPath?: string) => void;
  onDownloadFile?: (file: FileTreeNode) => void;
  onMoveFile?: (source: FileTreeNode, target: FileTreeNode) => void;
  onAddToContext?: (file: FileTreeNode) => void; // Add file to AI context
  className?: string;
}

// File type icons based on extension
const getFileIcon = (extension?: string): { Icon: React.ElementType; color: string } => {
  const iconMap: Record<string, { Icon: React.ElementType; color: string }> = {
    ts: { Icon: FileCode, color: 'text-blue-500' },
    tsx: { Icon: FileCode, color: 'text-blue-500' },
    js: { Icon: FileCode, color: 'text-yellow-500' },
    jsx: { Icon: FileCode, color: 'text-yellow-500' },
    json: { Icon: FileJson, color: 'text-yellow-600' },
    css: { Icon: FileCode, color: 'text-blue-400' },
    scss: { Icon: FileCode, color: 'text-pink-500' },
    html: { Icon: FileCode, color: 'text-orange-500' },
    md: { Icon: FileText, color: 'text-gray-400' },
    txt: { Icon: FileText, color: 'text-gray-400' },
    py: { Icon: FileCode, color: 'text-green-500' },
    go: { Icon: FileCode, color: 'text-cyan-500' },
    rs: { Icon: FileCode, color: 'text-orange-600' },
    java: { Icon: FileCode, color: 'text-red-500' },
    png: { Icon: Image, color: 'text-purple-500' },
    jpg: { Icon: Image, color: 'text-purple-500' },
    jpeg: { Icon: Image, color: 'text-purple-500' },
    gif: { Icon: Image, color: 'text-purple-500' },
    svg: { Icon: Image, color: 'text-pink-400' },
    yaml: { Icon: FileText, color: 'text-green-400' },
    yml: { Icon: FileText, color: 'text-green-400' },
    prisma: { Icon: FileCode, color: 'text-indigo-500' },
  };

  return iconMap[extension || ''] || { Icon: File, color: 'text-muted-foreground' };
};

interface TreeNodeProps {
  node: FileTreeNode;
  level: number;
  selectedPath?: string;
  expandedPaths: Set<string>;
  onToggleExpand: (path: string) => void;
  onSelectFile: (file: FileTreeNode) => void;
  onCreateFile?: (parentPath: string, name: string, isDirectory: boolean) => void;
  onDeleteFile?: (file: FileTreeNode) => void;
  onRenameFile?: (file: FileTreeNode, newName: string) => void;
  onUploadFile?: (file: File, parentPath?: string) => void;
  onDownloadFile?: (file: FileTreeNode) => void;
  onMoveFile?: (source: FileTreeNode, target: FileTreeNode) => void;
  onAddToContext?: (file: FileTreeNode) => void;
}

function TreeNode({
  node,
  level,
  selectedPath,
  expandedPaths,
  onToggleExpand,
  onSelectFile,
  onCreateFile,
  onDeleteFile,
  onRenameFile,
  onUploadFile,
  onDownloadFile,
  onMoveFile,
  onAddToContext,
}: TreeNodeProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(node.name);

  const isExpanded = expandedPaths.has(node.path);
  const isSelected = selectedPath === node.path;
  const iconStyle = getFileIcon(node.extension);

  const handleClick = () => {
    if (node.isDirectory) {
      onToggleExpand(node.path);
    } else {
      onSelectFile(node);
    }
  };

  const handleRename = () => {
    if (editName && editName !== node.name && onRenameFile) {
      onRenameFile(node, editName);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRename();
    } else if (e.key === 'Escape') {
      setEditName(node.name);
      setIsEditing(false);
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    e.dataTransfer.setData('sourceId', node.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (node.isDirectory) {
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if it's an internal move
    const sourceId = e.dataTransfer.getData('sourceId');
    if (sourceId && onMoveFile && node.isDirectory) {
      // Cannot move to itself
      if (sourceId !== node.id) {
         onMoveFile({ id: sourceId } as FileTreeNode, node);
      }
      return;
    }
    
    // Handle file upload drop on folder
    if (onUploadFile && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
       Array.from(e.dataTransfer.files).forEach((file) => {
        onUploadFile(file, node.path);
      });
    }
  };

  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger>
          <div
            className={cn(
              'file-tree-item group',
              isSelected && 'selected',
            )}
            style={{ paddingLeft: `${level * 12 + 8}px` }}
            onClick={handleClick}
            draggable={!isEditing}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {/* Expand/collapse icon for directories */}
            {node.isDirectory ? (
              <span className="w-4 h-4 flex items-center justify-center">
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </span>
            ) : (
              <span className="w-4" />
            )}

            {/* File/folder icon */}
            {node.isDirectory ? (
              isExpanded ? (
                <FolderOpen className="h-4 w-4 text-yellow-500" />
              ) : (
                <Folder className="h-4 w-4 text-yellow-500" />
              )
            ) : (
              <iconStyle.Icon className={cn('h-4 w-4', iconStyle.color)} />
            )}

            {/* Name */}
            {isEditing ? (
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleRename}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-transparent border border-primary px-1 text-sm outline-none"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="flex-1 truncate text-sm">{node.name}</span>
            )}

            {/* Actions (visible on hover) */}
            <div className="hidden group-hover:flex items-center gap-1">
              {node.isDirectory && onCreateFile && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const name = prompt('Enter file name:');
                    if (name) onCreateFile(node.path, name, false);
                  }}
                  className="p-0.5 hover:bg-accent rounded"
                >
                  <Plus className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        </ContextMenuTrigger>

        <ContextMenuContent>
          {node.isDirectory && (
            <>
              <ContextMenuItem
                onClick={() => {
                  const name = prompt('Enter file name:');
                  if (name && onCreateFile) onCreateFile(node.path, name, false);
                }}
              >
                <File className="h-4 w-4 mr-2" />
                New File
              </ContextMenuItem>
              <ContextMenuItem
                onClick={() => {
                  const name = prompt('Enter folder name:');
                  if (name && onCreateFile) onCreateFile(node.path, name, true);
                }}
              >
                <Folder className="h-4 w-4 mr-2" />
                New Folder
              </ContextMenuItem>
              <ContextMenuSeparator />
            </>
          )}
          <ContextMenuItem onClick={() => setIsEditing(true)}>
            <Edit2 className="h-4 w-4 mr-2" />
            Rename
          </ContextMenuItem>
          <ContextMenuItem
            className="text-destructive"
            onClick={() => {
              if (confirm(`Delete ${node.name}?`) && onDeleteFile) {
                onDeleteFile(node);
              }
            }}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </ContextMenuItem>
          {!node.isDirectory && onDownloadFile && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem
                onClick={() => onDownloadFile(node)}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </ContextMenuItem>
            </>
          )}
          {!node.isDirectory && onAddToContext && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem
                onClick={() => onAddToContext(node)}
                className="text-purple-600"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Add to AI Context
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>

      {/* Children */}
      {node.isDirectory && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              selectedPath={selectedPath}
              expandedPaths={expandedPaths}
              onToggleExpand={onToggleExpand}
              onSelectFile={onSelectFile}
              onCreateFile={onCreateFile}
              onDeleteFile={onDeleteFile}
              onRenameFile={onRenameFile}
              onUploadFile={onUploadFile}
              onDownloadFile={onDownloadFile}
              onMoveFile={onMoveFile}
              onAddToContext={onAddToContext}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FileExplorer({
  files,
  selectedPath,
  onSelectFile,
  onCreateFile,
  onDeleteFile,
  onRenameFile,
  onUploadFile,
  onDownloadFile,
  onMoveFile,
  onAddToContext,
  className,
}: FileExplorerProps) {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (onUploadFile && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      Array.from(e.dataTransfer.files).forEach((file) => {
        // Default to root upload for now
        onUploadFile(file);
      });
    }
  }, [onUploadFile]);

  const handleToggleExpand = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  // Auto-expand parent folders of selected file
  React.useEffect(() => {
    if (selectedPath) {
      const parts = selectedPath.split('/');
      const pathsToExpand: string[] = [];
      for (let i = 1; i < parts.length; i++) {
        pathsToExpand.push(parts.slice(0, i).join('/'));
      }
      setExpandedPaths((prev) => {
        const next = new Set(prev);
        pathsToExpand.forEach((p) => next.add(p));
        return next;
      });
    }
  }, [selectedPath]);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter files recursively
  const filterFiles = useCallback((nodes: FileTreeNode[], query: string): FileTreeNode[] => {
    if (!query.trim()) return nodes;
    
    const lowerQuery = query.toLowerCase();
    return nodes.reduce<FileTreeNode[]>((acc, node) => {
      if (node.name.toLowerCase().includes(lowerQuery)) {
        acc.push(node);
      } else if (node.isDirectory && node.children) {
        const filteredChildren = filterFiles(node.children, query);
        if (filteredChildren.length > 0) {
          acc.push({ ...node, children: filteredChildren, isExpanded: true });
        }
      }
      return acc;
    }, []);
  }, []);
  
  const filteredFiles = useMemo(() => filterFiles(files, searchQuery), [files, searchQuery, filterFiles]);
  
  // Collect all paths for expand/collapse all
  const getAllPaths = useCallback((nodes: FileTreeNode[]): string[] => {
    return nodes.flatMap(node => {
      if (node.isDirectory) {
        return [node.path, ...(node.children ? getAllPaths(node.children) : [])];
      }
      return [];
    });
  }, []);
  
  const handleExpandAll = () => {
    setExpandedPaths(new Set(getAllPaths(files)));
  };
  
  const handleCollapseAll = () => {
    setExpandedPaths(new Set());
  };

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Toolbar */}
      <div className="px-2 py-1.5 border-b flex items-center gap-1 bg-muted/30">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files..."
            className="w-full h-6 pl-7 pr-2 text-xs bg-background border rounded focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={handleExpandAll}
          title="Expand all"
        >
          <FolderPlus className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={handleCollapseAll}
          title="Collapse all"
        >
          <FolderMinus className="h-3 w-3" />
        </Button>
        {onCreateFile && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => {
              const name = prompt('Enter file name:');
              if (name) onCreateFile('', name, false);
            }}
            title="New file"
          >
            <Plus className="h-3 w-3" />
          </Button>
        )}
      </div>
      
      {/* File count */}
      {searchQuery && (
        <div className="px-2 py-1 text-[10px] text-muted-foreground bg-muted/20 border-b">
          {filteredFiles.length === 0 ? 'No files found' : `Found ${filteredFiles.length} matches`}
        </div>
      )}

      {/* File tree */}
      <div 
        className={cn(
          'flex-1 py-2 select-none min-h-[200px] transition-colors overflow-auto', 
          isDragging && 'bg-accent/20 border-2 border-dashed border-primary/50',
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {filteredFiles.length === 0 && !searchQuery ? (
          <div className="text-center text-muted-foreground text-xs py-8">
            <Folder className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No files yet</p>
            <p className="text-[10px] mt-1">Drag files here or use the + button</p>
          </div>
        ) : (
          filteredFiles.map((file) => (
            <TreeNode
              key={file.id}
              node={file}
              level={0}
              selectedPath={selectedPath}
              expandedPaths={expandedPaths}
              onToggleExpand={handleToggleExpand}
              onSelectFile={onSelectFile}
              onCreateFile={onCreateFile}
              onDeleteFile={onDeleteFile}
              onRenameFile={onRenameFile}
              onUploadFile={onUploadFile}
              onDownloadFile={onDownloadFile}
              onMoveFile={onMoveFile}
              onAddToContext={onAddToContext}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default FileExplorer;
