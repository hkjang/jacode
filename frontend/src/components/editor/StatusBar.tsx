'use client';

import React from 'react';
import { 
  FileCode, 
  GitBranch, 
  AlertCircle, 
  AlertTriangle, 
  Check,
  Sparkles,
  Wifi,
  WifiOff
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatusBarProps {
  // File info
  line?: number;
  column?: number;
  language?: string;
  encoding?: string;
  lineEnding?: 'LF' | 'CRLF';
  
  // Git info
  branch?: string;
  
  // Problems
  errors?: number;
  warnings?: number;
  
  // AI status
  aiConnected?: boolean;
  aiModel?: string;
  
  // Actions
  onLanguageClick?: () => void;
  onEncodingClick?: () => void;
  onLineEndingClick?: () => void;
  onProblemsClick?: () => void;
  onAIClick?: () => void;
  
  className?: string;
}

export function StatusBar({
  line = 1,
  column = 1,
  language = 'plaintext',
  encoding = 'UTF-8',
  lineEnding = 'LF',
  branch,
  errors = 0,
  warnings = 0,
  aiConnected = true,
  aiModel,
  onLanguageClick,
  onEncodingClick,
  onLineEndingClick,
  onProblemsClick,
  onAIClick,
  className,
}: StatusBarProps) {
  return (
    <div className={cn(
      'flex items-center justify-between h-6 px-2 bg-primary text-primary-foreground text-[11px]',
      className
    )}>
      {/* Left Section */}
      <div className="flex items-center gap-3">
        {/* Git Branch */}
        {branch && (
          <div className="flex items-center gap-1">
            <GitBranch className="h-3 w-3" />
            <span>{branch}</span>
          </div>
        )}
        
        {/* Problems */}
        <button 
          className="flex items-center gap-2 hover:bg-white/10 px-1 rounded transition-colors"
          onClick={onProblemsClick}
        >
          <span className="flex items-center gap-0.5">
            <AlertCircle className={cn('h-3 w-3', errors > 0 && 'text-red-400')} />
            <span>{errors}</span>
          </span>
          <span className="flex items-center gap-0.5">
            <AlertTriangle className={cn('h-3 w-3', warnings > 0 && 'text-yellow-400')} />
            <span>{warnings}</span>
          </span>
        </button>
      </div>
      
      {/* Right Section */}
      <div className="flex items-center gap-3">
        {/* AI Status */}
        <button 
          className={cn(
            'flex items-center gap-1 px-1 rounded transition-colors',
            aiConnected ? 'hover:bg-white/10' : 'text-red-300'
          )}
          onClick={onAIClick}
          title={aiConnected ? `AI: ${aiModel || 'Connected'}` : 'AI Disconnected'}
        >
          {aiConnected ? (
            <>
              <Sparkles className="h-3 w-3 text-purple-300" />
              {aiModel && <span className="max-w-[80px] truncate">{aiModel}</span>}
            </>
          ) : (
            <>
              <WifiOff className="h-3 w-3" />
              <span>Offline</span>
            </>
          )}
        </button>
        
        {/* Line/Column */}
        <span className="tabular-nums">Ln {line}, Col {column}</span>
        
        {/* Line Ending */}
        <button 
          className="hover:bg-white/10 px-1 rounded transition-colors"
          onClick={onLineEndingClick}
        >
          {lineEnding}
        </button>
        
        {/* Encoding */}
        <button 
          className="hover:bg-white/10 px-1 rounded transition-colors"
          onClick={onEncodingClick}
        >
          {encoding}
        </button>
        
        {/* Language */}
        <button 
          className="flex items-center gap-1 hover:bg-white/10 px-1 rounded transition-colors"
          onClick={onLanguageClick}
        >
          <FileCode className="h-3 w-3" />
          <span>{language}</span>
        </button>
      </div>
    </div>
  );
}

export default StatusBar;
