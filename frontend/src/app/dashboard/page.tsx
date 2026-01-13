'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Code2,
  Plus,
  FolderOpen,
  Clock,
  MoreVertical,
  Trash2,
  Edit,
  LogOut,
  Shield,
  LayoutGrid,
  List as ListIcon,
  Search,
  Calendar,
  AlertCircle,
  TrendingUp,
  Activity,
  Zap,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Settings
} from 'lucide-react';

import { projectApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { LanguageSelector, useI18n } from '@/contexts/I18nContext';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

type ViewMode = 'grid' | 'list';
type SortBy = 'updated' | 'created' | 'name';

export default function DashboardPage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { t } = useI18n();
  
  // State
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Interactive State
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('updated');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  // Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({ name: '', description: '' });

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }
    loadProjects();
  }, [router]);

  const loadProjects = async () => {
    try {
      const data = await projectApi.getAll();
      setProjects(data);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  };

  // Stats Calculations
  const stats = useMemo(() => {
    const total = projects.length;
    
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const active = projects.filter(p => new Date(p.updatedAt) > oneWeekAgo).length;
    
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0,0,0,0);
    const newThisMonth = projects.filter(p => new Date(p.createdAt) > startOfMonth).length;

    return { total, active, newThisMonth };
  }, [projects]);

  // Recent Projects
  const recentProjects = useMemo(() => {
    return [...projects]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 3);
  }, [projects]);

  // Filtering and Sorting
  const filteredProjects = useMemo(() => {
    return projects
      .filter(project => 
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (project.description && project.description.toLowerCase().includes(searchQuery.toLowerCase()))
      )
      .sort((a, b) => {
        switch (sortBy) {
          case 'name':
            return a.name.localeCompare(b.name);
          case 'created':
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          case 'updated':
          default:
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        }
      });
  }, [projects, searchQuery, sortBy]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);
  const paginatedProjects = filteredProjects.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const project = await projectApi.create(formData);
      setProjects([project, ...projects]);
      setIsCreateOpen(false);
      setFormData({ name: '', description: '' });
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  const handleEditProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject) return;
    
    try {
        // Call the API to update the project
        await projectApi.update(currentProject.id, formData);
        
        // Update local state
        setProjects(projects.map(p => p.id === currentProject.id ? { ...p, ...formData, updatedAt: new Date().toISOString() } : p));
        
        setIsEditOpen(false);
        setCurrentProject(null);
        setFormData({ name: '', description: '' });
    } catch (error) {
      console.error('Failed to update project:', error);
      alert('Failed to update project. Please try again.');
    }
  };

  const handleDeleteProject = async (id: string) => {
    // We use a small timeout to allow the dropdown to close before showing the confirm dialog
    // This prevents some browser/UI conflicts
    setTimeout(async () => {
        if (!confirm(t('dashboard.confirmDelete') || 'Are you sure you want to delete this project?')) return;
        try {
          await projectApi.delete(id);
          setProjects(prev => prev.filter((p) => p.id !== id));
        } catch (error: any) {
          console.error('Failed to delete project:', error);
          if (error.response) {
             console.error('Error Status:', error.response.status);
             console.error('Error Data:', JSON.stringify(error.response.data));
          } else {
             console.error('Error Message:', error.message);
          }
          alert('Failed to delete project. Please try again.');
        }
    }, 100);
  };

  const openEditModal = (project: Project) => {
    setCurrentProject(project);
    setFormData({ name: project.name, description: project.description || '' });
    setIsEditOpen(true);
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getRelativeTime = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return formatDate(date);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-muted-foreground animate-pulse">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-30">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-lg">
                <Code2 className="h-6 w-6 text-primary" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">JaCode</span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSelector />
            {user?.role === 'ADMIN' && (
              <Button variant="outline" size="sm" onClick={() => router.push('/admin')}>
                <Shield className="h-4 w-4 mr-2" />
                {t('admin.dashboard')}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/agent')}>
              🤖 AI Agent
            </Button>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full">
                <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
                    {user?.name?.[0]?.toUpperCase() || 'U'}
                </div>
                <span className="text-sm font-medium">{user?.name || 'User'}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} title={t('auth.logout')}>
              <LogOut className="h-5 w-5 text-muted-foreground hover:text-destructive transition-colors" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-primary/5 border-primary/20">
                <CardHeader className="pb-2">
                    <CardDescription>Total Projects</CardDescription>
                    <CardTitle className="text-4xl">{stats.total}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-xs text-muted-foreground flex items-center">
                        <FolderOpen className="h-3 w-3 mr-1" />
                        All time
                    </div>
                </CardContent>
            </Card>
            <Card className="bg-green-500/5 border-green-500/20">
                <CardHeader className="pb-2">
                    <CardDescription>Active Recently</CardDescription>
                    <CardTitle className="text-4xl text-green-600 dark:text-green-400">{stats.active}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-xs text-muted-foreground flex items-center">
                        <Activity className="h-3 w-3 mr-1" />
                        Updated in last 7 days
                    </div>
                </CardContent>
            </Card>
            <Card className="bg-blue-500/5 border-blue-500/20">
                <CardHeader className="pb-2">
                    <CardDescription>New This Month</CardDescription>
                    <CardTitle className="text-4xl text-blue-600 dark:text-blue-400">{stats.newThisMonth}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-xs text-muted-foreground flex items-center">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        Growth
                    </div>
                </CardContent>
            </Card>
        </div>

        {/* Recent Projects Section */}
        {recentProjects.length > 0 && (
            <div className="mb-10">
                <h2 className="text-lg font-semibold mb-4 flex items-center">
                    <Zap className="h-5 w-5 mr-2 text-yellow-500" />
                    Recently Updated
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {recentProjects.map(project => (
                        <Card key={project.id} className="hover:shadow-lg transition-shadow border-l-4 border-l-primary cursor-pointer" onClick={() => router.push(`/editor/${project.id}`)}>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base truncate">{project.name}</CardTitle>
                                <CardDescription className="text-xs">{getRelativeTime(project.updatedAt)}</CardDescription>
                            </CardHeader>
                        </Card>
                    ))}
                </div>
            </div>
        )}

        {/* Dashboard Toolbar */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight mb-1">{t('dashboard.yourProjects')}</h2>
            </div>
            <Button onClick={() => setIsCreateOpen(true)} size="lg" className="shadow-lg shadow-primary/20">
                <Plus className="h-5 w-5 mr-2" />
                {t('dashboard.newProject')}
            </Button>
        </div>

        {/* Filters and Controls */}
        <div className="bg-card border rounded-xl p-4 mb-8 shadow-sm">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search projects..." 
                        className="pl-9" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="updated">Last Updated</SelectItem>
                            <SelectItem value="created">Date Created</SelectItem>
                            <SelectItem value="name">Name (A-Z)</SelectItem>
                        </SelectContent>
                    </Select>
                    
                    <div className="flex items-center border rounded-md p-1 bg-muted/50">
                        <Button 
                            variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => setViewMode('grid')}
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </Button>
                        <Button 
                            variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => setViewMode('list')}
                        >
                            <ListIcon className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-20 bg-muted/30 rounded-xl border border-dashed">
            <div className="bg-background p-4 rounded-full w-fit mx-auto mb-4 border shadow-sm">
                <FolderOpen className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">{t('dashboard.noProjects')}</h2>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              {t('dashboard.noProjectsDesc')}
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('dashboard.createProject')}
            </Button>
          </div>
        ) : filteredProjects.length === 0 ? (
            <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-4">
                    <Search className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">No projects found</h3>
                <p className="text-muted-foreground text-sm mt-1">
                    Try adjusting your search or filters
                </p>
                <Button variant="link" onClick={() => setSearchQuery('')} className="mt-2">
                    Clear search
                </Button>
            </div>
        ) : (
          <>
            <div className={viewMode === 'grid' ? "grid md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-3"}>
                {paginatedProjects.map((project) => (
                viewMode === 'grid' ? (
                    // Grid View
                    <Card key={project.id} className="group flex flex-col hover:border-primary/50 hover:shadow-lg transition-all duration-300">
                        <CardHeader className="pb-3 relative">
                            <div className="flex items-start justify-between">
                                <Link href={`/editor/${project.id}`} className="flex-1">
                                    <h3 className="font-semibold text-lg hover:text-primary transition-colors flex items-center gap-2">
                                        {project.name}
                                        <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-50" />
                                    </h3>
                                </Link>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-muted-foreground hover:text-foreground">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => openEditModal(project)}>
                                            <Edit className="h-4 w-4 mr-2" />
                                            Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDeleteProject(project.id)}>
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                            <CardDescription className="line-clamp-2 h-10 mt-1">
                                {project.description || "No description provided."}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pb-2 flex-grow">
                             {/* Placeholder for tags or languages if available in future */}
                             <div className="flex gap-2">
                                <Badge variant="secondary" className="text-xs font-normal">Typescript</Badge>
                             </div>
                        </CardContent>
                        <CardFooter className="pt-3 text-xs text-muted-foreground flex items-center justify-between border-t bg-muted/10 px-6 py-3 mt-auto">
                            <div className="flex items-center" title={`Updated: ${new Date(project.updatedAt).toLocaleString()}`}>
                                <Clock className="h-3 w-3 mr-1.5" />
                                {getRelativeTime(project.updatedAt)}
                            </div>
                            <Button variant="ghost" size="sm" className="h-6 text-xs px-2 hover:bg-primary/10 hover:text-primary" onClick={() => router.push(`/editor/${project.id}`)}>
                                Open Editor
                            </Button>
                        </CardFooter>
                    </Card>
                ) : (
                    // List View
                    <div key={project.id} className="group flex items-center justify-between p-4 rounded-lg border bg-card hover:border-primary/50 hover:shadow-sm transition-all">
                        <div className="flex items-center gap-4 flex-1">
                            <div className="bg-primary/5 p-3 rounded-lg group-hover:bg-primary/10 transition-colors">
                                <Code2 className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <Link href={`/editor/${project.id}`} className="font-semibold text-lg hover:text-primary transition-colors flex items-center gap-2 w-fit">
                                    {project.name}
                                </Link>
                                <p className="text-sm text-muted-foreground truncate max-w-lg mt-0.5">
                                    {project.description || "No description"}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-8 text-sm text-muted-foreground">
                            <div className="hidden md:flex flex-col items-end min-w-[100px]">
                                <span className="text-xs text-muted-foreground/70">Last updated</span>
                                <span className="font-medium text-foreground">{getRelativeTime(project.updatedAt)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => router.push(`/editor/${project.id}`)}>
                                    Open
                                </Button>
                                <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-9 w-9">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => openEditModal(project)}>
                                                <Edit className="h-4 w-4 mr-2" />
                                                Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDeleteProject(project.id)}>
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                    </div>
                )
                ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium mx-2">
                        Page {currentPage} of {totalPages}
                    </span>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            )}
          </>
        )}
      </main>

      {/* Create Project Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Start a new coding project. Enter the details below.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateProject}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Project Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="My Awesome Project"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of your project"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Project</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Project Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>
              Update your project details.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditProject}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Project Name</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="My Awesome Project"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-description">Description</Label>
                <Input
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of your project"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
