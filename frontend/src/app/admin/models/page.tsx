'use client';

import { useEffect, useState } from 'react';
import {
  Bot,
  Loader2,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  Star,
  ToggleLeft,
  ToggleRight,
  Save,
  Server,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

interface AIModel {
  id: string;
  name: string;
  provider: 'ollama' | 'vllm';
  model: string;
  serverId?: string;
  isDefault: boolean;
  isActive: boolean;
  settings: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    contextLength?: number;
  };
  createdAt: string;
}

interface ModelServer {
  id: string;
  name: string;
  type: 'OLLAMA' | 'VLLM';
  url: string;
}

export default function ModelsPage() {
  const [models, setModels] = useState<AIModel[]>([]);
  const [servers, setServers] = useState<ModelServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingModel, setEditingModel] = useState<AIModel | null>(null);
  const [filterProvider, setFilterProvider] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [modelsRes, serversRes] = await Promise.all([
        api.get('/api/admin/ai-models'),
        api.get('/api/admin/servers'),
      ]);
      setModels(modelsRes.data || []);
      setServers(serversRes.data || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleModel = async (modelId: string, isActive: boolean) => {
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

  const deleteModel = async (modelId: string) => {
    if (!confirm('정말 이 모델을 삭제하시겠습니까?')) return;
    setActionLoading(modelId);
    try {
      await api.delete(`/api/admin/ai-models/${modelId}`);
      await loadData();
    } catch (error) {
      console.error('Failed to delete model:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveModel = async (model: Partial<AIModel>) => {
    try {
      if (editingModel?.id) {
        await api.patch(`/api/admin/ai-models/${editingModel.id}`, model);
      } else {
        await api.post('/api/admin/ai-models', model);
      }
      setShowAddModal(false);
      setEditingModel(null);
      await loadData();
    } catch (error) {
      console.error('Failed to save model:', error);
    }
  };

  const filteredModels = filterProvider
    ? models.filter((m) => m.provider === filterProvider)
    : models;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Bot className="h-5 w-5" />
          AI 모델 관리
        </h2>
        <div className="flex gap-2">
          <select
            value={filterProvider}
            onChange={(e) => setFilterProvider(e.target.value)}
            className="px-3 py-1 border rounded-md text-sm"
          >
            <option value="">전체 Provider</option>
            <option value="ollama">Ollama</option>
            <option value="vllm">vLLM</option>
          </select>
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            새로고침
          </Button>
          <Button size="sm" onClick={() => { setEditingModel(null); setShowAddModal(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            모델 추가
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 rounded-lg border bg-card text-center">
          <p className="text-2xl font-bold">{models.length}</p>
          <p className="text-sm text-muted-foreground">전체 모델</p>
        </div>
        <div className="p-4 rounded-lg border bg-card text-center">
          <p className="text-2xl font-bold text-green-500">
            {models.filter(m => m.isActive).length}
          </p>
          <p className="text-sm text-muted-foreground">활성</p>
        </div>
        <div className="p-4 rounded-lg border bg-card text-center">
          <p className="text-2xl font-bold text-blue-500">
            {models.filter(m => m.provider === 'ollama').length}
          </p>
          <p className="text-sm text-muted-foreground">Ollama</p>
        </div>
        <div className="p-4 rounded-lg border bg-card text-center">
          <p className="text-2xl font-bold text-purple-500">
            {models.filter(m => m.provider === 'vllm').length}
          </p>
          <p className="text-sm text-muted-foreground">vLLM</p>
        </div>
      </div>

      {/* Models List */}
      <div className="space-y-4">
        {filteredModels.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            등록된 AI 모델이 없습니다. 모델을 추가해주세요.
          </div>
        ) : (
          filteredModels.map((model) => (
            <div
              key={model.id}
              className={`p-4 rounded-lg border bg-card ${
                model.isDefault ? 'ring-2 ring-primary' : ''
              } ${!model.isActive ? 'opacity-60' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bot className={`h-8 w-8 ${model.isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{model.name}</h3>
                      {model.isDefault && (
                        <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded flex items-center gap-1">
                          <Star className="h-3 w-3" />
                          기본
                        </span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        model.provider === 'ollama' 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-purple-100 text-purple-700'
                      }`}>
                        {model.provider.toUpperCase()}
                      </span>
                      {!model.isActive && (
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                          비활성
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {model.model}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {!model.isDefault && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDefaultModel(model.id)}
                      disabled={actionLoading === model.id}
                      title="기본 모델로 설정"
                    >
                      <Star className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleModel(model.id, model.isActive)}
                    disabled={actionLoading === model.id}
                    title={model.isActive ? '비활성화' : '활성화'}
                  >
                    {model.isActive ? (
                      <ToggleRight className="h-4 w-4 text-green-500" />
                    ) : (
                      <ToggleLeft className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { setEditingModel(model); setShowAddModal(true); }}
                    title="수정"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteModel(model.id)}
                    disabled={actionLoading === model.id}
                    className="text-red-500"
                    title="삭제"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t grid grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="block font-medium text-foreground">
                    {model.settings?.temperature || 0.7}
                  </span>
                  <span className="text-muted-foreground">Temperature</span>
                </div>
                <div>
                  <span className="block font-medium text-foreground">
                    {model.settings?.maxTokens || 4096}
                  </span>
                  <span className="text-muted-foreground">Max Tokens</span>
                </div>
                <div>
                  <span className="block font-medium text-foreground">
                    {model.settings?.topP || 0.9}
                  </span>
                  <span className="text-muted-foreground">Top P</span>
                </div>
                <div>
                  <span className="block font-medium text-foreground">
                    {model.settings?.contextLength || 4096}
                  </span>
                  <span className="text-muted-foreground">Context Length</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <ModelFormModal
          model={editingModel}
          servers={servers}
          onSave={handleSaveModel}
          onClose={() => { setShowAddModal(false); setEditingModel(null); }}
        />
      )}
    </div>
  );
}

function ModelFormModal({
  model,
  servers,
  onSave,
  onClose,
}: {
  model: AIModel | null;
  servers: ModelServer[];
  onSave: (model: Partial<AIModel>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    name: model?.name || '',
    provider: model?.provider || 'ollama',
    model: model?.model || '',
    serverId: model?.serverId || '',
    temperature: model?.settings?.temperature || 0.7,
    maxTokens: model?.settings?.maxTokens || 4096,
    topP: model?.settings?.topP || 0.9,
    contextLength: model?.settings?.contextLength || 4096,
    isActive: model?.isActive !== false,
  });
  const [loading, setLoading] = useState(false);

  // Popular models for quick selection
  const ollamaModels = [
    'codellama:7b', 'codellama:13b', 'codellama:34b',
    'deepseek-coder:6.7b', 'deepseek-coder:33b',
    'llama2:7b', 'llama2:13b', 'llama2:70b',
    'mixtral:8x7b', 'mistral:7b',
    'qwen2.5-coder:7b', 'qwen2.5-coder:14b',
  ];

  const vllmModels = [
    'codellama/CodeLlama-7b-hf',
    'codellama/CodeLlama-13b-hf',
    'deepseek-ai/deepseek-coder-6.7b-instruct',
    'meta-llama/Llama-2-7b-chat-hf',
    'mistralai/Mistral-7B-Instruct-v0.2',
  ];

  const filteredServers = servers.filter(s => 
    s.type.toLowerCase() === form.provider
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave({
        name: form.name,
        provider: form.provider as 'ollama' | 'vllm',
        model: form.model,
        serverId: form.serverId || undefined,
        isActive: form.isActive,
        settings: {
          temperature: form.temperature,
          maxTokens: form.maxTokens,
          topP: form.topP,
          contextLength: form.contextLength,
        },
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card rounded-lg p-6 w-full max-w-lg border max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">
          {model ? '모델 수정' : '새 모델 추가'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Info */}
          <div>
            <label className="block text-sm font-medium mb-1">모델 이름 *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 rounded border bg-background"
              placeholder="예: Code Assistant"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Provider *</label>
              <select
                value={form.provider}
                onChange={(e) => setForm({ ...form, provider: e.target.value, model: '', serverId: '' })}
                className="w-full px-3 py-2 rounded border bg-background"
              >
                <option value="ollama">Ollama</option>
                <option value="vllm">vLLM</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">연결 서버</label>
              <select
                value={form.serverId}
                onChange={(e) => setForm({ ...form, serverId: e.target.value })}
                className="w-full px-3 py-2 rounded border bg-background"
              >
                <option value="">기본 서버</option>
                {filteredServers.map((server) => (
                  <option key={server.id} value={server.id}>
                    {server.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">모델 *</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                className="flex-1 px-3 py-2 rounded border bg-background"
                placeholder={form.provider === 'ollama' ? 'codellama:7b' : 'codellama/CodeLlama-7b-hf'}
                required
              />
            </div>
            {/* Quick Select */}
            <div className="flex flex-wrap gap-1 mt-2">
              {(form.provider === 'ollama' ? ollamaModels : vllmModels).slice(0, 6).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setForm({ ...form, model: m })}
                  className="text-xs px-2 py-1 bg-muted rounded hover:bg-muted/80"
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Temperature</label>
              <input
                type="number"
                value={form.temperature}
                onChange={(e) => setForm({ ...form, temperature: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 rounded border bg-background"
                min={0}
                max={2}
                step={0.1}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Max Tokens</label>
              <input
                type="number"
                value={form.maxTokens}
                onChange={(e) => setForm({ ...form, maxTokens: parseInt(e.target.value) })}
                className="w-full px-3 py-2 rounded border bg-background"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Top P</label>
              <input
                type="number"
                value={form.topP}
                onChange={(e) => setForm({ ...form, topP: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 rounded border bg-background"
                min={0}
                max={1}
                step={0.1}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Context Length</label>
              <input
                type="number"
                value={form.contextLength}
                onChange={(e) => setForm({ ...form, contextLength: parseInt(e.target.value) })}
                className="w-full px-3 py-2 rounded border bg-background"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            <label htmlFor="isActive" className="text-sm">활성화</label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              취소
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {model ? '수정' : '추가'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

