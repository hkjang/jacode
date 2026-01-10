'use client';

import { useEffect, useState } from 'react';
import {
  Cpu,
  Plus,
  Trash2,
  RefreshCw,
  Loader2,
  Heart,
  HeartOff,
  BarChart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

interface AIProvider {
  id: string;
  name: string;
  type: string;
  healthy: boolean;
  lastCheck: string;
  metrics?: {
    totalRequests: number;
    successRate: number;
    avgLatency: number;
  };
}

export default function AIProvidersPage() {
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/admin/ai-providers');
      setProviders(res.data || []);
    } catch (error) {
      console.error('Failed to load providers:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkHealth = async (id: string) => {
    try {
      await api.get(`/api/admin/ai-providers/${id}/health`);
      loadProviders();
    } catch (error) {
      console.error('Failed to check health:', error);
    }
  };

  const checkAllHealth = async () => {
    try {
      await api.get('/api/admin/ai-providers/health/all');
      loadProviders();
    } catch (error) {
      console.error('Failed to check all health:', error);
    }
  };

  const unregister = async (id: string) => {
    if (!confirm('정말 해제하시겠습니까?')) return;
    try {
      await api.delete(`/api/admin/ai-providers/${id}`);
      loadProviders();
    } catch (error) {
      console.error('Failed to unregister:', error);
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
          <Cpu className="h-5 w-5" />
          AI Provider 관리
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={checkAllHealth}>
            <Heart className="h-4 w-4 mr-2" />
            전체 헬스체크
          </Button>
          <Button variant="outline" size="sm" onClick={loadProviders}>
            <RefreshCw className="h-4 w-4 mr-2" />
            새로고침
          </Button>
        </div>
      </div>

      {/* Providers Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {providers.map((provider) => (
          <div key={provider.id} className="p-4 rounded-lg border bg-card">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-medium">{provider.name}</h3>
                <span className="text-xs text-muted-foreground">{provider.type}</span>
              </div>
              <div className="flex items-center gap-2">
                {provider.healthy ? (
                  <span className="flex items-center gap-1 text-green-500 text-sm">
                    <Heart className="h-4 w-4" />
                    정상
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-red-500 text-sm">
                    <HeartOff className="h-4 w-4" />
                    비정상
                  </span>
                )}
              </div>
            </div>

            {provider.metrics && (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">총 요청</span>
                  <span>{provider.metrics.totalRequests.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">성공률</span>
                  <span className={provider.metrics.successRate > 0.9 ? 'text-green-500' : 'text-yellow-500'}>
                    {(provider.metrics.successRate * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">평균 지연</span>
                  <span>{provider.metrics.avgLatency}ms</span>
                </div>
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => checkHealth(provider.id)}
              >
                <Heart className="h-4 w-4 mr-1" />
                체크
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-red-500"
                onClick={() => unregister(provider.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}

        {providers.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            등록된 AI Provider가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
