import { useState, useEffect } from 'react';
import { 
  X, 
  FileText, 
  Play, 
  Terminal, 
  CheckCircle, 
  AlertCircle,
  Clock,
  User,
  Folder,
  Code
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TaskExecutionVisualizer } from './TaskExecutionVisualizer';
import { useSocket } from '@/providers/SocketProvider';

interface TaskData {
  id: string;
  type: string;
  status: string;
  prompt: string;
  createdAt: string;
  user: { name: string; email: string };
  project: { name: string };
  context?: any;
  artifacts?: any[];
  error?: string;
  progress?: number;
  currentStep?: string;
}

interface TaskDetailProps {
  task: TaskData;
  onClose: () => void;
  onAction: (action: string, data?: any) => Promise<void>;
}

export function TaskDetail({ task: initialTask, onClose, onAction }: TaskDetailProps) {
  const [task, setTask] = useState<TaskData>(initialTask);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedArtifact, setSelectedArtifact] = useState<any | null>(null);
  const { socket } = useSocket();

  useEffect(() => {
    setTask(initialTask);
  }, [initialTask]);

  useEffect(() => {
    if (!socket) return;

    function onTaskUpdate(updatedTask: any) {
      if (updatedTask.id === task.id) {
        setTask((prev) => ({ ...prev, ...updatedTask }));
      }
    }

    function onTaskProgress(payload: { taskId: string, progress: number, currentStep?: string }) {
      if (payload.taskId === task.id) {
        setTask((prev) => ({ 
          ...prev, 
          progress: payload.progress,
          currentStep: payload.currentStep
        }));
      }
    }

    socket.on('task:updated', onTaskUpdate);
    socket.on('task:progress', onTaskProgress);
    socket.on('task:completed', onTaskUpdate);
    socket.on('task:failed', onTaskUpdate);

    return () => {
      socket.off('task:updated', onTaskUpdate);
      socket.off('task:progress', onTaskProgress);
      socket.off('task:completed', onTaskUpdate);
      socket.off('task:failed', onTaskUpdate);
    };
  }, [socket, task.id]);

  return (
    <div className="fixed inset-y-0 right-0 w-[600px] bg-background border-l shadow-2xl z-50 flex flex-col transition-all duration-300">
      {/* Header */}
      <div className="p-6 border-b flex items-start justify-between bg-muted/10">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{task.type}</Badge>
            <StatusBadge status={task.status} />
          </div>
          <h2 className="text-xl font-semibold mt-2">Agent Task Details</h2>
          <p className="text-sm text-muted-foreground font-mono">{task.id}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <div className="px-6 border-b">
            <TabsList className="w-full justify-start rounded-none h-12 bg-transparent p-0">
              <TabsTrigger value="overview" className="h-12 border-b-2 border-transparent data-[state=active]:border-primary rounded-none">
                Overview
              </TabsTrigger>
              <TabsTrigger value="execution" className="h-12 border-b-2 border-transparent data-[state=active]:border-primary rounded-none">
                Execution
              </TabsTrigger>
              <TabsTrigger value="artifacts" className="h-12 border-b-2 border-transparent data-[state=active]:border-primary rounded-none">
                Artifacts ({task.artifacts?.length || 0})
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Overview Tab */}
            <TabsContent value="overview" className="p-6 space-y-8 m-0">
              <div className="space-y-4">
                <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Prompt</h3>
                <div className="p-4 rounded-lg bg-muted/50 text-sm whitespace-pre-wrap">
                  {task.prompt}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Context</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg border">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">User</p>
                      <p className="text-sm font-medium">{task.user?.name || 'Unknown'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg border">
                    <Folder className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Project</p>
                      <p className="text-sm font-medium">{task.project?.name || 'Unknown'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg border">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Created</p>
                      <p className="text-sm font-medium">{new Date(task.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>

              {task.error && (
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600">
                  <div className="flex items-center gap-2 font-medium mb-1">
                    <AlertCircle className="h-4 w-4" />
                    Error Occurred
                  </div>
                  <p className="text-sm opacity-90">{task.error}</p>
                </div>
              )}
            </TabsContent>

            {/* Execution Tab */}
            <TabsContent value="execution" className="p-6 m-0">
              <TaskExecutionVisualizer 
                status={task.status} 
                currentStep={task.currentStep}
                progress={task.progress}
              />
              
              <div className="mt-8 p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                <h4 className="flex items-center gap-2 font-medium text-blue-700 text-sm mb-2">
                  <Terminal className="h-4 w-4" />
                  How to verify
                </h4>
                <p className="text-sm text-blue-600/80">
                  Tasks are executed by the Agent Worker. You can inspect the detailed logs in your terminal where the worker is running.
                </p>
              </div>
            </TabsContent>

            {/* Artifacts Tab */}
            <TabsContent value="artifacts" className="p-6 m-0">
              {(!task.artifacts || task.artifacts.length === 0) ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>No artifacts generated yet</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {selectedArtifact ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedArtifact(null)} className="-ml-2">
                          ← Back to list
                        </Button>
                        <Badge variant="outline">{selectedArtifact.type}</Badge>
                      </div>
                      <div className="border rounded-lg overflow-hidden">
                        <div className="bg-muted px-4 py-2 border-b flex items-center justify-between">
                          <span className="font-mono text-sm">{selectedArtifact.title}</span>
                          <span className="text-xs text-muted-foreground">{selectedArtifact.metadata?.filePath}</span>
                        </div>
                        <ScrollArea className="h-[400px] w-full bg-slate-950 text-slate-50 p-4 font-mono text-xs">
                          <pre>{selectedArtifact.content || 'No content preview available'}</pre>
                        </ScrollArea>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {task.artifacts.map((artifact: any) => (
                        <div 
                          key={artifact.id} 
                          className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer group"
                          onClick={() => {
                            if (artifact.type === 'CODE' || artifact.type === 'DIFF') {
                              setSelectedArtifact(artifact);
                            }
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                              {artifact.type === 'CODE' ? <Code className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                            </div>
                            <div>
                              <p className="font-medium text-sm group-hover:text-primary transition-colors">{artifact.title}</p>
                              <div className="flex items-center gap-2">
                                <p className="text-xs text-muted-foreground">{artifact.type}</p>
                                {(artifact.type === 'CODE' || artifact.type === 'DIFF') && (
                                  <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">Click to preview</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <Badge variant={artifact.status === 'APPROVED' ? 'default' : 'secondary'}>
                            {artifact.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t bg-muted/10 flex gap-2 justify-end">
        {task.status === 'WAITING_APPROVAL' && (
          <>
            <Button variant="destructive" onClick={() => onAction('reject', task.id)}>Reject</Button>
            <Button onClick={() => onAction('approve', task.id)}>Approve</Button>
          </>
        )}
        {(task.status === 'FAILED' || task.status === 'CANCELLED') && (
          <Button variant="outline" onClick={() => onAction('retry', task.id)}>Retry</Button>
        )}
        {['PENDING', 'PLANNING', 'EXECUTING'].includes(task.status) && (
          <Button variant="destructive" onClick={() => onAction('cancel', task.id)}>Cancel Task</Button>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    COMPLETED: 'bg-green-500/10 text-green-600 border-green-500/20',
    EXECUTING: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    PENDING: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    FAILED: 'bg-red-500/10 text-red-600 border-red-500/20',
    CANCELLED: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
    PLANNING: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
    WAITING_APPROVAL: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  };
  return (
    <Badge variant="outline" className={`border ${colors[status] || ''}`}>
      {status.replace('_', ' ')}
    </Badge>
  );
}
