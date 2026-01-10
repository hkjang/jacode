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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

interface CircuitBreakerState {
  resourceId: string;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failures: number;
  successes: number;
  lastFailure: string | null;
  lastSuccess: string | null;
}

export default function CircuitBreakersPage() {
  const [circuits, setCircuits] = useState<CircuitBreakerState[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCircuits();
  }, []);

  const loadCircuits = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/admin/circuit-breaker');
      setCircuits(res.data || []);
    } catch (error) {
      console.error('Failed to load circuits:', error);
    } finally {
      setLoading(false);
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

  const getStateIcon = (state: string) => {
    switch (state) {
      case 'CLOSED':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'OPEN':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'HALF_OPEN':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStateLabel = (state: string) => {
    switch (state) {
      case 'CLOSED':
        return { text: '정상', class: 'bg-green-100 text-green-700' };
      case 'OPEN':
        return { text: '차단', class: 'bg-red-100 text-red-700' };
      case 'HALF_OPEN':
        return { text: '복구중', class: 'bg-yellow-100 text-yellow-700' };
      default:
        return { text: state, class: 'bg-gray-100' };
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Circuit Breaker 관리
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={resetAll}>
            <RotateCcw className="h-4 w-4 mr-2" />
            전체 초기화
          </Button>
          <Button variant="outline" size="sm" onClick={loadCircuits}>
            <RefreshCw className="h-4 w-4 mr-2" />
            새로고침
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-lg border bg-card text-center">
          <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
          <p className="text-2xl font-bold">{closedCount}</p>
          <p className="text-sm text-muted-foreground">Closed (정상)</p>
        </div>
        <div className="p-4 rounded-lg border bg-card text-center">
          <XCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-2xl font-bold">{openCount}</p>
          <p className="text-sm text-muted-foreground">Open (차단)</p>
        </div>
        <div className="p-4 rounded-lg border bg-card text-center">
          <AlertCircle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
          <p className="text-2xl font-bold">{halfOpenCount}</p>
          <p className="text-sm text-muted-foreground">Half-Open (복구중)</p>
        </div>
      </div>

      {/* Circuits List */}
      <div className="space-y-4">
        {circuits.map((circuit) => {
          const stateInfo = getStateLabel(circuit.state);
          return (
            <div
              key={circuit.resourceId}
              className="p-4 rounded-lg border bg-card"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStateIcon(circuit.state)}
                  <div>
                    <h3 className="font-medium">{circuit.resourceId}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded ${stateInfo.class}`}>
                      {stateInfo.text}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => resetCircuit(circuit.resourceId)}
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    리셋
                  </Button>
                  {circuit.state !== 'OPEN' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-500"
                      onClick={() => forceOpen(circuit.resourceId)}
                    >
                      <PowerOff className="h-4 w-4 mr-1" />
                      강제 차단
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-green-500"
                      onClick={() => forceClose(circuit.resourceId)}
                    >
                      <Power className="h-4 w-4 mr-1" />
                      강제 복구
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4 mt-4 text-sm">
                <div>
                  <p className="text-muted-foreground">실패 횟수</p>
                  <p className="font-medium">{circuit.failures}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">성공 횟수</p>
                  <p className="font-medium">{circuit.successes}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">마지막 실패</p>
                  <p className="font-medium">
                    {circuit.lastFailure
                      ? new Date(circuit.lastFailure).toLocaleString()
                      : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">마지막 성공</p>
                  <p className="font-medium">
                    {circuit.lastSuccess
                      ? new Date(circuit.lastSuccess).toLocaleString()
                      : '-'}
                  </p>
                </div>
              </div>
            </div>
          );
        })}

        {circuits.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            등록된 Circuit Breaker가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
