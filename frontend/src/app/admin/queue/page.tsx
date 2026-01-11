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
  MoreHorizontal,
  Plus,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { api } from '@/lib/api';
import { socket } from '@/lib/socket';
import { JobDetailView } from './JobDetailView';

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
  data: any;
  status: string;
  progress: number;
  attempts: number;
  timestamp: number;
  processedOn?: number;
  finishedOn?: number;
  failedReason?: string;
}

export default function QueuePage() {
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [jobs, setJobs] = useState<JobInfo[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('waiting');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobInfo | null>(null);
  
  // Selection State
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);

  // Socket Connection
  useEffect(() => {
    // Connect and subscribe
    if (!socket.connected) {
        socket.connect();
    }
    socket.emit('subscribe-queue');
    
    // Listeners
    const handleJobUpdate = () => {
        loadStats();
        // Only reload jobs if the event affects the current view
        // For simplicity, we can debounce reload or just reload.
        // Or better: optimize to only reload if we are viewing that status
        // But stats always need update.
        loadJobs(selectedStatus, false); // false = silent reload
    };

    socket.on('queue:job_completed', handleJobUpdate);
    socket.on('queue:job_failed', handleJobUpdate);
    socket.on('queue:job_waiting', handleJobUpdate);
    socket.on('queue:job_active', handleJobUpdate);
    socket.on('queue:update_stats', loadStats);

    return () => {
        socket.off('queue:job_completed', handleJobUpdate);
        socket.off('queue:job_failed', handleJobUpdate);
        socket.off('queue:job_waiting', handleJobUpdate);
        socket.off('queue:job_active', handleJobUpdate);
        socket.off('queue:update_stats', loadStats);
        // We don't disconnect here to avoid breaking other components using the socket
        // but typically you might leave the room.
    };
  }, [selectedStatus]);

  useEffect(() => {
    // Initial Load
    loadStats();
    loadJobs(selectedStatus);
    // Remove polling
  }, [selectedStatus]);

  const loadStats = async () => {
    try {
      const res = await api.get('/api/admin/queue/stats');
      setStats(res.data);
    } catch (error) {
      console.error('Failed to load queue stats:', error);
    }
  };

  const loadJobs = async (status: string, showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const res = await api.get(`/api/admin/queue/jobs/${status}`);
      setJobs(res.data);
      setSelectedJobIds([]); // Reset selection on view change
    } catch (error) {
      console.error('Failed to load jobs:', error);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handleCreateTestJob = async () => {
    setActionLoading('createTest');
    try {
        await api.post('/api/admin/queue/test-job');
        console.log('Test job created');
        // No need to manually reload, socket should pick it up
    } catch (error) {
        console.error('Failed to create test job', error);
    } finally {
        setActionLoading(null);
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
      console.log(`Action ${action} successful`);
      await loadStats();
      await loadJobs(selectedStatus);
      if (jobId && selectedJob?.id === jobId) {
          setSelectedJob(null);
      }
    } catch (error) {
      console.error(`Action ${action} failed:`, error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkAction = async (action: 'retry' | 'remove') => {
      if (selectedJobIds.length === 0) return;
      setActionLoading(`bulk-${action}`);
      try {
          if (action === 'retry') {
              await api.post('/api/admin/queue/bulk/retry', { ids: selectedJobIds });
          } else {
              await api.post('/api/admin/queue/bulk/remove', { ids: selectedJobIds });
          }
          console.log(`Bulk ${action} successful`);
          setSelectedJobIds([]);
          await loadStats();
          await loadJobs(selectedStatus);
      } catch (error) {
          console.error(`Bulk ${action} failed:`, error);
      } finally {
          setActionLoading(null);
      }
  };

  const toggleSelectAll = (checked: boolean) => {
      if (checked) {
          setSelectedJobIds(jobs.map(j => j.id));
      } else {
          setSelectedJobIds([]);
      }
  };

  const toggleSelectJob = (id: string, checked: boolean) => {
      setSelectedJobIds(prev => 
          checked ? [...prev, id] : prev.filter(jobId => jobId !== id)
      );
  };

  const statuses = [
    { id: 'waiting', label: 'Waiting', icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
    { id: 'active', label: 'Active', icon: Activity, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
    { id: 'completed', label: 'Completed', icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/20' },
    { id: 'failed', label: 'Failed', icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20' },
    { id: 'delayed', label: 'Delayed', icon: AlertCircle, color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Queue Management
            </h2>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                Real-time active
            </p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCreateTestJob} disabled={!!actionLoading}>
                <Plus className="h-4 w-4 mr-2" />
                Create Test Job
            </Button>
          <Button variant="outline" size="sm" onClick={() => { loadStats(); loadJobs(selectedStatus); }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {stats?.paused ? (
            <Button size="sm" onClick={() => handleAction('resume')} disabled={actionLoading === 'resume'}>
              <Play className="h-4 w-4 mr-2" />
              Resume Queue
            </Button>
          ) : (
            <Button size="sm" variant="destructive" onClick={() => handleAction('pause')} disabled={actionLoading === 'pause'}>
              <Pause className="h-4 w-4 mr-2" />
              Pause Queue
            </Button>
          )}
        </div>
      </div>

      {/* Pipeline Visualization */}
      {stats && (
          <div className="relative">
             <div className="absolute top-1/2 left-0 w-full h-0.5 bg-muted -z-10" />
             <div className="grid grid-cols-5 gap-4">
                {statuses.map((s, i) => (
                    <div key={s.id} className="relative group">
                         <button
                            onClick={() => setSelectedStatus(s.id)}
                            className={`w-full p-4 rounded-xl border bg-card text-left transition-all hover:-translate-y-1 hover:shadow-md ${
                                selectedStatus === s.id ? `ring-2 ring-primary ${s.bg}` : 'hover:bg-accent'
                            }`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className={`p-2 rounded-lg ${s.bg} ${s.color}`}>
                                    <s.icon className="h-4 w-4" />
                                </span>
                                {selectedStatus === s.id && <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />}
                            </div>
                            <div className="space-y-1">
                                <p className="text-2xl font-bold tracking-tight">
                                    {stats[s.id as keyof QueueStats] as number}
                                </p>
                                <p className="text-sm text-muted-foreground font-medium">{s.label}</p>
                            </div>
                        </button>
                    </div>
                ))}
             </div>
          </div>
      )}

      {/* Queue Actions / Bulk Toolbar */}
      <div className="flex items-center justify-between py-2 min-h-[40px]">
           {selectedJobIds.length > 0 ? (
               <div className="flex items-center gap-2 bg-accent/30 px-3 py-1.5 rounded-lg border border-accent">
                   <span className="text-sm font-medium">{selectedJobIds.length} selected</span>
                   <div className="h-4 w-[1px] bg-border mx-2" />
                   {selectedStatus === 'failed' && (
                       <Button variant="ghost" size="sm" onClick={() => handleBulkAction('retry')} disabled={!!actionLoading}>
                           <RotateCcw className="h-4 w-4 mr-2" /> Retry Selected
                       </Button>
                   )}
                   <Button variant="ghost" size="sm" onClick={() => handleBulkAction('remove')} disabled={!!actionLoading} className="text-destructive hover:text-destructive">
                       <Trash2 className="h-4 w-4 mr-2" /> Remove Selected
                   </Button>
               </div>
           ) : (
                <h3 className="text-sm font-medium text-muted-foreground">
                    {statuses.find(s => s.id === selectedStatus)?.label} Jobs
                </h3>
           )}

          <div className="flex gap-2">
            <Button
            variant="outline"
            size="sm"
            onClick={() => handleAction('retryAll')}
            disabled={!!actionLoading || stats?.failed === 0}
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
            Clean Completed
            </Button>
            <Button
            variant="outline"
            size="sm"
            onClick={() => handleAction('cleanFailed')}
            disabled={!!actionLoading}
            >
            <Trash2 className="h-4 w-4 mr-2" />
            Clean Failed
            </Button>
        </div>
      </div>

      {/* Jobs List */}
      <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="px-4 py-3 w-[40px]">
                  <Checkbox 
                    checked={jobs.length > 0 && selectedJobIds.length === jobs.length}
                    onCheckedChange={(checked) => toggleSelectAll(!!checked)}
                  />
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground w-[100px]">Job ID</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name / Data</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground w-[100px]">Attempts</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground w-[180px]">Created At</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status / Details</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground w-[100px]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">Loading jobs...</p>
                  </div>
                </td>
              </tr>
            ) : jobs.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-muted-foreground">
                  No jobs found in this queue
                </td>
              </tr>
            ) : (
              jobs.map(job => (
                <tr
                    key={job.id}
                    className={`group transition-colors cursor-pointer border-l-2 ${selectedJobIds.includes(job.id) ? 'bg-muted/50 border-l-primary' : 'hover:bg-muted/30 border-l-transparent'}`}
                    onClick={() => setSelectedJob(job)}
                >
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                       <Checkbox 
                        checked={selectedJobIds.includes(job.id)}
                        onCheckedChange={(checked) => toggleSelectJob(job.id, !!checked)}
                      />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {job.id.slice(0, 8)}...
                  </td>
                  <td className="px-4 py-3">
                      <div className="font-medium">{job.name}</div>
                      {job.data?.prompt && (
                          <div className="text-xs text-muted-foreground truncate max-w-[300px]">
                              {job.data.prompt}
                          </div>
                      )}
                  </td>
                  <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          job.attempts > 0 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                          {job.attempts}
                      </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(job.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                     {job.failedReason ? (
                         <div className="text-xs text-destructive truncate max-w-[200px]" title={job.failedReason}>
                             {job.failedReason}
                         </div>
                     ) : (
                        <div className="flex items-center gap-2">
                            {job.progress > 0 && job.status === 'active' && (
                                <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                                    <div className="h-full bg-primary" style={{ width: `${job.progress}%` }} />
                                </div>
                            )}
                            <span className="text-xs capitalize text-muted-foreground">{job.status}</span>
                        </div>
                     )}
                  </td>
                  <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {selectedStatus === 'failed' && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => handleAction('retry', job.id)}
                          disabled={actionLoading === `retry${job.id}`}
                          title="Retry Job"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                      {selectedStatus !== 'active' && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleAction('remove', job.id)}
                          disabled={actionLoading === `remove${job.id}`}
                          title="Remove Job"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setSelectedJob(job)}>
                          <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <JobDetailView
        job={selectedJob}
        isOpen={!!selectedJob}
        onClose={() => setSelectedJob(null)}
        onRetry={selectedStatus === 'failed' ? (id) => handleAction('retry', id) : undefined}
      />
    </div>
  );
}
