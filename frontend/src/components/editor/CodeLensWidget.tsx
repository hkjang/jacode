'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface CodeLens {
  id: string;
  line: number;
  label: string;
  tooltip?: string;
  onClick?: () => void;
}

interface CodeLensWidgetProps {
  lenses: CodeLens[];
  lineHeight: number;
  topOffset?: number;
  className?: string;
}

export function CodeLensWidget({
  lenses,
  lineHeight,
  topOffset = 0,
  className,
}: CodeLensWidgetProps) {
  // Group lenses by line
  const groupedByLine = lenses.reduce<Record<number, CodeLens[]>>((acc, lens) => {
    if (!acc[lens.line]) acc[lens.line] = [];
    acc[lens.line].push(lens);
    return acc;
  }, {});

  return (
    <div className={cn('absolute left-0 top-0 pointer-events-none w-full', className)}>
      {Object.entries(groupedByLine).map(([lineNum, lineLenses]) => {
        const line = parseInt(lineNum, 10);
        const top = topOffset + (line - 1) * lineHeight - lineHeight * 0.3;
        
        return (
          <div
            key={line}
            className="absolute left-16 flex items-center gap-3 text-[10px] text-muted-foreground pointer-events-auto"
            style={{ top }}
          >
            {lineLenses.map((lens) => (
              <button
                key={lens.id}
                className="hover:text-primary hover:underline transition-colors"
                onClick={lens.onClick}
                title={lens.tooltip}
              >
                {lens.label}
              </button>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// Common lens generators
export function generateReferenceLenses(
  symbols: { name: string; line: number; references: number }[],
  onShowReferences: (name: string, line: number) => void
): CodeLens[] {
  return symbols.map(symbol => ({
    id: `ref-${symbol.name}-${symbol.line}`,
    line: symbol.line,
    label: `${symbol.references} reference${symbol.references !== 1 ? 's' : ''}`,
    tooltip: `Show all references to ${symbol.name}`,
    onClick: () => onShowReferences(symbol.name, symbol.line),
  }));
}

export function generateTestLenses(
  testFunctions: { name: string; line: number }[],
  onRunTest: (name: string) => void,
  onDebugTest: (name: string) => void
): CodeLens[] {
  return testFunctions.flatMap(test => [
    {
      id: `run-${test.name}`,
      line: test.line,
      label: '▶ Run Test',
      tooltip: `Run ${test.name}`,
      onClick: () => onRunTest(test.name),
    },
    {
      id: `debug-${test.name}`,
      line: test.line,
      label: '🐛 Debug',
      tooltip: `Debug ${test.name}`,
      onClick: () => onDebugTest(test.name),
    },
  ]);
}

export default CodeLensWidget;
