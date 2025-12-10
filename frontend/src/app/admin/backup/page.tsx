'use client';

import { useState } from 'react';
import {
  Database,
  Download,
  Upload,
  Loader2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

export default function BackupPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setLoading('export');
    setError(null);
    try {
      const res = await api.get('/api/admin/backup/export', {
        responseType: 'blob',
      });
      
      // Create download link
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `jacode-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setResult({ type: 'export', message: 'Backup exported successfully' });
    } catch (err: any) {
      setError(err.message || 'Failed to export backup');
    } finally {
      setLoading(null);
    }
  };

  const handleImport = async (overwrite: boolean) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setLoading('import');
      setError(null);
      
      try {
        const content = await file.text();
        const data = JSON.parse(content);
        
        const res = await api.post(`/api/admin/backup/import?overwrite=${overwrite}`, data);
        setResult({ type: 'import', ...res.data });
      } catch (err: any) {
        setError(err.message || 'Failed to import backup');
      } finally {
        setLoading(null);
      }
    };
    
    input.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Database className="h-5 w-5" />
          Backup & Restore
        </h2>
      </div>

      {/* Export Section */}
      <div className="p-6 rounded-lg border bg-card">
        <h3 className="font-medium mb-3 flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export Configuration
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Download all system settings, prompt templates, feature toggles, and server configurations as JSON.
        </p>
        <Button onClick={handleExport} disabled={loading === 'export'}>
          {loading === 'export' ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Export Backup
        </Button>
      </div>

      {/* Import Section */}
      <div className="p-6 rounded-lg border bg-card">
        <h3 className="font-medium mb-3 flex items-center gap-2">
          <Upload className="h-4 w-4" />
          Import Configuration
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Restore system configuration from a backup JSON file.
        </p>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => handleImport(false)}
            disabled={loading === 'import'}
          >
            {loading === 'import' ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            Import (Skip Existing)
          </Button>
          <Button
            variant="destructive"
            onClick={() => handleImport(true)}
            disabled={loading === 'import'}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Import (Overwrite)
          </Button>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className="p-4 rounded-lg border bg-green-500/10 border-green-500/30">
          <div className="flex items-center gap-2 text-green-600 mb-2">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">
              {result.type === 'export' ? 'Export Successful' : 'Import Successful'}
            </span>
          </div>
          {result.results && (
            <div className="text-sm space-y-1 text-muted-foreground">
              <p>Settings: {result.results.settings.created} created, {result.results.settings.updated} updated, {result.results.settings.skipped} skipped</p>
              <p>Features: {result.results.features.created} created, {result.results.features.updated} updated, {result.results.features.skipped} skipped</p>
              <p>Prompts: {result.results.prompts.created} created, {result.results.prompts.updated} updated, {result.results.prompts.skipped} skipped</p>
              <p>Servers: {result.results.servers.created} created, {result.results.servers.updated} updated, {result.results.servers.skipped} skipped</p>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 rounded-lg border bg-red-500/10 border-red-500/30">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        </div>
      )}
    </div>
  );
}
