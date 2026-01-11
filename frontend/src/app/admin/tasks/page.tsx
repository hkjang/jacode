'use client';

import { useEffect, useState } from 'react';
import {
  Activity,
  Loader2,
  Trash2,
  RefreshCw,
  Search,
  Filter,
  ArrowUpDown,
  Bot,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectTrigger, 
  SelectValue, 
  SelectContent, 
  SelectItem 
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { ModelSelector } from '@/components/ai/ModelSelector';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { TaskDetail } from './components/TaskDetail';

interface TaskData {
  id: string;
  type: string;
  status: string;
  prompt: string;
  createdAt: string;
  user: { name: string; email: string };
  project: { name: string };
  error?: string;
  progress?: number;
  currentStep?: string;
  artifacts?: any[];
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskData | null>(null);
  
  // New Task State
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    type: 'CODE_GENERATION',
    prompt: '',
    model: '',
    priority: 1
  });
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

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

  const handleTaskAction = async (action: string, taskId: string, data?: any) => {
    try {
      switch (action) {
        case 'cancel':
          await api.post(`/api/agents/tasks/${taskId}/cancel`);
          break;
        case 'retry':
          await api.post(`/api/agents/tasks/${taskId}/retry`);
          break;
        case 'approve':
          await api.post(`/api/agents/tasks/${taskId}/approve`);
          break;
        case 'reject':
          await api.post(`/api/agents/tasks/${taskId}/reject`, data);
          break;
      }
      // Reload specific task to update UI
      const res = await api.get(`/api/agents/tasks/${taskId}`);
      const updatedTask = res.data;
      
      // Update local state
      setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));
      if (selectedTask?.id === taskId) {
        setSelectedTask(updatedTask);
      }
    } catch (error) {
      console.error(`Failed to ${action} task:`, error);
      alert(`Failed to ${action} task`);
    }
  };

  const handleCreateTask = async () => {
    try {
      setActionLoading('create-task');
      // Use Default Project ID or ask user - for now using first project or hardcoded if needed
      // Since this is Admin UI, maybe we need a Project Selector too? 
      // Or just default to a "General" way. 
      // The API requires projectId. 
      // Let's assume we can fetch projects and pick first one or let user select.
      // For simplicity, I will hardcode a TODO or use a "default" one if available.
      // Ideally I should add ProjectSelector.
      
      const projectId = 'default-project-id'; // TODO: Get real project ID
      
      await api.post('/api/agents/tasks', {
        ...newTask,
        projectId,
        context: {} // Empty context for manual tasks
      });
      
      setIsNewTaskOpen(false);
      setNewTask({ type: 'CODE_GENERATION', prompt: '', model: '', priority: 1 });
      loadTasks();
    } catch (error) {
      console.error('Failed to create task:', error);
      alert('Failed to create task');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (statusFilter !== 'ALL' && task.status !== statusFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        task.prompt.toLowerCase().includes(query) ||
        task.user?.name.toLowerCase().includes(query) ||
        task.project?.name.toLowerCase().includes(query) ||
        task.type.toLowerCase().includes(query)
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      <div className="flex items-center justify-between">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
        <Activity className="h-5 w-5" />
        Agent Tasks Management
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
        Monitor and manage AI agent tasks across all projects
        </p>
      </div>
      <div className="flex gap-2">
        <Dialog open={isNewTaskOpen} onOpenChange={setIsNewTaskOpen}>
        <DialogTrigger asChild>
          <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Task
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
          <DialogTitle>Create New Agent Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Task Type</Label>
            <Select 
            value={newTask.type} 
            onValueChange={(v) => setNewTask({...newTask, type: v})}
            >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CODE_GENERATION">Code Generation</SelectItem>
              <SelectItem value="CODE_MODIFICATION">Code Modification</SelectItem>
              <SelectItem value="CODE_REVIEW">Code Review</SelectItem>
              <SelectItem value="BUG_FIX">Bug Fix</SelectItem>
              <SelectItem value="REFACTORING">Refactoring</SelectItem>
              <SelectItem value="DOCUMENTATION">Documentation</SelectItem>
            </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>AI Model</Label>
            <ModelSelector 
            value={newTask.model}
            onValueChange={(v) => setNewTask({...newTask, model: v})}
            />
          </div>

          <div className="space-y-2">
             <Label>Prompt</Label>
             <Textarea 
               placeholder="Describe the task..."
               value={newTask.prompt}
               onChange={(e) => setNewTask({...newTask, prompt: e.target.value})}
               className="min-h-[100px]"
             />
          </div>
          </div>
          <DialogFooter>
          <Button variant="outline" onClick={() => setIsNewTaskOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateTask} disabled={!newTask.prompt || actionLoading === 'create-task'}>
            {actionLoading === 'create-task' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Task
          </Button>
          </DialogFooter>
        </DialogContent>
        </Dialog>

        <Button variant="outline" size="sm" onClick={loadTasks}>
        <RefreshCw className="h-4 w-4 mr-2" />
        Refresh
        </Button>
        
        <Button variant="outline" size="sm" onClick={deleteOldTasks} disabled={actionLoading === 'delete-tasks'}>
        <Trash2 className="h-4 w-4 mr-2" />
        Cleanup
        </Button>
      </div>
      </div>

      {/* Integration Info Banner */}
      <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4 flex items-start gap-3">
        <Bot className="h-5 w-5 text-blue-600 mt-1" />
        <div>
          <h3 className="text-sm font-medium text-blue-700">Editor Integration</h3>
          <p className="text-sm text-blue-600/80 mt-1">
            These tasks are created directly from the IDE when users use the AI Assistant. 
            The status reflected here corresponds to the real-time feedback users see in their editor.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by prompt, project, or user..." 
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="PLANNING">Planning</SelectItem>
            <SelectItem value="EXECUTING">Executing</SelectItem>
            <SelectItem value="WAITING_APPROVAL">Waiting Approval</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="FAILED">Failed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-sm">Type</th>
              <th className="text-left px-4 py-3 font-medium text-sm">
                <div className="flex items-center gap-1 cursor-pointer hover:text-primary">
                  Status
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="text-left px-4 py-3 font-medium text-sm">User</th>
              <th className="text-left px-4 py-3 font-medium text-sm">Project</th>
              <th className="text-left px-4 py-3 font-medium text-sm">Prompt</th>
              <th className="text-left px-4 py-3 font-medium text-sm">Created</th>
            </tr>
          </thead>
          <tbody>
            {filteredTasks.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No tasks found matching your filters.
                </td>
              </tr>
            ) : filteredTasks.map((t) => (
              <tr 
                key={t.id} 
                className={`border-t hover:bg-muted/30 cursor-pointer ${selectedTask?.id === t.id ? 'bg-muted/50' : ''}`}
                onClick={() => setSelectedTask(t)}
              >
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
                <td className="px-4 py-3 text-sm max-w-xs truncate" title={t.prompt}>
                  {t.prompt}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {new Date(t.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedTask && (
        <>
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 transition-all duration-100" onClick={() => setSelectedTask(null)} />
          <TaskDetail 
            task={selectedTask} 
            onClose={() => setSelectedTask(null)} 
            onAction={handleTaskAction}
          />
        </>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    COMPLETED: 'bg-green-500/10 text-green-600 border-green-500/20',
    EXECUTING: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    PENDING: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    FAILED: 'bg-red-500/10 text-red-600 border-red-500/20',
    CANCELLED: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
    PLANNING: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
    WAITING_APPROVAL: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  };
  return (
    <Badge variant="outline" className={`font-normal ${colors[status] || 'bg-muted text-muted-foreground'}`}>
      {status.replace('_', ' ')}
    </Badge>
  );
}
