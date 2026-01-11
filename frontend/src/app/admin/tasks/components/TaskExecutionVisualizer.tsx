import { CheckCircle2, Circle, Clock, Loader2, XCircle } from 'lucide-react';
import { AgentStatus } from '@jacode/shared';

interface Step {
  id: string;
  label: string;
  status: 'completed' | 'current' | 'pending' | 'failed';
  description?: string;
}

interface TaskExecutionVisualizerProps {
  status: string; // AgentStatus string
  currentStep?: string;
  progress?: number;
}

export function TaskExecutionVisualizer({ status, currentStep, progress }: TaskExecutionVisualizerProps) {
  // Map overall status to steps
  const steps: Step[] = [
    {
      id: 'queue',
      label: 'Queued',
      status: 'completed', // Always starts here
      description: 'Task received and queued',
    },
    {
      id: 'planning',
      label: 'Planning',
      status: getStepStatus(status, 'PLANNING'),
      description: 'Analyzing constraints and creating plan',
    },
    {
      id: 'executing',
      label: 'Executing',
      status: getStepStatus(status, 'EXECUTING'),
      description: currentStep || 'Running task steps...',
    },
    {
      id: 'review',
      label: 'Review',
      status: getStepStatus(status, 'WAITING_APPROVAL'),
      description: 'Waiting for user approval',
    },
    {
      id: 'completed',
      label: 'Completed',
      status: getStepStatus(status, 'COMPLETED'),
      description: 'Changes applied successfully',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="relative">
        {/* Connector Line */}
        <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-muted -z-10" />

        <div className="space-y-6">
          {steps.map((step, index) => (
            <div key={step.id} className="flex gap-4">
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center bg-background">
                <StepIcon status={step.status} />
              </div>
              <div className="flex flex-col justify-center min-h-[40px]">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${
                    step.status === 'completed' ? 'text-primary' :
                    step.status === 'current' ? 'text-foreground' : 'text-muted-foreground'
                  }`}>
                    {step.label}
                  </span>
                  {step.status === 'current' && <span className="text-xs animate-pulse text-primary font-bold">●</span>}
                </div>
                {step.description && (
                  <p className="text-sm text-muted-foreground max-w-md">
                    {step.description}
                  </p>
                )}
                {step.status === 'current' && progress !== undefined && (
                  <div className="mt-2 w-full max-w-xs h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-500 ease-in-out" 
                      style={{ width: `${progress}%` }} 
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function getStepStatus(currentStatus: string, stepStage: string): 'completed' | 'current' | 'pending' | 'failed' {
  const order = ['PENDING', 'PLANNING', 'EXECUTING', 'WAITING_APPROVAL', 'COMPLETED'];
  
  if (currentStatus === 'FAILED' || currentStatus === 'CANCELLED') {
    if (stepStage === currentStatus) return 'failed';
    // If we failed at a later stage, this stage is completed. 
    // Simplified: Find index.
    const currentIndex = order.indexOf(currentStatus); // Won't find FAILED/CANCELLED in simple list
    // Handling fail state is bit tricky without history. 
    // For now, if failed, we show failed state on the specific visualizer if we can map it?
    // Let's stick to simple logic:
    return 'pending'; // dynamic fix below
  }

  const currentIndex = order.indexOf(currentStatus);
  const stepIndex = order.indexOf(stepStage);

  if (currentIndex > stepIndex) return 'completed';
  if (currentIndex === stepIndex) return 'current';
  return 'pending';
}

function StepIcon({ status }: { status: Step['status'] }) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="w-6 h-6 text-green-500" />;
    case 'current':
      return <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />;
    case 'failed':
      return <XCircle className="w-6 h-6 text-red-500" />;
    default:
      return <Circle className="w-6 h-6 text-muted-foreground" />;
  }
}
