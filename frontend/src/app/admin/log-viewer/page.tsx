'use client';

import { useEffect, useState } from 'react';
import {
  ScrollText,
  Loader2,
  RefreshCw,
  Filter,
  Trash2,
  AlertTriangle,
  AlertCircle,
  Info,
  Bug,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

interface LogEntry {
  id: string;
  level: string;
  category: string;
  message: string;
  stackTrace: string | null;
  context: any;
  createdAt: string;
}

type LogType = 'system' | 'activity' | 'usage';

export default function LogViewerPage() {
  const [logData, setLogData] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [logType, setLogType] = useState<LogType>('system');
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filters, setFilters] = useState({
    level: '',
    category: '',
    search: '',
  });

  useEffect(() => {
    loadLogData();
  }, [logType, filters]);

  const loadLogData = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '50');
      if (filters.level) params.set('level', filters.level);
      if (filters.category) params.set('category', filters.category);
      if (filters.search) params.set('search', filters.search);

      const res = await api.get(`/api/admin/logs/${logType}?${params}`);
      setLogData(res.data.logs);
      setPagination(res.data.pagination);
    } catch (error) {
      console.error('Failed to load logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const cleanup = async () => {
    if (!confirm('Delete logs older than 30 days?')) return;
    try {
      const res = await api.delete('/api/admin/logs/cleanup?days=30');
      alert(`Cleaned up ${res.data.systemLogs + res.data.activityLogs + res.data.usageLogs} logs`);
      loadLogData();
    } catch (error) {
      console.error('Failed to cleanup:', error);
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'ERROR':
      case 'FATAL':
        return <Bug className="h-4 w-4 text-red-500" />;
      case 'WARN':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'INFO':
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <ScrollText className="h-5 w-5" />
          System Logs
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => loadLogData()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={cleanup}>
            <Trash2 className="h-4 w-4 mr-2" />
            Cleanup
          </Button>
        </div>
      </div>

      {/* Log Type Tabs */}
      <div className="flex gap-2 border-b pb-2">
        {(['system', 'activity', 'usage'] as LogType[]).map((type) => (
          <button
            key={type}
            onClick={() => setLogType(type)}
            className={`px-4 py-2 text-sm rounded-t transition ${
              logType === type
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            }`}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      {/* Filters */}
      {logType === 'system' && (
        <div className="flex gap-4">
          <select
            value={filters.level}
            onChange={(e) => setFilters({ ...filters, level: e.target.value })}
            className="px-3 py-2 rounded border bg-background text-sm"
          >
            <option value="">All Levels</option>
            <option value="DEBUG">Debug</option>
            <option value="INFO">Info</option>
            <option value="WARN">Warning</option>
            <option value="ERROR">Error</option>
            <option value="FATAL">Fatal</option>
          </select>
          <select
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            className="px-3 py-2 rounded border bg-background text-sm"
          >
            <option value="">All Categories</option>
            <option value="api">API</option>
            <option value="queue">Queue</option>
            <option value="model">Model</option>
            <option value="system">System</option>
          </select>
          <input
            type="text"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            placeholder="Search..."
            className="px-3 py-2 rounded border bg-background text-sm flex-1"
          />
        </div>
      )}

      {/* Log Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {logType === 'system' && <th className="text-left px-4 py-3">Level</th>}
                <th className="text-left px-4 py-3">
                  {logType === 'system' ? 'Category' : logType === 'activity' ? 'Action' : 'Feature'}
                </th>
                <th className="text-left px-4 py-3">Message</th>
                <th className="text-left px-4 py-3">Time</th>
              </tr>
            </thead>
            <tbody>
              {logData.map((log: any) => (
                <tr key={log.id} className="border-t hover:bg-muted/30">
                  {logType === 'system' && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {getLevelIcon(log.level)}
                        <span>{log.level}</span>
                      </div>
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {log.category || log.action || log.feature}
                    </code>
                  </td>
                  <td className="px-4 py-3 max-w-md truncate">
                    {log.message || log.prompt?.slice(0, 50) || '-'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Showing {logData.length} of {pagination.total} logs
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page <= 1}
            onClick={() => loadLogData(pagination.page - 1)}
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
            onClick={() => loadLogData(pagination.page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
