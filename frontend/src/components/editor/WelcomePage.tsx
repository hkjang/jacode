'use client';

import React from 'react';
import { File, Folder, Clock, Sparkles, Plus, GitBranch, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface RecentProject {
  id: string;
  name: string;
  path: string;
  lastOpened: Date;
}

interface WelcomePageProps {
  recentProjects?: RecentProject[];
  onOpenProject?: (id: string) => void;
  onNewProject?: () => void;
  onOpenFolder?: () => void;
  onCloneRepo?: () => void;
  onOpenAI?: () => void;
  className?: string;
}

export function WelcomePage({
  recentProjects = [],
  onOpenProject,
  onNewProject,
  onOpenFolder,
  onCloneRepo,
  onOpenAI,
  className,
}: WelcomePageProps) {
  return (
    <div className={cn(
      'flex-1 flex items-center justify-center p-8 bg-gradient-to-br from-background to-muted/30',
      className
    )}>
      <div className="max-w-3xl w-full space-y-8">
        {/* Logo & Welcome */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-lg">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold">JACode</h1>
          <p className="text-muted-foreground">AI-Powered Code Editor</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Start */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Start</h2>
            <div className="space-y-2">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-10"
                onClick={onNewProject}
              >
                <Plus className="h-4 w-4 text-green-500" />
                New Project
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-10"
                onClick={onOpenFolder}
              >
                <Folder className="h-4 w-4 text-yellow-500" />
                Open Folder
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-10"
                onClick={onCloneRepo}
              >
                <GitBranch className="h-4 w-4 text-orange-500" />
                Clone Repository
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-10"
                onClick={onOpenAI}
              >
                <Sparkles className="h-4 w-4 text-purple-500" />
                Start with AI
              </Button>
            </div>
          </div>

          {/* Recent */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Recent</h2>
            {recentProjects.length > 0 ? (
              <div className="space-y-1">
                {recentProjects.slice(0, 5).map((project) => (
                  <Button
                    key={project.id}
                    variant="ghost"
                    className="w-full justify-start gap-3 h-auto py-2"
                    onClick={() => onOpenProject?.(project.id)}
                  >
                    <Folder className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 text-left min-w-0">
                      <div className="font-medium truncate">{project.name}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{project.path}</div>
                    </div>
                    <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  </Button>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground py-4 text-center border rounded-lg border-dashed">
                No recent projects
              </div>
            )}
          </div>
        </div>

        {/* Keyboard Shortcuts */}
        <div className="pt-4 border-t">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Keyboard Shortcuts
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="flex items-center gap-2">
              <kbd className="px-1.5 py-0.5 bg-muted rounded font-mono">Ctrl+P</kbd>
              <span className="text-muted-foreground">Quick Open</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-1.5 py-0.5 bg-muted rounded font-mono">Ctrl+Shift+P</kbd>
              <span className="text-muted-foreground">Commands</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-1.5 py-0.5 bg-muted rounded font-mono">Ctrl+Shift+F</kbd>
              <span className="text-muted-foreground">Find in Files</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-1.5 py-0.5 bg-muted rounded font-mono">Ctrl+Shift+A</kbd>
              <span className="text-muted-foreground">AI Chat</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WelcomePage;
