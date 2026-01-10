'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, X, Sparkles, Code, FileCode, Loader2, Wand2, History, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { aiApi, api } from '@/lib/api';
import ReactMarkdown from 'react-markdown';
import { AICodeBlock, DiffPreviewModal } from './AICodeBlock';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatSession {
  id: string;
  title: string;
  lastMessage?: string;
  updatedAt: string;
  messageCount?: number;
}

interface AIChatProps {
  projectId: string;
  currentFile?: {
    id: string;
    path: string;
    content: string;
    language?: string;
  } | null;
  onClose: () => void;
  onApplyCode?: (code: string, mode: 'replace' | 'append' | 'insert') => void;
}

// Chat API helper
const chatApi = {
  async getSessions(projectId?: string): Promise<ChatSession[]> {
    const params = projectId ? { projectId } : {};
    try {
      const { data } = await api.get('/api/chat/sessions', { params });
      return data.map((s: any) => ({
        id: s.id,
        title: s.title,
        lastMessage: s.lastMessage,
        updatedAt: s.updatedAt,
        messageCount: s._count?.messages || 0,
      }));
    } catch (error) {
      console.error('Failed to get sessions:', error);
      return [];
    }
  },
  
  async createSession(projectId?: string, title?: string): Promise<string> {
    const { data } = await api.post('/api/chat/sessions', { projectId, title });
    return data.id;
  },
  
  async getSession(sessionId: string): Promise<{ messages: Message[] }> {
    try {
      const { data } = await api.get(`/api/chat/sessions/${sessionId}`);
      return {
        messages: (data.messages || []).map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: new Date(m.createdAt),
        })),
      };
    } catch (error) {
      console.error('Failed to get session:', error);
      return { messages: [] };
    }
  },
  
  async addMessage(sessionId: string, role: string, content: string): Promise<void> {
    await api.post(`/api/chat/sessions/${sessionId}/messages`, { role, content });
  },
  
  async deleteSession(sessionId: string): Promise<void> {
    await api.delete(`/api/chat/sessions/${sessionId}`);
  },
};

