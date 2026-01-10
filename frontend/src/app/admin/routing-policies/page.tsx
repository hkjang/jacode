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
  Cpu,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { PolicyForm } from './components/PolicyForm';
import { RoutingUsageGuide } from './components/RoutingUsageGuide';

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
    modelPreferences?: Record<string, string[]>;
  };
  createdAt: string;
  updatedAt: string;
}

export default function RoutingPoliciesPage() {
  const [policies, setPolicies] = useState<RoutingPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPolicy, setEditingPolicy] = useState<Partial<RoutingPolicy> | null>(null);
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
      if (policy.id) {
        await api.put(`/api/admin/routing-policies/${policy.id}`, policy);
      } else {
        await api.post('/api/admin/routing-policies', policy);
      }
      setEditingPolicy(null);
      setIsCreating(false);
      loadPolicies();
    } catch (error) {
      console.error('Failed to save policy:', error);
      alert('정책 저장에 실패했습니다.');
    }
  };

  const handleCreate = () => {
    setIsCreating(true); 
    setEditingPolicy({ 
      rules: { 
        costWeight: 0.3, 
        performanceWeight: 0.4, 
        availabilityWeight: 0.3,
        modelPreferences: {
          code: ['codellama', 'deepseek'],
          explain: ['gpt-4', 'claude-3']
        }
      } 
    } as any);
  };

  // Show Form view if creating or editing
  if (isCreating || editingPolicy) {
    return (
      <PolicyForm
        policy={editingPolicy}
        onSave={savePolicy}
        onCancel={() => {
          setEditingPolicy(null);
          setIsCreating(false);
        }}
      />
    );
  }

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
          <Route className="h-5 w-5 text-primary" />
          라우팅 정책 관리
        </h2>
        <div className="flex gap-2">
          <RoutingUsageGuide />
          <div className="w-px h-8 bg-border mx-2" />
          <Button variant="outline" size="sm" onClick={loadPolicies}>
            <RefreshCw className="h-4 w-4 mr-2" />
            새로고침
          </Button>
          <Button size="sm" onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            정책 추가
          </Button>
        </div>
      </div>

      {/* Policies List */}
      <div className="grid gap-4 md:grid-cols-1">
        {policies.map((policy) => (
          <div
            key={policy.id}
            className={`p-5 rounded-lg border bg-card hover:shadow-sm transition-shadow ${!policy.isActive ? 'opacity-60 bg-muted/40' : ''}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-lg">{policy.name}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider ${
                    policy.isActive ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-500 border border-gray-200'
                  }`}>
                    {policy.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                    Priority: {policy.priority}
                  </span>
                </div>
                {policy.description && (
                  <p className="text-sm text-muted-foreground">{policy.description}</p>
                )}
                
                <div className="flex gap-6 mt-3 text-sm">
                  <div className="flex items-center gap-1.5" title="Cost Weight">
                     <span className="w-2 h-2 rounded-full bg-blue-500"/>
                     <span className="text-muted-foreground">Cost:</span>
                     <span className="font-mono font-medium">{(policy.rules.costWeight * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex items-center gap-1.5" title="Performance Weight">
                     <span className="w-2 h-2 rounded-full bg-purple-500"/>
                     <span className="text-muted-foreground">Perf:</span>
                     <span className="font-mono font-medium">{(policy.rules.performanceWeight * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex items-center gap-1.5" title="Availability Weight">
                     <span className="w-2 h-2 rounded-full bg-green-500"/>
                     <span className="text-muted-foreground">Avail:</span>
                     <span className="font-mono font-medium">{(policy.rules.availabilityWeight * 100).toFixed(0)}%</span>
                  </div>
                  {policy.rules.modelPreferences && Object.keys(policy.rules.modelPreferences).length > 0 && (
                     <div className="flex items-center gap-1.5 ml-2" title="Model Preferences Configured">
                        <Cpu className="h-3.5 w-3.5 text-orange-500" />
                        <span className="text-xs text-orange-600 font-medium">+Preferences</span>
                     </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 pl-4 border-l ml-4 h-full">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => togglePolicy(policy.id)}
                  title={policy.isActive ? 'Click to Deactivate' : 'Click to Activate'}
                  className="h-8 w-8"
                >
                  {policy.isActive ? (
                    <ToggleRight className="h-5 w-5 text-green-600" />
                  ) : (
                    <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                  )}
                </Button>
                <div className="w-px h-6 bg-border mx-1" />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditingPolicy(policy)}
                  className="h-8 w-8"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => duplicatePolicy(policy.id)}
                  className="h-8 w-8"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deletePolicy(policy.id)}
                  className="h-8 w-8 text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}

        {policies.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border-2 border-dashed rounded-lg bg-muted/10">
            <Route className="h-10 w-10 mb-4 opacity-50" />
            <p className="text-lg font-medium">등록된 라우팅 정책이 없습니다.</p>
            <p className="text-sm mt-1 mb-4">새로운 정책을 추가하여 AI 모델 선택 로직을 제어하세요.</p>
            <Button onClick={handleCreate} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              첫 정책 생성하기
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
