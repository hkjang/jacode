'use client';

import { useState, useEffect } from 'react';
import {
  BookOpen,
  Code,
  FileText,
  Sparkles,
  Plus,
  Search,
  Tag,
  Edit,
  Trash2,
  Copy,
  X,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

interface KnowledgeEntry {
  id: string;
  type: 'CODE_PATTERN' | 'STYLE_GUIDE' | 'SNIPPET' | 'PROMPT_TEMPLATE';
  title: string;
  content: string;
  description?: string;
  tags: string[];
  language?: string;
  createdAt: string;
}

const TYPE_CONFIG = {
  CODE_PATTERN: { icon: Code, label: 'Code Pattern', color: 'text-blue-500' },
  STYLE_GUIDE: { icon: FileText, label: 'Style Guide', color: 'text-green-500' },
  SNIPPET: { icon: BookOpen, label: 'Snippet', color: 'text-purple-500' },
  PROMPT_TEMPLATE: { icon: Sparkles, label: 'Prompt', color: 'text-orange-500' },
};

interface KnowledgeBaseProps {
  onClose?: () => void;
  onInsert?: (content: string) => void;
}

export function KnowledgeBase({ onClose, onInsert }: KnowledgeBaseProps) {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<KnowledgeEntry | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  // Form state
  const [formType, setFormType] = useState<string>('SNIPPET');
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formTags, setFormTags] = useState('');
  const [formLanguage, setFormLanguage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadEntries();
  }, [filterType]);

  const loadEntries = async () => {
    try {
      const params = new URLSearchParams();
      if (filterType) params.set('type', filterType);
      if (search) params.set('search', search);

      const { data } = await api.get(`/api/knowledge?${params}`);
      setEntries(data);
    } catch (error) {
      console.error('Failed to load knowledge entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formContent.trim()) return;

    setSaving(true);
    try {
      await api.post('/api/knowledge', {
        type: formType,
        title: formTitle,
        content: formContent,
        description: formDescription || undefined,
        tags: formTags ? formTags.split(',').map((t) => t.trim()) : [],
        language: formLanguage || undefined,
      });
      resetForm();
      loadEntries();
    } catch (error) {
      console.error('Failed to create entry:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this entry?')) return;
    try {
      await api.delete(`/api/knowledge/${id}`);
      setEntries(entries.filter((e) => e.id !== id));
      if (selectedEntry?.id === id) setSelectedEntry(null);
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const resetForm = () => {
    setShowCreate(false);
    setFormTitle('');
    setFormContent('');
    setFormDescription('');
    setFormTags('');
    setFormLanguage('');
  };

  const filteredEntries = entries.filter((e) =>
    search
      ? e.title.toLowerCase().includes(search.toLowerCase()) ||
        e.description?.toLowerCase().includes(search.toLowerCase())
      : true
  );

  return (
    <div className="h-full flex flex-col bg-card border-l">
      {/* Header */}
      <div className="p-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">Knowledge Base</span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowCreate(true)}>
            <Plus className="h-3 w-3 mr-1" />
            Add
          </Button>
          {onClose && (
            <Button size="sm" variant="ghost" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="p-2 border-b space-y-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full h-8 pl-8 pr-2 rounded border bg-background text-sm"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          <Button
            size="sm"
            variant={filterType === null ? 'secondary' : 'ghost'}
            className="h-6 text-xs"
            onClick={() => setFilterType(null)}
          >
            All
          </Button>
          {Object.entries(TYPE_CONFIG).map(([type, config]) => (
            <Button
              key={type}
              size="sm"
              variant={filterType === type ? 'secondary' : 'ghost'}
              className="h-6 text-xs"
              onClick={() => setFilterType(type)}
            >
              {config.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Create Form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="p-3 border-b space-y-2 bg-muted/30">
          <select
            value={formType}
            onChange={(e) => setFormType(e.target.value)}
            className="w-full h-8 px-2 rounded border bg-background text-sm"
          >
            {Object.entries(TYPE_CONFIG).map(([type, config]) => (
              <option key={type} value={type}>
                {config.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            placeholder="Title"
            className="w-full h-8 px-2 rounded border bg-background text-sm"
            required
          />
          <textarea
            value={formContent}
            onChange={(e) => setFormContent(e.target.value)}
            placeholder="Content / Code"
            className="w-full h-24 px-2 py-1 rounded border bg-background text-sm font-mono resize-none"
            required
          />
          <input
            type="text"
            value={formTags}
            onChange={(e) => setFormTags(e.target.value)}
            placeholder="Tags (comma separated)"
            className="w-full h-8 px-2 rounded border bg-background text-sm"
          />
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={resetForm}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* Entries List */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-8">
            <BookOpen className="h-8 w-8 mx-auto mb-3 opacity-50" />
            <p>No entries found</p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredEntries.map((entry) => {
              const config = TYPE_CONFIG[entry.type];
              const Icon = config.icon;
              return (
                <div
                  key={entry.id}
                  className="p-3 hover:bg-accent/50 cursor-pointer group"
                  onClick={() => setSelectedEntry(entry)}
                >
                  <div className="flex items-start gap-2">
                    <Icon className={`h-4 w-4 mt-0.5 ${config.color}`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{entry.title}</p>
                      {entry.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {entry.description}
                        </p>
                      )}
                      {entry.tags.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {entry.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="text-xs bg-muted px-1.5 py-0.5 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(entry.content);
                        }}
                        className="p-1 hover:bg-accent rounded"
                        title="Copy"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(entry.id);
                        }}
                        className="p-1 hover:bg-destructive/10 rounded text-destructive"
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected Entry Detail */}
      {selectedEntry && (
        <div className="border-t p-3 bg-muted/30 max-h-48 overflow-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-sm">{selectedEntry.title}</span>
            <button onClick={() => setSelectedEntry(null)}>
              <X className="h-4 w-4" />
            </button>
          </div>
          <pre className="text-xs font-mono bg-background p-2 rounded overflow-x-auto">
            {selectedEntry.content}
          </pre>
          {onInsert && (
            <Button
              size="sm"
              className="mt-2"
              onClick={() => onInsert(selectedEntry.content)}
            >
              Insert
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
