'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Bot,
  Clock,
  CheckCircle,
  XCircle,
  Pause,
  Play,
  RefreshCw,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { agentApi } from '@/lib/api';
import { useAgentStore } from '@/stores/agentStore';

interface AgentTask {
  id: string;
  type: string;
  status: string;
  prompt: string;
  progress: number;
  currentStep?: string;
  error?: string;
  createdAt: string;
  artifacts?: { id: string; type: string; title: string }[];
}

interface AgentPanelProps {
  projectId: string;
  onClose: () => void;
}

const STATUS_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  PENDING: { icon: Clock, color: 'text-muted-foreground', label: 'Pending' },
  PLANNING: { icon: Loader2, color: 'text-blue-500', label: 'Planning' },
  EXECUTING: { icon: Loader2, color: 'text-primary', label: 'Executing' },
  WAITING_APPROVAL: { icon: Pause, color: 'text-yellow-500', label: 'Awaiting Approval' },
  COMPLETED: { icon: CheckCircle, color: 'text-green-500', label: 'Completed' },
  FAILED: { icon: XCircle, color: 'text-destructive', label: 'Failed' },
  CANCELLED: { icon: XCircle, color: 'text-muted-foreground', label: 'Cancelled' },
};

export function AgentPanel({ projectId, onClose }: AgentPanelProps) {
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<AgentTask | null>(null);
  const [newPrompt, setNewPrompt] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadTasks();
    const interval = setInterval(loadTasks, 5000);
    return () => clearInterval(interval);
  }, [projectId]);

  const loadTasks = async () => {
    try {
      const data = await agentApi.getProjectTasks(projectId);
      setTasks(data);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrompt.trim()) return;

    setCreating(true);
    try {
      const task = await agentApi.createTask({
        type: 'CODE_GENERATION',
        prompt: newPrompt,
        projectId,
      });
      setTasks([task, ...tasks]);
      setNewPrompt('');
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleApprove = async (taskId: string) => {
    try {
      await agentApi.approveTask(taskId);
      loadTasks();
    } catch (error) {
      console.error('Failed to approve task:', error);
    }
  };

  const handleReject = async (taskId: string) => {
    try {
      await agentApi.rejectTask(taskId);
      loadTasks();
    } catch (error) {
      console.error('Failed to reject task:', error);
    }
  };

  const handleRetry = async (taskId: string) => {
    try {
      await agentApi.retryTask(taskId);
      loadTasks();
    } catch (error) {
      console.error('Failed to retry task:', error);
    }
  };

  const handleCancel = async (taskId: string) => {
    try {
      await agentApi.cancelTask(taskId);
      loadTasks();
    } catch (error) {
      console.error('Failed to cancel task:', error);
    }
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="h-full flex flex-col bg-card border-l">
      {/* Header */}
      <div className="p-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">AI Agents</span>
          <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
            {tasks.filter((t) => ['PENDING', 'PLANNING', 'EXECUTING'].includes(t.status)).length} active
          </span>
        </div>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Create Task Form */}
      <form onSubmit={handleCreateTask} className="p-3 border-b">
        <div className="flex gap-2">
          <input
            type="text"
            value={newPrompt}
            onChange={(e) => setNewPrompt(e.target.value)}
            placeholder="Describe what you want to build..."
            className="flex-1 h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={creating}
          />
          <Button type="submit" size="sm" disabled={creating || !newPrompt.trim()}>
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          </Button>
        </div>
      </form>

      {/* Tasks List */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-8">
            <Bot className="h-8 w-8 mx-auto mb-3 opacity-50" />
            <p>No tasks yet</p>
            <p className="text-xs mt-1">Create a task to get started</p>
          </div>
        ) : (
          <div className="divide-y">
            {tasks.map((task) => {
              const config = STATUS_CONFIG[task.status] || STATUS_CONFIG.PENDING;
              const StatusIcon = config.icon;
              const isActive = ['PENDING', 'PLANNING', 'EXECUTING'].includes(task.status);

              return (
                <div
                  key={task.id}
                  className="p-3 hover:bg-accent/50 cursor-pointer"
                  onClick={() => setSelectedTask(task)}
                >
                  <div className="flex items-start gap-3">
                    <StatusIcon
                      className={`h-4 w-4 mt-0.5 ${config.color} ${isActive ? 'animate-spin' : ''}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{task.prompt}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs ${config.color}`}>{config.label}</span>
                        {task.currentStep && (
                          <span className="text-xs text-muted-foreground">• {task.currentStep}</span>
                        )}
                      </div>
                      {isActive && task.progress > 0 && (
                        <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                      )}
                      {task.status === 'WAITING_APPROVAL' && (
                        <div className="flex gap-2 mt-2">
                          <Button size="sm" variant="success" onClick={(e) => { e.stopPropagation(); handleApprove(task.id); }}>
                            Approve
                          </Button>
                          <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleReject(task.id); }}>
                            Reject
                          </Button>
                        </div>
                      )}
                      {task.status === 'FAILED' && (
                        <div className="flex gap-2 mt-2">
                          <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleRetry(task.id); }}>
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Retry
                          </Button>
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{formatTime(task.createdAt)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
