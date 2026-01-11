'use client';

import React, { useState, useEffect } from 'react';
import { Save, Check, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

interface AutoSaveIndicatorProps {
  status: SaveStatus;
  lastSaved?: Date;
  onManualSave?: () => void;
  className?: string;
}

export function AutoSaveIndicator({
  status,
  lastSaved,
  onManualSave,
  className,
}: AutoSaveIndicatorProps) {
  const [showSaved, setShowSaved] = useState(false);

  // Flash "Saved" message briefly
  useEffect(() => {
    if (status === 'saved') {
      setShowSaved(true);
      const timer = setTimeout(() => setShowSaved(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [status, lastSaved]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={cn('flex items-center gap-1.5 text-[11px]', className)}>
      {status === 'saving' && (
        <>
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground">Saving...</span>
        </>
      )}

      {status === 'saved' && showSaved && (
        <>
          <Check className="h-3 w-3 text-green-500" />
          <span className="text-green-600 dark:text-green-400">Saved</span>
        </>
      )}

      {status === 'saved' && !showSaved && lastSaved && (
        <>
          <Clock className="h-3 w-3 text-muted-foreground" />
          <span className="text-muted-foreground">
            {formatTime(lastSaved)}
          </span>
        </>
      )}

      {status === 'unsaved' && (
        <button
          onClick={onManualSave}
          className="flex items-center gap-1 text-orange-500 hover:text-orange-600 transition-colors"
          title="Save now (Ctrl+S)"
        >
          <Save className="h-3 w-3" />
          <span>Unsaved</span>
        </button>
      )}

      {status === 'error' && (
        <button
          onClick={onManualSave}
          className="flex items-center gap-1 text-red-500 hover:text-red-600 transition-colors"
          title="Save failed - Click to retry"
        >
          <AlertCircle className="h-3 w-3" />
          <span>Save failed</span>
        </button>
      )}
    </div>
  );
}

// Hook for auto-save functionality
export function useAutoSave(
  content: string,
  onSave: (content: string) => Promise<void>,
  options: {
    debounceMs?: number;
    enabled?: boolean;
  } = {}
) {
  const { debounceMs = 2000, enabled = true } = options;
  const [status, setStatus] = useState<SaveStatus>('saved');
  const [lastSaved, setLastSaved] = useState<Date | undefined>();
  const [lastContent, setLastContent] = useState(content);

  useEffect(() => {
    if (!enabled) return;
    if (content === lastContent) return;

    setStatus('unsaved');

    const timer = setTimeout(async () => {
      setStatus('saving');
      try {
        await onSave(content);
        setLastContent(content);
        setLastSaved(new Date());
        setStatus('saved');
      } catch (e) {
        setStatus('error');
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [content, onSave, debounceMs, enabled, lastContent]);

  const manualSave = async () => {
    setStatus('saving');
    try {
      await onSave(content);
      setLastContent(content);
      setLastSaved(new Date());
      setStatus('saved');
    } catch (e) {
      setStatus('error');
    }
  };

  return { status, lastSaved, manualSave };
}

export default AutoSaveIndicator;
