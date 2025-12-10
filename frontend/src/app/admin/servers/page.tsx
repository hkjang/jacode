'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Server,
  Plus,
  RefreshCw,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Settings,
  Trash2,
  Activity,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

interface ModelServer {
  id: string;
  name: string;
  type: 'VLLM' | 'OLLAMA';
  url: string;
  maxTokens: number;
  device: string;
  status: string;
  lastHealthCheck: string | null;
  routingWeight: number;
  rateLimit: number;
  isActive: boolean;
}

export default function ServersPage() {
  const router = useRouter();
  const [servers, setServers] = useState<ModelServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [healthChecking, setHealthChecking] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    loadServers();
  }, []);

  const loadServers = async () => {
    try {
      const res = await api.get('/api/admin/servers');
      setServers(res.data);
    } catch (error) {
      console.error('Failed to load servers:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkHealth = async (id: string) => {
    setHealthChecking(id);
    try {
      await api.get(`/api/admin/servers/${id}/health`);
      await loadServers();
    } catch (error) {
      console.error('Health check failed:', error);
    } finally {
      setHealthChecking(null);
    }
  };

  const checkAllHealth = async () => {
    setHealthChecking('all');
    try {
      await api.get('/api/admin/servers/health');
      await loadServers();
    } catch (error) {
      console.error('Health check failed:', error);
    } finally {
      setHealthChecking(null);
    }
  };

  const toggleServer = async (id: string, isActive: boolean) => {
    try {
      await api.patch(`/api/admin/servers/${id}`, { isActive: !isActive });
      await loadServers();
    } catch (error) {
      console.error('Failed to toggle server:', error);
    }
  };

  const deleteServer = async (id: string) => {
    if (!confirm('Are you sure you want to delete this server?')) return;
    try {
      await api.delete(`/api/admin/servers/${id}`);
      await loadServers();
    } catch (error) {
      console.error('Failed to delete server:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ONLINE':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'OFFLINE':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'DEGRADED':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
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
          <Server className="h-5 w-5" />
          Model Servers
        </h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={checkAllHealth}
            disabled={healthChecking === 'all'}
          >
            {healthChecking === 'all' ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Activity className="h-4 w-4 mr-2" />
            )}
            Check All
          </Button>
          <Button size="sm" onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Server
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {servers.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No model servers configured. Add one to get started.
          </div>
        ) : (
          servers.map((server) => (
            <div
              key={server.id}
              className={`p-4 rounded-lg border bg-card ${!server.isActive && 'opacity-50'}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {getStatusIcon(server.status)}
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{server.name}</h3>
                      <span className="text-xs px-2 py-0.5 bg-muted rounded">
                        {server.type}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{server.url}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => checkHealth(server.id)}
                    disabled={healthChecking === server.id}
                  >
                    {healthChecking === server.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant={server.isActive ? 'destructive' : 'default'}
                    onClick={() => toggleServer(server.id, server.isActive)}
                  >
                    {server.isActive ? 'Disable' : 'Enable'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deleteServer(server.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t flex gap-6 text-sm text-muted-foreground">
                <span>Max Tokens: {server.maxTokens}</span>
                <span>Device: {server.device}</span>
                <span>Weight: {server.routingWeight}</span>
                <span>Rate Limit: {server.rateLimit}/min</span>
                {server.lastHealthCheck && (
                  <span>Last Check: {new Date(server.lastHealthCheck).toLocaleString()}</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {showAddModal && (
        <AddServerModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            loadServers();
          }}
        />
      )}
    </div>
  );
}

function AddServerModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    name: '',
    type: 'OLLAMA' as 'VLLM' | 'OLLAMA',
    url: 'http://localhost:11434',
    maxTokens: 4096,
    device: 'auto',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/api/admin/servers', form);
      onSuccess();
    } catch (error) {
      console.error('Failed to create server:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card rounded-lg p-6 w-full max-w-md border">
        <h3 className="text-lg font-semibold mb-4">Add Model Server</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 rounded border bg-background"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as any })}
              className="w-full px-3 py-2 rounded border bg-background"
            >
              <option value="OLLAMA">Ollama</option>
              <option value="VLLM">vLLM</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">URL</label>
            <input
              type="url"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              className="w-full px-3 py-2 rounded border bg-background"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Max Tokens</label>
              <input
                type="number"
                value={form.maxTokens}
                onChange={(e) => setForm({ ...form, maxTokens: parseInt(e.target.value) })}
                className="w-full px-3 py-2 rounded border bg-background"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Device</label>
              <select
                value={form.device}
                onChange={(e) => setForm({ ...form, device: e.target.value })}
                className="w-full px-3 py-2 rounded border bg-background"
              >
                <option value="auto">Auto</option>
                <option value="cuda">CUDA</option>
                <option value="cpu">CPU</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Add Server
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