export function AIChat({ projectId, currentFile, onClose, onApplyCode }: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [pendingCode, setPendingCode] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load active session from localStorage on mount
  useEffect(() => {
    const savedSessionId = localStorage.getItem(`chat-session-${projectId}`);
    if (savedSessionId && savedSessionId !== 'undefined' && savedSessionId !== 'null') {
      loadSession(savedSessionId);
    }
    loadSessions();
  }, [projectId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadSessions = async () => {
    const data = await chatApi.getSessions(projectId);
    setSessions(data);
  };

  const loadSession = async (sessionId: string) => {
    const data = await chatApi.getSession(sessionId);
    setMessages(data.messages);
    setCurrentSessionId(sessionId);
    localStorage.setItem(`chat-session-${projectId}`, sessionId);
    setShowHistory(false);
  };

  const createNewSession = async () => {
    const sessionId = await chatApi.createSession(projectId, '새 대화');
    setCurrentSessionId(sessionId);
    setMessages([]);
    localStorage.setItem(`chat-session-${projectId}`, sessionId);
    loadSessions();
    setShowHistory(false);
  };

  const deleteSession = async (sessionId: string) => {
    await chatApi.deleteSession(sessionId);
    if (currentSessionId === sessionId) {
      setCurrentSessionId(null);
      setMessages([]);
      localStorage.removeItem(`chat-session-${projectId}`);
    }
    loadSessions();
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    // Create session if needed
    let sessionId = currentSessionId;
    if (!sessionId || sessionId === 'undefined' || sessionId === 'null') {
      sessionId = await chatApi.createSession(projectId, input.substring(0, 50));
      setCurrentSessionId(sessionId);
      localStorage.setItem(`chat-session-${projectId}`, sessionId);
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    // Save user message to backend
    await chatApi.addMessage(sessionId, 'user', input);

    try {
      const context = currentFile
        ? `Current file: ${currentFile.path}\n\`\`\`${currentFile.language || ''}\n${currentFile.content}\n\`\`\``
        : '';

      const response = await aiApi.chat(
        [
          ...(context ? [{ role: 'system', content: `You are a helpful coding assistant. When providing code, always use markdown code blocks with the language specified. ${context}` }] : []),
          ...messages.map((m) => ({ role: m.role, content: m.content })),
          { role: 'user', content: input },
        ],
        { temperature: 0.7 }
      );

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      
      // Save assistant message to backend
      await chatApi.addMessage(sessionId, 'assistant', response.content);
      loadSessions(); // Refresh session list
    } catch (error) {
      console.error('Failed to get AI response:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please make sure Ollama is running.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyCode = (code: string) => {
    if (currentFile) {
      setPendingCode(code);
      setShowDiff(true);
    } else {
      onApplyCode?.(code, 'replace');
    }
  };

  const handleAcceptCode = () => {
    onApplyCode?.(pendingCode, 'replace');
    setShowDiff(false);
    setPendingCode('');
  };

  const handleRejectCode = () => {
    setShowDiff(false);
    setPendingCode('');
  };

  const handleGenerateCode = async () => {
    if (!currentFile) return;
    setInput(`이 파일을 개선해주세요: ${currentFile.path}\n\n개선할 부분:\n1. 코드 품질 향상\n2. 성능 최적화\n3. 가독성 개선`);
  };

  const handleRefactorCode = async () => {
    if (!currentFile) return;
    setInput(`이 코드를 리팩토링해주세요. 더 깔끔하고 유지보수하기 쉬운 코드로 변환: ${currentFile.path}`);
  };

  const handleFixBugs = async () => {
    if (!currentFile) return;
    setInput(`이 코드의 잠재적 버그와 문제점을 찾아서 수정해주세요: ${currentFile.path}`);
  };

  const handleExplainCode = async () => {
    if (!currentFile) return;
    setInput(`이 코드를 상세히 설명해주세요: ${currentFile.path}`);
  };

  const renderMarkdown = (content: string) => {
    return (
      <ReactMarkdown
        className="prose prose-sm dark:prose-invert max-w-none"
        components={{
          code: ({ node, className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            const codeContent = String(children).replace(/\n$/, '');
            
            if (!className) {
              return (
                <code className="bg-background/50 px-1 rounded text-primary" {...props}>
                  {children}
                </code>
              );
            }
            
            return (
              <AICodeBlock
                code={codeContent}
                language={language}
                currentCode={currentFile?.content}
                onApply={onApplyCode ? handleApplyCode : undefined}
                onPreview={currentFile ? () => {
                  setPendingCode(codeContent);
                  setShowDiff(true);
                } : undefined}
              />
            );
          },
          p: ({ children }) => <p className="mb-2 leading-relaxed">{children}</p>,
          ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
        }}
      >
        {content}
      </ReactMarkdown>
    );
  };

  return (
    <div className="h-full flex flex-col bg-card border-l">
      <DiffPreviewModal
        isOpen={showDiff}
        onClose={() => setShowDiff(false)}
        originalCode={currentFile?.content || ''}
        newCode={pendingCode}
        fileName={currentFile?.path}
        onAccept={handleAcceptCode}
        onReject={handleRejectCode}
      />

      {/* Header */}
      <div className="p-3 border-b flex items-center justify-between bg-gradient-to-r from-purple-500/10 to-blue-500/10">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-500" />
          <span className="font-medium text-sm">AI Coding Assistant</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setShowHistory(!showHistory)}
            title="채팅 이력"
          >
            <History className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={createNewSession}
            title="새 대화"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* History Panel */}
      {showHistory && (
        <div className="border-b max-h-48 overflow-auto">
          <div className="p-2 text-xs font-medium text-muted-foreground">이전 대화</div>
          {sessions.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center">대화 이력이 없습니다</div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className={`p-2 hover:bg-muted cursor-pointer flex items-center justify-between group ${
                  session.id === currentSessionId ? 'bg-muted' : ''
                }`}
                onClick={() => loadSession(session.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{session.title}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {session.lastMessage || '메시지 없음'}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSession(session.id);
                  }}
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Quick Actions */}
      {currentFile && !showHistory && (
        <div className="p-2 border-b flex gap-1.5 flex-wrap">
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleGenerateCode}>
            <Wand2 className="h-3 w-3 mr-1" />개선
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleRefactorCode}>
            <Code className="h-3 w-3 mr-1" />리팩토링
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleFixBugs}>
            🐛 버그 수정
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleExplainCode}>
            <FileCode className="h-3 w-3 mr-1" />설명
          </Button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-8">
            <Sparkles className="h-12 w-12 mx-auto mb-4 text-purple-500/50" />
            <p className="font-medium">AI Vibe Coding</p>
            <p className="text-xs mt-2 max-w-[200px] mx-auto">
              코드를 생성하고, 바로 에디터에 적용하세요!
            </p>
            {currentFile && (
              <div className="mt-4 p-2 bg-muted rounded text-xs">📄 {currentFile.path}</div>
            )}
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[90%] rounded-lg px-3 py-2 text-sm ${
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              }`}
            >
              {message.role === 'assistant' ? renderMarkdown(message.content) : message.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg px-4 py-3 text-sm flex items-center gap-2">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
              <span className="text-muted-foreground">코드 생성 중...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="코드 생성 요청을 입력하세요..."
            className="flex-1 h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            disabled={loading}
          />
          <Button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
