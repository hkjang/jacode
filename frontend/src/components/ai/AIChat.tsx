'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Send, X, Sparkles, Code, FileCode, Loader2, Wand2, History, Plus, Trash2, FilePlus, FileMinus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { aiApi, api } from '@/lib/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AICodeBlock, DiffPreviewModal } from './AICodeBlock';
import { ModelSelector } from './ModelSelector';
import { ContextSuggestionPanel, SuggestedFile } from './ContextSuggestionPanel';

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

interface FileContext {
  id: string;
  path: string;
  content: string;
  language?: string;
  source?: 'manual' | 'auto';
}

interface AIChatProps {
  projectId: string;
  initialFile?: FileContext | null;
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
  
  async addMessage(
    sessionId: string, 
    role: string, 
    content: string,
    metadata?: {
      modelName?: string;
      modelProvider?: string;
      promptTokens?: number;
      completionTokens?: number;
      responseTimeMs?: number;
    }
  ): Promise<void> {
    await api.post(`/api/chat/sessions/${sessionId}/messages`, { 
      role, 
      content,
      ...metadata 
    });
  },
  
  async deleteSession(sessionId: string): Promise<void> {
    await api.delete(`/api/chat/sessions/${sessionId}`);
  },

  async markCodeApplied(messageId: string, filePath: string): Promise<void> {
    await api.patch(`/api/chat/messages/${messageId}/applied`, { filePath });
  },
};

