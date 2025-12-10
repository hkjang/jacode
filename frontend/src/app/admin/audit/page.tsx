'use client';

import { useEffect, useState } from 'react';
import {
  FileSearch,
  Loader2,
  RefreshCw,
  Filter,
  User,
  Clock,
  Settings,
  History,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

interface AuditLog {
  id: string;
  adminEmail: string;
  adminName: string;
  action: string;
  resource: string;
  resourceId: string | null;
  status: string;
  createdAt: string;
}

interface SettingsHistoryEntry {
  id: string;
  key: string;
  category: string;
  changedByName: string;
  createdAt: string;
}

type TabType = 'audit' | 'settings';

export default function AuditPage() {
  const [activeTab, setActiveTab] = useState<TabType>('audit');
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [settingsHistory, setSettingsHistory] = useState<SettingsHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filters, setFilters] = useState({
    action: '',
    resource: '',
  });

  useEffect(() => {
    if (activeTab === 'audit') {
      loadAuditLogs();
    } else {
      loadSettingsHistory();
    }
  }, [activeTab, filters]);

  const loadAuditLogs = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '50');
      if (filters.action) params.set('action', filters.action);
      if (filters.resource) params.set('resource', filters.resource);

      const res = await api.get(`/api/admin/audit/logs?${params}`);
      setAuditLogs(res.data.logs);
      setPagination(res.data.pagination);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSettingsHistory = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '50');

      const res = await api.get(`/api/admin/audit/settings-history?${params}`);
      setSettingsHistory(res.data.history);
      setPagination(res.data.pagination);
    } catch (error) {
      console.error('Failed to load settings history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'bg-green-500/20 text-green-600';
      case 'UPDATE':
        return 'bg-blue-500/20 text-blue-600';
      case 'DELETE':
        return 'bg-red-500/20 text-red-600';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <FileSearch className="h-5 w-5" />
          Audit & History
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => activeTab === 'audit' ? loadAuditLogs() : loadSettingsHistory()}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2">
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 text-sm rounded-t transition flex items-center gap-2 ${
            activeTab === 'audit'
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-muted'
          }`}
        >
          <User className="h-4 w-4" />
          Admin Activity
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 text-sm rounded-t transition flex items-center gap-2 ${
            activeTab === 'settings'
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-muted'
          }`}
        >
          <History className="h-4 w-4" />
          Settings History
        </button>
      </div>

      {/* Filters for audit logs */}
      {activeTab === 'audit' && (
        <div className="flex gap-4">
          <select
            value={filters.action}
            onChange={(e) => setFilters({ ...filters, action: e.target.value })}
            className="px-3 py-2 rounded border bg-background text-sm"
          >
            <option value="">All Actions</option>
            <option value="CREATE">Create</option>
            <option value="UPDATE">Update</option>
            <option value="DELETE">Delete</option>
          </select>
          <select
            value={filters.resource}
            onChange={(e) => setFilters({ ...filters, resource: e.target.value })}
            className="px-3 py-2 rounded border bg-background text-sm"
          >
            <option value="">All Resources</option>
            <option value="users">Users</option>
            <option value="settings">Settings</option>
            <option value="servers">Servers</option>
            <option value="prompts">Prompts</option>
            <option value="features">Features</option>
          </select>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {activeTab === 'audit' ? (
                  <>
                    <th className="text-left px-4 py-3">Admin</th>
                    <th className="text-left px-4 py-3">Action</th>
                    <th className="text-left px-4 py-3">Resource</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">Time</th>
                  </>
                ) : (
                  <>
                    <th className="text-left px-4 py-3">Setting</th>
                    <th className="text-left px-4 py-3">Category</th>
                    <th className="text-left px-4 py-3">Changed By</th>
                    <th className="text-left px-4 py-3">Time</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {activeTab === 'audit' ? (
                auditLogs.map((log) => (
                  <tr key={log.id} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium">{log.adminName}</p>
                        <p className="text-xs text-muted-foreground">{log.adminEmail}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {log.resource}{log.resourceId ? `/${log.resourceId.slice(0, 8)}` : ''}
                      </code>
                    </td>
                    <td className="px-4 py-3">
                      <span className={log.status === 'SUCCESS' ? 'text-green-600' : 'text-red-600'}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                settingsHistory.map((entry) => (
                  <tr key={entry.id} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs">{entry.key}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-muted rounded text-xs">{entry.category}</span>
                    </td>
                    <td className="px-4 py-3">{entry.changedByName}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(entry.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Showing {activeTab === 'audit' ? auditLogs.length : settingsHistory.length} of {pagination.total}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page <= 1}
            onClick={() => activeTab === 'audit' ? loadAuditLogs(pagination.page - 1) : loadSettingsHistory(pagination.page - 1)}
          >
            Previous
          </Button>
          <span className="px-3 py-2">
            Page {pagination.page} of {pagination.pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page >= pagination.pages}
            onClick={() => activeTab === 'audit' ? loadAuditLogs(pagination.page + 1) : loadSettingsHistory(pagination.page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
