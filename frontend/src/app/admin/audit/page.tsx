'use client';

import { useEffect, useState } from 'react';
import {
  FileSearch,
  Loader2,
  RefreshCw,
  Filter,
  User,
  Settings,
  History,
  Info,
  Calendar as CalendarIcon,
  ChevronRight,
  ChevronLeft,
  X,
  Search,
  Eye,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, subDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';
import { ActivityChart } from '@/components/admin/ActivityChart';

interface AuditLog {
  id: string;
  adminEmail: string;
  adminName: string;
  action: string;
  resource: string;
  resourceId: string | null;
  status: string;
  createdAt: string;
  before?: any;
  after?: any;
  ipAddress?: string;
  userAgent?: string;
  errorMessage?: string;
}

interface SettingsHistoryEntry {
  id: string;
  key: string;
  category: string;
  changedByName: string;
  createdAt: string;
  value: any;
}

type TabType = 'audit' | 'settings';

export default function AuditPage() {
  const [activeTab, setActiveTab] = useState<TabType>('audit');
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [settingsHistory, setSettingsHistory] = useState<SettingsHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // Filters
  const [date, setDate] = useState<DateRange | undefined>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });
  const [filters, setFilters] = useState({
    action: '',
    resource: '',
  });
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (activeTab === 'audit') {
      const delayDebounceFn = setTimeout(() => {
        loadAuditLogs();
      }, 300);
      return () => clearTimeout(delayDebounceFn);
    } else {
      loadSettingsHistory();
    }
  }, [activeTab, filters, date, search]);

  const loadAuditLogs = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '50');
      if (filters.action) params.set('action', filters.action);
      if (filters.resource) params.set('resource', filters.resource);
      if (search) params.set('search', search);
      if (date?.from) params.set('startDate', date.from.toISOString());
      if (date?.to) params.set('endDate', date.to.toISOString());

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
        return 'bg-green-500/10 text-green-600 border-green-200';
      case 'UPDATE':
        return 'bg-blue-500/10 text-blue-600 border-blue-200';
      case 'DELETE':
        return 'bg-red-500/10 text-red-600 border-red-200';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const downloadCSV = () => {
    if (activeTab !== 'audit' || auditLogs.length === 0) return;

    const headers = ['Date', 'Admin', 'Action', 'Resource', 'Resource ID', 'Status'];
    const rows = auditLogs.map(log => [
      format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm:ss'),
      `${log.adminName} (${log.adminEmail})`,
      log.action,
      log.resource,
      log.resourceId || '-',
      log.status
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileSearch className="h-6 w-6" />
            Audit & History
          </h2>
          <p className="text-muted-foreground mt-1">
            Monitor admin activities and system changes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'audit' && (
            <Button variant="outline" size="sm" onClick={downloadCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          )}

          {/* How it works Dialog */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm">
                <Info className="h-4 w-4 mr-2" />
                How it works
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Audit Logging System</DialogTitle>
                <DialogDescription>
                  Understanding how the system tracks and records activities.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4 text-sm">
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" /> Admin Actions
                  </h4>
                  <p className="text-muted-foreground">
                    Every critical action performed by an admin (Create, Update, Delete) is recorded.
                    This includes managing users, servers, and other resources.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Settings className="h-4 w-4 text-primary" /> System Settings
                  </h4>
                  <p className="text-muted-foreground">
                    Changes to global system settings, including Editor Policies and Queue Configurations,
                    are tracked separately to ensure configuration integrity.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Eye className="h-4 w-4 text-primary" /> Detailed View
                  </h4>
                  <p className="text-muted-foreground">
                    Click on any log entry to view the full details, including the exact data changes (Before vs After).
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Button
            variant="outline"
            size="sm"
            onClick={() => activeTab === 'audit' ? loadAuditLogs() : loadSettingsHistory()}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {activeTab === 'audit' && auditLogs.length > 0 && (
         <ActivityChart logs={auditLogs} />
      )}

      {/* Tabs & Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between border-b pb-4">
        <div className="flex gap-1 bg-muted p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('audit')}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2",
              activeTab === 'audit'
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <User className="h-4 w-4" />
            Admin Activity
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2",
              activeTab === 'settings'
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <History className="h-4 w-4" />
            Settings History
          </button>
        </div>

        {activeTab === 'audit' && (
          <div className="flex flex-wrap items-center gap-2">
             <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search logs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-[200px] rounded-md border border-input bg-background pl-9 pr-3 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant={"outline"}
                  className={cn(
                    "w-[240px] justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date?.from ? (
                    date.to ? (
                      <>
                        {format(date.from, "LLL dd, y")} -{" "}
                        {format(date.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(date.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={date?.from}
                  selected={date}
                  onSelect={setDate}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
            
            <div className="flex items-center border rounded-md bg-background px-2">
              <Filter className="h-4 w-4 text-muted-foreground mr-2" />
              <select
                value={filters.action}
                onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                className="h-9 bg-transparent border-none text-sm focus:ring-0 outline-none w-[110px]"
              >
                <option value="">All Actions</option>
                <option value="CREATE">Create</option>
                <option value="UPDATE">Update</option>
                <option value="DELETE">Delete</option>
              </select>
            </div>

            <div className="flex items-center border rounded-md bg-background px-2">
              <Search className="h-4 w-4 text-muted-foreground mr-2" />
              <select
                value={filters.resource}
                onChange={(e) => setFilters({ ...filters, resource: e.target.value })}
                className="h-9 bg-transparent border-none text-sm focus:ring-0 outline-none w-[110px]"
              >
                <option value="">All Resources</option>
                <option value="users">Users</option>
                <option value="settings">Settings</option>
                <option value="servers">Servers</option>
                <option value="prompts">Prompts</option>
                <option value="features">Features</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Content Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
          <p>Loading logs...</p>
        </div>
      ) : (
        <div className="rounded-md border shadow-sm bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground border-b">
              <tr>
                {activeTab === 'audit' ? (
                  <>
                    <th className="text-left px-6 py-3 font-medium">Admin</th>
                    <th className="text-left px-6 py-3 font-medium">Action</th>
                    <th className="text-left px-6 py-3 font-medium">Resource</th>
                    <th className="text-left px-6 py-3 font-medium">Status</th>
                    <th className="text-left px-6 py-3 font-medium">Time</th>
                    <th className="text-right px-6 py-3 font-medium">Details</th>
                  </>
                ) : (
                  <>
                    <th className="text-left px-6 py-3 font-medium">Setting Key</th>
                    <th className="text-left px-6 py-3 font-medium">Category</th>
                    <th className="text-left px-6 py-3 font-medium">Changed By</th>
                    <th className="text-left px-6 py-3 font-medium">Time</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {activeTab === 'audit' ? (
                auditLogs.length > 0 ? (
                  auditLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="group border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => setSelectedLog(log)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{log.adminName}</span>
                          <span className="text-xs text-muted-foreground">{log.adminEmail}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium border", getActionColor(log.action))}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded border font-mono">
                            {log.resource}
                          </code>
                          {log.resourceId && (
                            <span className="text-xs text-muted-foreground font-mono" title={log.resourceId}>
                              #{log.resourceId.slice(0, 8)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "text-xs font-medium",
                          log.status === 'SUCCESS' ? 'text-green-600' : 'text-red-500'
                        )}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {format(new Date(log.createdAt), 'MMM d, y HH:mm')}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                      No logs found for the selected period.
                    </td>
                  </tr>
                )
              ) : (
                settingsHistory.length > 0 ? (
                  settingsHistory.map((entry) => (
                    <tr key={entry.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-6 py-4 font-mono text-xs">{entry.key}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-muted rounded text-xs text-muted-foreground capitalize">{entry.category}</span>
                      </td>
                      <td className="px-6 py-4">{entry.changedByName}</td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {format(new Date(entry.createdAt), 'MMM d, y HH:mm')}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                      No history found.
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between pt-2">
        <p className="text-sm text-muted-foreground">
          Showing <span className="font-medium">{activeTab === 'audit' ? auditLogs.length : settingsHistory.length}</span> of <span className="font-medium">{pagination.total}</span> results
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page <= 1}
            onClick={() => activeTab === 'audit' ? loadAuditLogs(pagination.page - 1) : loadSettingsHistory(pagination.page - 1)}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <span className="text-sm font-medium px-4">
            Page {pagination.page}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page >= pagination.pages}
            onClick={() => activeTab === 'audit' ? loadAuditLogs(pagination.page + 1) : loadSettingsHistory(pagination.page + 1)}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* Detail Sheet */}
      <Sheet open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>Audit Log Details</SheetTitle>
            <SheetDescription>
              Complete information about this event.
            </SheetDescription>
          </SheetHeader>
          
          {selectedLog && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase">Timestamp</span>
                  <p className="text-sm font-medium">{format(new Date(selectedLog.createdAt), 'PPP pp')}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase">Status</span>
                  <p className={cn(
                    "text-sm font-medium",
                    selectedLog.status === 'SUCCESS' ? 'text-green-600' : 'text-red-500'
                  )}>
                    {selectedLog.status}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase">Admin</span>
                  <p className="text-sm">{selectedLog.adminName}</p>
                  <p className="text-xs text-muted-foreground">{selectedLog.adminEmail}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase">IP Address</span>
                  <p className="text-sm font-mono">{selectedLog.ipAddress || 'N/A'}</p>
                </div>
              </div>

              <div className="space-y-2 border rounded-md p-3 bg-muted/20">
                <div className="flex justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase">Action</span>
                  <span className={cn("text-xs font-bold px-2 py-0.5 rounded", getActionColor(selectedLog.action))}>
                    {selectedLog.action}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase">Resource</span>
                  <span className="text-sm font-mono">{selectedLog.resource}</span>
                </div>
                {selectedLog.resourceId && (
                  <div className="flex justify-between">
                    <span className="text-xs font-medium text-muted-foreground uppercase">Resource ID</span>
                    <span className="text-sm font-mono">{selectedLog.resourceId}</span>
                  </div>
                )}
              </div>
              
              {selectedLog.errorMessage && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md">
                  <span className="text-xs font-bold text-red-600 uppercase block mb-1">Error Message</span>
                  <p className="text-sm text-red-600 font-mono break-all">{selectedLog.errorMessage}</p>
                </div>
              )}

              {(selectedLog.before || selectedLog.after) && (
                <div className="space-y-4">
                  <h4 className="font-medium text-sm border-b pb-2">Data Changes</h4>
                  
                  {selectedLog.before && (
                    <div className="space-y-2">
                      <span className="text-xs font-medium text-muted-foreground uppercase">Before</span>
                      <pre className="bg-muted p-3 rounded-md text-xs font-mono overflow-x-auto">
                        {JSON.stringify(selectedLog.before, null, 2)}
                      </pre>
                    </div>
                  )}

                  {selectedLog.after && (
                    <div className="space-y-2">
                      <span className="text-xs font-medium text-muted-foreground uppercase">After</span>
                      <pre className="bg-muted p-3 rounded-md text-xs font-mono overflow-x-auto">
                        {JSON.stringify(selectedLog.after, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
