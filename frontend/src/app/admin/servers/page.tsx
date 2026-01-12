'use client';

import { useEffect, useState } from 'react';
import {
  Server,
  Plus,
  RefreshCw,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Trash2,
  Activity,
  Download,
  BarChart,
  Copy,
  ToggleLeft,
  ToggleRight,
  Eye,
  Edit,
  Play,
  MessageSquare,
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

interface OllamaModel {
  name: string;
  size: number;
  modified_at: string;
}

export default function ServersPage() {
  const [servers, setServers] = useState<ModelServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [healthChecking, setHealthChecking] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedServer, setSelectedServer] = useState<ModelServer | null>(null);
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [showModelsModal, setShowModelsModal] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [pullModel, setPullModel] = useState('');
  const [pulling, setPulling] = useState(false);
  // Edit modal
  const [editingServer, setEditingServer] = useState<ModelServer | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  // API test modal
  const [showApiTestModal, setShowApiTestModal] = useState(false);
  const [apiTestResult, setApiTestResult] = useState<any>(null);
  const [apiTestLoading, setApiTestLoading] = useState(false);
  const [apiTestPrompt, setApiTestPrompt] = useState('');

  useEffect(() => {
    loadServers();
    loadStats();
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

  const loadStats = async () => {
    try {
      const res = await api.get('/api/admin/servers/statistics');
      setStats(res.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
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

  const duplicateServer = async (id: string) => {
    try {
      await api.post(`/api/admin/servers/${id}/duplicate`);
      await loadServers();
    } catch (error) {
      console.error('Failed to duplicate server:', error);
    }
  };

  const deleteServer = async (id: string) => {
    if (!confirm('정말 서버를 삭제하시겠습니까?')) return;
    try {
      await api.delete(`/api/admin/servers/${id}`);
      await loadServers();
    } catch (error) {
      console.error('Failed to delete server:', error);
    }
  };

  const loadModels = async (server: ModelServer) => {
    setSelectedServer(server);
    setShowModelsModal(true);
    try {
      const res = await api.get(`/api/admin/servers/${server.id}/models`);
      setModels(res.data || []);
    } catch (error) {
      console.error('Failed to load models:', error);
      setModels([]);
    }
  };

  const handlePullModel = async () => {
    if (!selectedServer || !pullModel) return;
    setPulling(true);
    try {
      await api.post(`/api/admin/servers/${selectedServer.id}/models/pull`, {
        modelName: pullModel
      });
      alert(`${pullModel} 다운로드가 시작되었습니다.`);
      setPullModel('');
      // Reload models after a delay
      setTimeout(() => loadModels(selectedServer), 3000);
    } catch (error) {
      console.error('Failed to pull model:', error);
      alert('모델 다운로드에 실패했습니다.');
    } finally {
      setPulling(false);
    }
  };

  const handleDeleteModel = async (modelName: string) => {
    if (!selectedServer) return;
    if (!confirm(`${modelName} 모델을 삭제하시겠습니까?`)) return;
    try {
      await api.delete(`/api/admin/servers/${selectedServer.id}/models/${encodeURIComponent(modelName)}`);
      await loadModels(selectedServer);
    } catch (error) {
      console.error('Failed to delete model:', error);
      alert('모델 삭제에 실패했습니다.');
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

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const onlineCount = servers.filter(s => s.status === 'ONLINE').length;
  const offlineCount = servers.filter(s => s.status === 'OFFLINE').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Server className="h-5 w-5" />
          모델 서버 관리
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
            전체 체크
          </Button>
          <Button size="sm" onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            서버 추가
          </Button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 rounded-lg border bg-card text-center">
          <p className="text-2xl font-bold">{servers.length}</p>
          <p className="text-sm text-muted-foreground">전체 서버</p>
        </div>
        <div className="p-4 rounded-lg border bg-card text-center">
          <p className="text-2xl font-bold text-green-500">{onlineCount}</p>
          <p className="text-sm text-muted-foreground">온라인</p>
        </div>
        <div className="p-4 rounded-lg border bg-card text-center">
          <p className="text-2xl font-bold text-red-500">{offlineCount}</p>
          <p className="text-sm text-muted-foreground">오프라인</p>
        </div>
        <div className="p-4 rounded-lg border bg-card text-center">
          <p className="text-2xl font-bold">{stats?.executionsLast24h || 0}</p>
          <p className="text-sm text-muted-foreground">24시간 실행</p>
        </div>
      </div>

      {/* Servers List */}
      <div className="space-y-4">
        {servers.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            등록된 모델 서버가 없습니다. 서버를 추가해주세요.
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
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        server.type === 'OLLAMA' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                      }`}>
                        {server.type}
                      </span>
                      {!server.isActive && (
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                          비활성
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{server.url}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {/* Models - works for both OLLAMA and VLLM now */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => loadModels(server)}
                    title="모델 보기"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {/* API Test */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedServer(server);
                      setApiTestResult(null);
                      setApiTestPrompt('');
                      setShowApiTestModal(true);
                    }}
                    title="API 테스트"
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                  {/* Health Check */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => checkHealth(server.id)}
                    disabled={healthChecking === server.id}
                    title="헬스체크"
                  >
                    {healthChecking === server.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                  {/* Edit */}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingServer(server);
                      setShowEditModal(true);
                    }}
                    title="수정"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleServer(server.id, server.isActive)}
                    title={server.isActive ? '비활성화' : '활성화'}
                  >
                    {server.isActive ? (
                      <ToggleRight className="h-4 w-4 text-green-500" />
                    ) : (
                      <ToggleLeft className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => duplicateServer(server.id)}
                    title="복제"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteServer(server.id)}
                    className="text-red-500"
                    title="삭제"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t grid grid-cols-5 gap-4 text-sm text-muted-foreground">
                <div>
                  <span className="block font-medium text-foreground">{server.maxTokens}</span>
                  <span>Max Tokens</span>
                </div>
                <div>
                  <span className="block font-medium text-foreground">{server.device}</span>
                  <span>Device</span>
                </div>
                <div>
                  <span className="block font-medium text-foreground">{server.routingWeight}</span>
                  <span>가중치</span>
                </div>
                <div>
                  <span className="block font-medium text-foreground">{server.rateLimit}/분</span>
                  <span>Rate Limit</span>
                </div>
                <div>
                  <span className="block font-medium text-foreground">
                    {server.lastHealthCheck ? new Date(server.lastHealthCheck).toLocaleTimeString() : '-'}
                  </span>
                  <span>마지막 체크</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Server Modal */}
      {showAddModal && (
        <AddServerModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            loadServers();
          }}
        />
      )}

      {/* Models Modal */}
      {showModelsModal && selectedServer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 w-full max-w-2xl border max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                {selectedServer.name} - 모델 관리
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setShowModelsModal(false)}>
                ✕
              </Button>
            </div>

            {/* Pull Model */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={pullModel}
                onChange={(e) => setPullModel(e.target.value)}
                placeholder="모델 이름 (예: codellama:7b)"
                className="flex-1 px-3 py-2 border rounded-md"
              />
              <Button onClick={handlePullModel} disabled={pulling || !pullModel}>
                {pulling ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Pull
              </Button>
            </div>

            {/* Models List */}
            <div className="space-y-2">
              {models.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  설치된 모델이 없습니다.
                </p>
              ) : (
                models.map((model) => (
                  <div
                    key={model.name}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{model.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatBytes(model.size)} • {new Date(model.modified_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-500"
                      onClick={() => handleDeleteModel(model.name)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end mt-4">
              <Button variant="outline" onClick={() => setShowModelsModal(false)}>
                닫기
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Server Modal */}
      {showEditModal && editingServer && (
        <EditServerModal
          server={editingServer}
          onClose={() => {
            setShowEditModal(false);
            setEditingServer(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setEditingServer(null);
            loadServers();
          }}
        />
      )}

      {/* API Test Modal */}
      {showApiTestModal && selectedServer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 w-full max-w-lg border">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                OpenAI API 테스트 - {selectedServer.name}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setShowApiTestModal(false)}>
                ✕
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">테스트 프롬프트</label>
                <textarea
                  value={apiTestPrompt}
                  onChange={(e) => setApiTestPrompt(e.target.value)}
                  placeholder="Hello, respond with one word: working"
                  className="w-full px-3 py-2 border rounded-md min-h-[80px] bg-background"
                />
              </div>

              <Button 
                className="w-full"
                onClick={async () => {
                  setApiTestLoading(true);
                  setApiTestResult(null);
                  try {
                    const res = await api.post(`/api/admin/servers/${selectedServer.id}/test-chat`, {
                      prompt: apiTestPrompt || undefined
                    });
                    setApiTestResult(res.data);
                  } catch (error: any) {
                    setApiTestResult({ 
                      success: false, 
                      message: error.response?.data?.message || error.message 
                    });
                  } finally {
                    setApiTestLoading(false);
                  }
                }}
                disabled={apiTestLoading}
              >
                {apiTestLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    테스트 중...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    API 테스트 실행
                  </>
                )}
              </Button>

              {apiTestResult && (
                <div className={`p-4 rounded-lg border ${
                  apiTestResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {apiTestResult.success ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    <span className={`font-medium ${
                      apiTestResult.success ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {apiTestResult.message}
                    </span>
                  </div>
                  {apiTestResult.latency && (
                    <p className="text-sm text-muted-foreground">
                      응답 시간: {apiTestResult.latency}ms
                    </p>
                  )}
                  {apiTestResult.model && (
                    <p className="text-sm text-muted-foreground">
                      모델: {apiTestResult.model}
                    </p>
                  )}
                  {apiTestResult.response && (
                    <div className="mt-2 p-2 bg-background rounded border">
                      <p className="text-sm font-medium mb-1">응답:</p>
                      <p className="text-sm whitespace-pre-wrap">{apiTestResult.response}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end mt-4">
              <Button variant="outline" onClick={() => setShowApiTestModal(false)}>
                닫기
              </Button>
            </div>
          </div>
        </div>
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
    routingWeight: 100,
    rateLimit: 60,
  });
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTest = async () => {
    setLoading(true);
    try {
      const res = await api.post('/api/admin/servers/test-connection', {
        url: form.url,
        type: form.type,
      });
      setTestResult(res.data);
    } catch (error: any) {
      setTestResult({ success: false, message: error.message });
    } finally {
      setLoading(false);
    }
  };

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
        <h3 className="text-lg font-semibold mb-4">모델 서버 추가</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">서버 이름</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 rounded border bg-background"
              placeholder="Primary Ollama Server"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">서버 타입</label>
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
            <div className="flex gap-2">
              <input
                type="url"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                className="flex-1 px-3 py-2 rounded border bg-background"
                required
              />
              <Button type="button" variant="outline" onClick={handleTest} disabled={loading}>
                테스트
              </Button>
            </div>
            {testResult && (
              <p className={`text-sm mt-1 ${testResult.success ? 'text-green-500' : 'text-red-500'}`}>
                {testResult.message}
              </p>
            )}
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">라우팅 가중치</label>
              <input
                type="number"
                value={form.routingWeight}
                onChange={(e) => setForm({ ...form, routingWeight: parseInt(e.target.value) })}
                className="w-full px-3 py-2 rounded border bg-background"
                min={0}
                max={1000}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Rate Limit (/분)</label>
              <input
                type="number"
                value={form.rateLimit}
                onChange={(e) => setForm({ ...form, rateLimit: parseInt(e.target.value) })}
                className="w-full px-3 py-2 rounded border bg-background"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              취소
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              서버 추가
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface EditServerModalProps {
  server: ModelServer;
  onClose: () => void;
  onSuccess: () => void;
}

function EditServerModal({ server, onClose, onSuccess }: EditServerModalProps) {
  const [form, setForm] = useState({
    name: server.name,
    url: server.url,
    maxTokens: server.maxTokens,
    device: server.device,
    routingWeight: server.routingWeight,
    rateLimit: server.rateLimit,
  });
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTest = async () => {
    setLoading(true);
    try {
      const res = await api.post('/api/admin/servers/test-connection', {
        url: form.url,
        type: server.type,
      });
      setTestResult(res.data);
    } catch (error: any) {
      setTestResult({ success: false, message: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.patch(`/api/admin/servers/${server.id}`, form);
      onSuccess();
    } catch (error) {
      console.error('Failed to update server:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card rounded-lg p-6 w-full max-w-md border">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Edit className="h-5 w-5" />
          모델 서버 수정
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">서버 이름</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 rounded border bg-background"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">서버 타입</label>
            <input
              type="text"
              value={server.type}
              className="w-full px-3 py-2 rounded border bg-muted text-muted-foreground"
              disabled
            />
            <p className="text-xs text-muted-foreground mt-1">서버 타입은 변경할 수 없습니다</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">URL</label>
            <div className="flex gap-2">
              <input
                type="url"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                className="flex-1 px-3 py-2 rounded border bg-background"
                required
              />
              <Button type="button" variant="outline" onClick={handleTest} disabled={loading}>
                테스트
              </Button>
            </div>
            {testResult && (
              <p className={`text-sm mt-1 ${testResult.success ? 'text-green-500' : 'text-red-500'}`}>
                {testResult.message}
              </p>
            )}
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">라우팅 가중치</label>
              <input
                type="number"
                value={form.routingWeight}
                onChange={(e) => setForm({ ...form, routingWeight: parseInt(e.target.value) })}
                className="w-full px-3 py-2 rounded border bg-background"
                min={0}
                max={1000}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Rate Limit (/분)</label>
              <input
                type="number"
                value={form.rateLimit}
                onChange={(e) => setForm({ ...form, rateLimit: parseInt(e.target.value) })}
                className="w-full px-3 py-2 rounded border bg-background"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              취소
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              저장
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
