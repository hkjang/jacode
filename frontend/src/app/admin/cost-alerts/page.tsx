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
    } catch (error) {
      console.error('Failed to load alerts:', error);
    } finally {
      setLoading(false);
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
            <h2 className="text-lg font-semibold">비용 알림 설정</h2>
            <p className="text-sm text-muted-foreground">토큰 사용량 및 비용 임계값 알림을 관리합니다</p>
          </div>
        </div>
        <Button onClick={() => { setEditingAlert(null); setShowCreateModal(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          알림 추가
        </Button>
      </div>

      {/* Usage Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
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
            최근 트리거
          </div>
          <p className="text-2xl font-bold mt-2">{alerts.filter(a => a.lastTriggeredAt).length}</p>
        </div>
        <div className="p-4 border rounded-lg bg-card">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <TrendingUp className="h-4 w-4" />
            전체 알림
          </div>
          <p className="text-2xl font-bold mt-2">{alerts.length}</p>
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        <h3 className="font-medium">알림 규칙</h3>
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

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <AlertModal
          alert={editingAlert}
          onClose={() => { setShowCreateModal(false); setEditingAlert(null); }}
          onSave={handleSaveAlert}
        />
      )}
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
