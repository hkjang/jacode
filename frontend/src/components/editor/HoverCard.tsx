'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface HoverInfo {
  type: 'function' | 'variable' | 'class' | 'type' | 'property' | 'parameter';
  name: string;
  signature?: string;
  documentation?: string;
  params?: { name: string; type: string; description?: string }[];
  returnType?: string;
  deprecated?: boolean;
  deprecationMessage?: string;
}

interface HoverCardProps {
  isVisible: boolean;
  position: { x: number; y: number };
  info: HoverInfo | null;
  className?: string;
}

const typeColors = {
  function: 'text-yellow-500',
  variable: 'text-cyan-500',
  class: 'text-orange-500',
  type: 'text-blue-500',
  property: 'text-purple-500',
  parameter: 'text-green-500',
};

const typeLabels = {
  function: 'function',
  variable: 'variable',
  class: 'class',
  type: 'type',
  property: 'property',
  parameter: 'param',
};

export function HoverCard({
  isVisible,
  position,
  info,
  className,
}: HoverCardProps) {
  if (!isVisible || !info) return null;

  return (
    <div
      className={cn(
        'fixed z-50 max-w-md bg-popover border rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95',
        className
      )}
      style={{ 
        left: Math.min(position.x, window.innerWidth - 400), 
        top: position.y + 20 
      }}
    >
      {/* Signature */}
      <div className={cn(
        'px-3 py-2 bg-muted/50 border-b font-mono text-sm',
        info.deprecated && 'line-through opacity-70'
      )}>
        <span className="text-muted-foreground text-xs mr-2">
          ({typeLabels[info.type]})
        </span>
        <span className={typeColors[info.type]}>{info.name}</span>
        {info.signature && (
          <span className="text-muted-foreground">{info.signature}</span>
        )}
        {info.returnType && (
          <span className="text-blue-400">: {info.returnType}</span>
        )}
      </div>

      {/* Deprecated warning */}
      {info.deprecated && (
        <div className="px-3 py-2 bg-yellow-500/10 border-b text-xs text-yellow-600 dark:text-yellow-400">
          ⚠️ Deprecated{info.deprecationMessage && `: ${info.deprecationMessage}`}
        </div>
      )}

      {/* Documentation */}
      {info.documentation && (
        <div className="px-3 py-2 text-xs text-muted-foreground">
          {info.documentation}
        </div>
      )}

      {/* Parameters */}
      {info.params && info.params.length > 0 && (
        <div className="px-3 py-2 border-t">
          <div className="text-[10px] text-muted-foreground uppercase mb-1">Parameters</div>
          <div className="space-y-1">
            {info.params.map((param) => (
              <div key={param.name} className="flex gap-2 text-xs">
                <span className="text-cyan-500 font-mono">{param.name}</span>
                <span className="text-blue-400 font-mono">{param.type}</span>
                {param.description && (
                  <span className="text-muted-foreground">— {param.description}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default HoverCard;
