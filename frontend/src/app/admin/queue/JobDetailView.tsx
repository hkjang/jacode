'use client';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Clock,
  Activity,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  Code,
  AlertTriangle,
  Play,
} from 'lucide-react';
import { format } from 'date-fns';

interface JobDetailViewProps {
  job: any;
  isOpen: boolean;
  onClose: () => void;
  onRetry?: (id: string) => void;
  onRemove?: (id: string) => void;
}

export function JobDetailView({ job, isOpen, onClose, onRetry, onRemove }: JobDetailViewProps) {
  if (!job) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'failed':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'active':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'waiting':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return CheckCircle;
      case 'failed':
        return XCircle;
      case 'active':
        return Activity;
      case 'waiting':
        return Clock;
      default:
        return AlertCircle;
    }
  };

  const StatusIcon = getStatusIcon(job.status);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[500px] sm:w-[600px] sm:max-w-none">
        <SheetHeader className="mb-6">
          <SheetTitle className="flex items-center gap-3">
            <Badge variant="outline" className={getStatusColor(job.status)}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {job.status.toUpperCase()}
            </Badge>
            <span className="font-mono text-sm text-muted-foreground">{job.id}</span>
          </SheetTitle>
          <SheetDescription>
            Detailed information about this queue job
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-150px)] pr-4">
          <div className="space-y-6">
            {/* Timeline */}
            <section className="space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Timeline
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm border rounded-lg p-4 bg-muted/30">
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Created At</p>
                  <p className="font-medium">
                    {job.timestamp ? format(job.timestamp, 'PPpp') : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Finished At</p>
                  <p className="font-medium">
                    {job.finishedOn ? format(job.finishedOn, 'PPpp') : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Processed On</p>
                  <p className="font-medium">
                    {job.processedOn ? format(job.processedOn, 'PPpp') : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Attempts</p>
                  <p className="font-medium">{job.attempts || 0}</p>
                </div>
              </div>
            </section>

            {/* Error Info */}
            {job.failedReason && (
              <section className="space-y-3">
                <h3 className="text-sm font-medium flex items-center gap-2 text-destructive">
                  <AlertTriangle className="w-4 h-4" />
                  Failure Reason
                </h3>
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-sm font-mono text-destructive break-all">
                  {job.failedReason}
                </div>
              </section>
            )}

            {/* Data Payload */}
            <section className="space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Code className="w-4 h-4" />
                Job Data
              </h3>
              <div className="rounded-lg border bg-muted/50 p-4 font-mono text-xs overflow-auto max-h-[300px]">
                <pre>{JSON.stringify(job.data, null, 2)}</pre>
              </div>
            </section>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              {job.status === 'failed' && onRetry && (
                <Button onClick={() => onRetry(job.id)} variant="outline">
                   <Play className="w-4 h-4 mr-2" />
                  Retry Job
                </Button>
              )}
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
