'use client';

import { useState } from 'react';
import { Check, Copy, Play, Eye, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AICodeBlockProps {
  code: string;
  language?: string;
  currentCode?: string;
  onApply?: (code: string) => void;
  onPreview?: (code: string) => void;
}

export function AICodeBlock({ 
  code, 
  language, 
  currentCode,
  onApply, 
  onPreview 
}: AICodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [showDiff, setShowDiff] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApply = () => {
    onApply?.(code);
  };

  const handlePreview = () => {
    onPreview?.(code);
    setShowDiff(true);
  };

  return (
    <div className="relative group my-2">
      {/* Language Badge */}
      {language && (
        <div className="absolute top-0 left-0 px-2 py-0.5 text-xs bg-muted rounded-tl rounded-br text-muted-foreground">
          {language}
        </div>
      )}
      
      {/* Action Buttons */}
      <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 bg-background/80 hover:bg-background"
          onClick={handleCopy}
          title="복사"
        >
          {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
        </Button>
        
        {onPreview && currentCode && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 bg-background/80 hover:bg-background"
            onClick={handlePreview}
            title="미리보기"
          >
            <Eye className="h-3 w-3" />
          </Button>
        )}
        
        {onApply && (
          <Button
            variant="default"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={handleApply}
            title="에디터에 적용"
          >
            <Play className="h-3 w-3 mr-1" />
            적용
          </Button>
        )}
      </div>

      {/* Code Block */}
      <pre className="bg-zinc-900 text-zinc-100 p-3 pt-6 rounded-lg overflow-x-auto text-sm font-mono">
        <code>{code}</code>
      </pre>
    </div>
  );
}

// Diff Preview Modal
interface DiffPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalCode: string;
  newCode: string;
  fileName?: string;
  onAccept: () => void;
  onReject: () => void;
}

export function DiffPreviewModal({
  isOpen,
  onClose,
  originalCode,
  newCode,
  fileName,
  onAccept,
  onReject,
}: DiffPreviewModalProps) {
  if (!isOpen) return null;

  // Simple diff visualization
  const originalLines = originalCode.split('\n');
  const newLines = newCode.split('\n');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card w-[90%] max-w-4xl max-h-[80vh] rounded-lg shadow-xl flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <h3 className="font-semibold">코드 변경 미리보기</h3>
            {fileName && <p className="text-sm text-muted-foreground">{fileName}</p>}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Diff View */}
        <div className="flex-1 overflow-auto p-4 grid grid-cols-2 gap-4">
          {/* Original */}
          <div>
            <div className="text-sm font-medium mb-2 text-red-500">- 기존 코드</div>
            <pre className="bg-red-950/20 border border-red-500/20 p-3 rounded text-sm overflow-x-auto max-h-96">
              <code>{originalCode}</code>
            </pre>
          </div>
          
          {/* New */}
          <div>
            <div className="text-sm font-medium mb-2 text-green-500">+ 새 코드</div>
            <pre className="bg-green-950/20 border border-green-500/20 p-3 rounded text-sm overflow-x-auto max-h-96">
              <code>{newCode}</code>
            </pre>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t flex justify-end gap-2">
          <Button variant="outline" onClick={onReject}>
            <X className="h-4 w-4 mr-1" />
            취소
          </Button>
          <Button variant="default" onClick={onAccept}>
            <Check className="h-4 w-4 mr-1" />
            적용
          </Button>
        </div>
      </div>
    </div>
  );
}

// Code extraction utility
export function extractCodeBlocks(markdown: string): Array<{ code: string; language: string }> {
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
  const blocks: Array<{ code: string; language: string }> = [];
  
  let match;
  while ((match = codeBlockRegex.exec(markdown)) !== null) {
    blocks.push({
      language: match[1] || 'text',
      code: match[2].trim(),
    });
  }
  
  return blocks;
}
