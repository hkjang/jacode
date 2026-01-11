'use client';

import { useEffect, useState } from 'react';
import {
  Activity,
  Server,
  Cpu,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  BarChart3,
  Download,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/lib/api';

// --- Interfaces ---

interface MonitoringMetrics {
  timestamp: string;
  modelServers: {
    total: number;
    online: number;
    offline: number;
    degraded: number;
  };
  promptExecutions: {
    total: number;
    successful: number;
    failed: number;
    averageConfidence: number;
    averageExecutionTime: number;
  };
  circuitBreakers: {
    closed: number;
    open: number;
    halfOpen: number;
  };
  recentErrors: any[];
}

interface Alert {
  level: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: string;
  details?: any;
}

interface UsageMetric {
  timestamp: string;
  totalExecutions: number;
  totalTokens: number;
  estimatedCost: number;
  averageConfidence: number;
}

interface UsageResponse {
  period: 'hour' | 'day' | 'week' | 'month';
  data: UsageMetric[];
}

interface ModelPerformance {
  provider: string;
  modelName: string;
  totalExecutions: number;
  successRate: number;
  averageConfidence: number;
  averageExecutionTime: number;
  errorCount: number;
}

export default function MonitoringPage() {
  const [activeTab, setActiveTab] = useState('live');
  const [metrics, setMetrics] = useState<MonitoringMetrics | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [usageData, setUsageData] = useState<UsageResponse | null>(null);
  const [performanceData, setPerformanceData] = useState<ModelPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  // New State for Analytics
  const [analyticsPeriod, setAnalyticsPeriod] = useState<'day' | 'week' | 'month'>('day');

  // Initial Data Load
  useEffect(() => {
    loadAllData();
  }, []);

  // Update analytics when period changes
  useEffect(() => {
    if (activeTab === 'analytics') {
      loadAnalyticsData();
    }
  }, [analyticsPeriod]);

  // Auto Refresh for Live Data
  useEffect(() => {
    if (autoRefresh && activeTab === 'live') {
      const interval = setInterval(loadLiveData, 5000); // 5 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh, activeTab]);

  const loadLiveData = async () => {
    try {
      const [metricsRes, alertsRes] = await Promise.all([
        api.get('/api/admin/monitoring/metrics'),
        api.get('/api/admin/monitoring/alerts'),
      ]);
      setMetrics(metricsRes.data);
      setAlerts(alertsRes.data);
    } catch (error) {
      console.error('Failed to load live monitoring data:', error);
    }
  };

  const loadAnalyticsData = async () => {
    try {
      // Calculate days based on period for model performance
      const daysMap = { day: 1, week: 7, month: 30 };
      const days = daysMap[analyticsPeriod];

      const [usageRes, perfRes] = await Promise.all([
        api.get(`/api/admin/monitoring/usage?period=${analyticsPeriod}`),
        api.get(`/api/admin/monitoring/models/performance?days=${days}`),
      ]);
      setUsageData(usageRes.data);
      setPerformanceData(perfRes.data);
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([loadLiveData(), loadAnalyticsData()]);
    setLoading(false);
  };

  const handleExportCSV = () => {
    if (performanceData.length === 0) return;

    const headers = ['Provider', 'Model Name', 'Total Executions', 'Success Rate', 'Avg Confidence', 'Avg Latency (ms)', 'Error Count'];
    const rows = performanceData.map(m => [
      m.provider,
      m.modelName,
      m.totalExecutions,
      (m.successRate * 100).toFixed(2) + '%',
      (m.averageConfidence * 100).toFixed(2) + '%',
      m.averageExecutionTime.toFixed(0),
      m.errorCount
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `model_performance_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            시스템 모니터링
          </h2>
          <p className="text-muted-foreground mt-1">
            AI 서비스의 실시간 상태와 성능 지표를 모니터링합니다.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'live' && (
             <div className="flex items-center gap-2 mr-2 bg-muted/50 px-3 py-1.5 rounded-lg border">
              <div className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                />
                실시간 갱신
              </label>
           </div>
          )}
          
          <Button variant="outline" size="sm" onClick={loadAllData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            새로고침
          </Button>

          <HowItWorksDialog />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="live" className="gap-2">
            <Activity className="h-4 w-4" />
            실시간 현황
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            분석 및 통계
          </TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="space-y-6 animate-in fade-in-50">
          {metrics && (
            <>
              <AlertsSection alerts={alerts} />

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  icon={Server}
                  label="전체 서버"
                  value={metrics.modelServers.total}
                  color="text-blue-500"
                  subValue={`${metrics.modelServers.online} Online`}
                />
                <StatCard
                  icon={TrendingUp}
                  label="금일 성공률"
                  value={`${metrics.promptExecutions.total > 0 ? ((metrics.promptExecutions.successful / metrics.promptExecutions.total) * 100).toFixed(1) : 0}%`}
                  color="text-green-500"
                  subValue={`${metrics.promptExecutions.total} Requests`}
                />
                <StatCard
                  icon={Cpu}
                  label="평균 지연시간"
                  value={`${metrics.promptExecutions.averageExecutionTime.toFixed(0)}ms`}
                  color="text-purple-500"
                  subValue="Last 1 Hour"
                />
                 <StatCard
                  icon={AlertCircle}
                  label="서킷 브레이커"
                  value={metrics.circuitBreakers.open > 0 ? `${metrics.circuitBreakers.open} Open` : "Stable"}
                  color={metrics.circuitBreakers.open > 0 ? "text-red-500" : "text-emerald-500"}
                  subValue={`${metrics.circuitBreakers.closed} Services Active`}
                />
              </div>

              <div className="grid lg:grid-cols-3 gap-6">
                <Card className="col-span-1 border-border/50 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Server className="h-4 w-4 text-muted-foreground" />
                      모델 서버 상태
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <StatusRow label="Online" value={metrics.modelServers.online} total={metrics.modelServers.total} color="bg-green-500" />
                    <StatusRow label="Offline" value={metrics.modelServers.offline} total={metrics.modelServers.total} color="bg-red-500" />
                    <StatusRow label="Degraded" value={metrics.modelServers.degraded} total={metrics.modelServers.total} color="bg-yellow-500" />
                  </CardContent>
                </Card>

                 <Card className="col-span-1 border-border/50 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Cpu className="h-4 w-4 text-muted-foreground" />
                      서비스 가용성 (Circuit Breaker)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <StatusRow label="Closed (정상)" value={metrics.circuitBreakers.closed} total={Object.values(metrics.circuitBreakers).reduce((a,b)=>a+b,0)} color="bg-green-500" />
                    <StatusRow label="Half-Open (복구중)" value={metrics.circuitBreakers.halfOpen} total={Object.values(metrics.circuitBreakers).reduce((a,b)=>a+b,0)} color="bg-yellow-500" />
                    <StatusRow label="Open (차단)" value={metrics.circuitBreakers.open} total={Object.values(metrics.circuitBreakers).reduce((a,b)=>a+b,0)} color="bg-red-500" />
                  </CardContent>
                </Card>

                <Card className="col-span-1 lg:col-span-1 border-border/50 shadow-sm flex flex-col">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                      최근 시스템 에러
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 min-h-[200px]">
                    <ScrollArea className="h-[200px] w-full pr-4">
                      {metrics.recentErrors.length > 0 ? (
                        <div className="space-y-3">
                          {metrics.recentErrors.map((error: any, i: number) => (
                            <div key={i} className="text-sm p-3 bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-lg">
                              <p className="font-medium text-red-900 dark:text-red-200 line-clamp-2">{error.message}</p>
                              <p className="text-xs text-red-700/70 dark:text-red-400 mt-1 flex justify-between">
                                <span>{error.code || 'UNKNOWN_ERROR'}</span>
                                <span>{new Date(error.createdAt).toLocaleTimeString()}</span>
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                          <CheckCircle className="h-8 w-8 mb-2 text-green-500/50" />
                          <p>최근 에러 내역이 없습니다</p>
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6 animate-in fade-in-50">
          <div className="flex justify-end mb-4 gap-2">
             <Select 
                value={analyticsPeriod} 
                onValueChange={(value: any) => setAnalyticsPeriod(value)}
             >
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="기간 선택" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="day">최근 24시간</SelectItem>
                    <SelectItem value="week">최근 7일</SelectItem>
                    <SelectItem value="month">최근 30일</SelectItem>
                </SelectContent>
             </Select>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="col-span-1 lg:col-span-2 shadow-sm">
                <CardHeader>
                  <CardTitle>API 호출 및 시간 추이</CardTitle>
                  <CardDescription>
                     선택 기간 동안의 AI 모델 호출 빈도와 평균 응답 시간을 시각화합니다.
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[350px]">
                  {usageData && usageData.data.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={usageData.data.map(d => ({
                        ...d,
                         formattedTime: analyticsPeriod === 'day' 
                            ? new Date(d.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                            : new Date(d.timestamp).toLocaleDateString()
                      }))}>
                        <defs>
                          <linearGradient id="colorExecs" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                           <linearGradient id="colorTime" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                        <XAxis dataKey="formattedTime" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis yAxisId="left" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis yAxisId="right" orientation="right" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                          labelStyle={{ color: 'hsl(var(--foreground))' }}
                        />
                        <Legend />
                        <Area
                            yAxisId="left"
                            type="monotone"
                            dataKey="totalExecutions"
                            name="호출 수"
                            stroke="#3b82f6"
                            fillOpacity={1}
                            fill="url(#colorExecs)"
                        />
                        <Area
                            yAxisId="right"
                            type="monotone"
                            dataKey="totalTokens"
                            name="토큰 사용량"
                            stroke="#10b981"
                            fillOpacity={1}
                            fill="url(#colorTime)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                       데이터가 부족하여 차트를 표시할 수 없습니다.
                    </div>
                  )}
                </CardContent>
            </Card>
          </div>

          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>AI 모델별 성능 리포트</CardTitle>
                <CardDescription>
                    각 AI 모델의 호출 성공률, 평균 응답 시간, 에러 발생 빈도를 비교합니다.
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                 <Download className="h-4 w-4 mr-2" />
                 CSV 다운로드
              </Button>
            </CardHeader>
            <CardContent>
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Provider</TableHead>
                    <TableHead>Model Name</TableHead>
                    <TableHead className="text-right">호출 수</TableHead>
                    <TableHead className="text-right">성공률</TableHead>
                    <TableHead className="text-right">평균 신뢰도</TableHead>
                    <TableHead className="text-right">평균 응답속도</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {performanceData.map((model, i) => (
                    <TableRow key={i}>
                        <TableCell className="font-medium">{model.provider}</TableCell>
                        <TableCell>{model.modelName}</TableCell>
                        <TableCell className="text-right font-mono">{model.totalExecutions.toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                            <Badge variant={model.successRate > 0.9 ? 'outline' : 'destructive'} className={model.successRate > 0.9 ? 'border-green-500 text-green-500' : ''}>
                                {(model.successRate * 100).toFixed(1)}%
                            </Badge>
                        </TableCell>
                         <TableCell className="text-right">{(model.averageConfidence * 100).toFixed(1)}%</TableCell>
                         <TableCell className="text-right font-mono">{model.averageExecutionTime.toFixed(0)}ms</TableCell>
                    </TableRow>
                    ))}
                    {performanceData.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                모델 성능 데이터가 없습니다.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
                </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// --- Sub Components ---

function AlertsSection({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) return null;
  
  return (
    <div className="space-y-2">
      {alerts.map((alert, i) => (
        <div
          key={i}
          className={`p-4 rounded-lg border flex items-start gap-4 shadow-sm animate-in slide-in-from-top-2 ${
            alert.level === 'critical' ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-900/30' :
            alert.level === 'warning' ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-900/30' :
            'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-900/30'
          }`}
        >
          <AlertTriangle className={`h-5 w-5 shrink-0 ${
            alert.level === 'critical' ? 'text-red-600 dark:text-red-400' :
            alert.level === 'warning' ? 'text-yellow-600 dark:text-yellow-400' :
            'text-blue-600 dark:text-blue-400'
          }`} />
          <div className="flex-1">
            <h4 className={`font-semibold text-sm ${
               alert.level === 'critical' ? 'text-red-900 dark:text-red-200' :
               alert.level === 'warning' ? 'text-yellow-900 dark:text-yellow-200' :
               'text-blue-900 dark:text-blue-200'
            }`}>
                {alert.message}
            </h4>
            {alert.details && (
              <p className={`text-xs mt-1 opacity-90 ${
                alert.level === 'critical' ? 'text-red-800 dark:text-red-300' :
                alert.level === 'warning' ? 'text-yellow-800 dark:text-yellow-300' :
                'text-blue-800 dark:text-blue-300'
              }`}>
                {Array.isArray(alert.details) ? alert.details.join(', ') : JSON.stringify(alert.details)}
              </p>
            )}
          </div>
          <span className="text-xs text-muted-foreground shrink-0">
             {new Date(alert.timestamp).toLocaleTimeString()}
          </span>
        </div>
      ))}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, subValue }: { icon: any; label: string; value: string | number; color: string, subValue?: string }) {
  return (
    <Card className="border-border/50 shadow-sm transition-all hover:shadow-md">
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-x-4">
            <div className="flex-1 space-y-1">
                <p className="text-sm font-medium text-muted-foreground leading-none">
                {label}
                </p>
                <p className="text-2xl font-bold tracking-tight">
                {value}
                </p>
                {subValue && (
                    <p className="text-xs text-muted-foreground">
                        {subValue}
                    </p>
                )}
            </div>
          <div className={`p-3 rounded-full bg-muted/50 ${color.replace('text-', 'bg-').replace('500', '100')} dark:bg-muted`}>
            <Icon className={`h-6 w-6 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
    const percentage = total > 0 ? (value / total) * 100 : 0;
    
    return (
        <div className="space-y-1">
            <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-mono font-medium">{value}</span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div 
                    className={`h-full ${color} transition-all duration-500`} 
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
}

function HowItWorksDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Info className="h-5 w-5 text-muted-foreground hover:text-foreground" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>모니터링 시스템 가이드</DialogTitle>
          <DialogDescription>
            관리자 대시보드의 주요 지표와 동작 방식에 대해 설명합니다.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
            <section className="space-y-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    실시간 지표
                </h3>
                <ul className="list-disc pl-5 space-y-2 text-sm text-foreground/80">
                    <li><strong>전체 서버:</strong> 현재 등록된 모든 AI 모델 서버의 수입니다.</li>
                    <li><strong>Online / Offline:</strong> 헬스 체크(Health Check)에 성공하여 요청을 처리할 수 있는 서버는 Online, 응답하지 않는 서버는 Offline으로 분류됩니다.</li>
                    <li><strong>금일 성공률:</strong> 오늘 발생한 모든 프롬프트 실행 요청 중 에러 없이 완료된 건의 비율입니다.</li>
                    <li><strong>평균 지연시간:</strong> 최근 1시간 동안의 AI 모델 응답 시간 평균입니다.</li>
                </ul>
            </section>

            <section className="space-y-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Cpu className="h-5 w-5 text-primary" />
                    Circuit Breaker (장애 차단)
                </h3>
                <div className="text-sm space-y-2 text-foreground/80">
                    <p>외부 AI 서비스 장애가 시스템 전체로 전파되는 것을 막기 위한 안전 장치입니다.</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                        <div className="border p-3 rounded bg-green-50 dark:bg-green-900/10">
                            <strong>✅ Closed (정상)</strong>
                            <p className="text-xs mt-1 text-muted-foreground">에러율이 임계치 이하이며 정상적으로 통신 중입니다.</p>
                        </div>
                        <div className="border p-3 rounded bg-red-50 dark:bg-red-900/10">
                            <strong>⛔ Open (차단됨)</strong>
                            <p className="text-xs mt-1 text-muted-foreground">에러율이 너무 높아 요청을 일시적으로 차단합니다.</p>
                        </div>
                        <div className="border p-3 rounded bg-yellow-50 dark:bg-yellow-900/10">
                            <strong>⚠️ Half-Open (테스트)</strong>
                            <p className="text-xs mt-1 text-muted-foreground">차단 후 일정 시간이 지나 일부 요청만 보내보며 복구를 시도합니다.</p>
                        </div>
                    </div>
                </div>
            </section>

             <section className="space-y-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    분석 데이터
                </h3>
                <ul className="list-disc pl-5 space-y-2 text-sm text-foreground/80">
                    <li><strong>API 호출 추이:</strong> 시간대별 요청량과 토큰 사용량을 보여줍니다. 트래픽 피크 시간을 파악할 수 있습니다.</li>
                    <li><strong>모델별 성능:</strong> 각 LLM 모델(예: GPT-4, Claude 3)별로 실제 응답 속도와 성공률을 비교하여 어떤 모델이 안정적인지 판단할 수 있습니다.</li>
                </ul>
            </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
