'use client';

import { useEffect, useState } from 'react';
import {
  FileText,
  Plus,
  Loader2,
  Edit,
  Trash2,
  History,
  Play,
  Save,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

interface PromptTemplate {
  id: string;
  name: string;
  type: string;
  description: string | null;
  content: string;
  variables: string[];
  version: number;
  isActive: boolean;
  versions: { version: number; createdAt: string }[];
}

export default function PromptsPage() {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showEditor, setShowEditor] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const res = await api.get('/api/admin/prompts');
      setTemplates(res.data);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectTemplate = (template: PromptTemplate) => {
    setSelectedTemplate(template);
    setEditContent(template.content);
    setShowEditor(true);
  };

  const saveTemplate = async () => {
    if (!selectedTemplate) return;
    try {
      await api.patch(`/api/admin/prompts/${selectedTemplate.id}`, {
        content: editContent,
      });
      await loadTemplates();
      alert('Template saved!');
    } catch (error) {
      console.error('Failed to save:', error);
    }
  };

  const initializeDefaults = async () => {
    setLoading(true);
    try {
      await api.post('/api/admin/prompts/initialize');
      await loadTemplates();
    } catch (error) {
      console.error('Failed to initialize:', error);
    } finally {
      setLoading(false);
    }
  };

  const rollback = async (templateId: string, version: number) => {
    if (!confirm(`Rollback to version ${version}?`)) return;
    try {
      await api.post(`/api/admin/prompts/${templateId}/rollback/${version}`);
      await loadTemplates();
      if (selectedTemplate?.id === templateId) {
        const updated = templates.find(t => t.id === templateId);
        if (updated) selectTemplate(updated);
      }
    } catch (error) {
      console.error('Failed to rollback:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex gap-6 h-[calc(100vh-200px)]">
      {/* Template List */}
      <div className="w-80 border-r pr-4 overflow-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Templates
          </h2>
          <Button size="sm" variant="outline" onClick={initializeDefaults}>
            Init
          </Button>
        </div>

        <div className="space-y-2">
          {templates.map((template) => (
            <button
              key={template.id}
              onClick={() => selectTemplate(template)}
              className={`w-full text-left p-3 rounded-lg border transition ${
                selectedTemplate?.id === template.id
                  ? 'border-primary bg-primary/5'
                  : 'hover:bg-muted'
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-sm">{template.name}</h3>
                <span className="text-xs bg-muted px-2 py-0.5 rounded">
                  v{template.version}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {template.type.replace('_', ' ')}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col">
        {showEditor && selectedTemplate ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold">{selectedTemplate.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedTemplate.description}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={saveTemplate}>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </div>
            </div>

            {/* Variables */}
            {selectedTemplate.variables.length > 0 && (
              <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                <p className="text-xs font-medium mb-2">Variables:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedTemplate.variables.map((v) => (
                    <code key={v} className="text-xs bg-background px-2 py-1 rounded">
                      {`{{${v}}}`}
                    </code>
                  ))}
                </div>
              </div>
            )}

            {/* Content Editor */}
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="flex-1 p-4 rounded-lg border bg-background font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Template content..."
            />

            {/* Version History */}
            <div className="mt-4 p-3 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <History className="h-4 w-4" />
                <span className="text-sm font-medium">Version History</span>
              </div>
              <div className="flex gap-2 overflow-x-auto">
                {selectedTemplate.versions.map((v) => (
                  <button
                    key={v.version}
                    onClick={() => rollback(selectedTemplate.id, v.version)}
                    className="px-3 py-1 text-xs border rounded hover:bg-muted whitespace-nowrap"
                  >
                    v{v.version} - {new Date(v.createdAt).toLocaleDateString()}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Select a template to edit
          </div>
        )}
      </div>
    </div>
  );
}
