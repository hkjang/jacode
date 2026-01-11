'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  MoreVertical,
  Trash2,
  Search,
  FolderOpen,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Download,
  Eye,
  FileText,
  Calendar as CalendarIcon,
  Edit,
  X
} from 'lucide-react';
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { DateRange } from "react-day-picker"

import { api } from '@/lib/api';
// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"

interface AdminProject {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
  _count: {
    files: number;
    agentTasks: number;
  };
}

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Advanced Features State
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [sortBy, setSortBy] = useState('updatedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  // Details View State
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Edit State
  const [editProject, setEditProject] = useState<AdminProject | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => {
        loadProjects();
    }, 300);
    return () => clearTimeout(timer);
  }, [page, searchQuery, sortBy, sortOrder, dateRange]);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const params: any = {
          page,
          limit: 10,
          search: searchQuery,
          sortBy,
          order: sortOrder
      };

      if (dateRange?.from) {
          params.startDate = dateRange.from.toISOString();
      }
      if (dateRange?.to) {
          params.endDate = dateRange.to.toISOString();
      }

      const { data } = await api.get('/api/admin/projects', { params });
      
      setProjects(data.data);
      setTotalPages(data.meta.totalPages);
      setTotalItems(data.meta.total);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
        setSortBy(field);
        setSortOrder('desc');
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
        setSelectedIds(new Set(projects.map(p => p.id)));
    } else {
        setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
        newSelected.add(id);
    } else {
        newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm('정말로 이 프로젝트를 영구 삭제하시겠습니까?')) return;
    try {
      await api.delete(`/api/admin/projects/${id}`);
      loadProjects();
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (error) {
      console.error('Failed to delete project:', error);
      alert('삭제 실패');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`선택한 ${selectedIds.size}개 프로젝트를 영구 삭제하시겠습니까?`)) return;

    try {
        await api.delete('/api/admin/projects/bulk', {
            data: { ids: Array.from(selectedIds) }
        });
        setSelectedIds(new Set());
        loadProjects();
    } catch (error) {
        console.error('Bulk delete failed:', error);
        alert('일괄 삭제 실패');
    }
  };

  const handleViewDetails = async (id: string) => {
      setIsDetailsOpen(true);
      setDetailsLoading(true);
      try {
          const { data } = await api.get(`/api/admin/projects/${id}`);
          setSelectedProject(data);
      } catch (error) {
          console.error("Failed to load details:", error);
          setSelectedProject(null);
      } finally {
          setDetailsLoading(false);
      }
  };

  const openEditDialog = (project: AdminProject) => {
      setEditProject(project);
      setEditName(project.name);
      setEditDesc(project.description || '');
      setIsEditOpen(true);
  };

  const handleUpdateProject = async () => {
      if (!editProject) return;
      try {
          await api.patch(`/api/admin/projects/${editProject.id}`, {
              name: editName,
              description: editDesc
          });
          setIsEditOpen(false);
          loadProjects();
      } catch (error) {
          console.error("Update failed:", error);
          alert("수정 실패");
      }
  };

  const handleExport = async () => {
      try {
           const { data } = await api.get('/api/admin/projects', {
            params: {
              page: 1,
              limit: 1000, 
              search: searchQuery,
              sortBy,
              order: sortOrder,
              startDate: dateRange?.from?.toISOString(),
              endDate: dateRange?.to?.toISOString()
            }
          });
          const projectsToExport = data.data;
          
          if (projectsToExport.length === 0) {
              alert('내보낼 데이터가 없습니다.');
              return;
          }

          const headers = ['ID', 'Project Name', 'Description', 'User Name', 'User Email', 'Files Count', 'Created At', 'Updated At'];
          const csvContent = [
              headers.join(','),
              ...projectsToExport.map((p: any) => [
                  p.id,
                  `"${p.name.replace(/"/g, '""')}"`,
                  `"${(p.description || '').replace(/"/g, '""')}"`,
                  p.user.name,
                  p.user.email,
                  p._count.files,
                  p.createdAt,
                  p.updatedAt
              ].join(','))
          ].join('\n');

          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.setAttribute('href', url);
          link.setAttribute('download', `projects_export_${new Date().toISOString().slice(0,10)}.csv`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

      } catch (error) {
          console.error("Export failed:", error);
          alert("내보내기 실패");
      }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Detail Sheet */}
      <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <SheetContent className="w-[400px] sm:w-[540px]">
              <SheetHeader>
                  <SheetTitle>프로젝트 상세 정보</SheetTitle>
                  <SheetDescription>트러블슈팅 및 관리를 위한 상세 정보입니다.</SheetDescription>
              </SheetHeader>
              {detailsLoading ? (
                  <div className="py-8 text-center text-muted-foreground">불러오는 중...</div>
              ) : selectedProject ? (
                  <div className="mt-6 space-y-6">
                      <div className="space-y-1">
                          <h4 className="text-sm font-medium leading-none">기본 정보</h4>
                          <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground mt-2">
                              <div>이름:</div><div className="text-foreground font-medium">{selectedProject.name}</div>
                              <div>ID:</div><div className="text-foreground text-xs break-all">{selectedProject.id}</div>
                              <div>설명:</div><div className="text-foreground">{selectedProject.description || '-'}</div>
                              <div>생성일:</div><div className="text-foreground">{formatDate(selectedProject.createdAt)}</div>
                              <div>수정일:</div><div className="text-foreground">{formatDate(selectedProject.updatedAt)}</div>
                          </div>
                      </div>

                      <div className="space-y-1">
                           <h4 className="text-sm font-medium leading-none">소유자 정보</h4>
                           <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground mt-2">
                              <div>이름:</div><div className="text-foreground">{selectedProject.user.name}</div>
                              <div>이메일:</div><div className="text-foreground">{selectedProject.user.email}</div>
                              <div>ID:</div><div className="text-foreground text-xs">{selectedProject.user.id}</div>
                           </div>
                      </div>

                      <div className="space-y-1">
                          <div className="flex items-center justify-between">
                             <h4 className="text-sm font-medium leading-none">파일 목록 ({selectedProject.files?.length || 0})</h4>
                          </div>
                          <ScrollArea className="h-[200px] w-full rounded-md border p-2 mt-2">
                              {selectedProject.files?.length === 0 ? (
                                  <div className="text-xs text-muted-foreground text-center py-4">파일이 없습니다.</div>
                              ) : (
                                  <ul className="text-xs space-y-1">
                                      {selectedProject.files?.map((file: any) => (
                                          <li key={file.id} className="flex justify-between">
                                              <span className="truncate max-w-[300px]" title={file.path}>{file.path}</span>
                                              <span className="text-muted-foreground">{formatDate(file.updatedAt)}</span>
                                          </li>
                                      ))}
                                  </ul>
                              )}
                          </ScrollArea>
                      </div>

                       <div className="space-y-1">
                          <h4 className="text-sm font-medium leading-none">AI 작업 ({selectedProject.agentTasks?.length || 0})</h4>
                           <ScrollArea className="h-[150px] w-full rounded-md border p-2 mt-2">
                              {selectedProject.agentTasks?.length === 0 ? (
                                  <div className="text-xs text-muted-foreground text-center py-4">작업 기록이 없습니다.</div>
                              ) : (
                                  <ul className="text-xs space-y-2">
                                      {selectedProject.agentTasks?.map((task: any) => (
                                          <li key={task.id} className="border-b pb-1 last:border-0">
                                              <div className="font-medium">{task.status}</div>
                                              <div className="text-muted-foreground truncate">{task.description}</div>
                                          </li>
                                      ))}
                                  </ul>
                              )}
                          </ScrollArea>
                      </div>
                  </div>
              ) : (
                   <div className="py-8 text-center text-muted-foreground">정보를 불러올 수 없습니다.</div>
              )}
          </SheetContent>
      </Sheet>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
            <DialogHeader>
            <DialogTitle>프로젝트 수정</DialogTitle>
            <DialogDescription>
                프로젝트 이름과 설명을 수정할 수 있습니다.
            </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                이름
                </Label>
                <Input
                id="name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="col-span-3"
                />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="desc" className="text-right">
                설명
                </Label>
                <Input
                id="desc"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className="col-span-3"
                />
            </div>
            </div>
            <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>취소</Button>
            <Button onClick={handleUpdateProject}>저장</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Header & Stats */}
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold tracking-tight">프로젝트 관리</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">총 프로젝트</CardTitle>
                    <FolderOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{totalItems}</div>
                </CardContent>
            </Card>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 bg-card p-4 rounded-lg border justify-between items-start md:items-center">
        <div className="flex flex-1 gap-2 w-full md:w-auto">
            <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                type="search"
                placeholder="검색..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1); 
                }}
                />
            </div>
            <Popover>
                <PopoverTrigger asChild>
                <Button
                    variant={"outline"}
                    className={`w-[240px] justify-start text-left font-normal ${!dateRange && "text-muted-foreground"}`}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                    dateRange.to ? (
                        <>
                        {format(dateRange.from, "LLL dd, y", { locale: ko })} -{" "}
                        {format(dateRange.to, "LLL dd, y", { locale: ko })}
                        </>
                    ) : (
                        format(dateRange.from, "LLL dd, y", { locale: ko })
                    )
                    ) : (
                    <span>날짜 선택</span>
                    )}
                </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                />
                </PopoverContent>
            </Popover>
            {dateRange && (
                <Button variant="ghost" size="icon" onClick={() => setDateRange(undefined)}>
                    <X className="h-4 w-4" />
                </Button>
            )}
        </div>
        
        <div className="flex items-center gap-2">
             <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                CSV 내보내기
             </Button>
             {selectedIds.size > 0 && (
                 <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    선택 삭제 ({selectedIds.size})
                 </Button>
             )}
             <Button variant="outline" size="sm" onClick={loadProjects}>
                새로고침
             </Button>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg bg-card overflow-hidden">
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[50px]">
                        <Checkbox 
                            checked={projects.length > 0 && selectedIds.size === projects.length}
                            onCheckedChange={handleSelectAll}
                        />
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('name')}>
                        <div className="flex items-center gap-1">프로젝트명 <ArrowUpDown className="h-3 w-3" /></div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('user')}>
                        <div className="flex items-center gap-1">소유자 <ArrowUpDown className="h-3 w-3" /></div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('fileCount')}>
                        <div className="flex items-center gap-1">파일 <ArrowUpDown className="h-3 w-3" /></div>
                    </TableHead>
                     <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('taskCount')}>
                        <div className="flex items-center gap-1">작업 <ArrowUpDown className="h-3 w-3" /></div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('updatedAt')}>
                        <div className="flex items-center gap-1">수정일 <ArrowUpDown className="h-3 w-3" /></div>
                    </TableHead>
                    <TableHead className="text-right">관리</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {loading ? (
                    <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">로딩 중...</TableCell>
                    </TableRow>
                ) : projects.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            프로젝트가 없습니다.
                        </TableCell>
                    </TableRow>
                ) : (
                    projects.map((project) => (
                        <TableRow key={project.id} data-state={selectedIds.has(project.id) && "selected"}>
                            <TableCell>
                                <Checkbox 
                                    checked={selectedIds.has(project.id)}
                                    onCheckedChange={(checked) => handleSelectOne(project.id, checked as boolean)}
                                />
                            </TableCell>
                            <TableCell>
                                <div className="font-medium flex items-center gap-2 cursor-pointer hover:underline" onClick={() => handleViewDetails(project.id)}>
                                    <FolderOpen className="h-4 w-4 text-primary" />
                                    {project.name}
                                </div>
                                <div className="text-xs text-muted-foreground truncate max-w-[200px]" title={project.description}>
                                    {project.description || '-'}
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex flex-col">
                                    <span className="font-medium text-sm">{project.user.name}</span>
                                    <span className="text-xs text-muted-foreground">{project.user.email}</span>
                                </div>
                            </TableCell>
                            <TableCell>
                                {project._count.files}
                            </TableCell>
                             <TableCell>
                                {project._count.agentTasks}
                            </TableCell>
                            <TableCell>
                                <span className="text-sm">{formatDate(project.updatedAt)}</span>
                            </TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => handleViewDetails(project.id)}>
                                            <Eye className="h-4 w-4 mr-2" />
                                            상세 보기
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => openEditDialog(project)}>
                                            <Edit className="h-4 w-4 mr-2" />
                                            수정
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDeleteProject(project.id)}>
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            영구 삭제
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))
                )}
            </TableBody>
        </Table>
      </div>
      
      {/* Pagination */}
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {totalItems}개 중 {projects.length}개 표시 (선택됨: {selectedIds.size}개)
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
          >
            <ChevronLeft className="h-4 w-4" />
            이전
          </Button>
          <div className="inline-flex items-center text-sm font-medium">
             Page {page} of {totalPages}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || loading}
          >
            다음
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
