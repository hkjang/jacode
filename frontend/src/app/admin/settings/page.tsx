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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
  const [activeCategory, setActiveCategory] = useState<'editor' | 'queue' | 'notification'>('editor');

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
      await api.patch(`/api/admin/settings/${activeCategory}`, settings[activeCategory]);
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
        ...settings[activeCategory],
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
    { key: 'editor', label: 'Editor Policy', icon: Settings, description: 'Monaco 에디터 기본 설정' },
    { key: 'queue', label: 'Queue Settings', icon: RefreshCw, description: 'BullMQ 작업 큐 설정' },
    { key: 'notification', label: 'Notifications', icon: Bell, description: '시스템 알림 및 공지 설정' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold tracking-tight">System Settings</h2>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <HelpCircle className="h-4 w-4" />
                How it works
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>System Settings Guide</DialogTitle>
                <DialogDescription>
                  시스템 설정이 어떻게 적용되고 동작하는지 설명합니다.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                <div className="space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Bell className="h-4 w-4 text-primary" />
                    Notification Management
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    알림 설정은 시스템의 중요 이벤트나 변경사항을 관리자 및 사용자에게 전달하는 방식을 제어합니다.
                  </p>
                  <ul className="list-disc list-inside text-sm space-y-1 ml-2 text-muted-foreground">
                    <li>
                      <span className="font-medium text-foreground">Global Announcement</span>: 
                      모든 활성 사용자(에디터)에게 상단 배너 또는 토스트 메시지로 공지사항을 즉시 전송합니다.
                    </li>
                    <li>
                      <span className="font-medium text-foreground">Email Alerts</span>: 
                      시스템 오류, 백업 실패 등 중요한 관리자 이벤트를 지정된 이메일로 발송합니다.
                    </li>
                    <li>
                      <span className="font-medium text-foreground">Policy Change Notification</span>: 
                      에디터 정책 변경 시 사용자에게 실시간 알림을 보내, 새로고침 없이 변경사항을 인지할 수 있게 합니다.
                    </li>
                  </ul>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Editor Application</CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-muted-foreground">
                      에디터 설정(테마, 폰트 등)은 사용자가 페이지를 새로고침하거나 설정을 재로드할 때 적용됩니다. 
                      'Policy Change Notification'이 켜져있으면 변경 즉시 알림이 갑니다.
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Queue Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-muted-foreground">
                      큐 설정은 백엔드 서비스 재시작 없이 즉시 적용되지만, 진행 중인 작업에는 영향을 주지 않을 수 있습니다.
                    </CardContent>
                  </Card>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={initializeDefaults}>
            Initialize Defaults
          </Button>
          <Button size="sm" onClick={saveSettings} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Changes
          </Button>
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
              {activeCategory === 'editor' && (
                <>
                  <SettingRow
                    label="Theme"
                    description="기본 에디터 테마"
                    value={settings.editor['editor.theme']}
                    type="select"
                    options={['vs-dark', 'vs', 'hc-black']}
                    onChange={(v) => updateSetting('editor.theme', v)}
                  />
                  <SettingRow
                    label="Font Size"
                    description="기본 폰트 크기 (px)"
                    value={settings.editor['editor.fontSize']}
                    type="number"
                    onChange={(v) => updateSetting('editor.fontSize', parseInt(v))}
                  />
                  <SettingRow
                    label="Tab Size"
                    description="탭 크기 (spaces)"
                    value={settings.editor['editor.tabSize']}
                    type="number"
                    onChange={(v) => updateSetting('editor.tabSize', parseInt(v))}
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
  onChange,
}: {
  label: string;
  description: string;
  value: any;
  type: 'text' | 'number' | 'select' | 'toggle';
  options?: string[];
  step?: string;
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
