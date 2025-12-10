'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  FolderKanban,
  Activity,
  Settings,
  Database,
  Server,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  Clock,
  Trash2,
  RefreshCw,
  Shield,
  Loader2,
  Cpu,
  HardDrive,
  Zap,
  Eye,
  BarChart3,
  List,
  Bot,
  FileText,
  Download,
  Upload,
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

interface UserData {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  _count: { projects: number; agentTasks: number };
}

interface TaskData {
  id: string;
  type: string;
  status: string;
  prompt: string;
  createdAt: string;
  user: { name: string; email: string };
  project: { name: string };
}

interface AIModel {
  id: string;
  name: string;
  provider: string;
  model: string;
  isDefault: boolean;
  isActive: boolean;
  settings: any;
}

export default function AdminPage() {
  const router = useRouter();
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [users, setUsers] = useState<UserData[]>([]);
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [aiModels, setAIModels] = useState<AIModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'tasks' | 'models' | 'system'>('overview');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, tasksRes, modelsRes] = await Promise.all([
        api.get('/api/admin/stats'),
        api.get('/api/admin/users'),
        api.get('/api/admin/tasks/recent'),
        api.get('/api/admin/ai-models'),
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data);
      setTasks(tasksRes.data);
      setAIModels(modelsRes.data);
    } catch (error) {
      console.error('Failed to load admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleUserRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN';
    setActionLoading(userId);
    try {
      await api.patch(`/api/admin/users/${userId}/role`, { role: newRole });
      await loadData();
    } catch (error) {
      console.error('Failed to update role:', error);
      alert('Failed to update user role');
    } finally {
      setActionLoading(null);
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This will also delete all their projects and data.')) return;
    setActionLoading(userId);
    try {
      await api.delete(`/api/admin/users/${userId}`);
      await loadData();
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert('Failed to delete user');
    } finally {
      setActionLoading(null);
    }
  };

  const toggleAIModel = async (modelId: string, isActive: boolean) => {
    setActionLoading(modelId);
    try {
      await api.patch(`/api/admin/ai-models/${modelId}`, { isActive: !isActive });
      await loadData();
    } catch (error) {
      console.error('Failed to update model:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const setDefaultModel = async (modelId: string) => {
    setActionLoading(modelId);
    try {
      await api.patch(`/api/admin/ai-models/${modelId}/default`);
      await loadData();
    } catch (error) {
      console.error('Failed to set default model:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const deleteOldTasks = async () => {
    if (!confirm('Delete all completed tasks older than 30 days?')) return;
    setActionLoading('delete-tasks');
    try {
      const res = await api.delete('/api/admin/tasks/old');
      alert(`Deleted ${res.data.deleted} old tasks`);
      await loadData();
    } catch (error) {
      console.error('Failed to delete old tasks:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const exportData = async () => {
    setActionLoading('export');
    try {
      const res = await api.get('/api/admin/export');
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `jacode-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
    } catch (error) {
      console.error('Failed to export data:', error);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'tasks', label: 'Tasks', icon: Activity },
    { id: 'models', label: 'AI Models', icon: Bot },
    { id: 'system', label: 'System', icon: Server },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push('/dashboard')}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </header>

      <div className="flex max-w-7xl mx-auto">
        {/* Sidebar */}
        <aside className="w-56 border-r bg-card min-h-[calc(100vh-65px)] p-4 sticky top-[65px]">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition text-sm ${
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && stats && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">System Overview</h2>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={Users} label="Total Users" value={stats.users.total} subtext={`${stats.users.admins} admins`} color="text-blue-500" />
                <StatCard icon={FolderKanban} label="Projects" value={stats.projects.total} subtext={`${stats.projects.activeToday} active today`} color="text-green-500" />
                <StatCard icon={Activity} label="Agent Tasks" value={stats.tasks.total} subtext={`${stats.tasks.pending} pending`} color="text-purple-500" />
                <StatCard icon={FileText} label="Artifacts" value={stats.artifacts.total} subtext={`${stats.artifacts.approved} approved`} color="text-orange-500" />
              </div>

              {/* Task Distribution */}
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
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">User Management ({users.length})</h2>
              </div>

              <div className="rounded-lg border bg-card overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-sm">User</th>
                      <th className="text-left px-4 py-3 font-medium text-sm">Role</th>
                      <th className="text-center px-4 py-3 font-medium text-sm">Projects</th>
                      <th className="text-center px-4 py-3 font-medium text-sm">Tasks</th>
                      <th className="text-left px-4 py-3 font-medium text-sm">Joined</th>
                      <th className="text-right px-4 py-3 font-medium text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-t hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium">{u.name}</p>
                            <p className="text-sm text-muted-foreground">{u.email}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              u.role === 'ADMIN'
                                ? 'bg-primary/20 text-primary'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">{u._count.projects}</td>
                        <td className="px-4 py-3 text-center">{u._count.agentTasks}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => toggleUserRole(u.id, u.role)}
                              disabled={actionLoading === u.id}
                            >
                              {actionLoading === u.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : u.role === 'ADMIN' ? (
                                'Demote'
                              ) : (
                                'Promote'
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteUser(u.id)}
                              disabled={actionLoading === u.id}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tasks Tab */}
          {activeTab === 'tasks' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Recent Agent Tasks</h2>
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
                        <td className="px-4 py-3 text-sm">{t.user.name}</td>
                        <td className="px-4 py-3 text-sm">{t.project.name}</td>
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
          )}

          {/* AI Models Tab */}
          {activeTab === 'models' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">AI Model Settings</h2>

              <div className="grid gap-4">
                {aiModels.map((model) => (
                  <div
                    key={model.id}
                    className={`p-4 rounded-lg border bg-card ${
                      model.isDefault ? 'ring-2 ring-primary' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Bot className={`h-8 w-8 ${model.isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{model.name}</h3>
                            {model.isDefault && (
                              <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
                                Default
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {model.provider} • {model.model}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!model.isDefault && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDefaultModel(model.id)}
                            disabled={actionLoading === model.id}
                          >
                            Set Default
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant={model.isActive ? 'destructive' : 'default'}
                          onClick={() => toggleAIModel(model.id, model.isActive)}
                          disabled={actionLoading === model.id}
                        >
                          {actionLoading === model.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : model.isActive ? (
                            'Disable'
                          ) : (
                            'Enable'
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t text-sm text-muted-foreground">
                      Temperature: {model.settings?.temperature || 0.7} • 
                      Max Tokens: {model.settings?.maxTokens || 4096}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* System Tab */}
          {activeTab === 'system' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">System Management</h2>

              <div className="grid lg:grid-cols-2 gap-6">
                <div className="p-6 rounded-lg border bg-card">
                  <h3 className="font-medium mb-4 flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Database Actions
                  </h3>
                  <div className="space-y-3">
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={deleteOldTasks}
                      disabled={actionLoading === 'delete-tasks'}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear Old Tasks (30+ days)
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={exportData}
                      disabled={actionLoading === 'export'}
                    >
                      {actionLoading === 'export' ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Download className="h-4 w-4 mr-2" />
                      )}
                      Export All Data
                    </Button>
                  </div>
                </div>

                <div className="p-6 rounded-lg border bg-card">
                  <h3 className="font-medium mb-4 flex items-center gap-2">
                    <Server className="h-4 w-4" />
                    Server Info
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Uptime</span>
                      <span className="font-medium">{stats?.system.uptime}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Memory Usage</span>
                      <span className="font-medium">{stats?.system.memoryUsage}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Node.js Version</span>
                      <span className="font-medium">{stats?.system.nodeVersion}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Environment</span>
                      <span className="font-medium">Development</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
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
