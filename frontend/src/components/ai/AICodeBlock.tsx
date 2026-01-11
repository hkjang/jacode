'use client';

import { useState } from 'react';
import { Check, Copy, Play, Eye, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MonacoDiffEditor } from '@/components/editor/MonacoDiffEditor';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

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

  const ActionButtons = ({ className, showLabel = false }: { className?: string, showLabel?: boolean }) => (
    <div className={className}>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 px-2 hover:bg-background/80"
        onClick={handleCopy}
        title="복사"
      >
        {copied ? <Check className="h-3 w-3 text-green-500 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
        {showLabel && (copied ? '복사됨' : '복사')}
      </Button>
      
      {onPreview && currentCode && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 hover:bg-background/80"
          onClick={handlePreview}
          title="미리보기"
        >
          <Eye className="h-3 w-3 mr-1" />
          {showLabel && '미리보기'}
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
  );

  return (
    <div className="relative group my-2">
      {/* Language Badge */}
      {language && (
        <div className="absolute top-0 left-0 px-2 py-0.5 text-xs bg-muted rounded-tl rounded-br text-muted-foreground z-10">
          {language}
        </div>
      )}
      
      {/* Top Action Buttons (Overlay) */}
      <ActionButtons className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-background/50 backdrop-blur-sm rounded p-0.5" />

      {/* Code Block */}
      <div className="rounded-lg overflow-hidden border border-border/50 mb-1">
        <SyntaxHighlighter
          language={language || 'typescript'}
          style={vscDarkPlus}
          customStyle={{
            margin: 0,
            padding: '1.5rem 1rem 1rem 1rem',
            background: '#18181b', // zinc-900
            fontSize: '0.875rem',
            fontFamily: 'monospace'
          }}
          showLineNumbers={true}
        >
          {code}
        </SyntaxHighlighter>
      </div>

      {/* Bottom Action Buttons (Footer) */}
      <div className="flex justify-end border-t border-border/50 pt-1">
        <ActionButtons className="flex gap-2" showLabel={true} />
      </div>
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
  language?: string;
  onAccept: () => void;
  onReject: () => void;
}

export function DiffPreviewModal({
  isOpen,
  onClose,
  originalCode,
  newCode,
  fileName,
  language,
  onAccept,
  onReject,
}: DiffPreviewModalProps) {
  if (!isOpen) return null;

  // Simple diff visualization
  const originalLines = originalCode.split('\n');
  const newLines = newCode.split('\n');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card w-[90%] max-w-7xl h-[85vh] rounded-lg shadow-xl flex flex-col border border-border">
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
        <div className="flex-1 overflow-hidden p-0">
          <MonacoDiffEditor
            original={originalCode}
            modified={newCode}
            language={language || 'typescript'}
            readOnly={true}
            options={{
              minimap: { enabled: false },
              renderSideBySide: true,
              scrollBeyondLastLine: false,
            }}
          />
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
