'use client';

import { useState, useEffect } from 'react';
import {
  Clock,
  GitBranch,
  RotateCcw,
  Trash2,
  Plus,
  ChevronRight,
  Loader2,
  History,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

interface Snapshot {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

interface VersionHistoryProps {
  projectId: string;
  onRollback?: () => void;
}

export function VersionHistory({ projectId, onRollback }: VersionHistoryProps) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  useEffect(() => {
    loadSnapshots();
  }, [projectId]);

  const loadSnapshots = async () => {
    try {
      const { data } = await api.get(`/api/projects/${projectId}/versions/snapshots`);
      setSnapshots(data);
    } catch (error) {
      console.error('Failed to load snapshots:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setCreating(true);
    try {
      await api.post(`/api/projects/${projectId}/versions/snapshots`, {
        name: newName,
        description: newDesc,
      });
      setNewName('');
      setNewDesc('');
      setShowCreate(false);
      loadSnapshots();
    } catch (error) {
      console.error('Failed to create snapshot:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleRollback = async (id: string) => {
    if (!confirm('Are you sure you want to rollback to this snapshot? Current changes will be overwritten.')) {
      return;
    }

    try {
      await api.post(`/api/projects/${projectId}/versions/snapshots/${id}/rollback`);
      onRollback?.();
    } catch (error) {
      console.error('Failed to rollback:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this snapshot?')) return;

    try {
      await api.delete(`/api/projects/${projectId}/versions/snapshots/${id}`);
      loadSnapshots();
    } catch (error) {
      console.error('Failed to delete snapshot:', error);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="h-full flex flex-col bg-card border-l">
      {/* Header */}
      <div className="p-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">Version History</span>
        </div>
        <Button size="sm" variant="outline" onClick={() => setShowCreate(!showCreate)}>
          <Plus className="h-3 w-3 mr-1" />
          Snapshot
        </Button>
      </div>

      {/* Create Snapshot Form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="p-3 border-b space-y-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Snapshot name..."
            className="w-full h-8 px-2 rounded border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <textarea
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Description (optional)"
            className="w-full h-16 px-2 py-1 rounded border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={creating || !newName.trim()}>
              {creating ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Create'}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* Snapshots List */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : snapshots.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-8">
            <GitBranch className="h-8 w-8 mx-auto mb-3 opacity-50" />
            <p>No snapshots yet</p>
            <p className="text-xs mt-1">Create a snapshot to save your progress</p>
          </div>
        ) : (
          <div className="divide-y">
            {snapshots.map((snapshot) => (
              <div key={snapshot.id} className="p-3 hover:bg-accent/50 group">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{snapshot.name}</p>
                    {snapshot.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {snapshot.description}
                      </p>
                    )}
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDate(snapshot.createdAt)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() => handleRollback(snapshot.id)}
                      title="Rollback to this snapshot"
                    >
                      <RotateCcw className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-destructive"
                      onClick={() => handleDelete(snapshot.id)}
                      title="Delete snapshot"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
