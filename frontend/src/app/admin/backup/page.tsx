'use client';

import { useState, useEffect } from 'react';
import {
  Database,
  Download,
  Upload,
  Loader2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  History,
  Trash2,
  Plus,
  Info,
  Server,
  Settings, 
  ToggleLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { formatDistanceToNow } from 'date-fns';

interface BackupSnapshot {
  id: string;
  category: string;
  createdAt: string;
  createdBy: string;
  description: string;
  snapshot: any;
}

export default function BackupPage() {
  /* State */
  const [activeTab, setActiveTab] = useState('snapshots');
  const [snapshots, setSnapshots] = useState<BackupSnapshot[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Create Dialog
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newBackupDesc, setNewBackupDesc] = useState('');

  // Restore Dialog
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null);
  const [restoreOptions, setRestoreOptions] = useState({
    system_settings: true,
    prompt_templates: true,
    model_servers: true,
    feature_toggles: true,
    ai_models: true,
    routing_policies: true,
  });

  // Settings
  const [backupSchedule, setBackupSchedule] = useState({ enabled: false, frequency: 'daily' });

  useEffect(() => {
    fetchSnapshots();
  }, []);

  const fetchSnapshots = async () => {
    try {
      const res = await api.get('/api/admin/config-backup');
      setSnapshots(res.data);
    } catch (err) {
      console.error('Failed to fetch snapshots', err);
    }
  };

  const handleCreateSnapshot = async () => {
    setLoading('create');
    setError(null);
    try {
      await api.post('/api/admin/config-backup', {
        description: newBackupDesc,
        category: 'full_backup'
      });
      setNewBackupDesc('');
      setIsCreateDialogOpen(false);
      fetchSnapshots();
      setResult({ type: 'success', message: 'System snapshot created successfully' });
    } catch (err: any) {
      setError(err.message || 'Failed to create snapshot');
    } finally {
      setLoading(null);
    }
  };

  const openRestoreDialog = (id: string) => {
    setSelectedSnapshotId(id);
    setIsRestoreDialogOpen(true);
    // Reset options to all true by default
    setRestoreOptions({
      system_settings: true,
      prompt_templates: true,
      model_servers: true,
      feature_toggles: true,
      ai_models: true,
      routing_policies: true,
    });
  };

  const handleRestoreConfirm = async () => {
    if (!selectedSnapshotId) return;
    
    setLoading(`restore-${selectedSnapshotId}`);
    setError(null);
    setIsRestoreDialogOpen(false);

    try {
      // Convert options object to array of keys
      const components = Object.entries(restoreOptions)
        .filter(([_, enabled]) => enabled)
        .map(([key]) => key);

      await api.post(`/api/admin/config-backup/${selectedSnapshotId}/restore`, { components });
      setResult({ type: 'success', message: 'Snapshot restore initiated successfully' });
    } catch (err: any) {
      setError(err.message || 'Failed to restore snapshot');
    } finally {
      setLoading(null);
    }
  };

  const handleDeleteSnapshot = async (id: string) => {
    if (!confirm('Are you sure you want to delete this snapshot?')) return;
    
    setLoading(`delete-${id}`);
    try {
      await api.delete(`/api/admin/config-backup/${id}`);
      fetchSnapshots();
    } catch (err: any) {
      setError(err.message || 'Failed to delete snapshot');
    } finally {
      setLoading(null);
    }
  };

  const handleExport = async () => {
    setLoading('export');
    setError(null);
    try {
      const res = await api.get('/api/admin/backup/export', {
        responseType: 'blob',
      });
      
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `jacode-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setResult({ type: 'success', message: 'Backup exported successfully' });
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
        setResult({ type: 'success', message: 'Import completed', details: res.data });
      } catch (err: any) {
        setError(err.message || 'Failed to import backup');
      } finally {
        setLoading(null);
      }
    };
    
    input.click();
  };

  const toggleOption = (key: keyof typeof restoreOptions) => {
    setRestoreOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Backup & Restore</h2>
          <p className="text-muted-foreground">Manage system configuration snapshots and file backups.</p>
        </div>
      </div>

      {result && (
        <Alert variant={error ? "destructive" : "default"} className={result.type === 'success' ? "border-green-500/50 bg-green-500/10 text-green-600" : ""}>
          {result.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <AlertTitle>{result.type === 'success' ? 'Success' : 'Error'}</AlertTitle>
          <AlertDescription>
            {result.message}
            {result.details && (
              <div className="mt-2 text-xs opacity-90">
                {JSON.stringify(result.details)}
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="snapshots" className="flex-1 flex flex-col" onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="snapshots" className="flex items-center gap-2">
            <History className="h-4 w-4" /> Snapshots
          </TabsTrigger>
          <TabsTrigger value="files" className="flex items-center gap-2">
            <Database className="h-4 w-4" /> File Operations
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" /> Settings
          </TabsTrigger>
          <TabsTrigger value="help" className="flex items-center gap-2">
            <Info className="h-4 w-4" /> How it works
          </TabsTrigger>
        </TabsList>

        <TabsContent value="snapshots" className="flex-1 mt-4">
          <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>System Snapshots</CardTitle>
                <CardDescription>
                  Snapshots store the complete state of the system configuration in the database.
                </CardDescription>
              </div>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Snapshot
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Snapshot</DialogTitle>
                    <DialogDescription>
                      This will save the current state of all system configurations.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <label className="text-sm font-medium mb-2 block">Description (Optional)</label>
                    <input 
                      className="w-full p-2 border rounded-md bg-background" 
                      placeholder="e.g. Before major update"
                      value={newBackupDesc}
                      onChange={(e) => setNewBackupDesc(e.target.value)}
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreateSnapshot} disabled={loading === 'create'}>
                      {loading === 'create' && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Create
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              
              {/* Restore Dialog */}
              <Dialog open={isRestoreDialogOpen} onOpenChange={setIsRestoreDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Restore Snapshot</DialogTitle>
                    <DialogDescription>
                      Select which components you want to restore. Unchecked items will remain unchanged.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4 grid grid-cols-2 gap-4">
                    {Object.entries(restoreOptions).map(([key, enabled]) => (
                      <div key={key} className="flex items-center space-x-2">
                        <input 
                          type="checkbox" 
                          id={key} 
                          checked={enabled}
                          onChange={() => toggleOption(key as keyof typeof restoreOptions)}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <label htmlFor={key} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 capitalize">
                          {key.replace(/_/g, ' ')}
                        </label>
                      </div>
                    ))}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsRestoreDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleRestoreConfirm} disabled={loading?.startsWith('restore')}>
                      {loading?.startsWith('restore') && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Restore Selected
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Created By</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {snapshots.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No snapshots found. Create one to get started.
                        </TableCell>
                      </TableRow>
                    ) : (
                      snapshots.map((snapshot) => (
                        <TableRow key={snapshot.id}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {new Date(snapshot.createdAt).toLocaleDateString()}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(snapshot.createdAt).toLocaleTimeString()}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>{snapshot.description}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{snapshot.category}</Badge>
                          </TableCell>
                          <TableCell>{snapshot.createdBy}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => openRestoreDialog(snapshot.id)}
                                disabled={loading?.startsWith('restore')}
                              >
                                <RefreshCw className="h-3 w-3 mr-1" />
                                Restore
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleDeleteSnapshot(snapshot.id)}
                                disabled={loading?.startsWith('delete')}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="files" className="mt-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Export Configuration
                </CardTitle>
                <CardDescription>
                  Download a JSON file containing all system settings.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted p-4 rounded-md text-sm mb-4">
                  <h4 className="font-medium mb-2">Includes:</h4>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>System Settings</li>
                    <li>Prompt Templates</li>
                    <li>Feature Toggles</li>
                    <li>Model Server Configs</li>
                  </ul>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleExport} disabled={loading === 'export'} className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Download JSON Backup
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Import Configuration
                </CardTitle>
                <CardDescription>
                  Upload a previously exported JSON backup file.
                </CardDescription>
              </CardHeader>
              <CardContent>
                 <Alert className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Warning</AlertTitle>
                  <AlertDescription>
                    Importing will modify existing settings. Use "Overwrite" with caution.
                  </AlertDescription>
                </Alert>
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => handleImport(false)}
                  disabled={loading === 'import'}
                >
                  Merge (Skip Existing)
                </Button>
                <Button 
                  variant="destructive" 
                  className="flex-1"
                  onClick={() => handleImport(true)}
                  disabled={loading === 'import'}
                >
                  Overwrite All
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="settings" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Automated Backups</CardTitle>
              <CardDescription>Configure scheduled backups.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <h4 className="font-medium text-base">Enable Automated Backups</h4>
                  <p className="text-sm text-muted-foreground">Automatically create a snapshot at midnight.</p>
                </div>
                {/* Placeholder for Switch (using Checkbox for now) */}
                <input 
                  type="checkbox"
                  className="h-6 w-6" 
                  checked={backupSchedule.enabled}
                  onChange={(e) => setBackupSchedule({...backupSchedule, enabled: e.target.checked})}
                />
              </div>
              
              <div className="space-y-2">
                 <label className="text-sm font-medium">Frequency</label>
                 <select 
                   className="w-full p-2 border rounded-md bg-background"
                   value={backupSchedule.frequency}
                   onChange={(e) => setBackupSchedule({...backupSchedule, frequency: e.target.value})}
                   disabled={!backupSchedule.enabled}
                 >
                   <option value="daily">Daily (Every Midnight)</option>
                   <option value="weekly">Weekly (Sunday Midnight)</option>
                 </select>
              </div>
              
              <div className="p-4 bg-muted/50 rounded-md text-sm text-muted-foreground flex gap-2">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <p>Retention Policy: Automated backups older than 30 days are automatically deleted to save space.</p>
              </div>
            </CardContent>
            <CardFooter>
               <Button onClick={() => setResult({ type: 'success', message: 'Settings saved (simulation)' })}>
                 Save Settings
               </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="help" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>How Backups Work</CardTitle>
              <CardDescription>Understanding the backup and restore system.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 font-medium">
                    <Server className="h-4 w-4" />
                    1. System Configuration
                  </div>
                  <p className="text-sm text-muted-foreground">
                    The backend stores all configuration in the database. This includes which AI models are active, custom prompt templates, and feature flags (e.g. enabling code review).
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 font-medium">
                    <Database className="h-4 w-4" />
                    2. Snapshots
                  </div>
                  <p className="text-sm text-muted-foreground">
                    A snapshot captures the exact state of all these tables at a point in time. When you "Restore", we invoke the <code>ConfigBackupService</code> to wipe current settings and replace them with the snapshot data.
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 font-medium">
                    <Settings className="h-4 w-4" />
                    3. Live Effect
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Since the AI Editor and Assistant read directly from these database tables, restoring a backup <strong>immediately</strong> changes the behavior of the editor for all users. No restart required.
                  </p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">What is backed up?</h4>
                <div className="grid grid-cols-2 gap-4">
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li><span className="font-medium text-foreground">Prompt Templates:</span> All versions of system prompts.</li>
                    <li><span className="font-medium text-foreground">AI Model Settings:</span> Definitions of active models (Ollama/vLLM).</li>
                  </ul>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li><span className="font-medium text-foreground">Feature Toggles:</span> Global flags like "Safe Mode".</li>
                    <li><span className="font-medium text-foreground">Routing Policies:</span> Rules for model selection.</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
