import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { FileCode, Sparkles, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SuggestedFile {
  id: string;
  path: string;
  content: string;
  score: number;
}

interface ContextSuggestionPanelProps {
  suggestions: SuggestedFile[];
  onConfirm: (selectedFiles: SuggestedFile[]) => void;
  onCancel: () => void;
  className?: string;
}

export function ContextSuggestionPanel({
  suggestions,
  onConfirm,
  onCancel,
  className
}: ContextSuggestionPanelProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(suggestions.map(s => s.id))
  );

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleConfirm = () => {
    const selected = suggestions.filter(s => selectedIds.has(s.id));
    onConfirm(selected);
  };

  // Helper to determine score color
  const getScoreColor = (score: number) => {
    if (score >= 20) return 'bg-green-500';
    if (score >= 10) return 'bg-yellow-500';
    return 'bg-gray-400';
  };

  return (
    <Card className={cn("flex flex-col shadow-xl border-primary/20 overflow-hidden animate-in slide-in-from-bottom-2 duration-200", className)}>
      <div className="p-3 border-b bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-600 animate-pulse" />
          <span className="font-semibold text-sm">AI Context Suggestions</span>
          <span className="text-xs text-muted-foreground bg-background border px-1.5 py-0.5 rounded-full">
            {suggestions.length} found
          </span>
        </div>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onCancel}>
          <X className="h-3 w-3" />
        </Button>
      </div>

      <div className="p-2 max-h-[240px] overflow-y-auto space-y-1">
        {suggestions.map((file) => (
          <div
            key={file.id}
            className={cn(
              "flex items-center gap-3 p-2 rounded-lg border transition-all cursor-pointer hover:bg-muted/50",
              selectedIds.has(file.id) ? "bg-primary/5 border-primary/30" : "bg-card border-transparent"
            )}
            onClick={() => toggleSelection(file.id)}
          >
            <Checkbox
              checked={selectedIds.has(file.id)}
              onCheckedChange={() => toggleSelection(file.id)}
              className="mt-0.5"
            />
            
            <div className="flex-1 min-w-0">
               <div className="flex items-center justify-between">
                 <div className="flex items-center gap-1.5 min-w-0">
                   <FileCode className="h-3 w-3 text-muted-foreground shrink-0" />
                   <span className="text-xs font-medium truncate" title={file.path}>
                     {file.path.split('/').pop()}
                   </span>
                 </div>
                 {/* Score Indicator */}
                 <div className="flex items-center gap-1.5 group relative">
                    <div className="flex gap-0.5 h-1.5 items-end">
                       <div className={cn("w-1 rounded-sm", getScoreColor(file.score))} style={{ height: '40%' }}></div>
                       <div className={cn("w-1 rounded-sm", getScoreColor(file.score))} style={{ height: file.score > 10 ? '70%' : '20%' }}></div>
                       <div className={cn("w-1 rounded-sm", getScoreColor(file.score))} style={{ height: file.score > 20 ? '100%' : '20%' }}></div>
                    </div>
                 </div>
               </div>
               <div className="text-[10px] text-muted-foreground truncate pl-4.5 mt-0.5 opacity-70">
                 {file.path}
               </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-2 border-t bg-muted/10 flex justify-end gap-2">
         <Button variant="ghost" size="sm" onClick={onCancel} className="text-xs h-8">
            Skip
         </Button>
         <Button 
           size="sm" 
           onClick={handleConfirm} 
           className="text-xs h-8 bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0"
           disabled={selectedIds.size === 0}
         >
            <Check className="h-3 w-3 mr-1.5" />
            Add {selectedIds.size} Files
         </Button>
      </div>
    </Card>
  );
}
