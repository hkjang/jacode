import { useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useActiveModels } from '@/hooks/useActiveModels';

interface ModelSelectorProps {
  value?: string;
  onValueChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function ModelSelector({
  value,
  onValueChange,
  className,
  placeholder = "Select Model",
  disabled = false
}: ModelSelectorProps) {
  const { models, loading } = useActiveModels();

  // Auto-select default model if no value provided
  useEffect(() => {
    if (!value && models.length > 0) {
      const defaultModel = models.find(m => m.isDefault);
      if (defaultModel) {
        onValueChange(defaultModel.model);
      } else {
        onValueChange(models[0].model);
      }
    }
  }, [models, value, onValueChange]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm h-10 px-3 border rounded-md">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading models...</span>
      </div>
    );
  }

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled || loading}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {(models || []).map((model) => (
          <SelectItem key={model.id} value={model.model}>
            <div className="flex items-center justify-between w-full min-w-[200px]">
              <span>{model.name}</span>
              <span className="text-xs text-muted-foreground ml-2 capitalize">
                {model.provider}
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
