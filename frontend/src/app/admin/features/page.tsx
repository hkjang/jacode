'use client';

import { useEffect, useState } from 'react';
import {
  Zap,
  Loader2,
  ToggleLeft,
  ToggleRight,
  Settings,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

interface FeatureToggle {
  id: string;
  key: string;
  name: string;
  description: string | null;
  isEnabled: boolean;
  settings: any;
}

export default function FeaturesPage() {
  const [features, setFeatures] = useState<FeatureToggle[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    loadFeatures();
  }, []);

  const loadFeatures = async () => {
    try {
      const res = await api.get('/api/admin/features');
      setFeatures(res.data);
    } catch (error) {
      console.error('Failed to load features:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFeature = async (key: string, currentValue: boolean) => {
    setToggling(key);
    try {
      await api.patch(`/api/admin/features/${key}/toggle`, {
        isEnabled: !currentValue,
      });
      await loadFeatures();
    } catch (error) {
      console.error('Failed to toggle feature:', error);
    } finally {
      setToggling(null);
    }
  };

  const initializeDefaults = async () => {
    setLoading(true);
    try {
      await api.post('/api/admin/features/initialize');
      await loadFeatures();
    } catch (error) {
      console.error('Failed to initialize:', error);
    } finally {
      setLoading(false);
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
          <Zap className="h-5 w-5" />
          Feature Toggles
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadFeatures}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={initializeDefaults}>
            Initialize Defaults
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        바이브코딩 기능들을 활성화하거나 비활성화합니다.
      </p>

      <div className="grid gap-4">
        {features.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No features configured. Click "Initialize Defaults" to create default features.
          </div>
        ) : (
          features.map((feature) => (
            <div
              key={feature.id}
              className="p-4 rounded-lg border bg-card flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <button
                  onClick={() => toggleFeature(feature.key, feature.isEnabled)}
                  disabled={toggling === feature.key}
                  className="focus:outline-none"
                >
                  {toggling === feature.key ? (
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  ) : feature.isEnabled ? (
                    <ToggleRight className="h-8 w-8 text-green-500" />
                  ) : (
                    <ToggleLeft className="h-8 w-8 text-muted-foreground" />
                  )}
                </button>
                <div>
                  <h3 className="font-medium">{feature.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description || feature.key}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    feature.isEnabled
                      ? 'bg-green-500/20 text-green-600'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {feature.isEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-4 rounded-lg border bg-muted/30">
        <h3 className="font-medium mb-2">Feature Descriptions</h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li><strong>Smart Context:</strong> 자동으로 관련 코드 컨텍스트를 수집하여 프롬프트에 추가</li>
          <li><strong>Auto Fix:</strong> 코드 오류 자동 수정 기능</li>
          <li><strong>Patch Generation:</strong> 기존 코드와 diff 기반 패치 생성</li>
          <li><strong>Inline Explain:</strong> 코드에 대한 설명 인라인 삽입</li>
          <li><strong>Code Security Filter:</strong> 위험한 코드 패턴 차단</li>
          <li><strong>Code Review:</strong> AI 기반 코드 리뷰 기능</li>
        </ul>
      </div>
    </div>
  );
}
