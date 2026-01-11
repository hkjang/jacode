'use client';

import { useEffect, useState } from 'react';
import {
  Bell,
  Plus,
  Loader2,
  Trash2,
  Edit,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
  Coins,
  Timer,
  TrendingUp,
  X,
  Info,
  RotateCw,
  History,
  FileText,
  Play,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

interface CostAlert {
  id: string;
  name: string;
  type: 'TOKEN_LIMIT' | 'COST_LIMIT' | 'RATE_LIMIT';
  threshold: number;
  period: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  isEnabled: boolean;
  lastTriggeredAt: string | null;
  notificationChannels: string[];
  userId?: string;
  teamId?: string;
  createdAt: string;
}

interface UsageTrendItem {
  periodStart: string;
  totalTokens: number;
  estimatedCostUsd: number;
  requestCount: number;
}

const alertTypeLabels: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  TOKEN_LIMIT: { label: '토큰 제한', icon: <Coins className="h-4 w-4" />, color: 'text-blue-500' },
  COST_LIMIT: { label: '비용 제한', icon: <AlertTriangle className="h-4 w-4" />, color: 'text-yellow-500' },
  RATE_LIMIT: { label: '요청률 제한', icon: <Timer className="h-4 w-4" />, color: 'text-red-500' },
};

const periodLabels: Record<string, string> = {
  DAILY: '일별',
  WEEKLY: '주별',
  MONTHLY: '월별',
};

