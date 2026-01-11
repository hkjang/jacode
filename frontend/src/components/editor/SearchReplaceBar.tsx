'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Search, Replace, X, ChevronDown, ChevronUp, CaseSensitive, Regex, WholeWord } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface SearchMatch {
  line: number;
  start: number;
  end: number;
}

interface SearchReplaceBarProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (query: string, options: SearchOptions) => SearchMatch[];
  onReplace: (match: SearchMatch, replacement: string) => void;
  onReplaceAll: (replacement: string) => void;
  onNavigate: (match: SearchMatch) => void;
  className?: string;
}

interface SearchOptions {
  caseSensitive: boolean;
  wholeWord: boolean;
  regex: boolean;
}

export function SearchReplaceBar({
  isOpen,
  onClose,
  onSearch,
  onReplace,
  onReplaceAll,
  onNavigate,
  className,
}: SearchReplaceBarProps) {
  const [showReplace, setShowReplace] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [currentMatch, setCurrentMatch] = useState(0);
  const [options, setOptions] = useState<SearchOptions>({
    caseSensitive: false,
    wholeWord: false,
    regex: false,
  });
  
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Search on query change
  useEffect(() => {
    if (searchQuery) {
      const results = onSearch(searchQuery, options);
      setMatches(results);
      setCurrentMatch(results.length > 0 ? 0 : -1);
    } else {
      setMatches([]);
      setCurrentMatch(-1);
    }
  }, [searchQuery, options, onSearch]);

  // Navigate to current match
  useEffect(() => {
    if (matches[currentMatch]) {
      onNavigate(matches[currentMatch]);
    }
  }, [currentMatch, matches, onNavigate]);

  const handleNext = () => {
    if (matches.length > 0) {
      setCurrentMatch((prev) => (prev + 1) % matches.length);
    }
  };

  const handlePrev = () => {
    if (matches.length > 0) {
      setCurrentMatch((prev) => (prev - 1 + matches.length) % matches.length);
    }
  };

  const handleReplace = () => {
    if (matches[currentMatch]) {
      onReplace(matches[currentMatch], replaceQuery);
      // Search again after replace
      const results = onSearch(searchQuery, options);
      setMatches(results);
    }
  };

  const handleReplaceAll = () => {
    onReplaceAll(replaceQuery);
    const results = onSearch(searchQuery, options);
    setMatches(results);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        handlePrev();
      } else {
        handleNext();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const toggleOption = (key: keyof SearchOptions) => {
    setOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (!isOpen) return null;

  return (
    <div className={cn(
      'absolute top-0 right-4 z-40 bg-popover border rounded-lg shadow-lg overflow-hidden',
      className
    )}>
      <div className="p-2 space-y-2">
        {/* Search row */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setShowReplace(!showReplace)}
          >
            {showReplace ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
          
          <div className="relative flex-1">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search"
              className="w-48 h-6 px-2 text-xs bg-background border rounded focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          
          {/* Match count */}
          <span className="text-[10px] text-muted-foreground min-w-[50px]">
            {matches.length > 0 ? `${currentMatch + 1}/${matches.length}` : 'No results'}
          </span>
          
          {/* Navigation */}
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handlePrev} disabled={matches.length === 0}>
            <ChevronUp className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleNext} disabled={matches.length === 0}>
            <ChevronDown className="h-3 w-3" />
          </Button>
          
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onClose}>
            <X className="h-3 w-3" />
          </Button>
        </div>

        {/* Options */}
        <div className="flex items-center gap-1 pl-7">
          <Button
            variant={options.caseSensitive ? 'default' : 'ghost'}
            size="sm"
            className="h-5 px-1.5 text-[10px]"
            onClick={() => toggleOption('caseSensitive')}
            title="Match Case"
          >
            <CaseSensitive className="h-3 w-3" />
          </Button>
          <Button
            variant={options.wholeWord ? 'default' : 'ghost'}
            size="sm"
            className="h-5 px-1.5 text-[10px]"
            onClick={() => toggleOption('wholeWord')}
            title="Whole Word"
          >
            <WholeWord className="h-3 w-3" />
          </Button>
          <Button
            variant={options.regex ? 'default' : 'ghost'}
            size="sm"
            className="h-5 px-1.5 text-[10px]"
            onClick={() => toggleOption('regex')}
            title="Use Regex"
          >
            <Regex className="h-3 w-3" />
          </Button>
        </div>

        {/* Replace row */}
        {showReplace && (
          <div className="flex items-center gap-1 pl-7">
            <input
              type="text"
              value={replaceQuery}
              onChange={(e) => setReplaceQuery(e.target.value)}
              placeholder="Replace"
              className="w-48 h-6 px-2 text-xs bg-background border rounded focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[10px]"
              onClick={handleReplace}
              disabled={matches.length === 0}
            >
              Replace
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[10px]"
              onClick={handleReplaceAll}
              disabled={matches.length === 0}
            >
              All
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default SearchReplaceBar;
