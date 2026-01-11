'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Terminal as TerminalIcon, 
  X, 
  Plus, 
  Maximize2, 
  Minimize2,
  ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface TerminalTab {
  id: string;
  name: string;
  history: string[];
  cwd?: string;
}

interface IntegratedTerminalProps {
  isOpen: boolean;
  onClose: () => void;
  onCommand?: (command: string) => Promise<string>;
  className?: string;
}

export function IntegratedTerminal({
  isOpen,
  onClose,
  onCommand,
  className,
}: IntegratedTerminalProps) {
  const [tabs, setTabs] = useState<TerminalTab[]>([
    { id: '1', name: 'bash', history: ['$ Welcome to JACode Terminal', '$ Type "help" for available commands'] }
  ]);
  const [activeTab, setActiveTab] = useState('1');
  const [input, setInput] = useState('');
  const [isMaximized, setIsMaximized] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  const currentTab = tabs.find(t => t.id === activeTab);

  // Auto scroll to bottom
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [currentTab?.history]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleCommand = async (cmd: string) => {
    if (!cmd.trim()) return;

    const updatedHistory = [...(currentTab?.history || []), `$ ${cmd}`];
    
    // Built-in commands
    if (cmd === 'clear') {
      setTabs(tabs.map(t => t.id === activeTab ? { ...t, history: [] } : t));
      setInput('');
      return;
    }

    if (cmd === 'help') {
      const helpText = [
        'Available commands:',
        '  clear     - Clear terminal',
        '  help      - Show this help',
        '  pwd       - Current directory',
        '  ls        - List files',
        '  echo      - Print message',
      ];
      setTabs(tabs.map(t => t.id === activeTab ? { ...t, history: [...updatedHistory, ...helpText] } : t));
      setInput('');
      return;
    }

    setIsProcessing(true);
    
    try {
      // Call external handler if provided
      if (onCommand) {
        const result = await onCommand(cmd);
        setTabs(tabs.map(t => t.id === activeTab ? { 
          ...t, 
          history: [...updatedHistory, result]
        } : t));
      } else {
        // Mock response
        setTabs(tabs.map(t => t.id === activeTab ? { 
          ...t, 
          history: [...updatedHistory, `Command not implemented: ${cmd}`]
        } : t));
      }
    } catch (error: any) {
      setTabs(tabs.map(t => t.id === activeTab ? { 
        ...t, 
        history: [...updatedHistory, `Error: ${error.message}`]
      } : t));
    } finally {
      setIsProcessing(false);
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isProcessing) {
      handleCommand(input);
    }
  };

  const addTab = () => {
    const newId = String(Date.now());
    setTabs([...tabs, { id: newId, name: 'bash', history: [] }]);
    setActiveTab(newId);
  };

  const closeTab = (id: string) => {
    if (tabs.length === 1) {
      onClose();
      return;
    }
    const newTabs = tabs.filter(t => t.id !== id);
    setTabs(newTabs);
    if (activeTab === id) {
      setActiveTab(newTabs[0].id);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={cn(
      'flex flex-col bg-zinc-900 text-zinc-100 border-t',
      isMaximized ? 'fixed inset-0 z-50' : 'h-64',
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1 bg-zinc-800 border-b border-zinc-700">
        <div className="flex items-center gap-1">
          <TerminalIcon className="h-3.5 w-3.5 text-zinc-400" />
          <span className="text-xs font-medium">Terminal</span>
        </div>
        
        {/* Tabs */}
        <div className="flex items-center gap-1 flex-1 mx-4 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={cn(
                'flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors',
                tab.id === activeTab ? 'bg-zinc-700' : 'hover:bg-zinc-700/50'
              )}
              onClick={() => setActiveTab(tab.id)}
            >
              <span>{tab.name}</span>
              <X 
                className="h-3 w-3 opacity-50 hover:opacity-100" 
                onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
              />
            </button>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 text-zinc-400 hover:text-zinc-100"
            onClick={addTab}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 text-zinc-400 hover:text-zinc-100"
            onClick={() => setIsMaximized(!isMaximized)}
          >
            {isMaximized ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 text-zinc-400 hover:text-zinc-100"
            onClick={onClose}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Output */}
      <div 
        ref={outputRef}
        className="flex-1 overflow-auto p-2 font-mono text-xs leading-relaxed"
        onClick={() => inputRef.current?.focus()}
      >
        {currentTab?.history.map((line, i) => (
          <div key={i} className={cn(
            line.startsWith('$') ? 'text-green-400' : 
            line.startsWith('Error') ? 'text-red-400' : 
            'text-zinc-300'
          )}>
            {line}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 px-2 py-1 border-t border-zinc-700 bg-zinc-800/50">
        <span className="text-green-400 font-mono text-xs">$</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isProcessing}
          placeholder={isProcessing ? 'Processing...' : 'Enter command'}
          className="flex-1 bg-transparent text-xs font-mono outline-none placeholder:text-zinc-500"
        />
      </div>
    </div>
  );
}

export default IntegratedTerminal;
