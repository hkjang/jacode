'use client';

import { useEffect, useState } from 'react';
import {
  Settings,
  Loader2,
  RefreshCw,
  Save,
  Bell,
  HelpCircle,
  Megaphone,
  Mail,
  Zap,
  LayoutDashboard,
  Server,
  ArrowRight,
  MonitorPlay,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { api } from '@/lib/api';

interface SettingCategory {
  [key: string]: any;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<{
    editor: SettingCategory;
    queue: SettingCategory;
    notification: SettingCategory;
  }>({
    editor: {},
    queue: {},
    notification: {},
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'overview' | 'editor' | 'queue' | 'notification'>('overview');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const [editor, queue, notification] = await Promise.all([
        api.get('/api/admin/settings/editor'),
        api.get('/api/admin/settings/queue'),
        api.get('/api/admin/settings/notification'),
      ]);
      setSettings({
        editor: editor.data || {},
        queue: queue.data || {},
        notification: notification.data || {},
      });
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await api.patch(`/api/admin/settings/${activeCategory}`, settings[activeCategory as keyof typeof settings]);
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Failed to save:', error);
      alert('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const initializeDefaults = async () => {
    if (!confirm('This will reset all settings to default values. Continue?')) return;
    
    setLoading(true);
    try {
      await api.post('/api/admin/settings/initialize');
      await loadSettings();
    } catch (error) {
      console.error('Failed to initialize:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = (key: string, value: any) => {
    setSettings({
      ...settings,
      [activeCategory]: {
        ...settings[activeCategory as keyof typeof settings],
        [key]: value,
      },
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const categories = [
    { key: 'overview', label: 'Overview', icon: LayoutDashboard, description: '시스템 설정 동작 원리 및 상태' },
    { key: 'editor', label: 'Editor Policy', icon: Settings, description: 'Monaco 에디터 기본 설정' },
    { key: 'queue', label: 'Queue Settings', icon: RefreshCw, description: 'BullMQ 작업 큐 설정' },
    { key: 'notification', label: 'Notifications', icon: Bell, description: '시스템 알림 및 공지 설정' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold tracking-tight">System Settings</h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={initializeDefaults}>
            Initialize Defaults
          </Button>
          {activeCategory !== 'overview' && (
            <Button size="sm" onClick={saveSettings} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Changes
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar Tabs */}
        <aside className="w-full md:w-64 space-y-1">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key as any)}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeCategory === cat.key
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              <cat.icon className="h-4 w-4" />
              <div className="text-left">
                <div>{cat.label}</div>
              </div>
            </button>
          ))}
        </aside>

        {/* content */}
        <div className="flex-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{categories.find(c => c.key === activeCategory)?.label}</CardTitle>
              <CardDescription>
                {categories.find(c => c.key === activeCategory)?.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeCategory === 'overview' && (
                <div className="space-y-8">
                  <div className="bg-muted/30 p-6 rounded-xl border border-dashed">
                    <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                      <Zap className="h-5 w-5 text-yellow-500" />
                      실시간 설정 전파 시스템 (Real-time Config Propagation)
                    </h3>
                    
                    {/* Flow Diagram */}
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 relative">
                      {/* Admin Node */}
                      <div className="flex flex-col items-center gap-2 z-10 w-full md:w-auto">
                        <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center border-2 border-primary/20">
                          <Settings className="h-8 w-8 text-primary" />
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-sm">Admin Console</div>
                          <div className="text-xs text-muted-foreground">설정 변경 및 저장</div>
                        </div>
                      </div>

                      {/* Connection 1 */}
                      <div className="hidden md:flex flex-1 items-center justify-center -mx-4">
                         <div className="h-0.5 w-full bg-border relative">
                            <div className="absolute right-0 top-1/2 -translate-y-1/2">
                                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <span className="absolute top-[-20px] left-1/2 -translate-x-1/2 text-[10px] bg-background px-2 text-muted-foreground uppercase tracking-wider">REST API</span>
                         </div>
                      </div>

                      {/* Server Node */}
                      <div className="flex flex-col items-center gap-2 z-10 w-full md:w-auto">
                        <div className="h-16 w-16 bg-blue-500/10 rounded-2xl flex items-center justify-center border-2 border-blue-500/20">
                          <Server className="h-8 w-8 text-blue-500" />
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-sm">Backend Server</div>
                          <div className="text-xs text-muted-foreground">DB 저장 & 이벤트 발행</div>
                        </div>
                      </div>

                      {/* Connection 2 */}
                      <div className="hidden md:flex flex-1 items-center justify-center -mx-4">
                         <div className="h-0.5 w-full bg-border relative">
                            <div className="absolute right-0 top-1/2 -translate-y-1/2">
                                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <span className="absolute top-[-20px] left-1/2 -translate-x-1/2 text-[10px] bg-background px-2 text-muted-foreground uppercase tracking-wider">WebSocket</span>
                         </div>
                      </div>

                      {/* Client Node */}
                      <div className="flex flex-col items-center gap-2 z-10 w-full md:w-auto">
                        <div className="h-16 w-16 bg-green-500/10 rounded-2xl flex items-center justify-center border-2 border-green-500/20">
                          <MonitorPlay className="h-8 w-8 text-green-500" />
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-sm">Editor Clients</div>
                          <div className="text-xs text-muted-foreground">실시간 반영 (No Refresh)</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center gap-2">
                                <MonitorPlay className="h-4 w-4 text-primary" />
                                Editor Application
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm space-y-3">
                            <p>에디터 설정은 사용자 경험에 즉시 영향을 미칩니다.</p>
                            <div className="space-y-2">
                                <div className="flex items-start gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                                    <span><strong>즉시 적용:</strong> 폰트 크기, 탭 간격, 미니맵 등은 저장 즉시 모든 연결된 에디터에 반영됩니다.</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                                    <span><strong>알림:</strong> 설정 변경 시 사용자에게 '정책 업데이트' 토스트 알림이 발송됩니다.</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
                                    <span><strong>테마:</strong> 테마는 사용자의 시스템 설정/개인 설정을 따르므로 관리자 설정보다 우선순위가 낮을 수 있습니다.</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Server className="h-4 w-4 text-primary" />
                                Queue & System
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm space-y-3">
                            <p>백엔드 시스템 설정은 작업 처리 방식에 영향을 줍니다.</p>
                            <div className="space-y-2">
                                <div className="flex items-start gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                                    <span><strong>동적 조정:</strong> 재시도 횟수, 타임아웃 등은 서비스 재시작 없이 다음 작업부터 적용됩니다.</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                                    <span><strong>안전성:</strong> 실행 중인 작업은 기존 설정을 유지하며 안전하게 완료됩니다.</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {activeCategory === 'editor' && (
                <>
                  <Alert className="mb-4">
                    <AlertTitle>Editor Configuration</AlertTitle>
                    <AlertDescription>
                        이 설정들은 모든 프로젝트의 에디터에 기본값으로 적용됩니다.
                    </AlertDescription>
                  </Alert>
                  <SettingRow
                    label="Font Size"
                    description="기본 폰트 크기 (px)"
                    value={settings.editor['editor.fontSize']}
                    type="number"
                    onChange={(v) => updateSetting('editor.fontSize', parseInt(v))}
                    min={10}
                    max={30}
                  />
                  <SettingRow
                    label="Tab Size"
                    description="탭 크기 (spaces)"
                    value={settings.editor['editor.tabSize']}
                    type="number"
                    onChange={(v) => updateSetting('editor.tabSize', parseInt(v))}
                    min={2}
                    max={8}
                  />
                  <SettingRow
                    label="Minimap"
                    description="미니맵 표시 여부"
                    value={settings.editor['editor.minimap']}
                    type="toggle"
                    onChange={(v) => updateSetting('editor.minimap', v)}
                  />
                  <SettingRow
                    label="Word Wrap"
                    description="자동 줄바꿈 설정"
                    value={settings.editor['editor.wordWrap']}
                    type="select"
                    options={['on', 'off', 'wordWrapColumn', 'bounded']}
                    onChange={(v) => updateSetting('editor.wordWrap', v)}
                  />
                   <SettingRow
                    label="Auto Complete"
                    description="코드 자동완성 기능 활성화"
                    value={settings.editor['editor.autoComplete']}
                    type="toggle"
                    onChange={(v) => updateSetting('editor.autoComplete', v)}
                  />
                </>
              )}

              {activeCategory === 'queue' && (
                <>
                  <SettingRow
                    label="Max Concurrency"
                    description="최대 동시 작업 수"
                    value={settings.queue['queue.maxConcurrency']}
                    type="number"
                    onChange={(v) => updateSetting('queue.maxConcurrency', parseInt(v))}
                  />
                  <SettingRow
                    label="Retry Attempts"
                    description="작업 재시도 횟수"
                    value={settings.queue['queue.retryAttempts']}
                    type="number"
                    onChange={(v) => updateSetting('queue.retryAttempts', parseInt(v))}
                  />
                  <SettingRow
                    label="Retry Delay (ms)"
                    description="재시도 지연 시간"
                    value={settings.queue['queue.retryDelay']}
                    type="number"
                    onChange={(v) => updateSetting('queue.retryDelay', parseInt(v))}
                  />
                  <SettingRow
                    label="Job Timeout (ms)"
                    description="작업 타임아웃"
                    value={settings.queue['queue.jobTimeout']}
                    type="number"
                    onChange={(v) => updateSetting('queue.jobTimeout', parseInt(v))}
                  />
                </>
              )}

              {activeCategory === 'notification' && (
                <>
                  <div className="bg-muted/50 p-4 rounded-lg mb-4 flex gap-3 text-sm text-muted-foreground">
                    <Megaphone className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      이 설정들은 시스템 전체 알림 동작을 제어합니다. 공지사항을 입력하면 모든 사용자에게 즉시 표시됩니다.
                    </div>
                  </div>
                  
                  <SettingRow
                    label="System Notifications"
                    description="전체 시스템 알림 기능 활성화"
                    value={settings.notification['notification.enabled']}
                    type="toggle"
                    onChange={(v) => updateSetting('notification.enabled', v)}
                  />
                   <SettingRow
                    label="Notify on Policy Change"
                    description="정책 변경 시 사용자에게 알림"
                    value={settings.notification['notification.notifyOnPolicyChange']}
                    type="toggle"
                    onChange={(v) => updateSetting('notification.notifyOnPolicyChange', v)}
                  />
                  <div className="h-px bg-border my-2" />
                  <SettingRow
                    label="Announcement"
                    description="전체 공지사항 메시지 (비어있으면 숨김)"
                    value={settings.notification['notification.announcement']}
                    type="text"
                    onChange={(v) => updateSetting('notification.announcement', v)}
                  />
                  <SettingRow
                    label="Announcement Type"
                    description="공지사항 표시 유형"
                    value={settings.notification['notification.announcementType']}
                    type="select"
                    options={['info', 'warning', 'error']}
                    onChange={(v) => updateSetting('notification.announcementType', v)}
                  />
                  <div className="h-px bg-border my-2" />
                  <SettingRow
                    label="Email Alerts"
                    description="이메일 알림 활성화"
                    value={settings.notification['notification.emailEnabled']}
                    type="toggle"
                    onChange={(v) => updateSetting('notification.emailEnabled', v)}
                  />
                  {settings.notification['notification.emailEnabled'] && (
                    <SettingRow
                      label="Email Address"
                      description="알림을 받을 이메일 주소"
                      value={settings.notification['notification.emailAddress']}
                      type="text"
                      onChange={(v) => updateSetting('notification.emailAddress', v)}
                    />
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SettingRow({
  label,
  description,
  value,
  type,
  options,
  step,
  min,
  max,
  onChange,
}: {
  label: string;
  description: string;
  value: any;
  type: 'text' | 'number' | 'select' | 'toggle';
  options?: string[];
  step?: string;
  min?: number;
  max?: number;
  onChange: (value: any) => void;
}) {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors">
      <div className="space-y-0.5">
        <Label className="text-base">{label}</Label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="w-64">
        {type === 'text' && (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Enter value..."
          />
        )}
        {type === 'number' && (
          <input
            type="number"
            value={value || 0}
            step={step}
            min={min}
            max={max}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        )}
        {type === 'select' && (
          <select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {options?.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        )}
        {type === 'toggle' && (
          <Switch
            checked={!!value}
            onCheckedChange={onChange}
          />
        )}
      </div>
    </div>
  );
}
