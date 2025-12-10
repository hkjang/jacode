'use client';

import { useEffect, useState } from 'react';
import {
  Users,
  FolderKanban,
  Activity,
  FileText,
  Cpu,
  Clock,
  HardDrive,
  Zap,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

interface SystemStats {
  users: { total: number; admins: number; active: number };
  projects: { total: number; activeToday: number };
  tasks: { total: number; pending: number; completed: number; failed: number; executing: number };
  artifacts: { total: number; approved: number; rejected: number; draft: number };
  knowledge: { total: number; patterns: number; snippets: number; templates: number };
  system: {
    uptime: string;
    memoryUsage: number;
    dbConnections: number;
    nodeVersion: string;
  };
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/admin/stats');
      setStats(res.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Failed to load statistics.
        <Button variant="outline" className="ml-4" onClick={loadStats}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">System Overview</h2>
        <Button variant="outline" size="sm" onClick={loadStats}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Users" value={stats.users.total} subtext={`${stats.users.admins} admins`} color="text-blue-500" />
        <StatCard icon={FolderKanban} label="Projects" value={stats.projects.total} subtext={`${stats.projects.activeToday} active today`} color="text-green-500" />
        <StatCard icon={Activity} label="Agent Tasks" value={stats.tasks.total} subtext={`${stats.tasks.pending} pending`} color="text-purple-500" />
        <StatCard icon={FileText} label="Artifacts" value={stats.artifacts.total} subtext={`${stats.artifacts.approved} approved`} color="text-orange-500" />
      </div>

      {/* Task Distribution & System Health */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-lg border bg-card">
          <h3 className="font-medium mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Task Status Distribution
          </h3>
          <div className="space-y-3">
            <StatusBar label="Completed" value={stats.tasks.completed} total={stats.tasks.total} color="bg-green-500" />
            <StatusBar label="Executing" value={stats.tasks.executing} total={stats.tasks.total} color="bg-blue-500" />
            <StatusBar label="Pending" value={stats.tasks.pending} total={stats.tasks.total} color="bg-yellow-500" />
            <StatusBar label="Failed" value={stats.tasks.failed} total={stats.tasks.total} color="bg-red-500" />
          </div>
        </div>

        <div className="p-6 rounded-lg border bg-card">
          <h3 className="font-medium mb-4 flex items-center gap-2">
            <Cpu className="h-4 w-4" />
            System Health
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" /> Uptime
              </span>
              <span className="font-medium">{stats.system.uptime}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-2">
                <HardDrive className="h-4 w-4" /> Memory Usage
              </span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${stats.system.memoryUsage > 80 ? 'bg-red-500' : 'bg-green-500'}`}
                    style={{ width: `${stats.system.memoryUsage}%` }}
                  />
                </div>
                <span className="font-medium">{stats.system.memoryUsage}%</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-2">
                <Zap className="h-4 w-4" /> Node Version
              </span>
              <span className="font-medium">{stats.system.nodeVersion}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Knowledge Base Stats */}
      <div className="p-6 rounded-lg border bg-card">
        <h3 className="font-medium mb-4">Knowledge Base</h3>
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold">{stats.knowledge.total}</p>
            <p className="text-sm text-muted-foreground">Total Entries</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{stats.knowledge.patterns}</p>
            <p className="text-sm text-muted-foreground">Code Patterns</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{stats.knowledge.snippets}</p>
            <p className="text-sm text-muted-foreground">Snippets</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{stats.knowledge.templates}</p>
            <p className="text-sm text-muted-foreground">Templates</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, subtext, color }: { icon: any; label: string; value: number; subtext: string; color: string }) {
  return (
    <div className="p-4 rounded-lg border bg-card">
      <div className="flex items-center gap-3">
        <Icon className={`h-8 w-8 ${color}`} />
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">{subtext}</p>
        </div>
      </div>
    </div>
  );
}

function StatusBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}
