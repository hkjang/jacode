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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

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

export default function MonitoringPage() {
  const [metrics, setMetrics] = useState<MonitoringMetrics | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadData();
    
    if (autoRefresh) {
      const interval = setInterval(loadData, 10000); // 10초마다
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const loadData = async () => {
    try {
      const [metricsRes, alertsRes] = await Promise.all([
        api.get('/api/admin/monitoring/metrics'),
        api.get('/api/admin/monitoring/alerts'),
      ]);
      setMetrics(metricsRes.data);
      setAlerts(alertsRes.data);
    } catch (error) {
      console.error('Failed to load monitoring data:', error);
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

  if (!metrics) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Failed to load monitoring data.
        <Button variant="outline" className="ml-4" onClick={loadData}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Activity className="h-5 w-5" />
          실시간 모니터링
        </h2>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            자동 새로고침
          </label>
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            새로고침
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, i) => (
            <div
              key={i}
              className={`p-4 rounded-lg border flex items-start gap-3 ${
                alert.level === 'critical' ? 'bg-red-50 border-red-200 dark:bg-red-900/20' :
                alert.level === 'warning' ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20' :
                'bg-blue-50 border-blue-200 dark:bg-blue-900/20'
              }`}
            >
              <AlertTriangle className={`h-5 w-5 ${
                alert.level === 'critical' ? 'text-red-500' :
                alert.level === 'warning' ? 'text-yellow-500' :
                'text-blue-500'
              }`} />
              <div>
                <p className="font-medium">{alert.message}</p>
                {alert.details && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {JSON.stringify(alert.details)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Server Status */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Server}
          label="전체 서버"
          value={metrics.modelServers.total}
          color="text-blue-500"
        />
        <StatCard
          icon={CheckCircle}
          label="온라인"
          value={metrics.modelServers.online}
          color="text-green-500"
        />
        <StatCard
          icon={XCircle}
          label="오프라인"
          value={metrics.modelServers.offline}
          color="text-red-500"
        />
        <StatCard
          icon={AlertCircle}
          label="성능저하"
          value={metrics.modelServers.degraded}
          color="text-yellow-500"
        />
      </div>

      {/* Execution Stats */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-lg border bg-card">
          <h3 className="font-medium mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            실행 현황 (최근 1시간)
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">총 실행</span>
              <span className="font-bold text-2xl">{metrics.promptExecutions.total}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">성공률</span>
              <span className="font-medium text-green-500">
                {metrics.promptExecutions.total > 0
                  ? ((metrics.promptExecutions.successful / metrics.promptExecutions.total) * 100).toFixed(1)
                  : 0}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">평균 신뢰도</span>
              <span className="font-medium">
                {(metrics.promptExecutions.averageConfidence * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">평균 실행 시간</span>
              <span className="font-medium">
                {metrics.promptExecutions.averageExecutionTime.toFixed(0)}ms
              </span>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-lg border bg-card">
          <h3 className="font-medium mb-4 flex items-center gap-2">
            <Cpu className="h-4 w-4" />
            Circuit Breaker 상태
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 bg-green-500 rounded-full" />
                Closed (정상)
              </span>
              <span className="font-bold">{metrics.circuitBreakers.closed}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 bg-red-500 rounded-full" />
                Open (차단)
              </span>
              <span className="font-bold">{metrics.circuitBreakers.open}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 bg-yellow-500 rounded-full" />
                Half-Open (복구중)
              </span>
              <span className="font-bold">{metrics.circuitBreakers.halfOpen}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Errors */}
      {metrics.recentErrors.length > 0 && (
        <div className="p-6 rounded-lg border bg-card">
          <h3 className="font-medium mb-4">최근 에러</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {metrics.recentErrors.map((error: any, i: number) => (
              <div key={i} className="text-sm p-2 bg-muted rounded">
                <p className="font-medium">{error.message}</p>
                <p className="text-muted-foreground text-xs">
                  {new Date(error.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div className="p-4 rounded-lg border bg-card">
      <div className="flex items-center gap-3">
        <Icon className={`h-8 w-8 ${color}`} />
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}
