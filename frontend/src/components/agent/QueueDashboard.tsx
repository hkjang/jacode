'use client';

import { useState, useEffect } from 'react';
import {
  Activity,
  Server,
  Clock,
  CheckCircle,
  XCircle,
  Pause,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

interface AgentInfo {
  total: number;
  available: number;
  busy: number;
}

interface QueueData {
  codeGeneration: QueueStats;
  planGeneration: QueueStats;
  agents: AgentInfo;
}

export function QueueDashboard() {
  const [data, setData] = useState<QueueData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 3000);
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      const { data: stats } = await api.get('/api/agents/queue-stats');
      setData(stats);
    } catch (error) {
      console.error('Failed to load queue stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Failed to load queue stats
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Agent Status */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          icon={Server}
          label="Total Agents"
          value={data.agents.total}
          color="text-primary"
        />
        <StatCard
          icon={Activity}
          label="Active"
          value={data.agents.busy}
          color="text-yellow-500"
        />
        <StatCard
          icon={CheckCircle}
          label="Available"
          value={data.agents.available}
          color="text-green-500"
        />
      </div>

      {/* Queue Stats */}
      <div className="grid md:grid-cols-2 gap-4">
        <QueueCard title="Code Generation" stats={data.codeGeneration} />
        <QueueCard title="Plan Generation" stats={data.planGeneration} />
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: any;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="p-4 rounded-lg border bg-card">
      <div className="flex items-center gap-3">
        <Icon className={`h-5 w-5 ${color}`} />
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}

function QueueCard({ title, stats }: { title: string; stats: QueueStats }) {
  const total = stats.waiting + stats.active + stats.completed + stats.failed;

  return (
    <div className="p-4 rounded-lg border bg-card">
      <h3 className="font-medium mb-3">{title}</h3>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-muted-foreground" /> Waiting
          </span>
          <span className="font-medium">{stats.waiting}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="flex items-center gap-1">
            <Loader2 className="h-3 w-3 text-primary animate-spin" /> Active
          </span>
          <span className="font-medium">{stats.active}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3 text-green-500" /> Completed
          </span>
          <span className="font-medium">{stats.completed}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="flex items-center gap-1">
            <XCircle className="h-3 w-3 text-destructive" /> Failed
          </span>
          <span className="font-medium">{stats.failed}</span>
        </div>
      </div>
      {total > 0 && (
        <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden flex">
          <div
            className="bg-green-500"
            style={{ width: `${(stats.completed / total) * 100}%` }}
          />
          <div
            className="bg-primary"
            style={{ width: `${(stats.active / total) * 100}%` }}
          />
          <div
            className="bg-yellow-500"
            style={{ width: `${(stats.waiting / total) * 100}%` }}
          />
          <div
            className="bg-destructive"
            style={{ width: `${(stats.failed / total) * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}

interface TaskPriorityControlProps {
  taskId: string;
  currentPriority: number;
  onPriorityChange?: () => void;
}

export function TaskPriorityControl({
  taskId,
  currentPriority,
  onPriorityChange,
}: TaskPriorityControlProps) {
  const [priority, setPriority] = useState(currentPriority);
  const [updating, setUpdating] = useState(false);

  const handleChange = async (newPriority: number) => {
    if (newPriority < 1 || newPriority > 10) return;
    
    setUpdating(true);
    try {
      await api.patch(`/api/agents/tasks/${taskId}/priority`, { priority: newPriority });
      setPriority(newPriority);
      onPriorityChange?.();
    } catch (error) {
      console.error('Failed to update priority:', error);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <Button
        size="sm"
        variant="ghost"
        className="h-6 w-6 p-0"
        disabled={updating || priority >= 10}
        onClick={() => handleChange(priority + 1)}
      >
        <ArrowUp className="h-3 w-3" />
      </Button>
      <span className="w-6 text-center text-sm font-medium">{priority}</span>
      <Button
        size="sm"
        variant="ghost"
        className="h-6 w-6 p-0"
        disabled={updating || priority <= 1}
        onClick={() => handleChange(priority - 1)}
      >
        <ArrowDown className="h-3 w-3" />
      </Button>
    </div>
  );
}
