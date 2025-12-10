'use client';

import { useEffect, useState } from 'react';
import {
  Activity,
  Loader2,
  RefreshCw,
  Play,
  Pause,
  Trash2,
  RotateCcw,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

interface QueueStats {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
}

interface JobInfo {
  id: string;
  name: string;
  status: string;
  attempts: number;
  timestamp: number;
  failedReason?: string;
}

export default function QueuePage() {
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [jobs, setJobs] = useState<JobInfo[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('waiting');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
    loadJobs(selectedStatus);
  }, [selectedStatus]);

  const loadStats = async () => {
    try {
      const res = await api.get('/api/admin/queue/stats');
      setStats(res.data);
    } catch (error) {
      console.error('Failed to load queue stats:', error);
    }
  };

  const loadJobs = async (status: string) => {
    setLoading(true);
    try {
      const res = await api.get(`/api/admin/queue/jobs/${status}`);
      setJobs(res.data);
    } catch (error) {
      console.error('Failed to load jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: string, jobId?: string) => {
    setActionLoading(action + (jobId || ''));
    try {
      switch (action) {
        case 'pause':
          await api.post('/api/admin/queue/pause');
          break;
        case 'resume':
          await api.post('/api/admin/queue/resume');
          break;
        case 'retry':
          if (jobId) await api.post(`/api/admin/queue/jobs/${jobId}/retry`);
          break;
        case 'remove':
          if (jobId) await api.delete(`/api/admin/queue/jobs/${jobId}`);
          break;
        case 'retryAll':
          await api.post('/api/admin/queue/retry-all-failed');
          break;
        case 'cleanCompleted':
          await api.post('/api/admin/queue/clean/completed');
          break;
        case 'cleanFailed':
          await api.post('/api/admin/queue/clean/failed');
          break;
      }
      await loadStats();
      await loadJobs(selectedStatus);
    } catch (error) {
      console.error(`Action ${action} failed:`, error);
    } finally {
      setActionLoading(null);
    }
  };

  const statuses = [
    { id: 'waiting', label: 'Waiting', icon: Clock, color: 'text-yellow-500' },
    { id: 'active', label: 'Active', icon: Activity, color: 'text-blue-500' },
    { id: 'completed', label: 'Completed', icon: CheckCircle, color: 'text-green-500' },
    { id: 'failed', label: 'Failed', icon: XCircle, color: 'text-red-500' },
    { id: 'delayed', label: 'Delayed', icon: AlertCircle, color: 'text-orange-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Queue Management
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { loadStats(); loadJobs(selectedStatus); }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {stats?.paused ? (
            <Button size="sm" onClick={() => handleAction('resume')} disabled={actionLoading === 'resume'}>
              <Play className="h-4 w-4 mr-2" />
              Resume
            </Button>
          ) : (
            <Button size="sm" variant="destructive" onClick={() => handleAction('pause')} disabled={actionLoading === 'pause'}>
              <Pause className="h-4 w-4 mr-2" />
              Pause
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-5 gap-4">
          {statuses.map(s => (
            <button
              key={s.id}
              onClick={() => setSelectedStatus(s.id)}
              className={`p-4 rounded-lg border bg-card text-left transition ${
                selectedStatus === s.id ? 'ring-2 ring-primary' : ''
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <s.icon className={`h-4 w-4 ${s.color}`} />
                <span className="text-sm font-medium">{s.label}</span>
              </div>
              <p className="text-2xl font-bold">
                {stats[s.id as keyof QueueStats] as number}
              </p>
            </button>
          ))}
        </div>
      )}

      {/* Queue Actions */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleAction('retryAll')}
          disabled={!!actionLoading}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Retry All Failed
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleAction('cleanCompleted')}
          disabled={!!actionLoading}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Clean Completed (24h)
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleAction('cleanFailed')}
          disabled={!!actionLoading}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Clean Failed (7d)
        </Button>
      </div>

      {/* Jobs List */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3">Job ID</th>
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-left px-4 py-3">Attempts</th>
              <th className="text-left px-4 py-3">Time</th>
              <th className="text-left px-4 py-3">Error</th>
              <th className="text-right px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </td>
              </tr>
            ) : jobs.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-muted-foreground">
                  No jobs in this queue
                </td>
              </tr>
            ) : (
              jobs.map(job => (
                <tr key={job.id} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-xs">{job.id}</td>
                  <td className="px-4 py-3">{job.name}</td>
                  <td className="px-4 py-3">{job.attempts}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(job.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-red-500 text-xs max-w-xs truncate">
                    {job.failedReason || '-'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      {selectedStatus === 'failed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAction('retry', job.id)}
                          disabled={actionLoading === `retry${job.id}`}
                        >
                          <RotateCcw className="h-3 w-3" />
                        </Button>
                      )}
                      {selectedStatus !== 'active' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAction('remove', job.id)}
                          disabled={actionLoading === `remove${job.id}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
