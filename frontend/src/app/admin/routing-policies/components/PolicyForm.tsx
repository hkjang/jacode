'use client';

import { useState } from 'react';
import { Save, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RoutingSimulator } from './RoutingSimulator';

interface RoutingPolicy {
  id?: string;
  name: string;
  description: string;
  isActive: boolean;
  priority: number;
  rules: {
    costWeight: number;
    performanceWeight: number;
    availabilityWeight: number;
    modelPreferences?: Record<string, string[]>;
  };
}

const TASK_TYPES = [
  { id: 'code', label: 'Code Generation' },
  { id: 'refactor', label: 'Refactoring' },
  { id: 'explain', label: 'Explanation' },
  { id: 'review', label: 'Code Review' },
  { id: 'fix', label: 'Bug Fix' },
  { id: 'test', label: 'Test Generation' },
];

const AVAILABLE_MODELS = ['openai', 'anthropic', 'ollama', 'vllm', 'codellama', 'deepseek-coder', 'mistral', 'llama2', 'gpt-4', 'claude-3'];

interface PolicyFormProps {
  policy: Partial<RoutingPolicy> | null;
  onSave: (policy: Partial<RoutingPolicy>) => void;
  onCancel: () => void;
}

export function PolicyForm({ policy, onSave, onCancel }: PolicyFormProps) {
  const [form, setForm] = useState({
    name: policy?.name || '',
    description: policy?.description || '',
    priority: policy?.priority || 100,
    isActive: policy?.isActive !== false,
    costWeight: (policy?.rules?.costWeight || 0.3) * 100,
    performanceWeight: (policy?.rules?.performanceWeight || 0.4) * 100,
    availabilityWeight: (policy?.rules?.availabilityWeight || 0.3) * 100,
    modelPreferences: policy?.rules?.modelPreferences || {},
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...policy,
      name: form.name,
      description: form.description,
      priority: form.priority,
      isActive: form.isActive,
      rules: {
        costWeight: form.costWeight / 100,
        performanceWeight: form.performanceWeight / 100,
        availabilityWeight: form.availabilityWeight / 100,
        modelPreferences: form.modelPreferences,
      },
    });
  };

  const handlePreferenceChange = (taskType: string, modelsStr: string) => {
    const models = modelsStr.split(',').map(s => s.trim()).filter(Boolean);
    setForm(prev => ({
      ...prev,
      modelPreferences: {
        ...prev.modelPreferences,
         [taskType]: models
      }
    }));
  };

  return (
     <div className="flex flex-col h-[calc(100vh-12rem)] min-h-[700px] border rounded-lg bg-card overflow-hidden">
      {/* Header */}
       <div className="flex items-center justify-between px-6 py-4 border-b bg-card">
        <div className="flex items-center gap-2">
           <Button variant="ghost" size="sm" onClick={onCancel} className="mr-2">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="font-medium text-lg">
            {policy?.id ? '정책 수정' : '새 정책 생성'}
          </h3>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            취소
          </Button>
          <Button onClick={handleSubmit}>
            <Save className="h-4 w-4 mr-2" />
            저장
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-6 bg-muted/10">
        <Tabs defaultValue="general" className="h-full flex flex-col">
          <TabsList className="w-full justify-start border-b rounded-none bg-transparent p-0 mb-6">
            <TabsTrigger value="general" className="data-[state=active]:bg-background data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none shadow-none px-6 py-2">기본 설정</TabsTrigger>
            <TabsTrigger value="preferences" className="data-[state=active]:bg-background data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none shadow-none px-6 py-2">모델 선호도 (Preferences)</TabsTrigger>
            <TabsTrigger value="simulator" className="data-[state=active]:bg-background data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 rounded-none shadow-none px-6 py-2 ml-auto font-medium">✨ Routing Simulator</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="flex-1 overflow-y-auto pr-2">
             <div className="grid grid-cols-2 gap-6 max-w-4xl mx-auto">
                <div className="space-y-4 p-6 bg-card rounded-lg border">
                  <h4 className="font-medium mb-4">기본 정보</h4>
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
                    <p className="text-xs text-muted-foreground mt-1">숫자가 높을수록 먼저 적용됩니다.</p>
                  </div>
                   <div>
                    <label className="block text-sm font-medium mb-1">설명</label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md"
                      rows={3}
                    />
                  </div>
                   <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={form.isActive}
                      onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                      className="h-4 w-4"
                    />
                    <label htmlFor="isActive" className="text-sm font-medium">정책 활성화</label>
                  </div>
                </div>

                <div className="space-y-4 p-6 bg-card rounded-lg border">
                  <h4 className="font-medium mb-4">가중치 설정 (Weights)</h4>
                   <div>
                    <div className="flex justify-between mb-1">
                      <label className="block text-sm font-medium">비용 (Cost) Optimality</label>
                       <span className="text-sm font-mono">{form.costWeight}%</span>
                    </div>
                    <input
                      type="range"
                      min="0" max="100"
                      value={form.costWeight}
                      onChange={(e) => setForm({ ...form, costWeight: parseInt(e.target.value) })} // Intentionally loose typing for slider
                       className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
                    />
                    <p className="text-xs text-muted-foreground mt-1">높을수록 저렴한 모델을 선호합니다.</p>
                  </div>

                   <div className="pt-4">
                     <div className="flex justify-between mb-1">
                      <label className="block text-sm font-medium">성능 (Performance)</label>
                       <span className="text-sm font-mono">{form.performanceWeight}%</span>
                    </div>
                    <input
                      type="range"
                      min="0" max="100"
                      value={form.performanceWeight}
                      onChange={(e) => setForm({ ...form, performanceWeight: parseInt(e.target.value) })}
                       className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
                    />
                     <p className="text-xs text-muted-foreground mt-1">높을수록 고성능/빠른 모델을 선호합니다.</p>
                  </div>

                   <div className="pt-4">
                     <div className="flex justify-between mb-1">
                      <label className="block text-sm font-medium">가용성 (Availability)</label>
                       <span className="text-sm font-mono">{form.availabilityWeight}%</span>
                    </div>
                    <input
                      type="range"
                      min="0" max="100"
                      value={form.availabilityWeight}
                      onChange={(e) => setForm({ ...form, availabilityWeight: parseInt(e.target.value) })}
                       className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
                    />
                     <p className="text-xs text-muted-foreground mt-1">높을수록 에러가 없고 안정적인 서버를 선호합니다.</p>
                  </div>
                </div>
             </div>
          </TabsContent>

          <TabsContent value="preferences" className="flex-1 overflow-y-auto">
             <div className="max-w-4xl mx-auto p-6 bg-card rounded-lg border">
               <div className="mb-6">
                 <h4 className="font-medium text-lg">모델 선호도 설정</h4>
                 <p className="text-sm text-muted-foreground">
                   각 작업 유형별로 선호하는 모델 키워드를 입력하세요. 여기에 매칭되는 모델은 라우팅 시 **가산점**을 받습니다.
                 </p>
                 <p className="text-xs text-muted-foreground mt-1">
                   여러 개 입력 시 쉼표(,)로 구분. 예: <code>gpt-4, claude-3</code>
                 </p>
               </div>

               <div className="grid grid-cols-2 gap-6">
                  {TASK_TYPES.map(type => (
                    <div key={type.id} className="space-y-1">
                      <label className="text-sm font-medium flex items-center gap-2">
                        {type.label}
                        <span className="text-xs bg-muted px-1.5 rounded text-muted-foreground font-normal">{type.id}</span>
                      </label>
                      <input 
                         type="text"
                         className="w-full px-3 py-2 border rounded-md text-sm"
                         placeholder={`e.g. ${AVAILABLE_MODELS.slice(0, 2).join(', ')}`}
                         value={(form.modelPreferences?.[type.id] || []).join(', ')}
                         onChange={e => handlePreferenceChange(type.id, e.target.value)}
                      />
                    </div>
                  ))}
               </div>
             </div>
          </TabsContent>

           <TabsContent value="simulator" className="flex-1 h-full overflow-hidden">
             <RoutingSimulator 
               initialWeights={{
                 costWeight: form.costWeight / 100,
                 performanceWeight: form.performanceWeight / 100,
                 availabilityWeight: form.availabilityWeight / 100
               }}
               modelPreferences={form.modelPreferences}
             />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
