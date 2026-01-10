'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  MessageSquare,
  Loader2,
  Trash2,
  ArrowLeft,
  User,
  Folder,
  Calendar,
  Code
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { adminChatApi } from '@/lib/api';
import ReactMarkdown from 'react-markdown';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  modelName?: string;
  responseTimeMs?: number;
  codeApplied: boolean;
  createdAt: string;
}

interface ChatSessionDetail {
  id: string;
  title: string;
  user: { name: string; email: string };
  project?: { name: string };
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export default function ChatDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [session, setSession] = useState<ChatSessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (params.id) {
      loadSession(params.id as string);
    }
  }, [params.id]);

  const loadSession = async (id: string) => {
    try {
      setLoading(true);
      const data = await adminChatApi.getSession(id);
      setSession(data);
    } catch (error) {
      console.error('Failed to load session:', error);
      alert('세션을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!session || !confirm('이 세션을 삭제하시겠습니까?')) return;
    setDeleting(true);
    try {
      await adminChatApi.deleteSession(session.id);
      router.push('/admin/chat');
    } catch (error) {
      console.error('Failed to delete session:', error);
      alert('삭제 실패');
      setDeleting(false);
    }
  };

  const renderMarkdown = (content: string) => {
    return (
      <ReactMarkdown
        className="prose prose-sm dark:prose-invert max-w-none"
        components={{
          code: ({ node, className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '');
            return !className ? (
              <code className="bg-muted px-1 rounded" {...props}>
                {children}
              </code>
            ) : (
              <div className="bg-muted p-2 rounded-md my-2 overflow-x-auto text-xs">
                {String(children).replace(/\n$/, '')}
              </div>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-muted-foreground">세션을 찾을 수 없습니다.</p>
        <Button onClick={() => router.push('/admin/chat')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          목록으로 돌아가기
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/admin/chat')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            목록
          </Button>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" />
            {session.title}
          </h2>
        </div>
        <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
          {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
          세션 삭제
        </Button>
      </div>

      {/* Info Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/30 p-4 rounded-lg border">
        <div className="flex items-center gap-3">
          <User className="h-5 w-5 text-muted-foreground" />
          <div>
            <div className="text-sm font-medium">사용자</div>
            <div className="text-sm text-muted-foreground">
              {session.user.name} ({session.user.email})
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Folder className="h-5 w-5 text-muted-foreground" />
          <div>
            <div className="text-sm font-medium">프로젝트</div>
            <div className="text-sm text-muted-foreground">
              {session.project?.name || 'Unknown'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <div>
            <div className="text-sm font-medium">생성일</div>
            <div className="text-sm text-muted-foreground">
              {new Date(session.createdAt).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Chat Transcript */}
      <div className="space-y-6 p-4 border rounded-lg min-h-[500px] bg-card">
        {session.messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-10">메시지가 없습니다.</div>
        ) : (
          session.messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div
                  className={`rounded-lg px-4 py-3 text-sm ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted border'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1 opacity-70 text-xs">
                    <span className="font-semibold uppercase">{msg.role}</span>
                    <span>{new Date(msg.createdAt).toLocaleTimeString()}</span>
                    {msg.modelName && <span>• {msg.modelName}</span>}
                    {msg.responseTimeMs > 0 && <span>• {msg.responseTimeMs}ms</span>}
                  </div>
                  {msg.role === 'assistant' ? renderMarkdown(msg.content) : msg.content}
                </div>
                
                {msg.codeApplied && (
                  <div className="flex items-center gap-1 text-xs text-green-600 font-medium mt-1">
                    <Code className="h-3 w-3" />
                    코드 적용됨
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
