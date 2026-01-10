'use client';

import { useEffect, useState } from 'react';
import {
  Shield,
  RefreshCw,
  Loader2,
  XCircle,
  CheckCircle,
  AlertCircle,
  RotateCcw,
  Power,
  PowerOff,
  Activity,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  monitoringWindow: number;
}

interface CircuitBreakerState {
  resourceId: string;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failures: number;
  successes: number;
  lastFailureTime?: number;
  lastStateChange: number;
  totalRequests: number;
  failedRequests: number;
}

export default function CircuitBreakersPage() {
  const [circuits, setCircuits] = useState<CircuitBreakerState[]>([]);
  const [config, setConfig] = useState<CircuitBreakerConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [circuitsRes, configRes] = await Promise.all([
        api.get('/api/admin/circuit-breaker'),
        api.get('/api/admin/circuit-breaker/config'),
      ]);
      setCircuits(circuitsRes.data || []);
      setConfig(configRes.data || null);
    } catch (error) {
      console.error('Failed to load circuit breaker data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCircuits = async () => {
    try {
      const res = await api.get('/api/admin/circuit-breaker');
      setCircuits(res.data || []);
    } catch (error) {
      console.error('Failed to reload circuits:', error);
    }
  };

  const resetCircuit = async (resourceId: string) => {
    try {
      await api.post(`/api/admin/circuit-breaker/${resourceId}/reset`);
      loadCircuits();
    } catch (error) {
      console.error('Failed to reset:', error);
    }
  };

  const forceOpen = async (resourceId: string) => {
    try {
      await api.post(`/api/admin/circuit-breaker/${resourceId}/force-open`);
      loadCircuits();
    } catch (error) {
      console.error('Failed to force open:', error);
    }
  };

  const forceClose = async (resourceId: string) => {
    try {
      await api.post(`/api/admin/circuit-breaker/${resourceId}/force-close`);
      loadCircuits();
    } catch (error) {
      console.error('Failed to force close:', error);
    }
  };

  const resetAll = async () => {
    if (!confirm('모든 Circuit Breaker를 초기화하시겠습니까?')) return;
    try {
      await api.post('/api/admin/circuit-breaker/reset-all');
      loadCircuits();
    } catch (error) {
      console.error('Failed to reset all:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const closedCount = circuits.filter(c => c.state === 'CLOSED').length;
  const openCount = circuits.filter(c => c.state === 'OPEN').length;
  const halfOpenCount = circuits.filter(c => c.state === 'HALF_OPEN').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Circuit Breaker 관리
          </h2>
          <p className="text-muted-foreground mt-1">
            시스템 안정성을 위해 장애가 발생한 외부 서비스 요청을 자동으로 차단하고 복구를 관리합니다.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={resetAll}>
            <RotateCcw className="h-4 w-4 mr-2" />
            전체 초기화
          </Button>
          <Button variant="default" size="sm" onClick={loadCircuits}>
            <RefreshCw className="h-4 w-4 mr-2" />
            새로고침
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatusCard
          title="정상 (Closed)"
          count={closedCount}
          icon={CheckCircle}
          color="text-green-500"
          description="모든 요청 허용"
        />
        <StatusCard
          title="차단 (Open)"
          count={openCount}
          icon={XCircle}
          color="text-red-500"
          description="모든 요청 차단 중"
        />
        <StatusCard
          title="복구 중 (Half-Open)"
          count={halfOpenCount}
          icon={AlertCircle}
          color="text-yellow-500"
          description="일부 요청만 허용하여 테스트"
        />
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">설정 정보 (Global)</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xs space-y-1 mt-2 text-muted-foreground">
              {config && (
                <>
                  <div className="flex justify-between">
                    <span>실패 임계값:</span>
                    <span className="font-medium text-foreground">{config.failureThreshold}회</span>
                  </div>
                  <div className="flex justify-between">
                    <span>복구 임계값:</span>
                    <span className="font-medium text-foreground">{config.successThreshold}회</span>
                  </div>
                  <div className="flex justify-between">
                    <span>차단 시간:</span>
                    <span className="font-medium text-foreground">{config.timeout / 1000}초</span>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4">
        {circuits.map((circuit) => (
          <CircuitCard
            key={circuit.resourceId}
            circuit={circuit}
            config={config}
            onReset={() => resetCircuit(circuit.resourceId)}
            onForceOpen={() => forceOpen(circuit.resourceId)}
            onForceClose={() => forceClose(circuit.resourceId)}
          />
        ))}
        {circuits.length === 0 && (
          <div className="text-center py-12 border rounded-lg bg-muted/10">
            <p className="text-muted-foreground">활성화된 Circuit Breaker가 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusCard({ title, count, icon: Icon, color, description }: any) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{count}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function CircuitCard({
  circuit,
  config,
  onReset,
  onForceOpen,
  onForceClose
}: {
  circuit: CircuitBreakerState;
  config: CircuitBreakerConfig | null;
  onReset: () => void;
  onForceOpen: () => void;
  onForceClose: () => void;
}) {
  const totalRequests = circuit.totalRequests || 0;
  const failedRequests = circuit.failedRequests || 0;
  const failures = circuit.failures || 0;
  const successes = circuit.successes || 0;

  const failureRate = totalRequests > 0 
    ? Math.round((failedRequests / totalRequests) * 100) 
    : 0;
  
  // Progress calculations
  const failureProgress = config 
    ? Math.min((failures / config.failureThreshold) * 100, 100)
    : 0;

  const recoveryProgress = config && circuit.state === 'HALF_OPEN'
    ? Math.min((successes / config.successThreshold) * 100, 100)
    : 0;

  return (
    <Card className="overflow-hidden">
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-2 rounded-full ${
              circuit.state === 'CLOSED' ? 'bg-green-100 text-green-600' :
              circuit.state === 'OPEN' ? 'bg-red-100 text-red-600' :
              'bg-yellow-100 text-yellow-600'
            }`}>
              {circuit.state === 'CLOSED' ? <CheckCircle className="h-6 w-6" /> :
               circuit.state === 'OPEN' ? <XCircle className="h-6 w-6" /> :
               <AlertCircle className="h-6 w-6" />}
            </div>
            <div>
              <h3 className="font-semibold text-lg flex items-center gap-2">
                {circuit.resourceId}
                <Badge variant={circuit.state === 'CLOSED' ? 'default' : 'destructive'} 
                  className={
                    circuit.state === 'CLOSED' ? 'bg-green-500 hover:bg-green-600' :
                    circuit.state === 'OPEN' ? 'bg-red-500 hover:bg-red-600' :
                    'bg-yellow-500 hover:bg-yellow-600'
                  }>
                  {circuit.state}
                </Badge>
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Last changed: {new Date(circuit.lastStateChange).toLocaleTimeString()}
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={onReset}>
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>상태 및 카운터 초기화</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {circuit.state !== 'OPEN' ? (
              <Button variant="outline" size="sm" className="text-red-500 border-red-200 hover:bg-red-50" onClick={onForceOpen}>
                <PowerOff className="h-4 w-4 mr-2" />
                강제 차단
              </Button>
            ) : (
              <Button variant="outline" size="sm" className="text-green-500 border-green-200 hover:bg-green-50" onClick={onForceClose}>
                <Power className="h-4 w-4 mr-2" />
                강제 복구
              </Button>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Status Visualization */}
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">실패 임계값 상태</span>
                <span className="font-medium">
                  {failures} / {config?.failureThreshold || '?'} failures
                </span>
              </div>
              <Progress value={failureProgress} className="h-2" indicatorClassName={
                failureProgress >= 100 ? "bg-red-500" : "bg-primary"
              } />
              <p className="text-xs text-muted-foreground">
                설정된 임계값에 도달하면 회로가 차단(OPEN)됩니다.
              </p>
            </div>

            {circuit.state === 'HALF_OPEN' && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-yellow-600 font-medium">복구 진행률 (Half-Open)</span>
                  <span className="font-medium">
                    {successes} / {config?.successThreshold || '?'} success
                  </span>
                </div>
                <Progress value={recoveryProgress} className="h-2 bg-yellow-100" indicatorClassName="bg-yellow-500" />
                <p className="text-xs text-muted-foreground">
                  연속으로 요청이 성공하면 정상(CLOSED) 상태로 복구됩니다.
                </p>
              </div>
            )}
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-4 text-sm bg-muted/20 p-4 rounded-lg">
            <div>
              <p className="text-muted-foreground mb-1">총 요청 수</p>
              <div className="font-semibold text-lg flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                {totalRequests.toLocaleString()}
              </div>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">실패율</p>
              <div className={`font-semibold text-lg ${failureRate > 0 ? 'text-red-500' : 'text-green-500'}`}>
                {failureRate}%
              </div>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">최근 실패 시간</p>
              <div className="font-medium">
                {circuit.lastFailureTime 
                  ? new Date(circuit.lastFailureTime).toLocaleTimeString() 
                  : '-'}
              </div>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">차단 해제 (예상)</p>
              <div className="font-medium">
                {circuit.state === 'OPEN' && config && circuit.lastFailureTime
                  ? new Date(circuit.lastFailureTime + config.timeout).toLocaleTimeString()
                  : '-'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