export default function CostAlertsPage() {
  const [alerts, setAlerts] = useState<CostAlert[]>([]);
  const [usageTrend, setUsageTrend] = useState<UsageTrendItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAlert, setEditingAlert] = useState<CostAlert | null>(null);
  const [showExplainer, setShowExplainer] = useState(false);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [alertsRes] = await Promise.all([
        api.get('/api/admin/cost/alerts'),
      ]);
      setAlerts(alertsRes.data || []);
      loadLogs();
    } catch (error) {
      console.error('Failed to load alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await api.get('/api/admin/logs/system', { 
        params: { category: 'cost_alert', limit: 5 } 
      });
      setRecentLogs(res.data.data || []);
    } catch (error) {
      console.error('Failed to load logs:', error);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleRunCheck = async () => {
    setChecking(true);
    try {
      await api.post('/api/admin/cost/alerts/check');
      await loadLogs(); // Refresh logs to see new triggers
      await loadData(); // Refresh alerts to see lastTriggeredAt update
    } catch (error) {
      console.error('Failed to run check:', error);
    } finally {
      setChecking(false);
    }
  };

  const toggleAlert = async (id: string, isEnabled: boolean) => {
    try {
      await api.put(`/api/admin/cost/alerts/${id}/toggle`, { isEnabled });
      setAlerts(alerts.map(a => a.id === id ? { ...a, isEnabled } : a));
    } catch (error) {
      console.error('Failed to toggle alert:', error);
    }
  };

  const deleteAlert = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await api.delete(`/api/admin/cost/alerts/${id}`);
      setAlerts(alerts.filter(a => a.id !== id));
    } catch (error) {
      console.error('Failed to delete alert:', error);
    }
  };

  const handleSaveAlert = async (alertData: Partial<CostAlert>) => {
    try {
      if (editingAlert) {
        const res = await api.put(`/api/admin/cost/alerts/${editingAlert.id}`, alertData);
        setAlerts(alerts.map(a => a.id === editingAlert.id ? res.data : a));
      } else {
        const res = await api.post('/api/admin/cost/alerts', alertData);
        setAlerts([res.data, ...alerts]);
      }
      setShowCreateModal(false);
      setEditingAlert(null);
    } catch (error) {
      console.error('Failed to save alert:', error);
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="h-6 w-6 text-primary" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">비용 알림 설정</h2>
              <button 
                onClick={() => setShowExplainer(true)}
                className="text-muted-foreground hover:text-primary transition"
                title="어떻게 동작하나요?"
              >
                <Info className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">토큰 사용량 및 비용 임계값 알림을 관리합니다</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
             variant="outline" 
             onClick={handleRunCheck} 
             disabled={checking}
             className="gap-2"
          >
            {checking ? (
              <RotateCw className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            지금 검사
          </Button>
          <Button onClick={() => { setEditingAlert(null); setShowCreateModal(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            알림 추가
          </Button>
        </div>
      </div>

      {/* Usage Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 border rounded-lg bg-card">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Coins className="h-4 w-4" />
            활성 알림
          </div>
          <p className="text-2xl font-bold mt-2">{alerts.filter(a => a.isEnabled).length}</p>
        </div>
        <div className="p-4 border rounded-lg bg-card">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <AlertTriangle className="h-4 w-4" />
            이번 달 트리거
          </div>
          <p className="text-2xl font-bold mt-2">{alerts.filter(a => a.lastTriggeredAt && new Date(a.lastTriggeredAt).getMonth() === new Date().getMonth()).length}</p>
        </div>
        <div className="p-4 border rounded-lg bg-card">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <TrendingUp className="h-4 w-4" />
            전체 알림
          </div>
          <p className="text-2xl font-bold mt-2">{alerts.length}</p>
        </div>
        <div className="p-4 border rounded-lg bg-card">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <History className="h-4 w-4" />
            최근 로그
          </div>
          <p className="text-2xl font-bold mt-2">{recentLogs.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-medium flex items-center gap-2">
            <Bell className="h-4 w-4" />
            알림 규칙
          </h3>
        {alerts.length === 0 ? (
          <div className="p-8 border rounded-lg text-center text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>설정된 알림이 없습니다</p>
            <p className="text-sm mt-1">새 알림을 추가하여 비용을 모니터링하세요</p>
          </div>
        ) : (
          alerts.map((alert) => {
            const typeInfo = alertTypeLabels[alert.type];
            return (
              <div
                key={alert.id}
                className={`p-4 border rounded-lg flex items-center justify-between transition ${
                  alert.isEnabled ? 'bg-card' : 'bg-muted/30 opacity-60'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg bg-muted ${typeInfo.color}`}>
                    {typeInfo.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{alert.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        alert.isEnabled ? 'bg-green-500/10 text-green-500' : 'bg-muted text-muted-foreground'
                      }`}>
                        {alert.isEnabled ? '활성' : '비활성'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {typeInfo.label}: {alert.threshold.toLocaleString()} 
                      {alert.type === 'COST_LIMIT' ? ' USD' : alert.type === 'TOKEN_LIMIT' ? ' 토큰' : ' 요청'} 
                      / {periodLabels[alert.period]}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {alert.notificationChannels.map(ch => (
                        <span key={ch} className="text-xs px-1.5 py-0.5 rounded bg-muted">
                          {ch === 'email' ? '📧 이메일' : ch === 'inapp' ? '🔔 인앱' : ch}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleAlert(alert.id, !alert.isEnabled)}
                    className="p-2 hover:bg-muted rounded"
                    title={alert.isEnabled ? '비활성화' : '활성화'}
                  >
                    {alert.isEnabled ? (
                      <ToggleRight className="h-5 w-5 text-green-500" />
                    ) : (
                      <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                    )}
                  </button>
                  <button
                    onClick={() => { setEditingAlert(alert); setShowCreateModal(true); }}
                    className="p-2 hover:bg-muted rounded"
                    title="수정"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => deleteAlert(alert.id)}
                    className="p-2 hover:bg-red-500/10 hover:text-red-500 rounded"
                    title="삭제"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>



        <div className="lg:col-span-1">
           <CostAlertHistory logs={recentLogs} loading={loadingLogs} />
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <AlertModal
          alert={editingAlert}
          onClose={() => { setShowCreateModal(false); setEditingAlert(null); }}
          onSave={handleSaveAlert}
        />
      )}

      {/* Explainer Modal */}
       <AlertExplainer 
        isOpen={showExplainer} 
        onClose={() => setShowExplainer(false)} 
      />
    </div>
  );
}

function CostAlertHistory({ logs, loading }: { logs: any[], loading: boolean }) {
  return (
    <div className="border rounded-lg bg-card h-full">
      <div className="p-4 border-b">
        <h3 className="font-medium flex items-center gap-2">
          <History className="h-4 w-4" />
          최근 알림 이력
        </h3>
      </div>
      <div className="p-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>최근 발생한 알림이 없습니다</p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div key={log.id} className="text-sm border-l-2 border-yellow-500 pl-3 py-1">
                <p className="font-medium">{log.message}</p>
                <div className="flex justify-between items-center text-xs text-muted-foreground mt-1">
                   <span>{new Date(log.createdAt).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AlertExplainer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border rounded-lg w-full max-w-lg p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            비용 알림 동작 방식
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="space-y-4 text-sm">
          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2">
              <Timer className="h-4 w-4 text-blue-500" />
              모니터링 주기
            </h4>
            <p className="text-muted-foreground">
              시스템은 <strong>매 시간(Hourly)</strong>마다 사용량을 집계하고 알림 조건을 검사합니다. 
              설정된 임계값을 초과하더라도, 즉시 알림이 오지 않고 다음 정각 체크 시점에 발송될 수 있습니다.
              <br/>
              <span className="text-xs bg-muted px-1.5 py-0.5 rounded mt-1 inline-block">
                팁: "지금 검사" 버튼으로 즉시 확인할 수 있습니다.
              </span>
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2">
              <Coins className="h-4 w-4 text-yellow-500" />
              임계값 및 기간
            </h4>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li><strong>일별(Daily):</strong> 매일 00:00부터 현재까지의 사용량을 체크합니다.</li>
              <li><strong>월별(Monthly):</strong> 매월 1일부터 현재까지의 사용량을 체크합니다.</li>
              <li>임계값은 해당 기간 내 누적값을 의미합니다.</li>
            </ul>
          </div>

           <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2">
              <ToggleRight className="h-4 w-4 text-green-500" />
              중복 알림 방지
            </h4>
            <p className="text-muted-foreground">
              동일한 기간(예: 오늘, 이번 달) 내에 이미 알림이 발송되었다면, 
              사용량이 계속 증가하더라도 중복해서 알림을 보내지 않습니다.
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={onClose}>확인</Button>
        </div>
      </div>
    </div>
  );
}

function AlertModal({
  alert,
  onClose,
  onSave,
}: {
  alert: CostAlert | null;
  onClose: () => void;
  onSave: (data: Partial<CostAlert>) => void;
}) {
  const [formData, setFormData] = useState({
    name: alert?.name || '',
    type: alert?.type || 'TOKEN_LIMIT',
    threshold: alert?.threshold || 100000,
    period: alert?.period || 'MONTHLY',
    notificationChannels: alert?.notificationChannels || ['email', 'inapp'],
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave(formData);
    setSaving(false);
  };

  const toggleChannel = (channel: string) => {
    setFormData({
      ...formData,
      notificationChannels: formData.notificationChannels.includes(channel)
        ? formData.notificationChannels.filter(c => c !== channel)
        : [...formData.notificationChannels, channel],
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card border rounded-lg w-full max-w-md p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            {alert ? '알림 수정' : '새 알림 추가'}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-1">알림 이름</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="예: 월간 토큰 제한 알림"
              className="w-full px-3 py-2 rounded border bg-background"
              required
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium mb-1">알림 유형</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              className="w-full px-3 py-2 rounded border bg-background"
            >
              <option value="TOKEN_LIMIT">토큰 제한</option>
              <option value="COST_LIMIT">비용 제한 (USD)</option>
              <option value="RATE_LIMIT">요청률 제한</option>
            </select>
          </div>

          {/* Threshold */}
          <div>
            <label className="block text-sm font-medium mb-1">
              임계값 
              {formData.type === 'COST_LIMIT' ? ' (USD)' : formData.type === 'TOKEN_LIMIT' ? ' (토큰)' : ' (요청 수)'}
            </label>
            <input
              type="number"
              value={formData.threshold}
              onChange={(e) => setFormData({ ...formData, threshold: parseFloat(e.target.value) })}
              step={formData.type === 'COST_LIMIT' ? '0.01' : '1'}
              min="0"
              className="w-full px-3 py-2 rounded border bg-background"
              required
            />
          </div>

          {/* Period */}
          <div>
            <label className="block text-sm font-medium mb-1">집계 기간</label>
            <select
              value={formData.period}
              onChange={(e) => setFormData({ ...formData, period: e.target.value as any })}
              className="w-full px-3 py-2 rounded border bg-background"
            >
              <option value="DAILY">일별</option>
              <option value="WEEKLY">주별</option>
              <option value="MONTHLY">월별</option>
            </select>
          </div>

          {/* Notification Channels */}
          <div>
            <label className="block text-sm font-medium mb-2">알림 채널</label>
            <div className="flex gap-2">
              {['email', 'inapp', 'slack'].map((channel) => (
                <button
                  key={channel}
                  type="button"
                  onClick={() => toggleChannel(channel)}
                  className={`px-3 py-1.5 rounded border text-sm transition ${
                    formData.notificationChannels.includes(channel)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'hover:bg-muted'
                  }`}
                >
                  {channel === 'email' ? '📧 이메일' : channel === 'inapp' ? '🔔 인앱' : '💬 Slack'}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              취소
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {alert ? '수정' : '생성'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
