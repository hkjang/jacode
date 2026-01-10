'use client';

import { Info, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface UsageGuideProps {
  presetName: string;
  language: string;
  systemPromptPreview: string;
}

export function UsageGuide({ presetName, language, systemPromptPreview }: UsageGuideProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(systemPromptPreview);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Info className="h-4 w-4" />
          사용 가이드 & 프롬프트 확인
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>코드 스타일 프리셋 사용 가이드</DialogTitle>
          <DialogDescription>
            이 프리셋이 실제로 AI 코드 생성에 어떻게 적용되는지 확인하세요.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="guide" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="guide">사용 방법</TabsTrigger>
            <TabsTrigger value="prompt">시스템 프롬프트 미리보기</TabsTrigger>
          </TabsList>

          <TabsContent value="guide" className="space-y-4 py-4">
            <div className="space-y-4 text-sm">
              <div className="p-4 bg-muted rounded-lg border">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">1</span>
                  프리셋 선택
                </h4>
                <p className="text-muted-foreground ml-8">
                  AI에게 작업을 요청할 때(예: 코드 생성, 리팩토링), 옵션에서 
                  <span className="font-medium text-foreground mx-1">'{presetName}'</span>
                  프리셋을 선택하세요.
                </p>
              </div>

              <div className="p-4 bg-muted rounded-lg border">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">2</span>
                  AI 자동 적용
                </h4>
                <p className="text-muted-foreground ml-8">
                  VIBE Coding AI가 코드를 생성할 때, 설정된 들여쓰기({language} 등), 
                  따옴표 스타일, 그리고 정의된 컨벤션을 자동으로 준수합니다.
                </p>
              </div>

              <div className="p-4 bg-yellow-50/50 dark:bg-yellow-900/10 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <h4 className="font-semibold mb-2 text-yellow-800 dark:text-yellow-200">Tip</h4>
                <ul className="list-disc list-inside ml-4 space-y-1 text-muted-foreground">
                  <li>전역(Global) 프리셋으로 설정하면 별도 선택 없이 기본값으로 적용됩니다.</li>
                  <li>팀별로 다른 컨벤션이 필요하다면 별도 프리셋을 만들어 공유하세요.</li>
                </ul>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="prompt" className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  실제 AI에게 전달되는 시스템 프롬프트 내용입니다:
                </p>
                <Button variant="ghost" size="sm" onClick={handleCopy} className="h-8">
                  {copied ? (
                    <Check className="h-3.5 w-3.5 mr-1.5 text-green-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  {copied ? '복사됨' : '복사'}
                </Button>
              </div>
              <div className="relative rounded-md border bg-muted p-4">
                <pre className="text-xs overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed">
                  {systemPromptPreview}
                </pre>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
