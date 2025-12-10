'use client';

import { useState, useEffect } from 'react';
import {
  Eye,
  FileCode,
  FileText,
  Code,
  TestTube,
  ScrollText,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DiffViewer } from '@/components/editor/DiffViewer';
import { ArtifactFeedback } from './ArtifactFeedback';
import { artifactApi } from '@/lib/api';

interface Artifact {
  id: string;
  type: 'PLAN' | 'CODE' | 'DIFF' | 'TEST_RESULT' | 'LOG' | 'REVIEW';
  title: string;
  content: string;
  status: 'DRAFT' | 'APPROVED' | 'REJECTED' | 'APPLIED';
  metadata?: Record<string, any>;
  createdAt: string;
}

interface ArtifactViewerProps {
  artifact: Artifact;
  onApply?: () => void;
  onReject?: () => void;
  showFeedback?: boolean;
}

const TYPE_ICONS: Record<string, any> = {
  PLAN: FileText,
  CODE: FileCode,
  DIFF: Code,
  TEST_RESULT: TestTube,
  LOG: ScrollText,
  REVIEW: Eye,
};

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  DRAFT: { bg: 'bg-muted', text: 'text-muted-foreground' },
  APPROVED: { bg: 'bg-success/10', text: 'text-success' },
  REJECTED: { bg: 'bg-destructive/10', text: 'text-destructive' },
  APPLIED: { bg: 'bg-primary/10', text: 'text-primary' },
};

export function ArtifactViewer({
  artifact,
  onApply,
  onReject,
  showFeedback = true,
}: ArtifactViewerProps) {
  const [expanded, setExpanded] = useState(true);
  const [applying, setApplying] = useState(false);

  const Icon = TYPE_ICONS[artifact.type] || FileCode;
  const statusStyle = STATUS_STYLES[artifact.status] || STATUS_STYLES.DRAFT;

  const handleApply = async () => {
    if (!onApply) return;
    setApplying(true);
    try {
      await artifactApi.apply(artifact.id);
      onApply();
    } catch (error) {
      console.error('Failed to apply artifact:', error);
    } finally {
      setApplying(false);
    }
  };

  const renderContent = () => {
    switch (artifact.type) {
      case 'DIFF':
        const diffData = artifact.metadata?.diff;
        if (diffData) {
          return (
            <DiffViewer
              title={artifact.title}
              filePath={diffData.path || 'unknown'}
              oldContent={diffData.oldContent || ''}
              newContent={diffData.newContent || artifact.content}
              readOnly={artifact.status !== 'DRAFT'}
            />
          );
        }
        return <pre className="text-sm font-mono whitespace-pre-wrap">{artifact.content}</pre>;

      case 'CODE':
        return (
          <div className="bg-muted/50 rounded p-4 overflow-x-auto">
            <pre className="text-sm font-mono whitespace-pre">{artifact.content}</pre>
          </div>
        );

      case 'PLAN':
        return (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <pre className="whitespace-pre-wrap text-sm">{artifact.content}</pre>
          </div>
        );

      default:
        return (
          <div className="text-sm whitespace-pre-wrap">{artifact.content}</div>
        );
    }
  };

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      {/* Header */}
      <div className="p-3 border-b bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-0.5 hover:bg-accent rounded"
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">{artifact.title}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${statusStyle.bg} ${statusStyle.text}`}>
            {artifact.status}
          </span>
        </div>

        {artifact.status === 'DRAFT' && (onApply || onReject) && (
          <div className="flex items-center gap-2">
            {onApply && (
              <Button
                size="sm"
                variant="success"
                onClick={handleApply}
                disabled={applying}
              >
                {applying ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Check className="h-3 w-3 mr-1" />
                )}
                Apply
              </Button>
            )}
            {onReject && (
              <Button size="sm" variant="outline" onClick={onReject}>
                <X className="h-3 w-3 mr-1" />
                Reject
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      {expanded && (
        <div className="p-4 space-y-4">
          {renderContent()}
          
          {showFeedback && artifact.status !== 'DRAFT' && (
            <ArtifactFeedback artifactId={artifact.id} />
          )}
        </div>
      )}
    </div>
  );
}

interface ArtifactListProps {
  taskId: string;
}

export function ArtifactList({ taskId }: ArtifactListProps) {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadArtifacts();
  }, [taskId]);

  const loadArtifacts = async () => {
    try {
      const data = await artifactApi.getByTask(taskId);
      setArtifacts(data);
    } catch (error) {
      console.error('Failed to load artifacts:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (artifacts.length === 0) {
    return (
      <div className="text-center text-muted-foreground text-sm py-8">
        No artifacts yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {artifacts.map((artifact) => (
        <ArtifactViewer
          key={artifact.id}
          artifact={artifact}
          onApply={loadArtifacts}
          onReject={loadArtifacts}
        />
      ))}
    </div>
  );
}
