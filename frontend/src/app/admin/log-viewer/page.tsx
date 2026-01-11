'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  ScrollText,
  Loader2,
  RefreshCw,
  Trash2,
  Search,
  Calendar as CalendarIcon,
  Info,
  Activity,
  Cpu,
  MoreHorizontal,
  Download,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { format, subHours, subDays, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { DateRange } from 'react-day-picker';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';

import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface LogEntry {
  id: string;
  level: string;
  category: string;
  action?: string;
  feature?: string;
  message?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  responseTimeMs?: number;
  success?: boolean;
  stackTrace: string | null;
  context: any;
  metadata?: any;
  createdAt: string;
  user?: {
    email: string;
    name: string;
  };
}

type LogType = 'system' | 'activity' | 'usage';

export default function LogViewerPage() {
  const [logData, setLogData] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [logType, setLogType] = useState<LogType>('system');
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  
  // Filters
  const [filters, setFilters] = useState({
    level: 'all',
    category: 'all',
    search: '',
  });
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 7),
    to: new Date()
  });

  // Detail View
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);

  useEffect(() => {
    loadLogData();
  }, [logType, filters, dateRange, pagination.page]);

  const loadLogData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', pagination.page.toString());
      params.set('limit', '50');
      
      if (filters.level && filters.level !== 'all') params.set('level', filters.level);
      if (filters.category && filters.category !== 'all') {
        if (logType === 'system') params.set('category', filters.category);
        if (logType === 'activity') params.set('action', filters.category);
        if (logType === 'usage') params.set('feature', filters.category);
      }
      if (filters.search) params.set('search', filters.search);
      
      if (dateRange?.from) params.set('startDate', startOfDay(dateRange.from).toISOString());
      if (dateRange?.to) params.set('endDate', endOfDay(dateRange.to).toISOString());

      const res = await api.get(`/api/admin/logs/${logType}?${params}`);
      setLogData(res.data.logs);
      setPagination(res.data.pagination);
    } catch (error) {
      console.error('Failed to load logs:', error);
      toast.error('Failed to load logs');
    } finally {
      setLoading(false);
    }
  };

  const cleanup = async () => {
    if (!confirm('Delete logs older than 30 days?')) return;
    try {
      const res = await api.delete('/api/admin/logs/cleanup?days=30');
      const count = res.data.systemLogs + res.data.activityLogs + res.data.usageLogs;
      toast.success(`Cleaned up ${count} logs`);
      loadLogData();
    } catch (error) {
      console.error('Failed to cleanup:', error);
      toast.error('Cleanup failed');
    }
  };

  const exportLogs = () => {
    const dataStr = JSON.stringify(logData, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `jacode-logs-${logType}-${format(new Date(), 'yyyyMMdd-HHmm')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Logs exported successfully');
  };

  // --- Statistics Calculation ---
  const stats = useMemo(() => {
    if (!logData.length) return null;

    if (logType === 'system') {
      const errorCount = logData.filter(l => l.level === 'ERROR' || l.level === 'FATAL').length;
      const warnCount = logData.filter(l => l.level === 'WARN').length;
      return {
        total: pagination.total,
        errors: errorCount,
        warnings: warnCount,
        errorRate: ((errorCount / logData.length) * 100).toFixed(1)
      };
    }

    if (logType === 'usage') {
      const totalTokens = logData.reduce((acc, l) => acc + (l.totalTokens || 0), 0);
      const avgResponseTime = logData.reduce((acc, l) => acc + (l.responseTimeMs || 0), 0) / logData.length;
      const successRate = (logData.filter(l => l.success).length / logData.length * 100).toFixed(1);
      return {
        totalTokens,
        avgResponseTime: Math.round(avgResponseTime),
        successRate
      };
    }
    
    return { total: pagination.total };
  }, [logData, logType, pagination.total]);

  // --- Chart Data Preparation ---
  const chartData = useMemo(() => {
    if (!logData.length) return [];
    
    // Group logs by hour/day
    const grouped = logData.reduce((acc, log) => {
      const date = new Date(log.createdAt);
      const key = format(date, 'MM/dd HH:00');
      
      if (!acc[key]) {
        acc[key] = { 
          name: key, 
          count: 0, 
          errors: 0,
          tokens: 0 
        };
      }
      
      acc[key].count++;
      if (log.level === 'ERROR' || log.level === 'FATAL') acc[key].errors++;
      if (log.totalTokens) acc[key].tokens += log.totalTokens;
      
      return acc;
    }, {} as Record<string, any>);

    return Object.values(grouped).sort((a, b) => a.name.localeCompare(b.name));
  }, [logData]);

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'ERROR':
      case 'FATAL':
        return <Badge variant="destructive">{level}</Badge>;
      case 'WARN':
        return <Badge variant="warning" className="bg-yellow-500 text-white hover:bg-yellow-600">{level}</Badge>;
      case 'INFO':
        return <Badge variant="secondary" className="bg-blue-500 text-white hover:bg-blue-600">{level}</Badge>;
      case 'DEBUG':
        return <Badge variant="outline">{level}</Badge>;
      default:
        return <Badge variant="secondary">{level}</Badge>;
    }
  };

  const getLogIcon = (type: LogType) => {
    switch (type) {
      case 'system': return <Cpu className="h-4 w-4" />;
      case 'activity': return <Activity className="h-4 w-4" />;
      case 'usage': return <ScrollText className="h-4 w-4" />;
    }
  };

  const handleTabChange = (val: string) => {
    setLogType(val as LogType);
    setFilters({ level: 'all', category: 'all', search: '' });
    setPagination(p => ({ ...p, page: 1 }));
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Log Viewer</h2>
          <p className="text-muted-foreground">
            Monitor system events, user activities, and AI usage.
          </p>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" size="sm" onClick={exportLogs} disabled={loading || logData.length === 0}>
             <Download className="h-4 w-4 mr-2" />
             Export
           </Button>
          <Button variant="outline" size="sm" onClick={() => loadLogData()} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button variant="destructive" size="sm" onClick={cleanup}>
            <Trash2 className="h-4 w-4 mr-2" />
            Cleanup
          </Button>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {logType === 'system' && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Events</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.total || 0}</div>
                <p className="text-xs text-muted-foreground">Filtered logs count</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.errorRate || '0.0'}%</div>
                <p className="text-xs text-muted-foreground">Errors & Fatal</p>
              </CardContent>
            </Card>
          </>
        )}
        
        {logType === 'usage' && (
           <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
                <Cpu className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(stats as any)?.totalTokens?.toLocaleString() || 0}</div>
                <p className="text-xs text-muted-foreground">Combined Prompt + Completion</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(stats as any)?.successRate || '0.0'}%</div>
                <p className="text-xs text-muted-foreground">Successful generations</p>
              </CardContent>
            </Card>
            <Card>
               <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                 <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
                 <TrendingUp className="h-4 w-4 text-muted-foreground" />
               </CardHeader>
               <CardContent>
                 <div className="text-2xl font-bold">{(stats as any)?.avgResponseTime || 0}ms</div>
                 <p className="text-xs text-muted-foreground">Average response time</p>
               </CardContent>
             </Card>
           </>
        )}
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
         <Card>
           <CardHeader>
             <CardTitle className="text-sm font-medium">
               {logType === 'usage' ? 'Token Usage Trend' : 'Log Volume Trend'}
             </CardTitle>
           </CardHeader>
           <CardContent>
             <div className="h-[200px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                 {logType === 'usage' ? (
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      />
                      <Bar dataKey="tokens" fill="#8884d8" radius={[4, 4, 0, 0]} />
                    </BarChart>
                 ) : (
                    <LineChart data={chartData}>
                       <CartesianGrid strokeDasharray="3 3" />
                       <XAxis dataKey="name" fontSize={12} />
                       <YAxis fontSize={12} />
                       <Tooltip 
                         contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                       />
                       <Line type="monotone" dataKey="count" stroke="#8884d8" strokeWidth={2} />
                       <Line type="monotone" dataKey="errors" stroke="#ff4d4f" strokeWidth={2} />
                    </LineChart>
                 )}
               </ResponsiveContainer>
             </div>
           </CardContent>
         </Card>
      )}

      {/* Main Tabs & Filters */}
      <div className="flex flex-col gap-4">
        <Tabs value={logType} onValueChange={handleTabChange} className="w-full">
          <TabsList>
            <TabsTrigger value="system" className="flex items-center gap-2">
              <Cpu className="h-4 w-4" /> System
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Activity className="h-4 w-4" /> Activity
            </TabsTrigger>
            <TabsTrigger value="usage" className="flex items-center gap-2">
              <ScrollText className="h-4 w-4" /> AI Usage
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {logType === 'system' && (
                <div className="w-[150px]">
                  <Select 
                    value={filters.level} 
                    onValueChange={(val) => setFilters({ ...filters, level: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Levels</SelectItem>
                      <SelectItem value="DEBUG">Debug</SelectItem>
                      <SelectItem value="INFO">Info</SelectItem>
                      <SelectItem value="WARN">Warning</SelectItem>
                      <SelectItem value="ERROR">Error</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="w-[200px]">
                <Select 
                  value={filters.category} 
                  onValueChange={(val) => setFilters({ ...filters, category: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={
                      logType === 'system' ? 'Category' : 
                      logType === 'activity' ? 'Action' : 'Feature'
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {logType === 'system' && (
                      <>
                        <SelectItem value="api">API</SelectItem>
                        <SelectItem value="queue">Queue</SelectItem>
                        <SelectItem value="model">Model</SelectItem>
                        <SelectItem value="system">System</SelectItem>
                      </>
                    )}
                    {logType === 'usage' && (
                      <>
                        <SelectItem value="chat">Chat</SelectItem>
                        <SelectItem value="completion">Completion</SelectItem>
                        <SelectItem value="code-review">Code Review</SelectItem>
                        <SelectItem value="generation">Generation</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search logs..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    className="pl-8"
                  />
                </div>
              </div>

              <div className="w-[260px]">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateRange && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "LLL dd, y")} -{" "}
                            {format(dateRange.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(dateRange.from, "LLL dd, y")
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
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {logType === 'system' && <TableHead className="w-[100px]">Level</TableHead>}
                  <TableHead className="w-[150px]">
                    {logType === 'system' ? 'Category' : logType === 'activity' ? 'Action' : 'Feature'}
                  </TableHead>
                  <TableHead>Message / Details</TableHead>
                  {logType === 'usage' && <TableHead className="w-[100px]">Tokens</TableHead>}
                  <TableHead className="w-[180px]">Time</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <Loader2 className="h-8 w-8 animate-spin mb-2" />
                        Loading logs...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : logData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      No logs found matching your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  logData.map((log) => (
                    <TableRow key={log.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedLog(log)}>
                      {logType === 'system' && (
                        <TableCell>
                          {getLevelBadge(log.level)}
                        </TableCell>
                      )}
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {log.category || log.action || log.feature}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[500px] truncate">
                          {log.message || (
                             logType === 'usage' 
                               ? `${log.success ? 'Success' : 'Failed'} (${log.responseTimeMs}ms)` 
                               : '-'
                          )}
                          {log.user && <span className="ml-2 text-muted-foreground text-xs">by {log.user.name}</span>}
                        </div>
                      </TableCell>
                      {logType === 'usage' && (
                         <TableCell>
                           <div className="font-mono text-xs">
                             {log.totalTokens?.toLocaleString()}
                           </div>
                         </TableCell>
                      )}
                      <TableCell className="text-muted-foreground text-xs">
                        {format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm:ss')}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Pagination */}
          <div className="flex items-center justify-between p-4 border-t">
            <div className="text-sm text-muted-foreground">
              Showing {logData.length} of {pagination.total} entries
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagination(p => ({ ...p, page: Math.max(1, p.page - 1) }))}
                disabled={pagination.page <= 1}
              >
                Previous
              </Button>
              <div className="text-sm font-medium">
                Page {pagination.page} of {pagination.pages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagination(p => ({ ...p, page: Math.min(p.pages, p.page + 1) }))}
                disabled={pagination.page >= pagination.pages}
              >
                Next
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <Sheet open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <SheetContent className="w-[600px] sm:w-[540px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Log Details</SheetTitle>
            <SheetDescription>
              {selectedLog?.createdAt && format(new Date(selectedLog.createdAt), 'PPP pp')}
            </SheetDescription>
          </SheetHeader>
          
          {selectedLog && (
            <div className="mt-6 space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="text-xs font-medium text-muted-foreground">Type</label>
                     <div className="mt-1 flex items-center gap-2 capitalize">
                        {getLogIcon(logType)} {logType}
                     </div>
                   </div>
                   <div>
                     <label className="text-xs font-medium text-muted-foreground">Category/Action</label>
                     <div className="mt-1">
                        <Badge variant="outline">{selectedLog.category || selectedLog.action || selectedLog.feature}</Badge>
                     </div>
                   </div>
                </div>

                {selectedLog.level && (
                   <div>
                      <label className="text-xs font-medium text-muted-foreground">Level</label>
                      <div className="mt-1">{getLevelBadge(selectedLog.level)}</div>
                   </div>
                )}

                {selectedLog.user && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">User</label>
                    <div className="mt-1 text-sm">
                      {selectedLog.user.name} <span className="text-muted-foreground">({selectedLog.user.email})</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Message */}
              {(selectedLog.message) && (
                 <div className="p-4 bg-muted/50 rounded-lg">
                   <label className="text-xs font-medium text-muted-foreground mb-2 block">Message</label>
                   <p className="text-sm font-mono whitespace-pre-wrap break-all max-h-[200px] overflow-y-auto">{selectedLog.message}</p>
                 </div>
              )}

              {/* Usage Specifics */}
              {logType === 'usage' && (
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">Token Usage</CardTitle>
                  </CardHeader>
                  <CardContent className="py-3">
                    <div className="grid grid-cols-3 gap-4 text-center">
                       <div>
                         <div className="text-2xl font-bold">{selectedLog.promptTokens}</div>
                         <div className="text-xs text-muted-foreground">Prompt</div>
                       </div>
                       <div>
                         <div className="text-2xl font-bold">{selectedLog.completionTokens}</div>
                         <div className="text-xs text-muted-foreground">Completion</div>
                       </div>
                       <div>
                         <div className="text-2xl font-bold text-primary">{selectedLog.totalTokens}</div>
                         <div className="text-xs text-muted-foreground">Total</div>
                       </div>
                    </div>
                    <div className="mt-4 pt-4 border-t flex justify-between text-sm">
                       <span className="text-muted-foreground">Response Time</span>
                       <span className="font-mono">{selectedLog.responseTimeMs}ms</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Context / Metadata / StackTrace */}
              {(selectedLog.context || selectedLog.metadata) && (
                <div>
                   <label className="text-xs font-medium text-muted-foreground mb-2 block">Context / Metadata</label>
                   <div className="bg-slate-950 text-slate-50 p-4 rounded-lg overflow-x-auto max-h-[300px]">
                     <pre className="text-xs">
                       {JSON.stringify(selectedLog.context || selectedLog.metadata, null, 2)}
                     </pre>
                   </div>
                </div>
              )}

              {selectedLog.stackTrace && (
                <div>
                   <label className="text-xs font-medium text-muted-foreground mb-2 block">Stack Trace</label>
                   <div className="bg-red-50 text-red-900 p-4 rounded-lg overflow-x-auto border border-red-100 max-h-[300px]">
                     <pre className="text-xs whitespace-pre-wrap">
                       {selectedLog.stackTrace}
                     </pre>
                   </div>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
