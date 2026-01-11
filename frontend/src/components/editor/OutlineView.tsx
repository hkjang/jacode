'use client';

import React, { useState, useMemo } from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  Code, 
  Box,
  Hash,
  Brackets,
  Type,
  Parentheses
} from 'lucide-react';
import { cn } from '@/lib/utils';

type SymbolKind = 'function' | 'class' | 'interface' | 'variable' | 'constant' | 'method' | 'property' | 'type';

interface CodeSymbol {
  name: string;
  kind: SymbolKind;
  line: number;
  column?: number;
  children?: CodeSymbol[];
}

interface OutlineViewProps {
  symbols: CodeSymbol[];
  currentLine?: number;
  onSymbolClick: (line: number, column?: number) => void;
  className?: string;
}

const symbolIcons: Record<SymbolKind, React.ElementType> = {
  function: Parentheses,
  method: Parentheses,
  class: Box,
  interface: Brackets,
  type: Type,
  variable: Hash,
  constant: Hash,
  property: Code,
};

const symbolColors: Record<SymbolKind, string> = {
  function: 'text-yellow-500',
  method: 'text-yellow-500',
  class: 'text-orange-500',
  interface: 'text-blue-500',
  type: 'text-blue-400',
  variable: 'text-cyan-500',
  constant: 'text-green-500',
  property: 'text-purple-500',
};

function SymbolItem({
  symbol,
  level,
  currentLine,
  expanded,
  onToggle,
  onClick,
}: {
  symbol: CodeSymbol;
  level: number;
  currentLine?: number;
  expanded: boolean;
  onToggle: () => void;
  onClick: () => void;
}) {
  const Icon = symbolIcons[symbol.kind] || Code;
  const color = symbolColors[symbol.kind] || 'text-muted-foreground';
  const hasChildren = symbol.children && symbol.children.length > 0;
  const isCurrentLine = currentLine !== undefined && 
    currentLine >= symbol.line && 
    (!symbol.children?.length || currentLine < (symbol.children[0]?.line || Infinity));

  return (
    <>
      <button
        className={cn(
          'w-full flex items-center gap-1.5 px-2 py-1 text-xs transition-colors',
          isCurrentLine ? 'bg-accent' : 'hover:bg-accent/50'
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={() => hasChildren ? onToggle() : onClick()}
      >
        {hasChildren ? (
          <span className="w-3 h-3 flex items-center justify-center">
            {expanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </span>
        ) : (
          <span className="w-3" />
        )}
        <Icon className={cn('h-3 w-3', color)} />
        <span className="flex-1 truncate text-left">{symbol.name}</span>
        <span className="text-[10px] text-muted-foreground tabular-nums">{symbol.line}</span>
      </button>
    </>
  );
}

export function OutlineView({
  symbols,
  currentLine,
  onSymbolClick,
  className,
}: OutlineViewProps) {
  const [expandedSymbols, setExpandedSymbols] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState('');

  // Filter symbols
  const filteredSymbols = useMemo(() => {
    if (!filter.trim()) return symbols;
    
    const lowerFilter = filter.toLowerCase();
    const filterSymbol = (s: CodeSymbol): CodeSymbol | null => {
      const matches = s.name.toLowerCase().includes(lowerFilter);
      const filteredChildren = s.children?.map(filterSymbol).filter(Boolean) as CodeSymbol[] | undefined;
      
      if (matches || (filteredChildren && filteredChildren.length > 0)) {
        return { ...s, children: filteredChildren || s.children };
      }
      return null;
    };
    
    return symbols.map(filterSymbol).filter(Boolean) as CodeSymbol[];
  }, [symbols, filter]);

  const toggleSymbol = (name: string) => {
    setExpandedSymbols(prev => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const renderSymbol = (symbol: CodeSymbol, level: number = 0): React.ReactNode => {
    const isExpanded = expandedSymbols.has(symbol.name);
    
    return (
      <div key={`${symbol.name}-${symbol.line}`}>
        <SymbolItem
          symbol={symbol}
          level={level}
          currentLine={currentLine}
          expanded={isExpanded}
          onToggle={() => toggleSymbol(symbol.name)}
          onClick={() => onSymbolClick(symbol.line, symbol.column)}
        />
        {isExpanded && symbol.children?.map(child => renderSymbol(child, level + 1))}
      </div>
    );
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Filter */}
      <div className="px-2 py-1.5 border-b">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter symbols..."
          className="w-full h-6 px-2 text-xs bg-muted border rounded focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Symbols */}
      <div className="flex-1 overflow-auto py-1">
        {filteredSymbols.length === 0 ? (
          <div className="px-2 py-8 text-center text-xs text-muted-foreground">
            {filter ? 'No symbols match filter' : 'No symbols found'}
          </div>
        ) : (
          filteredSymbols.map(symbol => renderSymbol(symbol))
        )}
      </div>
    </div>
  );
}

export default OutlineView;
