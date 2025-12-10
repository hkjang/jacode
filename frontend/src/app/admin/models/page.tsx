'use client';

import { useEffect, useState } from 'react';
import {
  Bot,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

interface AIModel {
  id: string;
  name: string;
  provider: string;
  model: string;
  isDefault: boolean;
  isActive: boolean;
  settings: any;
}

export default function ModelsPage() {
  const [models, setModels] = useState<AIModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/admin/ai-models');
      setModels(res.data);
    } catch (error) {
      console.error('Failed to load models:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleModel = async (modelId: string, isActive: boolean) => {
    setActionLoading(modelId);
    try {
      await api.patch(`/api/admin/ai-models/${modelId}`, { isActive: !isActive });
      await loadModels();
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
      await loadModels();
    } catch (error) {
      console.error('Failed to set default model:', error);
    } finally {
      setActionLoading(null);
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
          <Bot className="h-5 w-5" />
          AI Model Settings
        </h2>
        <Button variant="outline" size="sm" onClick={loadModels}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4">
        {models.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No AI models configured.
          </div>
        ) : (
          models.map((model) => (
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
                    onClick={() => toggleModel(model.id, model.isActive)}
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
          ))
        )}
      </div>
    </div>
  );
}
