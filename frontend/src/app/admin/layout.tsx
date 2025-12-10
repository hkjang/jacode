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
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const navItems = [
  { href: '/admin', label: 'Overview', icon: BarChart3, exact: true },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/servers', label: 'Model Servers', icon: Server },
  { href: '/admin/tasks', label: 'Tasks', icon: Activity },
  { href: '/admin/models', label: 'AI Models', icon: Bot },
  { href: '/admin/features', label: 'Feature Toggles', icon: Zap },
  { href: '/admin/prompts', label: 'Prompt Templates', icon: FileText },
  { href: '/admin/log-viewer', label: 'System Logs', icon: ScrollText },
  { href: '/admin/audit', label: 'Audit & History', icon: FileSearch },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Admin Dashboard</h1>
          </div>
          <Link href="/dashboard">
            <Button variant="outline" size="sm">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
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
                  {item.label}
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
