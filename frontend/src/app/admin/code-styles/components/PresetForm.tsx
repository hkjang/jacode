'use client';

import { useState, useEffect } from 'react';
import { Save, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CodePreview } from './CodePreview';

import { UsageGuide } from './UsageGuide';

interface CodeStylePreset {
  id?: string;
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
}

const LANGUAGES = ['typescript', 'javascript', 'python', 'java', 'go', 'rust', 'cpp'];

interface PresetFormProps {
  preset: Partial<CodeStylePreset> | null;
  onSave: (preset: Partial<CodeStylePreset>) => void;
  onCancel: () => void;
}

export function PresetForm({ preset, onSave, onCancel }: PresetFormProps) {
  const [form, setForm] = useState({
    name: '',
    language: 'typescript',
    indentStyle: 'spaces',
    indentSize: 2,
    quotes: 'single',
    semicolons: true,
    conventions: '',
    isGlobal: false,
  });

  useEffect(() => {
    if (preset) {
      setForm({
        name: preset.name || '',
        language: preset.language || 'typescript',
        indentStyle: preset.rules?.indentStyle || 'spaces',
        indentSize: preset.rules?.indentSize || 2,
        quotes: preset.rules?.quotes || 'single',
        semicolons: preset.rules?.semicolons !== false,
        conventions: preset.conventions || '',
        isGlobal: preset.isGlobal || false,
      });
    }
  }, [preset]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...preset,
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

  const currentRules = {
    indentStyle: form.indentStyle,
    indentSize: form.indentSize,
    quotes: form.quotes,
    semicolons: form.semicolons,
  };

  // Generate system prompt preview
  const generatePromptPreview = () => {
    const rules = [];
    rules.push(`Code Style: ${form.name || 'Untitled'} (${form.language})`);
    rules.push('');
    rules.push('Rules:');
    rules.push(`- Indentation: ${form.indentSize} ${form.indentStyle}`);
    rules.push(`- Quotes: ${form.quotes === 'single' ? 'single quotes' : 'double quotes'}`);
    rules.push(`- Semicolons: ${form.semicolons ? 'required' : 'not required'}`);
    
    if (form.conventions) {
      rules.push('');
      rules.push('Conventions:');
      rules.push(form.conventions);
    }
    
    return rules.join('\n');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] min-h-[600px] border rounded-lg bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-card">
        <div className="flex items-center gap-2">
           <Button variant="ghost" size="sm" onClick={onCancel} className="mr-2">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="font-medium text-lg">
            {preset?.id ? '프리셋 수정' : '새 프리셋 생성'}
          </h3>
        </div>
        <div className="flex gap-2">
          <UsageGuide 
            presetName={form.name || 'New Preset'} 
            language={form.language}
            systemPromptPreview={generatePromptPreview()}
          />
          <div className="w-px h-8 bg-border mx-2" />
          <Button variant="outline" onClick={onCancel}>
            취소
          </Button>
          <Button onClick={handleSubmit}>
            <Save className="h-4 w-4 mr-2" />
            저장
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Form */}
        <div className="w-1/2 p-6 overflow-y-auto border-r space-y-6">
          <div className="space-y-4">
             <div className="space-y-2">
              <label className="text-sm font-medium">프리셋 이름</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Ex: My Team Standard"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">언어</label>
              <select
                value={form.language}
                onChange={(e) => setForm({ ...form, language: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
            </div>
            
            <div className="border-t my-4 pt-4">
              <h4 className="font-medium mb-4 text-sm text-muted-foreground uppercase tracking-wider">포맷팅 규칙</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">들여쓰기 스타일</label>
                  <select
                    value={form.indentStyle}
                    onChange={(e) => setForm({ ...form, indentStyle: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="spaces">Spaces</option>
                    <option value="tabs">Tabs</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">들여쓰기 크기</label>
                  <input
                    type="number"
                    value={form.indentSize}
                    onChange={(e) => setForm({ ...form, indentSize: parseInt(e.target.value) })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    min={1}
                    max={8}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">따옴표</label>
                  <select
                    value={form.quotes}
                    onChange={(e) => setForm({ ...form, quotes: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="single">Single (')</option>
                    <option value="double">Double (")</option>
                  </select>
                </div>
                <div className="space-y-2">
                   <label className="text-sm font-medium">세미콜론</label>
                   <div className="flex items-center space-x-2 pt-2">
                      <input
                        type="checkbox"
                        checked={form.semicolons}
                        onChange={(e) => setForm({ ...form, semicolons: e.target.checked })}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <span className="text-sm text-muted-foreground">{form.semicolons ? '항상 사용' : '가능하면 생략'}</span>
                   </div>
                </div>
              </div>
            </div>

            <div className="border-t my-4 pt-4">
               <label className="text-sm font-medium mb-2 block">Coding Conventions (상세 가이드)</label>
               <textarea
                value={form.conventions}
                onChange={(e) => setForm({ ...form, conventions: e.target.value })}
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="예: PascalCase for classes, camelCase for functions..."
              />
              <p className="text-xs text-muted-foreground mt-1">
                팀원들이 참고할 수 있는 상세 코딩 컨벤션을 마크다운 형식으로 작성하세요.
              </p>
            </div>

             <div className="flex items-center gap-2 pt-4">
                <input
                  type="checkbox"
                  id="isGlobal"
                  checked={form.isGlobal}
                  onChange={(e) => setForm({ ...form, isGlobal: e.target.checked })}
                   className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="isGlobal" className="text-sm">전역 프리셋으로 설정 (모든 프로젝트 기본값)</label>
              </div>
          </div>
        </div>

        {/* Right: Preview */}
        <div className="w-1/2 p-6 bg-muted/30">
          <div className="h-full flex flex-col">
             <h4 className="font-medium mb-4 text-sm text-muted-foreground uppercase tracking-wider flex justify-between items-center">
               Live Preview
               <span className="text-xs normal-case bg-primary/10 text-primary px-2 py-1 rounded">
                Generated based on current settings
               </span>
             </h4>
             <div className="flex-1">
                <CodePreview language={form.language} rules={currentRules} />
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
