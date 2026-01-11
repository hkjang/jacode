'use client';

import { useEffect, useState } from 'react';
import {
  Zap,
  Loader2,
  ToggleLeft,
  ToggleRight,
  Settings,
  RefreshCw,
  Info,
  Shield,
  Code2,
  Wand2,
  FileDiff,
  MessageSquareQuote,
  CheckCircle2,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { api } from '@/lib/api';

interface FeatureToggle {
  id: string;
  key: string;
  name: string;
  description: string | null;
  isEnabled: boolean;
  settings: any;
}

const FEATURE_METADATA: Record<string, { icon: any, label: string, enforcement: string, statusColor: string }> = {
  'smart_context': { icon: MessageSquareQuote, label: 'Smart Context', enforcement: 'Prompt Chain Service', statusColor: 'bg-blue-500/10 text-blue-500' },
  'patch_generation': { icon: FileDiff, label: 'Patch Generation', enforcement: 'Code Generation Service', statusColor: 'bg-purple-500/10 text-purple-500' },
  'inline_explain': { icon: MessageSquareQuote, label: 'Inline Explain', enforcement: 'Editor UI / AI Service', statusColor: 'bg-green-500/10 text-green-500' },
  'auto_fix': { icon: Wand2, label: 'Auto Fix', enforcement: 'Modify Code API', statusColor: 'bg-orange-500/10 text-orange-500' },
  'code_security_filter': { icon: Shield, label: 'Security Filter', enforcement: 'Active Blocking (Pre-check)', statusColor: 'bg-red-500/10 text-red-500' },
  'code_review': { icon: Code2, label: 'Code Review', enforcement: 'Review Service (Middleware)', statusColor: 'bg-indigo-500/10 text-indigo-500' },
};

export default function FeaturesPage() {
  const [features, setFeatures] = useState<FeatureToggle[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    loadFeatures();
  }, []);

  const loadFeatures = async () => {
    try {
      const res = await api.get('/api/admin/features');
      setFeatures(res.data);
    } catch (error) {
      console.error('Failed to load features:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFeature = async (key: string, currentValue: boolean) => {
    setToggling(key);
    try {
      await api.patch(`/api/admin/features/${key}/toggle`, {
        isEnabled: !currentValue,
      });
      await loadFeatures();
    } catch (error) {
      console.error('Failed to toggle feature:', error);
    } finally {
      setToggling(null);
    }
  };

  const initializeDefaults = async () => {
    setLoading(true);
    try {
      await api.post('/api/admin/features/initialize');
      await loadFeatures();
    } catch (error) {
      console.error('Failed to initialize:', error);
    } finally {
      setLoading(false);
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Zap className="h-6 w-6 text-yellow-500" />
            Feature Management
          </h2>
          <p className="text-muted-foreground mt-1">
            Manage system-wide feature toggles and their enforcement policies.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadFeatures}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {features.length === 0 && (
            <Button size="sm" onClick={initializeDefaults}>
              Initialize Defaults
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Feature Toggles</CardTitle>
            <CardDescription>
              Enable or disable specific AI capabilities. Changes applied immediately.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {features.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No features configured. Click "Initialize Defaults" to create default features.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Feature</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Enforcement</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {features.map((feature) => {
                    const meta = FEATURE_METADATA[feature.key] || { icon: Settings, label: feature.name, enforcement: 'Unknown', statusColor: 'bg-gray-100 text-gray-800' };
                    const Icon = meta.icon;
                    
                    return (
                      <TableRow key={feature.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-md ${meta.statusColor}`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="font-medium">{feature.name}</div>
                              <div className="text-xs text-muted-foreground">{feature.description}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={feature.isEnabled ? 'default' : 'secondary'} className={feature.isEnabled ? 'bg-green-500 hover:bg-green-600' : ''}>
                            {feature.isEnabled ? 'Active' : 'Disabled'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Shield className="h-3 w-3" />
                            {meta.enforcement}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost" 
                            size="sm"
                            disabled={toggling === feature.key}
                            onClick={() => toggleFeature(feature.key, feature.isEnabled)}
                            className={feature.isEnabled ? "text-red-500 hover:text-red-600 hover:bg-red-50" : "text-green-500 hover:text-green-600 hover:bg-green-50"}
                          >
                            {toggling === feature.key ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : feature.isEnabled ? (
                              "Disable"
                            ) : (
                              "Enable"
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">System Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Features</span>
                <span className="font-medium">{features.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Active</span>
                <span className="font-medium text-green-600">{features.filter(f => f.isEnabled).length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Disabled</span>
                <span className="font-medium text-red-600">{features.filter(f => !f.isEnabled).length}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/30">
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Info className="h-4 w-4" />
                How it works
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-3">
              <p>
                <strong>Feature Toggles</strong> control the availability of AI capabilities across the platform.
              </p>
              <ul className="list-disc list-inside space-y-1 ml-1">
                <li>Saved in database</li>
                <li>Cached for 60s (requires fresh)</li>
                <li>Enforced at API level</li>
              </ul>
              <div className="mt-4 p-3 bg-secondary rounded-md border text-xs">
                <div className="font-semibold mb-1 flex items-center gap-1">
                   <AlertTriangle className="h-3 w-3 text-orange-500" />
                   Important
                </div>
                Disabling critical features like "Code Security Filter" may expose the system to risks (simulated mode).
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
