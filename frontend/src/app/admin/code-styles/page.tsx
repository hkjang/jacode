'use client';

import { useEffect, useState } from 'react';
import {
  Code,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Loader2,
  Save,
  Languages,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

interface CodeStylePreset {
  id: string;
  name: string;
  language: string;
  rules: {
    indentStyle: string;
    indentSize: number;
    quotes: string;
    semicolons: boolean;
  };
  conventions: string;
  isGlobal: boolean;
  createdAt: string;
}

const LANGUAGES = ['typescript', 'javascript', 'python', 'java', 'go', 'rust', 'cpp'];

export default function CodeStylesPage() {
  const [presets, setPresets] = useState<CodeStylePreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPreset, setEditingPreset] = useState<CodeStylePreset | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [filterLang, setFilterLang] = useState<string>('');

  useEffect(() => {
    loadPresets();
  }, []);

  const loadPresets = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/admin/code-styles');
      setPresets(res.data);
    } catch (error) {
      console.error('Failed to load presets:', error);
    } finally {
      setLoading(false);
    }
  };

  const deletePreset = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await api.delete(`/api/admin/code-styles/${id}`);
      loadPresets();
    } catch (error) {
      console.error('Failed to delete preset:', error);
    }
  };

  const savePreset = async (preset: Partial<CodeStylePreset>) => {
    try {
      if (editingPreset?.id) {
        await api.put(`/api/admin/code-styles/${editingPreset.id}`, preset);
      } else {
        await api.post('/api/admin/code-styles', preset);
      }
      setEditingPreset(null);
      setIsCreating(false);
      loadPresets();
    } catch (error) {
      console.error('Failed to save preset:', error);
    }
  };

  const filteredPresets = filterLang
    ? presets.filter((p) => p.language === filterLang)
    : presets;

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
          <Code className="h-5 w-5" />
          코드 스타일 프리셋
        </h2>
        <div className="flex gap-2">
          <select
            value={filterLang}
            onChange={(e) => setFilterLang(e.target.value)}
            className="px-3 py-1 border rounded-md text-sm"
          >
            <option value="">전체 언어</option>
            {LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>
          <Button variant="outline" size="sm" onClick={loadPresets}>
            <RefreshCw className="h-4 w-4 mr-2" />
            새로고침
          </Button>
          <Button size="sm" onClick={() => { 
            setIsCreating(true); 
            setEditingPreset({
              rules: { indentStyle: 'spaces', indentSize: 2, quotes: 'single', semicolons: true }
            } as any); 
          }}>
            <Plus className="h-4 w-4 mr-2" />
            프리셋 추가
          </Button>
        </div>
      </div>

      {/* Create/Edit Form */}
      {(editingPreset || isCreating) && (
        <PresetForm
          preset={editingPreset}
          onSave={savePreset}
          onCancel={() => { setEditingPreset(null); setIsCreating(false); }}
        />
      )}

      {/* Presets Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPresets.map((preset) => (
          <div key={preset.id} className="p-4 rounded-lg border bg-card">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-medium">{preset.name}</h3>
                <span className="text-xs px-2 py-0.5 bg-primary/10 rounded">
                  {preset.language}
                </span>
                {preset.isGlobal && (
                  <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded ml-1">
                    전역
                  </span>
                )}
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingPreset(preset)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deletePreset(preset.id)}
                  className="text-red-500 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="text-sm space-y-1 text-muted-foreground">
              <p>들여쓰기: {preset.rules.indentSize} {preset.rules.indentStyle}</p>
              <p>따옴표: {preset.rules.quotes}</p>
              <p>세미콜론: {preset.rules.semicolons ? '사용' : '미사용'}</p>
            </div>

            {preset.conventions && (
              <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                {preset.conventions}
              </p>
            )}
          </div>
        ))}

        {filteredPresets.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            등록된 코드 스타일 프리셋이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}

function PresetForm({
  preset,
  onSave,
  onCancel,
}: {
  preset: Partial<CodeStylePreset> | null;
  onSave: (preset: Partial<CodeStylePreset>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    name: preset?.name || '',
    language: preset?.language || 'typescript',
    indentStyle: preset?.rules?.indentStyle || 'spaces',
    indentSize: preset?.rules?.indentSize || 2,
    quotes: preset?.rules?.quotes || 'single',
    semicolons: preset?.rules?.semicolons !== false,
    conventions: preset?.conventions || '',
    isGlobal: preset?.isGlobal || false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name: form.name,
      language: form.language,
      rules: {
        indentStyle: form.indentStyle,
        indentSize: form.indentSize,
        quotes: form.quotes,
        semicolons: form.semicolons,
      },
      conventions: form.conventions,
      isGlobal: form.isGlobal,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 rounded-lg border bg-card space-y-4">
      <h3 className="font-medium">{preset?.id ? '프리셋 수정' : '새 프리셋 생성'}</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">프리셋 이름 *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-3 py-2 border rounded-md"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">언어 *</label>
          <select
            value={form.language}
            onChange={(e) => setForm({ ...form, language: e.target.value })}
            className="w-full px-3 py-2 border rounded-md"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">들여쓰기</label>
          <select
            value={form.indentStyle}
            onChange={(e) => setForm({ ...form, indentStyle: e.target.value })}
            className="w-full px-3 py-2 border rounded-md"
          >
            <option value="spaces">Spaces</option>
            <option value="tabs">Tabs</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">크기</label>
          <input
            type="number"
            value={form.indentSize}
            onChange={(e) => setForm({ ...form, indentSize: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border rounded-md"
            min={1}
            max={8}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">따옴표</label>
          <select
            value={form.quotes}
            onChange={(e) => setForm({ ...form, quotes: e.target.value })}
            className="w-full px-3 py-2 border rounded-md"
          >
            <option value="single">Single (')</option>
            <option value="double">Double (")</option>
          </select>
        </div>
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.semicolons}
              onChange={(e) => setForm({ ...form, semicolons: e.target.checked })}
            />
            세미콜론
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">코딩 컨벤션</label>
        <textarea
          value={form.conventions}
          onChange={(e) => setForm({ ...form, conventions: e.target.value })}
          className="w-full px-3 py-2 border rounded-md"
          rows={3}
          placeholder="예: PascalCase for classes, camelCase for functions..."
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isGlobal"
          checked={form.isGlobal}
          onChange={(e) => setForm({ ...form, isGlobal: e.target.checked })}
        />
        <label htmlFor="isGlobal" className="text-sm">전역 프리셋으로 설정</label>
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
