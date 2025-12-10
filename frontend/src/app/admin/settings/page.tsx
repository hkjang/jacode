'use client';

import { useEffect, useState } from 'react';
import {
  Settings,
  Loader2,
  RefreshCw,
  Save,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

interface SettingCategory {
  [key: string]: any;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<{
    editor: SettingCategory;
    queue: SettingCategory;
    model: SettingCategory;
  }>({
    editor: {},
    queue: {},
    model: {},
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'editor' | 'queue' | 'model'>('editor');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const [editor, queue, model] = await Promise.all([
        api.get('/api/admin/settings/editor'),
        api.get('/api/admin/settings/queue'),
        api.get('/api/admin/settings/model'),
      ]);
      setSettings({
        editor: editor.data || {},
        queue: queue.data || {},
        model: model.data || {},
      });
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await api.patch(`/api/admin/settings/${activeCategory}`, settings[activeCategory]);
      alert('Settings saved!');
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setSaving(false);
    }
  };

  const initializeDefaults = async () => {
    setLoading(true);
    try {
      await api.post('/api/admin/settings/initialize');
      await loadSettings();
    } catch (error) {
      console.error('Failed to initialize:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = (key: string, value: any) => {
    setSettings({
      ...settings,
      [activeCategory]: {
        ...settings[activeCategory],
        [key]: value,
      },
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const categories = [
    { key: 'editor', label: 'Editor Policy', description: 'Monaco 에디터 기본 설정' },
    { key: 'queue', label: 'Queue Settings', description: 'BullMQ 작업 큐 설정' },
    { key: 'model', label: 'Model Settings', description: 'AI 모델 기본 설정' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Settings className="h-5 w-5" />
          System Settings
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={initializeDefaults}>
            Initialize Defaults
          </Button>
          <Button size="sm" onClick={saveSettings} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save
          </Button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 border-b pb-2">
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key as any)}
            className={`px-4 py-2 text-sm rounded-t transition ${
              activeCategory === cat.key
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Settings Form */}
      <div className="space-y-4">
        {activeCategory === 'editor' && (
          <>
            <SettingRow
              label="Theme"
              description="기본 에디터 테마"
              value={settings.editor['editor.theme']}
              type="select"
              options={['vs-dark', 'vs', 'hc-black']}
              onChange={(v) => updateSetting('editor.theme', v)}
            />
            <SettingRow
              label="Font Size"
              description="기본 폰트 크기 (px)"
              value={settings.editor['editor.fontSize']}
              type="number"
              onChange={(v) => updateSetting('editor.fontSize', parseInt(v))}
            />
            <SettingRow
              label="Tab Size"
              description="탭 크기 (spaces)"
              value={settings.editor['editor.tabSize']}
              type="number"
              onChange={(v) => updateSetting('editor.tabSize', parseInt(v))}
            />
            <SettingRow
              label="Minimap"
              description="미니맵 표시 여부"
              value={settings.editor['editor.minimap']}
              type="toggle"
              onChange={(v) => updateSetting('editor.minimap', v)}
            />
          </>
        )}

        {activeCategory === 'queue' && (
          <>
            <SettingRow
              label="Max Concurrency"
              description="최대 동시 작업 수"
              value={settings.queue['queue.maxConcurrency']}
              type="number"
              onChange={(v) => updateSetting('queue.maxConcurrency', parseInt(v))}
            />
            <SettingRow
              label="Retry Attempts"
              description="작업 재시도 횟수"
              value={settings.queue['queue.retryAttempts']}
              type="number"
              onChange={(v) => updateSetting('queue.retryAttempts', parseInt(v))}
            />
            <SettingRow
              label="Retry Delay (ms)"
              description="재시도 지연 시간"
              value={settings.queue['queue.retryDelay']}
              type="number"
              onChange={(v) => updateSetting('queue.retryDelay', parseInt(v))}
            />
            <SettingRow
              label="Job Timeout (ms)"
              description="작업 타임아웃"
              value={settings.queue['queue.jobTimeout']}
              type="number"
              onChange={(v) => updateSetting('queue.jobTimeout', parseInt(v))}
            />
          </>
        )}

        {activeCategory === 'model' && (
          <>
            <SettingRow
              label="Default Provider"
              description="기본 모델 제공자"
              value={settings.model['model.defaultProvider']}
              type="select"
              options={['ollama', 'vllm']}
              onChange={(v) => updateSetting('model.defaultProvider', v)}
            />
            <SettingRow
              label="Default Model"
              description="기본 모델 이름"
              value={settings.model['model.defaultModel']}
              type="text"
              onChange={(v) => updateSetting('model.defaultModel', v)}
            />
            <SettingRow
              label="Max Tokens"
              description="최대 토큰 수"
              value={settings.model['model.maxTokens']}
              type="number"
              onChange={(v) => updateSetting('model.maxTokens', parseInt(v))}
            />
            <SettingRow
              label="Temperature"
              description="모델 온도 (0.0 - 2.0)"
              value={settings.model['model.temperature']}
              type="number"
              step="0.1"
              onChange={(v) => updateSetting('model.temperature', parseFloat(v))}
            />
          </>
        )}
      </div>
    </div>
  );
}

function SettingRow({
  label,
  description,
  value,
  type,
  options,
  step,
  onChange,
}: {
  label: string;
  description: string;
  value: any;
  type: 'text' | 'number' | 'select' | 'toggle';
  options?: string[];
  step?: string;
  onChange: (value: any) => void;
}) {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="w-48">
        {type === 'text' && (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 rounded border bg-background"
          />
        )}
        {type === 'number' && (
          <input
            type="number"
            value={value || 0}
            step={step}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 rounded border bg-background"
          />
        )}
        {type === 'select' && (
          <select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 rounded border bg-background"
          >
            {options?.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        )}
        {type === 'toggle' && (
          <button
            onClick={() => onChange(!value)}
            className={`w-12 h-6 rounded-full transition ${
              value ? 'bg-primary' : 'bg-muted'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition transform ${
                value ? 'translate-x-6' : 'translate-x-0.5'
              }`}
            />
          </button>
        )}
      </div>
    </div>
  );
}
