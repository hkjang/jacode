'use client';

import React, { useState, useCallback } from 'react';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
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
  className?: string;
}

// File type icons based on extension
const getFileIcon = (extension?: string) => {
  const iconMap: Record<string, { color: string }> = {
    ts: { color: 'text-blue-500' },
    tsx: { color: 'text-blue-500' },
    js: { color: 'text-yellow-500' },
    jsx: { color: 'text-yellow-500' },
    json: { color: 'text-yellow-600' },
    css: { color: 'text-blue-400' },
    scss: { color: 'text-pink-500' },
    html: { color: 'text-orange-500' },
    md: { color: 'text-gray-400' },
    py: { color: 'text-green-500' },
    go: { color: 'text-cyan-500' },
    rs: { color: 'text-orange-600' },
    java: { color: 'text-red-500' },
  };

  return iconMap[extension || ''] || { color: 'text-muted-foreground' };
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
              <File className={cn('h-4 w-4', iconStyle.color)} />
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
  className,
}: FileExplorerProps) {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

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

  return (
    <div className={cn('py-2 select-none', className)}>
      {files.map((file) => (
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
        />
      ))}
    </div>
  );
}

export default FileExplorer;
