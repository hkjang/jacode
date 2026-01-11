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
  Code,
  Cpu,
  Clock,
  Zap,
  Terminal,
  Database,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { adminChatApi } from '@/lib/api';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  modelName?: string;
  modelProvider?: string;
  promptTokens: number;
  completionTokens: number;
  responseTimeMs: number;
  codeApplied: boolean;
  appliedFilePath?: string;
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
  const [showRaw, setShowRaw] = useState(false);

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
        className="prose prose-sm dark:prose-invert max-w-none break-words"
        components={{
          code: ({ node, className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '');
            return !className ? (
              <code className="bg-muted px-1 rounded font-mono text-xs" {...props}>
                {children}
              </code>
            ) : (
              <div className="bg-muted p-2 rounded-md my-2 overflow-x-auto text-xs font-mono border">
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

  // Calculate aggregation stats
  const calculateStats = () => {
    if (!session) return { totalPrompt: 0, totalCompletion: 0, totalLatency: 0, avgLatency: 0 };
    
    const assistantMessages = session.messages.filter(m => m.role === 'assistant');
    const totalPrompt = session.messages.reduce((acc, m) => acc + (m.promptTokens || 0), 0);
    const totalCompletion = session.messages.reduce((acc, m) => acc + (m.completionTokens || 0), 0);
    const totalLatency = session.messages.reduce((acc, m) => acc + (m.responseTimeMs || 0), 0);
    const avgLatency = assistantMessages.length > 0 ? Math.round(totalLatency / assistantMessages.length) : 0;

    return { totalPrompt, totalCompletion, totalLatency, avgLatency };
  };

  const stats = calculateStats();
  const totalTokens = stats.totalPrompt + stats.totalCompletion;

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
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/admin/chat')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            목록
          </Button>
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <MessageSquare className="h-6 w-6 text-primary" />
              {session.title}
            </h2>
            <div className="text-xs text-muted-foreground flex items-center gap-3 mt-1">
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" /> {session.user.name}
              </span>
              <span className="flex items-center gap-1">
                <Folder className="h-3 w-3" /> {session.project?.name || 'Unknown'}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" /> {new Date(session.createdAt).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRaw(!showRaw)}
            className={showRaw ? 'bg-muted' : ''}
          >
            <Terminal className="h-4 w-4 mr-2" />
            Raw Data
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
            삭제
          </Button>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{session.messages.length}</div>
            <p className="text-xs text-muted-foreground">
              User: {session.messages.filter(m => m.role === 'user').length} / AI: {session.messages.filter(m => m.role === 'assistant').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTokens.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Prompt: {stats.totalPrompt.toLocaleString()} / Completion: {stats.totalCompletion.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgLatency.toLocaleString()}ms</div>
            <p className="text-xs text-muted-foreground">
              Total Wait: {(stats.totalLatency / 1000).toFixed(1)}s
            </p>
          </CardContent>
        </Card>
        <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Applied Code</CardTitle>
            <Code className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{session.messages.filter(m => m.codeApplied).length}</div>
            <p className="text-xs text-muted-foreground">
              Blocks applied to files
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chat Transcript */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            Transaction Log
          </h3>
          <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
            <Info className="h-3 w-3" />
            <span>Code application happens when users accept AI changes in the Editor</span>
          </div>
        </div>
        
        <div className="space-y-4">
          {session.messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-10 bg-muted/20 rounded-lg">메시지가 없습니다.</div>
          ) : (
            session.messages.map((msg, index) => (
              <div key={msg.id} className={cn(
                "flex flex-col border rounded-lg overflow-hidden transition-all hover:shadow-md",
                msg.role === 'system' ? "bg-muted/50 border-dashed" : "bg-card"
              )}>
                {/* Message Header */}
                <div className={cn(
                  "flex items-center justify-between px-4 py-2 text-xs font-medium border-b",
                  msg.role === 'user' ? "bg-primary/5 text-primary-foreground/90 bg-blue-50 dark:bg-blue-950/20" : 
                  msg.role === 'assistant' ? "bg-secondary/20" : "bg-muted"
                )}>
                  <div className="flex items-center gap-2">
                    <Badge variant={msg.role === 'user' ? 'default' : msg.role === 'assistant' ? 'secondary' : 'outline'} className="uppercase">
                      {msg.role}
                    </Badge>
                    <span className="text-muted-foreground">{new Date(msg.createdAt).toLocaleTimeString()}</span>
                  </div>
                  
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-3 text-muted-foreground">
                      {msg.modelName && (
                        <div className="flex items-center gap-1" title="Model">
                          <Cpu className="h-3 w-3" />
                          <span>{msg.modelName}</span>
                        </div>
                      )}
                      {(msg.responseTimeMs > 0) && (
                        <div className={cn(
                          "flex items-center gap-1",
                          msg.responseTimeMs > 5000 ? "text-red-500" : msg.responseTimeMs > 2000 ? "text-yellow-500" : "text-green-500"
                        )} title="Latency">
                          <Zap className="h-3 w-3" />
                          <span>{msg.responseTimeMs}ms</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Message Body */}
                <div className="p-4 text-sm relative group">
                  {showRaw ? (
                    <pre className="whitespace-pre-wrap font-mono text-xs text-muted-foreground bg-muted p-4 rounded-md overflow-x-auto">
                      {JSON.stringify(msg, null, 2)}
                    </pre>
                  ) : (
                    <>
                      {msg.role === 'assistant' ? renderMarkdown(msg.content) : (
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      )}
                    </>
                  )}
                </div>

                {/* Message Footer (Metadata) */}
                {(msg.role === 'assistant' || msg.promptTokens > 0) && !showRaw && (
                  <div className="px-4 py-2 bg-muted/10 border-t text-xs text-muted-foreground flex justify-between items-center">
                     <div className="flex gap-4">
                       {msg.promptTokens > 0 && <span>Prompt Tokens: <span className="font-mono text-foreground">{msg.promptTokens}</span></span>}
                       {msg.completionTokens > 0 && <span>Completion: <span className="font-mono text-foreground">{msg.completionTokens}</span></span>}
                       {(msg.promptTokens > 0 || msg.completionTokens > 0) && (
                         <span className="font-medium">Total: <span className="font-mono text-foreground">{msg.promptTokens + msg.completionTokens}</span></span>
                       )}
                     </div>
                     {msg.codeApplied && (
                       <div className="flex items-center gap-2">
                         <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 dark:bg-green-900/20">
                           <Code className="h-3 w-3 mr-1" /> Code Applied
                         </Badge>
                         {msg.appliedFilePath && (
                           <span className="text-xs font-mono text-muted-foreground flex items-center gap-1" title="This file was updated by the AI based on user request in the Editor">
                             <span className="opacity-50">→</span>
                             {msg.appliedFilePath}
                           </span>
                         )}
                       </div>
                     )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
