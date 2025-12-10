'use client';

import { useEffect, useState } from 'react';
import {
  Activity,
  Loader2,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

interface TaskData {
  id: string;
  type: string;
  status: string;
  prompt: string;
  createdAt: string;
  user: { name: string; email: string };
  project: { name: string };
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/admin/tasks/recent');
      setTasks(res.data);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteOldTasks = async () => {
    if (!confirm('Delete all completed tasks older than 30 days?')) return;
    setActionLoading('delete-tasks');
    try {
      const res = await api.delete('/api/admin/tasks/old');
      alert(`Deleted ${res.data.deleted} old tasks`);
      await loadTasks();
    } catch (error) {
      console.error('Failed to delete old tasks:', error);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Recent Agent Tasks ({tasks.length})
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadTasks}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={deleteOldTasks}
            disabled={actionLoading === 'delete-tasks'}
          >
            {actionLoading === 'delete-tasks' ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            Clean Old Tasks
          </Button>
        </div>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-sm">Type</th>
              <th className="text-left px-4 py-3 font-medium text-sm">Status</th>
              <th className="text-left px-4 py-3 font-medium text-sm">User</th>
              <th className="text-left px-4 py-3 font-medium text-sm">Project</th>
              <th className="text-left px-4 py-3 font-medium text-sm">Prompt</th>
              <th className="text-left px-4 py-3 font-medium text-sm">Created</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <tr key={t.id} className="border-t hover:bg-muted/30">
                <td className="px-4 py-3">
                  <span className="text-xs font-mono bg-muted px-2 py-1 rounded">
                    {t.type.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={t.status} />
                </td>
                <td className="px-4 py-3 text-sm">{t.user?.name || 'Unknown'}</td>
                <td className="px-4 py-3 text-sm">{t.project?.name || 'Unknown'}</td>
                <td className="px-4 py-3 text-sm max-w-xs truncate">{t.prompt}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {new Date(t.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    COMPLETED: 'bg-green-500/20 text-green-600',
    EXECUTING: 'bg-blue-500/20 text-blue-600',
    PENDING: 'bg-yellow-500/20 text-yellow-600',
    FAILED: 'bg-red-500/20 text-red-600',
    CANCELLED: 'bg-gray-500/20 text-gray-600',
    PLANNING: 'bg-purple-500/20 text-purple-600',
    WAITING_APPROVAL: 'bg-orange-500/20 text-orange-600',
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-muted'}`}>
      {status.replace('_', ' ')}
    </span>
  );
}
