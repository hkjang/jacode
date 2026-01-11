'use client';

import React from 'react';
import { ChevronRight, File, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BreadcrumbsProps {
  path: string;
  onNavigate?: (path: string) => void;
  className?: string;
}

export function Breadcrumbs({ path, onNavigate, className }: BreadcrumbsProps) {
  if (!path) return null;

  // Split path into segments
  const segments = path.split('/').filter(Boolean);
  
  // Build cumulative paths
  const breadcrumbs = segments.map((segment, index) => ({
    label: segment,
    path: segments.slice(0, index + 1).join('/'),
    isLast: index === segments.length - 1,
  }));

  return (
    <div className={cn(
      'flex items-center gap-1 px-3 py-1.5 text-xs bg-muted/30 border-b overflow-x-auto',
      className
    )}>
      {/* Home/Root */}
      <button
        className="flex items-center gap-1 px-1 py-0.5 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
        onClick={() => onNavigate?.('')}
        title="Go to root"
      >
        <Home className="h-3 w-3" />
      </button>
      
      {breadcrumbs.map((item, index) => (
        <React.Fragment key={item.path}>
          <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          <button
            className={cn(
              'px-1 py-0.5 rounded transition-colors truncate max-w-[150px]',
              item.isLast 
                ? 'font-medium text-foreground' 
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            )}
            onClick={() => !item.isLast && onNavigate?.(item.path)}
            disabled={item.isLast}
            title={item.path}
          >
            {item.isLast ? (
              <span className="flex items-center gap-1">
                <File className="h-3 w-3 inline" />
                {item.label}
              </span>
            ) : (
              item.label
            )}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
}

export default Breadcrumbs;
