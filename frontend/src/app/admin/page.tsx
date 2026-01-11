'use client';

import { useEffect, useState, useRef } from 'react';
import {
  Users,
  FolderKanban,
  Activity,
  FileText,
  Cpu,
  Clock,
  HardDrive,
  Zap,
  Loader2,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  PlayCircle,
  CheckCircle2,
  XCircle,
  Database,
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  Signal
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { socket } from '@/lib/socket';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { toast } from 'sonner';

interface SystemStats {
  users: { total: number; admins: number; active: number; trend: string };
  projects: { total: number; activeToday: number; trend: string };
  tasks: { total: number; pending: number; completed: number; failed: number; executing: number; trend: string };
  artifacts: { total: number; approved: number; rejected: number; draft: number };
  knowledge: { total: number; patterns: number; snippets: number; templates: number };
  system: {
    uptime: string;
    memoryUsage: number;
    dbConnections: number;
    nodeVersion: string;
  };
}

interface RecentTask {
  id: string;
  status: 'PENDING' | 'EXECUTING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
  user: { name: string; email: string };
  project: { name: string };
}

export default function AdminOverviewPage() {
  const router = useRouter();
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [recentTasks, setRecentTasks] = useState<RecentTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const lastUpdateRef = useRef<Date>(new Date());

  // Derived state for charts
  const [taskChartData, setTaskChartData] = useState<any[]>([]);
  const [systemHealthData, setSystemHealthData] = useState<any[]>([]);

  useEffect(() => {
    loadData();

    // Socket Connection
    if (!socket.connected) {
        socket.connect();
    }
    
    function onConnect() {
        setIsConnected(true);
        socket.emit('subscribe-dashboard');
    }

    function onDisconnect() {
        setIsConnected(false);
    }

    function onDashboardUpdate(data: any) {
        // Debounce updates if they come too fast
        const now = new Date();
        if (now.getTime() - lastUpdateRef.current.getTime() > 2000) {
            loadData(false); // Silent reload
            lastUpdateRef.current = now;
            toast.success("Dashboard updated", { description: `New activity detected: ${data.source || 'Unknown'}` });
        }
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('dashboard:update', onDashboardUpdate);

    // Initial subscription if already connected
    if (socket.connected) {
        onConnect();
    }

    return () => {
        socket.off('connect', onConnect);
        socket.off('disconnect', onDisconnect);
        socket.off('dashboard:update', onDashboardUpdate);
        // Do not disconnect socket as it is shared
    };
  }, []);

  const loadData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const [statsRes, tasksRes] = await Promise.all([
        api.get('/api/admin/stats'),
        api.get('/api/admin/tasks/recent'),
      ]);
      setStats(statsRes.data);
      setRecentTasks(tasksRes.data);
      
      // Prepare Chart Data
      const tasks = statsRes.data.tasks;
      setSystemHealthData([
        { name: 'Completed', value: tasks.completed, color: '#22c55e' }, // green-500
        { name: 'Failed', value: tasks.failed, color: '#ef4444' },    // red-500
        { name: 'Pending', value: tasks.pending, color: '#eab308' },  // yellow-500
      ]);

      // Mock time series for "Activity" based on recent tasks
      const activityMap = new Map();
      tasksRes.data.forEach((task: RecentTask) => {
         const hour = new Date(task.createdAt).getHours();
         const hourStr = `${hour}:00`;
         activityMap.set(hourStr, (activityMap.get(hourStr) || 0) + 1);
      });

      const data = Array.from(activityMap.entries()).map(([time, count]) => ({ time, count }));
      if (data.length < 2) {
         setTaskChartData([
            { time: '10:00', count: 12 }, { time: '11:00', count: 19 },
            { time: '12:00', count: 15 }, { time: '13:00', count: 24 },
            { time: '14:00', count: 32 }, { time: '15:00', count: 28 },
         ]);
      } else {
         setTaskChartData(data.sort((a,b) => parseInt(a.time) - parseInt(b.time)));
      }

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      if (showLoading) toast.error("Failed to refresh data");
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge className="bg-green-500 hover:bg-green-600">Completed</Badge>;
      case 'EXECUTING':
        return <Badge className="bg-blue-500 hover:bg-blue-600 animate-pulse">Running</Badge>;
      case 'FAILED':
        return <Badge variant="destructive">Failed</Badge>;
      case 'PENDING':
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <h3 className="text-lg font-semibold">Failed to load system data</h3>
        <Button onClick={() => loadData(true)}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
            <Badge variant="secondary" className="text-xs">v2.1 Real-time</Badge>
            {isConnected && (
                <Badge variant="outline" className="text-xs border-green-500 text-green-500 animate-pulse flex items-center gap-1">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    Live
                </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1">
            System overview, analytics, and real-time monitoring
          </p>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" onClick={() => loadData(true)}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
          <Button onClick={() => router.push('/admin/settings')}>
            System Settings
          </Button>
        </div>
      </div>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Users"
          value={stats.users.total}
          icon={Users}
          description={`${stats.users.admins} administrators`}
          trend={stats.users.trend}
          trendColor="text-green-500"
        />
        <StatsCard
          title="Active Projects"
          value={stats.projects.total}
          icon={FolderKanban}
          description={`${stats.projects.activeToday} active recently`}
          trend={stats.projects.trend}
          trendColor="text-green-500"
        />
        <StatsCard
          title="Total Tasks Today"
          value={stats.tasks.total} 
          icon={Activity}
          description={`${stats.tasks.executing} running now`}
          trend={stats.tasks.trend}
          trendColor={stats.tasks.trend.startsWith('-') ? 'text-red-500' : 'text-green-500'}
        />
        <StatsCard
          title="System Health"
          value="98%"
          icon={ShieldCheck}
          description={`Uptime: ${stats.system.uptime}`}
          trend="Stable"
          trendColor="text-green-500"
        />
      </div>

      {/* Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[400px]">
         <Card className="lg:col-span-2 flex flex-col">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <BarChartIcon className="h-5 w-5 text-primary" />
                    Task Activity
                </CardTitle>
                <CardDescription>
                    Number of tasks executed per hour
                </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={taskChartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis 
                            dataKey="time" 
                            stroke="#888888" 
                            fontSize={12} 
                            tickLine={false} 
                            axisLine={false}
                        />
                        <YAxis 
                            stroke="#888888" 
                            fontSize={12} 
                            tickLine={false} 
                            axisLine={false}
                            tickFormatter={(value) => `${value}`}
                        />
                        <Tooltip 
                            contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                            itemStyle={{ color: 'hsl(var(--foreground))' }}
                        />
                        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
         </Card>

         <Card className="flex flex-col">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <PieChartIcon className="h-5 w-5 text-primary" />
                    Task Distribution
                </CardTitle>
                <CardDescription>
                    Status breakdown of all tasks
                </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 min-h-[300px] flex flex-col items-center justify-center">
                <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                        <Pie
                            data={systemHealthData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {systemHealthData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip 
                             contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                             itemStyle={{ color: 'hsl(var(--foreground))' }}
                        />
                    </PieChart>
                </ResponsiveContainer>
                <div className="flex gap-4 text-xs">
                    {systemHealthData.map((item, i) => (
                        <div key={i} className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                            <span>{item.name}</span>
                        </div>
                    ))}
                </div>
            </CardContent>
         </Card>
      </div>

      {/* Data & Actions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Tasks List */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Agent Tasks</CardTitle>
                  <CardDescription>Latest automation tasks executed by the system</CardDescription>
                </div>
                <Button variant="ghost" size="sm" className="gap-1" onClick={() => router.push('/admin/tasks')}>
                  View All <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Task</TableHead>
                    <TableHead>User & Project</TableHead>
                    <TableHead className="text-right">Time</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentTasks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                        No recent tasks found
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentTasks.slice(0, 5).map((task) => (
                      <TableRow key={task.id} className="cursor-pointer hover:bg-muted/50" onClick={() => {}}>
                        <TableCell>{getStatusBadge(task.status)}</TableCell>
                        <TableCell className="font-medium truncate max-w-[200px]">
                          {task.id.slice(0, 8)}...
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{task.user?.name || 'Unknown'}</span>
                            <span className="text-xs text-muted-foreground">{task.project?.name || 'Unknown Project'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground text-sm">
                          {new Date(task.createdAt).toLocaleTimeString()}
                        </TableCell>
                        <TableCell>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: System Status & Quick Actions */}
        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="h-5 w-5 text-primary" />
                System Resources
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <HardDrive className="h-4 w-4" /> Memory
                  </span>
                  <span className={stats.system.memoryUsage > 80 ? 'text-red-500 font-bold' : 'text-foreground'}>
                    {stats.system.memoryUsage}%
                  </span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      stats.system.memoryUsage > 80 ? 'bg-red-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${stats.system.memoryUsage}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Database className="h-4 w-4" /> DB Connections
                  </span>
                  <span>{stats.system.dbConnections}</span>
                </div>
              </div>

               <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="p-3 bg-muted/40 rounded-lg text-center">
                     <div className="text-2xl font-bold">{stats.knowledge.total}</div>
                     <div className="text-xs text-muted-foreground">Knowledge</div>
                  </div>
                  <div className="p-3 bg-muted/40 rounded-lg text-center">
                     <div className="text-2xl font-bold">{stats.artifacts.total}</div>
                     <div className="text-xs text-muted-foreground">Artifacts</div>
                  </div>
               </div>
              
              <div className="pt-4 border-t">
                 <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Uptime: {stats.system.uptime}</span>
                 </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start gap-2" onClick={() => router.push('/admin/users')}>
                <Users className="h-4 w-4" />
                Manage Users
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2" onClick={() => router.push('/admin/monitoring')}>
                <Activity className="h-4 w-4" />
                System Monitoring
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2" onClick={() => router.push('/admin/audit')}>
                <FileText className="h-4 w-4" />
                View Audit Logs
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2" onClick={() => router.push('/admin/queue')}>
                 <RefreshCw className="h-4 w-4" />
                 Manage Queue
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatsCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  trendColor = 'text-muted-foreground',
}: {
  title: string;
  value: string | number;
  icon: any;
  description: string;
  trend?: string;
  trendColor?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">
          {description}
        </p>
        {trend && (
           <div className="flex items-center mt-2">
               <span className={`text-xs font-bold ${trendColor}`}>{trend}</span>
               <span className="text-xs text-muted-foreground ml-1"> from yesterday</span>
           </div>
        )}
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
    return (
        <div className="space-y-8 animate-in fade-in">
           <div className="flex items-center justify-between">
              <div>
                  <Skeleton className="h-8 w-48 mb-2" />
                  <Skeleton className="h-4 w-64" />
              </div>
              <div className="flex gap-2">
                 <Skeleton className="h-9 w-24" />
                 <Skeleton className="h-9 w-32" />
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                  <Card key={i}>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-4 w-4 rounded-full" />
                      </CardHeader>
                      <CardContent>
                          <Skeleton className="h-8 w-16 mb-2" />
                          <Skeleton className="h-3 w-32" />
                      </CardContent>
                  </Card>
              ))}
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[400px]">
               <Card className="lg:col-span-2">
                   <CardHeader>
                       <Skeleton className="h-6 w-32 mb-2" />
                       <Skeleton className="h-4 w-48" />
                   </CardHeader>
                   <CardContent>
                       <Skeleton className="h-[300px] w-full" />
                   </CardContent>
               </Card>
               <Card>
                   <CardHeader>
                       <Skeleton className="h-6 w-32 mb-2" />
                       <Skeleton className="h-4 w-48" />
                   </CardHeader>
                   <CardContent className="flex items-center justify-center">
                       <Skeleton className="h-[250px] w-[250px] rounded-full" />
                   </CardContent>
               </Card>
           </div>
           
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
               <Card className="lg:col-span-2 h-64">
                   <CardHeader>
                       <Skeleton className="h-6 w-32" />
                   </CardHeader>
                   <CardContent>
                       <div className="space-y-4">
                           <Skeleton className="h-12 w-full" />
                           <Skeleton className="h-12 w-full" />
                           <Skeleton className="h-12 w-full" />
                       </div>
                   </CardContent>
               </Card>
               <Card className="h-64">
                   <CardHeader>
                       <Skeleton className="h-6 w-32" />
                   </CardHeader>
                   <CardContent>
                       <div className="space-y-4">
                           <Skeleton className="h-4 w-full" />
                           <Skeleton className="h-4 w-full" />
                           <Skeleton className="h-4 w-full" />
                       </div>
                   </CardContent>
               </Card>
           </div>
        </div>
    );
}
