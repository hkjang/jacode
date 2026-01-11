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
  Route,
  Code,
  Cpu,
  Heart,
  Database,
  ListTodo,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LanguageSelector, useI18n } from '@/contexts/I18nContext';

// 카테고리별 메뉴 정리
const navSections = [
  {
    title: '대시보드',
    items: [
      { href: '/admin', label: '개요', icon: BarChart3, exact: true },
      { href: '/admin/monitoring', label: '실시간 모니터링', icon: Activity },
    ]
  },
  {
    title: 'AI 관리',
    items: [
      { href: '/admin/servers', label: '모델 서버', icon: Server },
      { href: '/admin/models', label: '모델 관리', icon: Bot },
      { href: '/admin/routing-policies', label: '라우팅 정책', icon: Route },
      { href: '/admin/circuit-breakers', label: 'Circuit Breaker', icon: Heart },
      { href: '/admin/prompts', label: '프롬프트 템플릿', icon: FileText },
      { href: '/admin/code-styles', label: '코드 스타일', icon: Code },
      { href: '/admin/chat', label: '채팅 기록', icon: MessageSquare },
    ]
  },
  {
    title: '작업 관리',
    items: [
      { href: '/admin/tasks', label: 'Agent 작업', icon: ListTodo },
      { href: '/admin/queue', label: '작업 큐', icon: Database },
    ]
  },
  {
    title: '사용자 & 권한',
    items: [
      { href: '/admin/users', label: '사용자 관리', icon: Users },
      { href: '/admin/features', label: '기능 토글', icon: Zap },
    ]
  },
  {
    title: '시스템 & 로그',
    items: [
      { href: '/admin/log-viewer', label: '로그 뷰어', icon: ScrollText },
      { href: '/admin/audit', label: '감사 로그', icon: FileSearch },
      { href: '/admin/backup', label: '백업 관리', icon: Shield },
      { href: '/admin/cost-alerts', label: '비용 알림', icon: Bell },
      { href: '/admin/settings', label: '시스템 설정', icon: Settings },
    ]
  },
];

import { SocketProvider } from '@/providers/SocketProvider';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <SocketProvider>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b bg-card px-6 py-4 sticky top-0 z-10">
          <div className="flex items-center justify-between max-w-[1800px] mx-auto">
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">관리자 대시보드</h1>
            </div>
            <div className="flex items-center gap-3">
              <LanguageSelector />
              <Link href="/dashboard">
                <Button variant="outline" size="sm">
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  돌아가기
                </Button>
              </Link>
            </div>
          </div>
        </header>

        <div className="flex max-w-[1800px] mx-auto">
          {/* Sidebar */}
          <aside className="w-60 border-r bg-card min-h-[calc(100vh-65px)] p-4 sticky top-[65px] overflow-y-auto">
            <nav className="space-y-6">
              {navSections.map((section) => (
                <div key={section.title}>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3">
                    {section.title}
                  </h3>
                  <div className="space-y-1">
                    {section.items.map((item) => {
                      const isActive = item.exact 
                        ? pathname === item.href 
                        : pathname.startsWith(item.href) && pathname !== '/admin';
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition text-sm ${
                            isActive
                              ? 'bg-primary text-primary-foreground'
                              : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <item.icon className="h-4 w-4" />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </SocketProvider>
  );
}

