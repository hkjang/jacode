'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Wand2, Code, FileCode, Bug, MessageSquare, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { featureApi } from '@/lib/api';

interface AIAction {
  id: string;
  label: string;
  icon: React.ElementType;
  action: () => void;
  feature?: string | null;
}

interface AIInlineActionsProps {
  isVisible: boolean;
  position: { x: number; y: number };
  selectedCode?: string;
  onExplain?: () => void;
  onRefactor?: () => void;
  onFix?: () => void;
  onDocument?: () => void;
  onAsk?: () => void;
  onClose: () => void;
  className?: string;
}

export function AIInlineActions({
  isVisible,
  position,
  selectedCode,
  onExplain,
  onRefactor,
  onFix,
  onDocument,
  onAsk,
  onClose,
  className,
}: AIInlineActionsProps) {
  const [copied, setCopied] = useState(false);
  const [enabledFeatures, setEnabledFeatures] = useState<string[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadFeatures();
  }, []);

  const loadFeatures = async () => {
    try {
      const features = await featureApi.getEnabled();
      setEnabledFeatures(features);
    } catch (error) {
      console.error('Failed to load enabled features', error);
      // Fallback to all enabled or empty? 
      // Safe default: Assume empty if error to prevent unauthorized usage, 
      // or assume all enabled if it's just a network glitch?
      // Given we are hard restricting in backend, we can be lenient or strict here.
      // Let's assume empty to avoid "Feature disabled" errors from backend.
    }
  };

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isVisible, onClose]);

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isVisible) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  const handleCopy = () => {
    if (selectedCode) {
      navigator.clipboard.writeText(selectedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const actions: AIAction[] = [
    { id: 'explain', label: 'Explain', icon: MessageSquare, action: onExplain || (() => {}), feature: 'inline_explain' },
    { id: 'refactor', label: 'Refactor', icon: Wand2, action: onRefactor || (() => {}), feature: 'auto_fix' }, // Mapping Refactor to auto_fix for now
    { id: 'fix', label: 'Fix', icon: Bug, action: onFix || (() => {}), feature: 'auto_fix' },
    { id: 'document', label: 'Document', icon: FileCode, action: onDocument || (() => {}), feature: 'doc_gen' },
    { id: 'ask', label: 'Ask AI', icon: Sparkles, action: onAsk || (() => {}), feature: null }, // Always available
  ];

  const visibleActions = actions.filter(a => !a.feature || enabledFeatures.includes(a.feature));

  return (
    <div
      ref={ref}
      className={cn(
        'fixed z-50 bg-popover border rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95',
        className
      )}
      style={{ left: position.x, top: position.y }}
    >
      {/* Header */}
      <div className="px-3 py-1.5 bg-gradient-to-r from-purple-500/20 to-blue-500/20 border-b flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-purple-500" />
        <span className="text-xs font-medium">AI Actions</span>
      </div>

      {/* Actions */}
      <div className="p-1">
        {visibleActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs rounded hover:bg-accent transition-colors"
              onClick={() => {
                action.action();
                onClose();
              }}
            >
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{action.label}</span>
            </button>
          );
        })}
        
        {/* Copy button */}
        <div className="border-t mt-1 pt-1">
          <button
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs rounded hover:bg-accent transition-colors"
            onClick={handleCopy}
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-green-500" />
                <span className="text-green-600">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Copy Code</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code preview */}
      {selectedCode && (
        <div className="border-t px-3 py-2 bg-muted/30 max-h-20 overflow-hidden">
          <pre className="text-[10px] font-mono text-muted-foreground truncate">
            {selectedCode.slice(0, 100)}
            {selectedCode.length > 100 && '...'}
          </pre>
        </div>
      )}
    </div>
  );
}

export default AIInlineActions;
