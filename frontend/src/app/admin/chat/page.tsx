'use client';

import { useEffect, useState } from 'react';
import {
  MessageSquare,
  Loader2,
  Trash2,
  RefreshCw,
  Search,
  Eye,
  Calendar,
  User,
  Folder,
  BarChart,
  Code
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { adminChatApi } from '@/lib/api';
import Link from 'next/link';

interface ChatSession {
  id: string;
  title: string;
  user: { name: string; email: string };
  project?: { name: string };
  _count: { messages: number };
  updatedAt: string;
  tokenUsage?: {
    prompt: number;
    completion: number;
    total: number;
  };
}

interface ChatStats {
  totalSessions: number;
  totalMessages: number;
  todaySessions: number;
  todayMessages: number;
  topUsers: { userId: string; _count: { userId: number } }[];
}

export default function AdminChatPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [stats, setStats] = useState<ChatStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    loadData();
  }, [page, debouncedSearch]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sessionsRes, statsRes] = await Promise.all([
        adminChatApi.getAllSessions({ page, limit: 10, search: debouncedSearch }),
        adminChatApi.getStats()
      ]);
      setSessions(sessionsRes.data);
      setTotalPages(sessionsRes.totalPages);
      setStats(statsRes);
    } catch (error) {
      console.error('Failed to load chat data:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteSession = async (id: string) => {
    if (!confirm('정말로 이 채팅 세션을 삭제하시겠습니까?')) return;
    setActionLoading(id);
    try {
      await adminChatApi.deleteSession(id);
      loadData();
    } catch (error) {
      console.error('Failed to delete session:', error);
      alert('세션 삭제 실패');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading && !sessions.length) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          AI 채팅 기록
        </h2>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="제목, 사용자, 프로젝트 검색..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon" onClick={loadData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 border rounded-lg bg-card shadow-sm">
            <div className="text-sm font-medium text-muted-foreground mb-1">총 대화 세션</div>
            <div className="text-2xl font-bold">{stats.totalSessions.toLocaleString()}</div>
          </div>
          <div className="p-4 border rounded-lg bg-card shadow-sm">
            <div className="text-sm font-medium text-muted-foreground mb-1">총 메시지</div>
            <div className="text-2xl font-bold">{stats.totalMessages.toLocaleString()}</div>
          </div>
          <div className="p-4 border rounded-lg bg-card shadow-sm">
            <div className="text-sm font-medium text-muted-foreground mb-1">오늘의 대화</div>
            <div className="text-2xl font-bold text-primary">{stats.todaySessions.toLocaleString()}</div>
          </div>
          <div className="p-4 border rounded-lg bg-card shadow-sm">
            <div className="text-sm font-medium text-muted-foreground mb-1">오늘의 메시지</div>
            <div className="text-2xl font-bold text-primary">{stats.todayMessages.toLocaleString()}</div>
          </div>
        </div>
      )}

      {/* Sessions List */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-sm">주제</th>
              <th className="text-left px-4 py-3 font-medium text-sm">사용자</th>
              <th className="text-left px-4 py-3 font-medium text-sm">프로젝트</th>
              <th className="text-center px-4 py-3 font-medium text-sm">메시지</th>
              <th className="text-center px-4 py-3 font-medium text-sm">토큰 (Total)</th>
              <th className="text-left px-4 py-3 font-medium text-sm">마지막 활동</th>
              <th className="text-right px-4 py-3 font-medium text-sm">관리</th>
            </tr>
          </thead>
          <tbody>
            {sessions.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  채팅 기록이 없습니다.
                </td>
              </tr>
            ) : (
              sessions.map((session) => (
                <tr key={session.id} className="border-t hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium max-w-[300px] truncate" title={session.title}>
                      {session.title}
                    </div>
                    <div className="text-xs text-muted-foreground">ID: {session.id.slice(0, 8)}...</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <User className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm">{session.user.name}</span>
                    </div>
                    <div className="text-xs text-muted-foreground ml-5">{session.user.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    {session.project ? (
                      <div className="flex items-center gap-2">
                        <Folder className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{session.project.name}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">프로젝트 없음</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-xs">
                      <MessageSquare className="h-3 w-3" />
                      {session._count.messages}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {session.tokenUsage ? (
                      <div className="text-sm font-mono">
                        {session.tokenUsage.total.toLocaleString()}
                        <div className="text-[10px] text-muted-foreground">
                          P:{session.tokenUsage.prompt} / C:{session.tokenUsage.completion}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      {new Date(session.updatedAt).toLocaleDateString()}
                    </div>
                    <div className="text-xs ml-5">
                      {new Date(session.updatedAt).toLocaleTimeString()}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Link href={`/admin/chat/${session.id}`}>
                        <Button size="sm" variant="ghost">
                          <Eye className="h-4 w-4 text-muted-foreground hover:text-primary" />
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteSession(session.id)}
                        disabled={actionLoading === session.id}
                      >
                        {actionLoading === session.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                        )}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            이전
          </Button>
          <span className="flex items-center px-4 text-sm font-medium">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            다음
          </Button>
        </div>
      )}
    </div>
  );
}