export function AIChat({ projectId, initialFile, onClose, onApplyCode }: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [pendingCode, setPendingCode] = useState('');
  const [pendingMessageId, setPendingMessageId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  
  // Initialize with persisted model if available
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('selected-ai-model') || '';
    }
    return '';
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Suggestion State
  const [suggestions, setSuggestions] = useState<SuggestedFile[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Multi-file context state
  const [contextFiles, setContextFiles] = useState<FileContext[]>([]);

  // Circuit Breaker State
  const [circuitStatus, setCircuitStatus] = useState<'CLOSED' | 'OPEN' | 'HALF_OPEN'>('CLOSED');

  // Persist model selection when it changes
  const handleModelChange = (model: string) => {
    setSelectedModel(model);
    localStorage.setItem('selected-ai-model', model);
  };

  // Load active session from localStorage on mount
  useEffect(() => {
    const savedSessionId = localStorage.getItem(`chat-session-${projectId}`);
    if (savedSessionId && savedSessionId !== 'undefined' && savedSessionId !== 'null') {
      loadSession(savedSessionId);
    }
    loadSessions();

    // Check circuit status and poll
    checkCircuitStatus();
    const interval = setInterval(checkCircuitStatus, 30000);
    return () => clearInterval(interval);
  }, [projectId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Update context files when initialFile changes (optional, or manual add)
  // Here we just ensure if there's no context, maybe add the initial one?
  // Or better, let user control it explicitly.
  // But for convenience, if list is empty and we open chat with file, add it?
  // Let's rely on explicit actions in UI mostly, but maybe init with one if provided and list empty.
  useEffect(() => {
    if (initialFile && contextFiles.length === 0) {
      setContextFiles([initialFile]);
    }
  }, [initialFile]);

  const checkCircuitStatus = async () => {
    try {
      // Check primary circuit status (ollama-primary) as proxy
      const { data } = await api.get('/api/admin/circuit-breaker/ollama-primary');
      if (data) {
        setCircuitStatus(data.state);
      }
    } catch (e) {
      // console.error('Failed to check circuit status');
    }
  };

  const getStatusColor = () => {
    switch (circuitStatus) {
      case 'CLOSED': return 'text-green-500';
      case 'OPEN': return 'text-red-500';
      case 'HALF_OPEN': return 'text-yellow-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusText = () => {
    switch (circuitStatus) {
      case 'CLOSED': return 'System Normal';
      case 'OPEN': return 'Circuit Open (Retrying...)';
      case 'HALF_OPEN': return 'Recovering...';
      default: return 'Unknown Status';
    }
  };

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

  const addFileToContext = (file: FileContext) => {
    if (!contextFiles.some(f => f.path === file.path)) {
      setContextFiles([...contextFiles, file]);
    }
  };

  const removeFileFromContext = (path: string) => {
    setContextFiles(contextFiles.filter(f => f.path !== path));
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    // Check circuit before sending
    if (circuitStatus === 'OPEN') {
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: '⚠️ AI Service is currently unavailable (Circuit Breaker OPEN). Please try again later.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      return;
    }

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
      // Build context from multiple files
      const context = contextFiles.length > 0
        ? contextFiles.map(f => `File${f.source === 'auto' ? ' (Auto)' : ''}: ${f.path}\n\`\`\`${f.language || ''}\n${f.content}\n\`\`\``).join('\n\n')
        : '';

      const response = await aiApi.chat(
        [
          ...(context ? [{ role: 'system', content: `You are a helpful coding assistant. When providing code, always use markdown code blocks with the language specified. \n\nContext Files:\n${context}` }] : []),
          ...messages.map((m) => ({ role: m.role, content: m.content })),
          { role: 'user', content: input },
        ],

        { 
          temperature: 0.7,
          model: selectedModel 
        }
      );

      const endTime = Date.now();
      const responseTimeMs = endTime - new Date(userMessage.timestamp).getTime(); // Approx

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      
      // Save assistant message to backend
      await chatApi.addMessage(sessionId, 'assistant', response.content, {
        modelName: response.model,
        promptTokens: response.usage?.promptTokens,
        completionTokens: response.usage?.completionTokens,
        responseTimeMs,
      });
      loadSessions(); // Refresh session list

      // If successful, ensure status is CLOSED
      if (circuitStatus !== 'CLOSED') checkCircuitStatus();

    } catch (error: any) {
      console.error('Failed to get AI response:', error);
      
      // Check if it's a circuit breaker error
      if (error?.response?.status === 503 || error?.message?.includes('Circuit Open')) {
        setCircuitStatus('OPEN');
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: '⚠️ AI Service temporarily unavailable (Circuit Breaker triggered).',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } else {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please make sure Ollama is running.',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApplyCode = (code: string, messageId?: string) => {
    // If we have just one context file, or if the code block explicitly mentions a file (future), we apply.
    // For now, if active (initialFile) is in context, we might assume applying to it, OR
    // we just rely on parent to know what to do if we don't pass file path (it might apply to active editor file).
    // The current implementation of handleApplyCode in EditorPage applies to activeFile.
    // So we just pass the code.
    
    // Future improvement: Parse file path from AI response?
    
    if (initialFile) {
        setPendingCode(code);
        setPendingMessageId(messageId || null);
        setShowDiff(true);
    } else {
        onApplyCode?.(code, 'replace');
    }
  };

  const handleAcceptCode = async () => {
    onApplyCode?.(pendingCode, 'replace');
    
    // Track applied code
    if (pendingMessageId && initialFile) {
      chatApi.markCodeApplied(pendingMessageId, initialFile.path).catch(console.error);
    }

    setShowDiff(false);
    setPendingCode('');
    setPendingMessageId(null);
  };

  const handleRejectCode = () => {
    setShowDiff(false);
    setPendingCode('');
  };

  const handleGenerateCode = async () => {
    if (!initialFile) return;
    setInput(`이 파일을 개선해주세요: ${initialFile.path}\n\n개선할 부분:\n1. 코드 품질 향상\n2. 성능 최적화\n3. 가독성 개선`);
  };

  const handleRefactorCode = async () => {
    if (!initialFile) return;
    setInput(`이 코드를 리팩토링해주세요. 더 깔끔하고 유지보수하기 쉬운 코드로 변환: ${initialFile.path}`);
  };

  const handleFixBugs = async () => {
    if (!initialFile) return;
    setInput(`이 코드의 잠재적 버그와 문제점을 찾아서 수정해주세요: ${initialFile.path}`);
  };

  const handleExplainCode = async () => {
    if (!initialFile) return;
    setInput(`이 코드를 상세히 설명해주세요: ${initialFile.path}`);
  };

  const renderMarkdown = (content: string, messageId?: string) => {
    return (
      <ReactMarkdown
        className="prose prose-sm dark:prose-invert max-w-none"
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ children }) => <div className="overflow-x-auto my-4"><table className="min-w-full divide-y divide-border border">{children}</table></div>,
          thead: ({ children }) => <thead className="bg-muted/50">{children}</thead>,
          th: ({ children }) => <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider border-r last:border-r-0">{children}</th>,
          td: ({ children }) => <td className="px-3 py-2 whitespace-nowrap text-sm border-r last:border-r-0 border-t">{children}</td>,
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
                currentCode={initialFile?.content} // Compare with active file context
                onApply={onApplyCode ? () => handleApplyCode(codeContent, messageId) : undefined}
                onPreview={initialFile ? () => {
                  setPendingCode(codeContent);
                  setPendingMessageId(messageId || null);
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
        originalCode={initialFile?.content || ''}
        newCode={pendingCode}
        fileName={initialFile?.path}
        language={initialFile?.language}
        onAccept={handleAcceptCode}
        onReject={handleRejectCode}
      />

      {/* Header */}
      <div className="p-3 border-b flex items-center justify-between bg-gradient-to-r from-purple-500/10 to-blue-500/10">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-500" />
          <div className="flex flex-col">
            <span className="font-medium text-sm">AI Coding Assistant</span>
            <div className="flex items-center gap-1.5" title={getStatusText()}>
              <div className={`w-1.5 h-1.5 rounded-full ${
                circuitStatus === 'CLOSED' ? 'bg-green-500' : 
                circuitStatus === 'OPEN' ? 'bg-red-500' : 
                'bg-yellow-500 animate-pulse'
              }`} />
              <span className={`text-[10px] ${getStatusColor()}`}>
                {circuitStatus === 'CLOSED' ? 'Online' : circuitStatus}
              </span>
            </div>
          </div>
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
      
      {/* Context Files Panel */}
      {!showHistory && (
        <div className="border-b p-2 bg-muted/20">
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-muted-foreground">Context Files ({contextFiles.length})</span>
                {initialFile && !contextFiles.some(f => f.path === initialFile.path) && (
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-5 text-[10px] px-2 flex items-center gap-1"
                        onClick={() => addFileToContext(initialFile)}
                    >
                        <Plus className="h-3 w-3" /> Add Current File
                    </Button>
                )}
            </div>
            {contextFiles.length > 0 ? (
                <div className="space-y-1 max-h-24 overflow-y-auto">
                    {contextFiles.map((file) => (
                        <div key={file.path} className="flex items-center justify-between bg-background rounded px-2 py-1 border text-xs">
                           <div className="flex items-center gap-1 overflow-hidden">
                               {file.source === 'auto' && <Sparkles className="h-3 w-3 text-purple-500 flex-shrink-0" />}
                               <div className="truncate max-w-[180px]" title={file.path}>
                                    {file.path.split('/').pop()}
                               </div>
                           </div>
                           <Button
                                variant="ghost"
                                size="sm"
                                className="h-4 w-4 p-0 opacity-70 hover:opacity-100"
                                onClick={() => removeFileFromContext(file.path)}
                           >
                                <X className="h-3 w-3" />
                           </Button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-[10px] text-muted-foreground text-center py-1">
                    No files in context. AI won't see any code unless added.
                </div>
            )}
        </div>
      )}

      {/* Quick Actions */}
      {initialFile && !showHistory && (
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
            {initialFile && (
              <div className="mt-4 p-2 bg-muted rounded text-xs">📄 {initialFile.path}</div>
            )}
            <div className="text-[10px] text-muted-foreground mt-4">
                Tip: Add files to context to let AI understand your project structure.
            </div>
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
              {message.role === 'assistant' ? renderMarkdown(message.content, message.id) : message.content}
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
      <div className="p-3 border-t relative">
        {/* Suggestion Panel */}
        {showSuggestions && (
            <ContextSuggestionPanel
                suggestions={suggestions}
                onCancel={() => setShowSuggestions(false)}
                onConfirm={(selected) => {
                    const newFiles: FileContext[] = selected.map(s => ({
                        id: s.id,
                        path: s.path,
                        content: s.content,
                        language: s.path.split('.').pop(),
                        source: 'auto'
                    }));
                    setContextFiles([...contextFiles, ...newFiles]);
                    setShowSuggestions(false);
                }}
                className="absolute bottom-full left-4 mb-2 z-20 w-[calc(100%-2rem)]"
            />
        )}
        <div className="flex justify-between items-center mb-2 px-1">
          <ModelSelector 
             value={selectedModel} 
             onValueChange={handleModelChange} 
             className="h-6 text-[10px] w-[140px] opacity-70 hover:opacity-100 transition-opacity"
             placeholder="모델 선택"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={async () => {
                if (!input.trim()) return;
                setLoading(true);
                try {
                  const { data } = await api.post('/api/ai/context/search', { projectId, query: input });
                  // Transform to Suggestion format
                  const foundFiles: SuggestedFile[] = data.map((f: any) => ({
                    id: f.path, 
                    path: f.path, 
                    content: f.content, 
                    score: f.score || 0
                  }));
                  
                  // Filter out already added files
                  const newSuggestions = foundFiles.filter(nf => !contextFiles.some(cf => cf.path === nf.path));
                  
                  if (newSuggestions.length > 0) {
                     setSuggestions(newSuggestions);
                     setShowSuggestions(true);
                  } else {
                     // Maybe show a toast that no *new* relevant files found
                  }
                } catch (e) { console.error(e); } finally { setLoading(false); }
            }}
            disabled={loading || !input.trim()}
            title="Auto-search relevant files" // Updated title
            className={cn("flex-shrink-0 w-10 px-0 relative", showSuggestions && "ring-2 ring-purple-500")}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-purple-600" />}
          </Button>
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

