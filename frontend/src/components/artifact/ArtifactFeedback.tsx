'use client';

import { useState } from 'react';
import { ThumbsUp, ThumbsDown, MessageSquare, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { artifactApi } from '@/lib/api';

interface ArtifactFeedbackProps {
  artifactId: string;
  onFeedbackSubmitted?: () => void;
}

export function ArtifactFeedback({ artifactId, onFeedbackSubmitted }: ArtifactFeedbackProps) {
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [showComment, setShowComment] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (rating === null && !comment.trim()) return;

    setSubmitting(true);
    try {
      await artifactApi.addFeedback(artifactId, {
        rating: rating || undefined,
        comment: comment.trim() || undefined,
      });
      setSubmitted(true);
      onFeedbackSubmitted?.();
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="p-3 bg-success/10 text-success text-sm rounded-lg">
        Thank you for your feedback!
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Rate this output</span>
        <div className="flex items-center gap-2">
          <Button
            variant={rating === 1 ? 'success' : 'outline'}
            size="sm"
            onClick={() => setRating(rating === 1 ? null : 1)}
          >
            <ThumbsUp className="h-4 w-4" />
          </Button>
          <Button
            variant={rating === -1 ? 'destructive' : 'outline'}
            size="sm"
            onClick={() => setRating(rating === -1 ? null : -1)}
          >
            <ThumbsDown className="h-4 w-4" />
          </Button>
          <Button
            variant={showComment ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setShowComment(!showComment)}
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {showComment && (
        <div className="space-y-2">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add a comment..."
            className="w-full h-20 px-3 py-2 rounded-md border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      )}

      {(rating !== null || comment.trim()) && (
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setRating(null);
              setComment('');
              setShowComment(false);
            }}
          >
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </div>
      )}
    </div>
  );
}

interface LineCommentProps {
  line: number;
  comment: string;
  type: 'suggestion' | 'issue' | 'praise';
  onDelete?: () => void;
}

export function LineComment({ line, comment, type, onDelete }: LineCommentProps) {
  const typeStyles = {
    suggestion: 'border-l-primary bg-primary/5',
    issue: 'border-l-destructive bg-destructive/5',
    praise: 'border-l-success bg-success/5',
  };

  return (
    <div className={`border-l-4 ${typeStyles[type]} p-2 rounded-r text-sm`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-muted-foreground">Line {line}:</span>
          <p className="mt-1">{comment}</p>
        </div>
        {onDelete && (
          <button onClick={onDelete} className="text-muted-foreground hover:text-foreground">
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}
