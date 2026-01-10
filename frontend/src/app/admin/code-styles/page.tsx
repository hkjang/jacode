'use client';

import { useEffect, useState } from 'react';
import {
  Code,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { PresetForm } from './components/PresetForm';

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
  const [editingPreset, setEditingPreset] = useState<Partial<CodeStylePreset> | null>(null);
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
      if (preset.id) {
        await api.put(`/api/admin/code-styles/${preset.id}`, preset);
      } else {
        await api.post('/api/admin/code-styles', preset);
      }
      setEditingPreset(null);
      setIsCreating(false);
      loadPresets();
    } catch (error) {
      console.error('Failed to save preset:', error);
      alert('저장 중 오류가 발생했습니다.');
    }
  };

  const handleEdit = (preset: CodeStylePreset) => {
    setEditingPreset(preset);
  };

  const handleCreate = () => {
    setEditingPreset({
      name: '',
      language: 'typescript',
      rules: { indentStyle: 'spaces', indentSize: 2, quotes: 'single', semicolons: true },
      conventions: '',
      isGlobal: false,
    });
    setIsCreating(true);
  };

  const filteredPresets = filterLang
    ? presets.filter((p) => p.language === filterLang)
    : presets;

  // Show Form view if creating or editing
  if (isCreating || editingPreset) {
    return (
      <PresetForm
        preset={editingPreset}
        onSave={savePreset}
        onCancel={() => {
          setEditingPreset(null);
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
          <Code className="h-5 w-5 text-primary" />
          코드 스타일 프리셋
        </h2>
        <div className="flex gap-2">
          <select
            value={filterLang}
            onChange={(e) => setFilterLang(e.target.value)}
            className="px-3 py-1 border rounded-md text-sm bg-background"
          >
            <option value="">전체 언어 ({presets.length})</option>
            {LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>
          <Button variant="outline" size="sm" onClick={loadPresets}>
            <RefreshCw className="h-4 w-4 mr-2" />
            새로고침
          </Button>
          <Button size="sm" onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            프리셋 추가
          </Button>
        </div>
      </div>

      {/* Presets Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPresets.map((preset) => (
          <div key={preset.id} className="p-5 rounded-lg border bg-card hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-lg">{preset.name}</h3>
                  {preset.isGlobal && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                      GLOBAL
                    </span>
                  )}
                </div>
                <div className="mt-1">
                   <span className="text-xs px-2 py-0.5 bg-secondary text-secondary-foreground rounded capitalize">
                    {preset.language}
                  </span>
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(preset)}
                  className="h-8 w-8"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deletePreset(preset.id)}
                  className="h-8 w-8 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="space-y-2 py-2 border-t border-b text-sm text-muted-foreground bg-muted/20 -mx-5 px-5 my-3">
              <div className="flex justify-between">
                <span>Indent</span>
                <span className="font-mono text-foreground">{preset.rules.indentSize} {preset.rules.indentStyle}</span>
              </div>
              <div className="flex justify-between">
                <span>Quotes</span>
                <span className="font-mono text-foreground capitalize">{preset.rules.quotes}</span>
              </div>
              <div className="flex justify-between">
                <span>Semicolons</span>
                <span className="font-mono text-foreground capitalize">{String(preset.rules.semicolons)}</span>
              </div>
            </div>

            {preset.conventions && (
              <div className="mt-3">
                <p className="text-xs text-muted-foreground font-medium mb-1">Convention Preview:</p>
                <div className="text-xs text-muted-foreground line-clamp-2 bg-muted p-2 rounded">
                  {preset.conventions}
                </div>
              </div>
            )}
          </div>
        ))}

        {filteredPresets.length === 0 && (
           <div className="col-span-full flex flex-col items-center justify-center py-16 text-muted-foreground border-2 border-dashed rounded-lg bg-muted/10">
            <Code className="h-10 w-10 mb-4 opacity-50" />
            <p className="text-lg font-medium">등록된 코드 스타일 프리셋이 없습니다.</p>
            <p className="text-sm mt-1">새로운 프리셋을 추가하여 팀의 코딩 컨벤션을 정의하세요.</p>
            <Button onClick={handleCreate} variant="outline" className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              첫 프리셋 추가하기
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
