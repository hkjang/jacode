'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, X, Sparkles, Code, FileCode, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { aiApi } from '@/lib/api';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
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
}

export function AIChat({ projectId, currentFile, onClose }: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const context = currentFile
        ? `Current file: ${currentFile.path}\n\`\`\`${currentFile.language || ''}\n${currentFile.content}\n\`\`\``
        : '';

      const response = await aiApi.chat(
        [
          ...(context ? [{ role: 'system', content: `You are a helpful coding assistant. ${context}` }] : []),
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

  const handleGenerateCode = async () => {
    if (!currentFile) return;
    setInput(`Generate code to improve this file: ${currentFile.path}`);
  };

  const handleExplainCode = async () => {
    if (!currentFile) return;
    setInput(`Explain this code in detail: ${currentFile.path}`);
  };

  return (
    <div className="h-full flex flex-col bg-card border-l">
      {/* Header */}
      <div className="p-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">AI Assistant</span>
        </div>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Quick Actions */}
      {currentFile && (
        <div className="p-2 border-b flex gap-2">
          <Button variant="outline" size="sm" onClick={handleGenerateCode}>
            <Code className="h-3 w-3 mr-1" />
            Generate
          </Button>
          <Button variant="outline" size="sm" onClick={handleExplainCode}>
            <FileCode className="h-3 w-3 mr-1" />
            Explain
          </Button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-8">
            <Sparkles className="h-8 w-8 mx-auto mb-3 opacity-50" />
            <p>Ask me anything about your code!</p>
            <p className="text-xs mt-1">I can help with generation, explanation, debugging, and more.</p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              }`}
            >
              {message.role === 'assistant' ? (
                <ReactMarkdown
                  className="prose prose-sm dark:prose-invert max-w-none"
                  components={{
                    code: ({ node, className, children, ...props }) => {
                      const isInline = !className;
                      return isInline ? (
                        <code className="bg-background/50 px-1 rounded" {...props}>
                          {children}
                        </code>
                      ) : (
                        <pre className="bg-background/50 p-2 rounded overflow-x-auto">
                          <code {...props}>{children}</code>
                        </pre>
                      );
                    },
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              ) : (
                message.content
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg px-3 py-2 text-sm flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Thinking...</span>
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
            placeholder="Ask anything..."
            className="flex-1 h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={loading}
          />
          <Button size="sm" onClick={handleSend} disabled={loading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
