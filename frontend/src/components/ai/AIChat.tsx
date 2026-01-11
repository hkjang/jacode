'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Send, X, Sparkles, Code, FileCode, Loader2, Wand2, History, Plus, Trash2, FilePlus, FileMinus, Copy, Download, RefreshCw, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { aiApi, api, API_BASE_URL } from '@/lib/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AICodeBlock, DiffPreviewModal } from './AICodeBlock';
import { ModelSelector } from './ModelSelector';
import { ContextSuggestionPanel, SuggestedFile } from './ContextSuggestionPanel';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  tool_calls?: {
    function: {
      name: string;
      arguments: string;
    };
  }[];
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
  const [expandedContextFile, setExpandedContextFile] = useState<string | null>(null);

  // Circuit Breaker State
  const [circuitStatus, setCircuitStatus] = useState<'CLOSED' | 'OPEN' | 'HALF_OPEN'>('CLOSED');
  
  // Streaming Control
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Smart Mode: Auto-gather strategic context on every send
  const [smartMode, setSmartMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ai-smart-mode') !== 'false'; // Default: ON
    }
    return true;
  });

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

  // Slash Command Processor
  const processSlashCommand = async (cmd: string) => {
    const command = cmd.trim().toLowerCase();
    
    if (command === '/clear' || command === '/reset') {
      setMessages([]);
      setContextFiles([]);
      setCurrentSessionId(null); // Detach current session
      // Optional: Clear from localStorage if desired, but keeping history is safer
      return true;
    }
    
    if (command === '/help') {
       const helpMsg: Message = {
         id: Date.now().toString(),
         role: 'assistant',
         content: `**Available Commands:**
- \`/auto\`: Trigger intelligent context search
- \`/clear\`: Clear current chat history
- \`/reset\`: Start a fresh session
- \`/help\`: Show this help message`,
         timestamp: new Date()
       };
       setMessages(prev => [...prev, helpMsg]);
       return true;
    }
    
    if (command === '/auto') {
      // Trigger the existing auto-context logic manually
      // We can simulate a click on the sparkle button or just run the logic if extracted
      // For now, let's just show a hint to use the button or input query
      return false; // Let it pass through or handle specifically if we refactor auto-logic
    }

    return false;
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    // 1. Process Slash Commands
    if (input.startsWith('/')) {
       const handled = await processSlashCommand(input);
       if (handled) {
         setInput('');
         return;
       }
       // If not handled (e.g. unknown command), send as text or warn? Send as text is safer.
    }

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
      // Smart Mode: Auto-gather strategic context
      let strategicFiles = [...contextFiles];
      if (smartMode && projectId) {
        try {
          const focusPaths = contextFiles.map(f => f.path);
          const { data } = await api.post('/api/ai/context/strategic', {
            projectId,
            query: input,
            focusFiles: focusPaths,
            options: { maxFiles: 8, includeConfig: true, includeImports: true }
          });
          
          // Merge strategic files with existing context (dedup by path)
          const existingPaths = new Set(contextFiles.map(f => f.path));
          for (const file of (data.files || [])) {
            if (!existingPaths.has(file.path)) {
              strategicFiles.push({
                id: file.path,
                path: file.path,
                content: file.content,
                language: file.path.split('.').pop(),
                source: 'auto'
              });
            }
          }
          
          // Update UI state with new files
          if (strategicFiles.length > contextFiles.length) {
            setContextFiles(strategicFiles);
          }
        } catch (e) {
          console.warn('Strategic context gathering failed:', e);
          // Continue with existing context
        }
      }

      // Build context from all files (including strategic ones)
      const context = strategicFiles.length > 0
        ? strategicFiles.map(f => `File${f.source === 'auto' ? ' (Auto)' : ''}: ${f.path}\n\`\`\`${f.language || ''}\n${f.content}\n\`\`\``).join('\n\n')
        : '';

      const requestBody = {
        messages: [
          ...(context ? [{ role: 'system', content: `You are a helpful coding assistant. When providing code, always use markdown code blocks with the language specified. \n\nContext Files:\n${context}` }] : []),
          ...messages.map((m) => ({ role: m.role, content: m.content })),
          { role: 'user', content: input },
        ],
        options: { 
          temperature: 0.7,
          model: selectedModel 
        }
      };

      // Create placeholder assistant message
      const assistantMsgId = (Date.now() + 1).toString();
      const assistantMessage: Message = {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // Start Streaming with AbortController
      abortControllerRef.current = new AbortController();
      setIsStreaming(true);
      
      const response = await fetch(`${API_BASE_URL}/api/ai/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`
        },
        body: JSON.stringify(requestBody),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) throw new Error(response.statusText);

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader');

      const decoder = new TextDecoder();
      let fullContent = '';
      let startTime = Date.now();
      let streamUsage = { promptTokens: 0, completionTokens: 0 };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                fullContent += data.content;
                setMessages((prev) => 
                  prev.map(m => m.id === assistantMsgId ? { ...m, content: fullContent } : m)
                );
              }
              if (data.tool_calls) {
                  setMessages((prev) => 
                    prev.map(m => m.id === assistantMsgId ? { ...m, tool_calls: data.tool_calls } : m)
                  );
              }
              // Capture usage if available (from final chunk)
              if (data.usage) {
                 streamUsage = data.usage;
              }
            } catch (e) {
              // Ignore parse errors for partial chunks
            }
          }
        }
      }
      
      const endTime = Date.now();
      const responseTimeMs = endTime - startTime; 

      // Save assistant message to backend with REAL metrics
      await chatApi.addMessage(sessionId, 'assistant', fullContent, {
        modelName: selectedModel,
        promptTokens: streamUsage.promptTokens,
        completionTokens: streamUsage.completionTokens,
        responseTimeMs,
      });
      loadSessions(); // Refresh session list

      // If successful, ensure status is CLOSED
      if (circuitStatus !== 'CLOSED') checkCircuitStatus();

    } catch (error: any) {
      console.error('Failed to get AI response:', error);
      
      // Handle abort (user pressed Stop)
      if (error?.name === 'AbortError') {
        // User cancelled, just append a note to the current message
        setMessages((prev) => 
          prev.map((m, idx) => 
            idx === prev.length - 1 && m.role === 'assistant' 
              ? { ...m, content: m.content + '\n\n_(Generation stopped by user)_' } 
              : m
          )
        );
        return; // Don't show error message
      }
      
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
        // More descriptive error message
        const errorDetail = error?.message || 'Unknown error';
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `⚠️ Error: ${errorDetail}\n\nPlease check:\n- Is the AI Provider (Ollama/vLLM) running?\n- Is the backend server running?`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } finally {
      setLoading(false);
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  // Stop Generation Handler
  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
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
          {/* Smart Mode Toggle */}
          <Button
            variant={smartMode ? "default" : "ghost"}
            size="sm"
            className={cn(
              "h-6 text-[10px] px-2 flex items-center gap-1 transition-all",
              smartMode && "bg-purple-500 hover:bg-purple-600 text-white"
            )}
            onClick={() => {
              const newValue = !smartMode;
              setSmartMode(newValue);
              localStorage.setItem('ai-smart-mode', String(newValue));
            }}
            title={smartMode ? "Smart Mode: Auto-gather context ON" : "Smart Mode: OFF"}
          >
            <Wand2 className="h-3 w-3" />
            {smartMode ? 'Smart' : 'Manual'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => {
              // Export chat as Markdown
              const markdown = messages.map(m => 
                m.role === 'user' 
                  ? `**User:**\n${m.content}` 
                  : `**AI:**\n${m.content}`
              ).join('\n\n---\n\n');
              const blob = new Blob([markdown], { type: 'text/markdown' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `chat-${new Date().toISOString().slice(0,10)}.md`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            title="Export chat as Markdown"
            disabled={messages.length === 0}
          >
            <Download className="h-4 w-4" />
          </Button>
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
      
      {/* Context Files Panel - Enhanced */}
      {!showHistory && (
        <div className="border-b bg-muted/20">
            <div className="flex items-center justify-between p-2 pb-1">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                    <FileCode className="h-3 w-3" />
                    Context ({contextFiles.length})
                    {contextFiles.length > 0 && (
                      <span className="text-[10px] text-muted-foreground/70">
                        · {contextFiles.reduce((acc, f) => acc + (f.content?.split('\n').length || 0), 0)} lines
                      </span>
                    )}
                </span>
                <div className="flex items-center gap-1">
                    {initialFile && !contextFiles.some(f => f.path === initialFile.path) && (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-5 text-[10px] px-2 flex items-center gap-1"
                            onClick={() => addFileToContext(initialFile)}
                        >
                            <Plus className="h-3 w-3" /> Add Current
                        </Button>
                    )}
                    {contextFiles.length > 0 && (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-5 text-[10px] px-2 text-destructive hover:text-destructive"
                            onClick={() => setContextFiles([])}
                            title="Clear all context"
                        >
                            <Trash2 className="h-3 w-3" />
                        </Button>
                    )}
                </div>
            </div>
            {contextFiles.length > 0 ? (
                <div className="px-2 pb-2 space-y-1">
                    {contextFiles.map((file) => {
                        const lineCount = file.content?.split('\n').length || 0;
                        const ext = file.path.split('.').pop()?.toLowerCase() || '';
                        const isExpanded = expandedContextFile === file.path;
                        
                        return (
                            <div key={file.path} className="bg-background rounded border text-xs overflow-hidden">
                                <div 
                                    className="flex items-center justify-between px-2 py-1.5 cursor-pointer hover:bg-muted/50 transition-colors"
                                    onClick={() => setExpandedContextFile(isExpanded ? null : file.path)}
                                >
                                    <div className="flex items-center gap-1.5 overflow-hidden">
                                        {file.source === 'auto' && <Sparkles className="h-3 w-3 text-purple-500 flex-shrink-0" />}
                                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                            ['ts', 'tsx', 'js', 'jsx'].includes(ext) ? 'bg-blue-500' :
                                            ['py'].includes(ext) ? 'bg-yellow-500' :
                                            ['css', 'scss'].includes(ext) ? 'bg-pink-500' :
                                            ['json', 'yaml', 'yml'].includes(ext) ? 'bg-green-500' :
                                            ['md', 'txt'].includes(ext) ? 'bg-gray-400' :
                                            'bg-gray-300'
                                        }`} />
                                        <span className="truncate max-w-[140px] font-medium" title={file.path}>
                                            {file.path.split('/').pop()}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground flex-shrink-0">
                                            {lineCount} lines
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Code className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-4 w-4 p-0 opacity-70 hover:opacity-100"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeFileFromContext(file.path);
                                            }}
                                        >
                                            <X className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                                {isExpanded && (
                                    <div className="border-t bg-zinc-900 text-zinc-100 p-2 max-h-40 overflow-auto">
                                        <pre className="text-[11px] font-mono whitespace-pre-wrap break-all">
                                            {file.content?.slice(0, 2000)}{file.content && file.content.length > 2000 ? '\n... (truncated)' : ''}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-[10px] text-muted-foreground text-center py-2 px-2">
                    <p>No files in context.</p>
                    <p className="mt-1 opacity-70">Use ✨ to auto-detect relevant files or add manually.</p>
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

        {messages.map((message, idx) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} group`}
          >
            <div
              className={`max-w-[90%] rounded-lg px-3 py-2 text-sm relative ${
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              }`}
            >
              {message.role === 'assistant' ? (
                <>
                  {message.tool_calls && message.tool_calls.length > 0 && (
                      <div className="mb-2 space-y-1">
                          {message.tool_calls.map((tool, i) => (
                              <details key={i} className="group bg-background/50 rounded border text-xs overflow-hidden open:pb-2 transition-all">
                                  <summary className="flex items-center gap-2 p-2 cursor-pointer hover:bg-muted/50 select-none">
                                      <div className="flex items-center gap-1.5 font-medium text-muted-foreground">
                                          <Wand2 className="h-3 w-3" />
                                          <span>Executed: {tool.function.name}</span>
                                      </div>
                                      <span className="ml-auto text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">View Details</span>
                                  </summary>
                                  <div className="px-2 pt-1">
                                      <div className="font-mono bg-muted/30 p-2 rounded text-[10px] whitespace-pre-wrap break-all max-h-32 overflow-auto">
                                          {tool.function.arguments}
                                      </div>
                                  </div>
                              </details>
                          ))}
                      </div>
                  )}
                  {renderMarkdown(message.content, message.id)}
                </>
              ) : message.content}
              
              {/* Message Actions (hover) */}
              <div className={`absolute -bottom-6 ${message.role === 'user' ? 'right-0' : 'left-0'} flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity`}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 rounded-full bg-background/80 hover:bg-background shadow-sm"
                  onClick={() => {
                    navigator.clipboard.writeText(message.content);
                  }}
                  title="Copy message"
                >
                  <Copy className="h-3 w-3" />
                </Button>
                {message.role === 'assistant' && idx === messages.length - 1 && !loading && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 rounded-full bg-background/80 hover:bg-background shadow-sm"
                    onClick={() => {
                      // Regenerate: remove last assistant message and re-send
                      const lastUserMsgIdx = messages.findLastIndex(m => m.role === 'user');
                      if (lastUserMsgIdx >= 0) {
                        const lastUserMsg = messages[lastUserMsgIdx];
                        setMessages(messages.slice(0, lastUserMsgIdx + 1));
                        setInput(lastUserMsg.content);
                      }
                    }}
                    title="Regenerate response"
                  >
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                )}
              </div>
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
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) handleSend();
              if (e.key === 'Escape' && isStreaming) handleStopGeneration();
            }}
            placeholder="코드 생성 요청을 입력하세요... (Enter to send, Esc to stop)"
            className="flex-1 h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            disabled={loading && !isStreaming}
          />
          {isStreaming ? (
            <Button
              onClick={handleStopGeneration}
              variant="destructive"
              className="flex items-center gap-1"
              title="Stop generating (Esc)"
            >
              <X className="h-4 w-4" />
              Stop
            </Button>
          ) : (
            <Button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

