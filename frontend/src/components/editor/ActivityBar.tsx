'use client';

import React from 'react';
import { 
  FolderOpen, 
  Search, 
  GitBranch, 
  Sparkles, 
  Bug, 
  Settings,
  Puzzle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ActivityItem {
  id: string;
  icon: React.ElementType;
  label: string;
  badge?: number;
  active?: boolean;
}

interface ActivityBarProps {
  activeItem?: string;
  onItemClick: (id: string) => void;
  className?: string;
}

const defaultItems: ActivityItem[] = [
  { id: 'explorer', icon: FolderOpen, label: 'Explorer' },
  { id: 'search', icon: Search, label: 'Search' },
  { id: 'ai', icon: Sparkles, label: 'AI Assistant' },
  { id: 'git', icon: GitBranch, label: 'Source Control' },
  { id: 'debug', icon: Bug, label: 'Debug' },
  { id: 'extensions', icon: Puzzle, label: 'Extensions' },
];

export function ActivityBar({ 
  activeItem = 'explorer', 
  onItemClick,
  className 
}: ActivityBarProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className={cn(
        'flex flex-col w-12 bg-muted/50 border-r items-center py-2 gap-1',
        className
      )}>
        {/* Main Items */}
        <div className="flex flex-col gap-1">
          {defaultItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeItem === item.id;
            
            return (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>
                  <button
                    className={cn(
                      'relative w-10 h-10 flex items-center justify-center rounded transition-colors',
                      isActive 
                        ? 'text-foreground bg-accent border-l-2 border-l-primary' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                    )}
                    onClick={() => onItemClick(item.id)}
                  >
                    <Icon className="h-5 w-5" />
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="absolute top-1 right-1 min-w-4 h-4 flex items-center justify-center text-[10px] font-medium bg-primary text-primary-foreground rounded-full px-1">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{item.label}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
        
        {/* Spacer */}
        <div className="flex-1" />
        
        {/* Bottom Items */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="w-10 h-10 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
              onClick={() => onItemClick('settings')}
            >
              <Settings className="h-5 w-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Settings</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

export default ActivityBar;
