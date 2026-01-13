'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  FolderOpen,
  Bot,
  ChevronLeft,
  Code2,
  GitBranch,
  BarChart3,
  Settings,
  Zap,
  FileCode2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LanguageSelector, useI18n } from '@/contexts/I18nContext';

// Dashboard navigation sections
const navSections = [
  {
    title: '메인',
    items: [
      { href: '/dashboard', label: '프로젝트', icon: FolderOpen, exact: true },
    ]
  },
  {
    title: 'AI Agent',
    items: [
      { href: '/dashboard/agent', label: 'Agent Dashboard', icon: Bot, exact: true },
      { href: '/dashboard/agent/code-analyzer', label: 'Code Analyzer', icon: FileCode2 },
      { href: '/dashboard/ast-analysis', label: 'AST 분석', icon: Code2 },
    ]
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { t } = useI18n();

  // Don't apply layout to base dashboard page (it has its own layout)
  if (pathname === '/dashboard') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-[1800px] mx-auto">
          <div className="flex items-center gap-3">
            <Bot className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">AI Agent</h1>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSelector />
            <Link href="/dashboard">
              <Button variant="outline" size="sm">
                <ChevronLeft className="h-4 w-4 mr-2" />
                프로젝트로 돌아가기
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
                      : pathname.startsWith(item.href);
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
  );
}
