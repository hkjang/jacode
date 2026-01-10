'use client';

import { useEffect, useState } from 'react';
import {
  Route,
  Plus,
  Edit,
  Trash2,
  Copy,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  Loader2,
  Save,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

interface RoutingPolicy {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  priority: number;
  rules: {
    costWeight: number;
    performanceWeight: number;
    availabilityWeight: number;
    modelPreferences?: any;
  };
  createdAt: string;
  updatedAt: string;
}

export default function RoutingPoliciesPage() {
  const [policies, setPolicies] = useState<RoutingPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPolicy, setEditingPolicy] = useState<RoutingPolicy | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadPolicies();
  }, []);

  const loadPolicies = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/admin/routing-policies');
      setPolicies(res.data);
    } catch (error) {
      console.error('Failed to load policies:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePolicy = async (id: string) => {
    try {
      await api.put(`/api/admin/routing-policies/${id}/toggle`);
      loadPolicies();
    } catch (error) {
      console.error('Failed to toggle policy:', error);
    }
  };

  const duplicatePolicy = async (id: string) => {
    try {
      await api.post(`/api/admin/routing-policies/${id}/duplicate`);
      loadPolicies();
    } catch (error) {
      console.error('Failed to duplicate policy:', error);
    }
  };

  const deletePolicy = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await api.delete(`/api/admin/routing-policies/${id}`);
      loadPolicies();
    } catch (error) {
      console.error('Failed to delete policy:', error);
    }
  };

  const savePolicy = async (policy: Partial<RoutingPolicy>) => {
    try {
      if (editingPolicy?.id) {
        await api.put(`/api/admin/routing-policies/${editingPolicy.id}`, policy);
      } else {
        await api.post('/api/admin/routing-policies', policy);
      }
      setEditingPolicy(null);
      setIsCreating(false);
      loadPolicies();
    } catch (error) {
      console.error('Failed to save policy:', error);
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Route className="h-5 w-5" />
          라우팅 정책 관리
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadPolicies}>
            <RefreshCw className="h-4 w-4 mr-2" />
            새로고침
          </Button>
          <Button size="sm" onClick={() => { setIsCreating(true); setEditingPolicy({ rules: { costWeight: 0.3, performanceWeight: 0.4, availabilityWeight: 0.3 } } as any); }}>
            <Plus className="h-4 w-4 mr-2" />
            정책 추가
          </Button>
        </div>
      </div>

      {/* Create/Edit Form */}
      {(editingPolicy || isCreating) && (
        <PolicyForm
          policy={editingPolicy}
          onSave={savePolicy}
          onCancel={() => { setEditingPolicy(null); setIsCreating(false); }}
        />
      )}

      {/* Policies List */}
      <div className="space-y-4">
        {policies.map((policy) => (
          <div
            key={policy.id}
            className={`p-4 rounded-lg border bg-card ${!policy.isActive ? 'opacity-60' : ''}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{policy.name}</h3>
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    policy.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {policy.isActive ? '활성' : '비활성'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    우선순위: {policy.priority}
                  </span>
                </div>
                {policy.description && (
                  <p className="text-sm text-muted-foreground mt-1">{policy.description}</p>
                )}
                <div className="flex gap-4 mt-2 text-sm">
                  <span>비용: {(policy.rules.costWeight * 100).toFixed(0)}%</span>
                  <span>성능: {(policy.rules.performanceWeight * 100).toFixed(0)}%</span>
                  <span>가용성: {(policy.rules.availabilityWeight * 100).toFixed(0)}%</span>
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => togglePolicy(policy.id)}
                  title={policy.isActive ? '비활성화' : '활성화'}
                >
                  {policy.isActive ? (
                    <ToggleRight className="h-4 w-4 text-green-500" />
                  ) : (
                    <ToggleLeft className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingPolicy(policy)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => duplicatePolicy(policy.id)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deletePolicy(policy.id)}
                  className="text-red-500 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}

        {policies.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            등록된 라우팅 정책이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}

function PolicyForm({
  policy,
  onSave,
  onCancel,
}: {
  policy: Partial<RoutingPolicy> | null;
  onSave: (policy: Partial<RoutingPolicy>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    name: policy?.name || '',
    description: policy?.description || '',
    priority: policy?.priority || 100,
    isActive: policy?.isActive !== false,
    costWeight: (policy?.rules?.costWeight || 0.3) * 100,
    performanceWeight: (policy?.rules?.performanceWeight || 0.4) * 100,
    availabilityWeight: (policy?.rules?.availabilityWeight || 0.3) * 100,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name: form.name,
      description: form.description,
      priority: form.priority,
      isActive: form.isActive,
      rules: {
        costWeight: form.costWeight / 100,
        performanceWeight: form.performanceWeight / 100,
        availabilityWeight: form.availabilityWeight / 100,
      },
    });
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 rounded-lg border bg-card space-y-4">
      <h3 className="font-medium">{policy?.id ? '정책 수정' : '새 정책 생성'}</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">정책 이름 *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-3 py-2 border rounded-md"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">우선순위</label>
          <input
            type="number"
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">설명</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="w-full px-3 py-2 border rounded-md"
          rows={2}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">비용 가중치 (%)</label>
          <input
            type="number"
            value={form.costWeight}
            onChange={(e) => setForm({ ...form, costWeight: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border rounded-md"
            min={0}
            max={100}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">성능 가중치 (%)</label>
          <input
            type="number"
            value={form.performanceWeight}
            onChange={(e) => setForm({ ...form, performanceWeight: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border rounded-md"
            min={0}
            max={100}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">가용성 가중치 (%)</label>
          <input
            type="number"
            value={form.availabilityWeight}
            onChange={(e) => setForm({ ...form, availabilityWeight: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border rounded-md"
            min={0}
            max={100}
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

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          취소
        </Button>
        <Button type="submit">
          <Save className="h-4 w-4 mr-2" />
          저장
        </Button>
      </div>
    </form>
  );
}
