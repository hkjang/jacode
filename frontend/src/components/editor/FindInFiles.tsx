'use client';

import React, { useState, useCallback } from 'react';
import { Search, Replace, X, ChevronDown, ChevronRight, File } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface SearchResult {
  path: string;
  name: string;
  matches: {
    line: number;
    content: string;
    matchStart: number;
    matchEnd: number;
  }[];
}

interface FindInFilesProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (query: string, options: { caseSensitive: boolean; regex: boolean }) => Promise<SearchResult[]>;
  onResultClick: (path: string, line: number) => void;
  className?: string;
}

export function FindInFiles({ 
  isOpen, 
  onClose, 
  onSearch, 
  onResultClick,
  className 
}: FindInFilesProps) {
  const [query, setQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [showReplace, setShowReplace] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    try {
      const searchResults = await onSearch(query, { caseSensitive, regex: useRegex });
      setResults(searchResults);
      // Expand all results by default
      setExpandedFiles(new Set(searchResults.map(r => r.path)));
    } finally {
      setIsSearching(false);
    }
  }, [query, caseSensitive, useRegex, onSearch]);

  const toggleFile = (path: string) => {
    setExpandedFiles(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const totalMatches = results.reduce((sum, r) => sum + r.matches.length, 0);

  if (!isOpen) return null;

  return (
    <div className={cn('flex flex-col h-full bg-background border-r', className)}>
      {/* Header */}
      <div className="p-2 border-b flex items-center justify-between">
        <span className="text-xs font-medium">Search</span>
        <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={onClose}>
          <X className="h-3 w-3" />
        </Button>
      </div>

      {/* Search Input */}
      <div className="p-2 space-y-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search"
            className="w-full h-7 pl-7 pr-2 text-xs bg-muted border rounded focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Options */}
        <div className="flex items-center gap-2">
          <button
            className={cn(
              'px-1.5 py-0.5 text-[10px] rounded border transition-colors',
              caseSensitive ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
            )}
            onClick={() => setCaseSensitive(!caseSensitive)}
            title="Match Case"
          >
            Aa
          </button>
          <button
            className={cn(
              'px-1.5 py-0.5 text-[10px] rounded border transition-colors',
              useRegex ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
            )}
            onClick={() => setUseRegex(!useRegex)}
            title="Use Regex"
          >
            .*
          </button>
          <button
            className="px-1.5 py-0.5 text-[10px] rounded border hover:bg-accent transition-colors"
            onClick={() => setShowReplace(!showReplace)}
            title="Toggle Replace"
          >
            <Replace className="h-3 w-3" />
          </button>
        </div>

        {/* Replace Input */}
        {showReplace && (
          <div className="relative">
            <Replace className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <input
              type="text"
              value={replaceQuery}
              onChange={(e) => setReplaceQuery(e.target.value)}
              placeholder="Replace"
              className="w-full h-7 pl-7 pr-2 text-xs bg-muted border rounded focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-auto">
        {isSearching ? (
          <div className="p-4 text-center text-xs text-muted-foreground">
            Searching...
          </div>
        ) : results.length > 0 ? (
          <>
            <div className="px-2 py-1 text-[10px] text-muted-foreground border-b">
              {totalMatches} results in {results.length} files
            </div>
            <div className="py-1">
              {results.map((result) => (
                <div key={result.path}>
                  <button
                    className="w-full flex items-center gap-1 px-2 py-1 text-xs hover:bg-accent/50 transition-colors"
                    onClick={() => toggleFile(result.path)}
                  >
                    {expandedFiles.has(result.path) ? (
                      <ChevronDown className="h-3 w-3 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="h-3 w-3 flex-shrink-0" />
                    )}
                    <File className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                    <span className="truncate flex-1 text-left">{result.name}</span>
                    <span className="text-muted-foreground">{result.matches.length}</span>
                  </button>
                  
                  {expandedFiles.has(result.path) && (
                    <div className="ml-6">
                      {result.matches.map((match, idx) => (
                        <button
                          key={idx}
                          className="w-full flex items-center gap-2 px-2 py-0.5 text-[11px] hover:bg-accent/50 transition-colors text-left"
                          onClick={() => onResultClick(result.path, match.line)}
                        >
                          <span className="text-muted-foreground min-w-8">{match.line}</span>
                          <span className="truncate font-mono">
                            {match.content.substring(0, match.matchStart)}
                            <span className="bg-yellow-200 dark:bg-yellow-800">
                              {match.content.substring(match.matchStart, match.matchEnd)}
                            </span>
                            {match.content.substring(match.matchEnd)}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : query ? (
          <div className="p-4 text-center text-xs text-muted-foreground">
            No results found
          </div>
        ) : (
          <div className="p-4 text-center text-xs text-muted-foreground">
            Type to search across files
          </div>
        )}
      </div>
    </div>
  );
}

export default FindInFiles;
