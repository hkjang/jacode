'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Shield,
  BarChart3,
  Users,
  Server,
  Zap,
  FileText,
  ScrollText,
  Settings,
  Activity,
  Bot,
  ChevronLeft,
  FileSearch,
  Bell,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LanguageSelector, useI18n } from '@/contexts/I18nContext';

const navItems = [
  { href: '/admin', labelKey: 'admin.overview', icon: BarChart3, exact: true },
  { href: '/admin/users', labelKey: 'admin.users', icon: Users },
  { href: '/admin/servers', labelKey: 'admin.servers', icon: Server },
  { href: '/admin/tasks', labelKey: 'admin.tasks', icon: Activity },
  { href: '/admin/models', labelKey: 'admin.models', icon: Bot },
  { href: '/admin/queue', labelKey: 'admin.queue', icon: Activity },
  { href: '/admin/features', labelKey: 'admin.features', icon: Zap },
  { href: '/admin/prompts', labelKey: 'admin.prompts', icon: FileText },
  { href: '/admin/log-viewer', labelKey: 'admin.logs', icon: ScrollText },
  { href: '/admin/audit', labelKey: 'admin.audit', icon: FileSearch },
  { href: '/admin/backup', labelKey: 'admin.backup', icon: Shield },
  { href: '/admin/cost-alerts', labelKey: 'admin.costAlerts', icon: Bell },
  { href: '/admin/settings', labelKey: 'admin.settings', icon: Settings },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">{t('admin.dashboard')}</h1>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSelector />
            <Link href="/dashboard">
              <Button variant="outline" size="sm">
                <ChevronLeft className="h-4 w-4 mr-2" />
                {t('common.back')}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="flex max-w-7xl mx-auto">
        {/* Sidebar */}
        <aside className="w-56 border-r bg-card min-h-[calc(100vh-65px)] p-4 sticky top-[65px]">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = item.exact 
                ? pathname === item.href 
                : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition text-sm ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {t(item.labelKey)}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
