'use client';

import React, { useState, useEffect } from 'react';
import { getASTHistory, removeASTRecord, clearASTHistory, getASTStats, ASTAnalysisRecord, SymbolCategory } from '@/lib/astHistoryStore';
import { agentApi, api } from '@/lib/api';
import { addASTRecord } from '@/lib/astHistoryStore';
import { FileCode2, Search, Loader2, Code, FileType, ChevronDown, ChevronRight, Download, RefreshCw, Trash2, Info, FolderOpen, Filter, Zap, Server, Blocks, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Project {
  id: string;
  name: string;
}

interface ASTAnalysisViewerProps {
  projectId?: string;
  isAdmin?: boolean;
}

// Category display config
const categoryConfig: Record<SymbolCategory, { label: string; color: string; icon: string }> = {
  class: { label: 'Class', color: 'bg-purple-500/20 text-purple-500', icon: '📦' },
  interface: { label: 'Interface', color: 'bg-green-500/20 text-green-500', icon: '📋' },
  type: { label: 'Type', color: 'bg-teal-500/20 text-teal-500', icon: '🏷️' },
  function: { label: 'Function', color: 'bg-blue-500/20 text-blue-500', icon: '⚡' },
  method: { label: 'Method', color: 'bg-blue-400/20 text-blue-400', icon: '🔧' },
  arrow_function: { label: 'Arrow', color: 'bg-cyan-500/20 text-cyan-500', icon: '➡️' },
  api_endpoint: { label: 'API', color: 'bg-orange-500/20 text-orange-500', icon: '🌐' },
  decorator: { label: 'Decorator', color: 'bg-pink-500/20 text-pink-500', icon: '🎀' },
  variable: { label: 'Variable', color: 'bg-gray-500/20 text-gray-500', icon: '📝' },
  constant: { label: 'Constant', color: 'bg-amber-500/20 text-amber-500', icon: '🔒' },
  enum: { label: 'Enum', color: 'bg-indigo-500/20 text-indigo-500', icon: '📊' },
  hook: { label: 'Hook', color: 'bg-violet-500/20 text-violet-500', icon: '🪝' },
  component: { label: 'Component', color: 'bg-rose-500/20 text-rose-500', icon: '🧩' },
  unknown: { label: 'Unknown', color: 'bg-muted text-muted-foreground', icon: '❓' },
};

export function ASTAnalysisViewer({ projectId: propProjectId, isAdmin = false }: ASTAnalysisViewerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<ASTAnalysisRecord[]>([]);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [filterLanguage, setFilterLanguage] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterProject, setFilterProject] = useState<string>(propProjectId || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState<ReturnType<typeof getASTStats> | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  
  // Manual analysis state
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [manualFilePath, setManualFilePath] = useState('src/example.ts');
  const [manualProjectId, setManualProjectId] = useState(propProjectId || '');

  // Load records and projects on mount
  useEffect(() => {
    loadRecords();
    loadProjects();
    
    const handleUpdate = () => loadRecords();
    window.addEventListener('ast-history-updated', handleUpdate);
    return () => window.removeEventListener('ast-history-updated', handleUpdate);
  }, []);

  const loadProjects = async () => {
    try {
      const response = await api.get('/api/projects');
      setProjects(response.data || []);
    } catch {
      console.error('Failed to load projects');
    }
  };

  const loadRecords = () => {
    let history = getASTHistory();
    if (propProjectId) {
      history = history.filter(r => r.projectId === propProjectId);
    }
    setRecords(history);
    setStats(getASTStats());
  };

  const toggleFile = (id: string) => {
    setExpandedFiles(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleRemoveRecord = (id: string) => {
    removeASTRecord(id);
    loadRecords();
  };

  const handleClearAll = () => {
    if (confirm('모든 AST 분석 기록을 삭제하시겠습니까?')) {
      clearASTHistory();
      loadRecords();
    }
  };

  const handleManualAnalysis = async () => {
    if (!manualCode.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const skeleton = await agentApi.getASTSkeleton(manualFilePath, manualCode);
      const selectedProject = projects.find(p => p.id === manualProjectId);
      
      addASTRecord({
        filePath: manualFilePath,
        language: skeleton.language || 'unknown',
        lineCount: skeleton.lineCount || manualCode.split('\n').length,
        symbols: skeleton.symbols || [],
        imports: skeleton.imports || [],
        exports: skeleton.exports || [],
        tokenEstimate: skeleton.tokenEstimate || Math.ceil(manualCode.length / 4),
        projectId: manualProjectId || undefined,
        projectName: selectedProject?.name,
        source: 'manual',
      });
      
      setManualCode('');
      setManualFilePath('src/example.ts');
      setShowManualInput(false);
      loadRecords();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Get unique projects from records
  const recordProjects = [...new Map(
    records.filter(r => r.projectId).map(r => [r.projectId, { id: r.projectId!, name: r.projectName || r.projectId! }])
  ).values()];

  const filteredRecords = records.filter(r => {
    if (filterLanguage !== 'all' && r.language !== filterLanguage) return false;
    if (filterProject !== 'all' && r.projectId !== filterProject) return false;
    if (filterCategory !== 'all' && !r.symbols.some(s => (s.category || s.type) === filterCategory)) return false;
    if (searchQuery && !r.filePath.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const languages = [...new Set(records.map(r => r.language))];
  const categories = [...new Set(records.flatMap(r => r.symbols.map(s => s.category || s.type)))];

  // Category stats
  const categoryStats = records.reduce((acc, r) => {
    r.symbols.forEach(s => {
      const cat = s.category || s.type || 'unknown';
      acc[cat] = (acc[cat] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  const exportResults = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      stats,
      categoryStats,
      records: records.map(r => ({
        ...r,
        analyzedAt: r.analyzedAt.toISOString(),
      }))
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ast-analysis-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileCode2 className="h-6 w-6 text-primary" />
            AST 분석 기록
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            에디터에서 분석된 코드 파일들의 구조를 프로젝트별로 확인합니다.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowManualInput(!showManualInput)}>
            <Code className="h-4 w-4 mr-2" />
            직접 분석
          </Button>
          {records.length > 0 && (
            <>
              <Button variant="outline" size="sm" onClick={exportResults}>
                <Download className="h-4 w-4 mr-2" />
                JSON 내보내기
              </Button>
              {isAdmin && (
                <Button variant="destructive" size="sm" onClick={handleClearAll}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  전체 삭제
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      {stats && records.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border rounded-lg p-4">
            <div className="text-2xl font-bold text-primary">{stats.totalFiles}</div>
            <div className="text-sm text-muted-foreground">분석된 파일</div>
          </div>
          <div className="bg-card border rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-500">{stats.totalSymbols}</div>
            <div className="text-sm text-muted-foreground">총 심볼</div>
          </div>
          <div className="bg-card border rounded-lg p-4">
            <div className="text-2xl font-bold text-green-500">{stats.totalLines.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">총 라인 수</div>
          </div>
          <div className="bg-card border rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-500">{recordProjects.length}</div>
            <div className="text-sm text-muted-foreground">프로젝트</div>
          </div>
        </div>
      )}

      {/* Category Stats */}
      {Object.keys(categoryStats).length > 0 && (
        <div className="bg-card border rounded-lg p-4">
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Blocks className="h-4 w-4" />
            심볼 분류 현황
          </h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(categoryStats)
              .sort((a, b) => b[1] - a[1])
              .map(([cat, count]) => {
                const config = categoryConfig[cat as SymbolCategory] || categoryConfig.unknown;
                return (
                  <button
                    key={cat}
                    onClick={() => setFilterCategory(filterCategory === cat ? 'all' : cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
                      filterCategory === cat ? 'ring-2 ring-primary' : ''
                    } ${config.color}`}
                  >
                    <span>{config.icon}</span>
                    <span>{config.label}</span>
                    <span className="opacity-70">({count})</span>
                  </button>
                );
              })}
          </div>
        </div>
      )}

      {/* Manual Analysis Input */}
      {showManualInput && (
        <div className="bg-card border rounded-lg p-6">
          <h3 className="font-medium mb-4">직접 코드 분석</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">프로젝트</label>
                <select
                  value={manualProjectId}
                  onChange={(e) => setManualProjectId(e.target.value)}
                  className="w-full px-3 py-2 bg-background border rounded-md text-sm"
                >
                  <option value="">프로젝트 선택 (선택사항)</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">파일 경로</label>
                <input
                  type="text"
                  value={manualFilePath}
                  onChange={(e) => setManualFilePath(e.target.value)}
                  className="w-full px-3 py-2 bg-background border rounded-md text-sm"
                  placeholder="src/example.ts"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">코드 입력</label>
              <textarea
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="w-full px-3 py-2 bg-background border rounded-md text-sm font-mono h-48"
                placeholder="분석할 코드를 입력하세요..."
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleManualAnalysis} disabled={loading || !manualCode.trim()}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    분석 중...
                  </>
                ) : (
                  <>
                    <Code className="h-4 w-4 mr-2" />
                    분석하기
                  </>
                )}
              </Button>
              <Button variant="ghost" onClick={() => setShowManualInput(false)}>
                취소
              </Button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Filter & Search */}
      {records.length > 0 && (
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="파일 검색..."
              className="w-full pl-10 pr-4 py-2 bg-background border rounded-md text-sm"
            />
          </div>
          <div className="flex items-center gap-1 text-sm">
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
            <select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              className="px-3 py-2 bg-background border rounded-md text-sm"
            >
              <option value="all">모든 프로젝트</option>
              {recordProjects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1 text-sm">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              value={filterLanguage}
              onChange={(e) => setFilterLanguage(e.target.value)}
              className="px-3 py-2 bg-background border rounded-md text-sm"
            >
              <option value="all">모든 언어</option>
              {languages.map(lang => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
          </div>
          <Button variant="outline" size="icon" onClick={loadRecords} title="새로고침">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Results */}
      <div className="space-y-4">
        {filteredRecords.map((record) => (
          <div key={record.id} className="bg-card border rounded-lg overflow-hidden group">
            {/* File Header */}
            <div
              className="px-4 py-3 bg-muted/50 flex items-center justify-between cursor-pointer hover:bg-muted/70 transition"
              onClick={() => toggleFile(record.id)}
            >
              <div className="flex items-center gap-3 flex-wrap">
                {expandedFiles.has(record.id) ? (
                  <ChevronDown className="h-4 w-4 flex-shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 flex-shrink-0" />
                )}
                <FileType className="h-4 w-4 text-blue-500 flex-shrink-0" />
                <span className="font-mono text-sm">{record.filePath}</span>
                <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded">
                  {record.language}
                </span>
                {record.projectName && (
                  <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-500 text-xs rounded flex items-center gap-1">
                    <FolderOpen className="h-3 w-3" />
                    {record.projectName}
                  </span>
                )}
                <span className={`px-2 py-0.5 text-xs rounded ${
                  record.source === 'editor' ? 'bg-green-500/10 text-green-500' :
                  record.source === 'auto' ? 'bg-blue-500/10 text-blue-500' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {record.source === 'editor' ? '에디터' : record.source === 'auto' ? '자동' : '수동'}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>{record.symbols.length} symbols</span>
                <span>{record.lineCount} lines</span>
                <span className="hidden md:inline">{new Date(record.analyzedAt).toLocaleString('ko-KR')}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveRecord(record.id);
                  }}
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            </div>

            {/* Expanded Content */}
            {expandedFiles.has(record.id) && (
              <div className="p-4 space-y-4">
                {/* Imports */}
                {record.imports.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 text-muted-foreground">Imports ({record.imports.length})</h4>
                    <div className="flex flex-wrap gap-2">
                      {record.imports.map((imp, i) => (
                        <span key={i} className="px-2 py-1 bg-muted rounded text-xs font-mono">
                          {imp}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Symbols grouped by category */}
                <div>
                  <h4 className="text-sm font-medium mb-2 text-muted-foreground">Symbols ({record.symbols.length})</h4>
                  <div className="space-y-2">
                    {record.symbols.map((symbol, i) => {
                      const cat = (symbol.category || symbol.type || 'unknown') as SymbolCategory;
                      const config = categoryConfig[cat] || categoryConfig.unknown;
                      return (
                        <div key={i} className="flex items-start gap-3 p-2 bg-muted/30 rounded">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 ${config.color}`}>
                            <span>{config.icon}</span>
                            {config.label}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-sm font-medium">{symbol.name}</span>
                              {symbol.exported && (
                                <span className="text-xs text-green-500">exported</span>
                              )}
                              {symbol.isAsync && (
                                <span className="text-xs text-cyan-500">async</span>
                              )}
                              {symbol.httpMethod && (
                                <span className={`text-xs px-1.5 rounded ${
                                  symbol.httpMethod === 'GET' ? 'bg-green-500/20 text-green-500' :
                                  symbol.httpMethod === 'POST' ? 'bg-blue-500/20 text-blue-500' :
                                  symbol.httpMethod === 'PUT' ? 'bg-yellow-500/20 text-yellow-500' :
                                  symbol.httpMethod === 'DELETE' ? 'bg-red-500/20 text-red-500' :
                                  'bg-purple-500/20 text-purple-500'
                                }`}>
                                  {symbol.httpMethod}
                                </span>
                              )}
                              {symbol.route && (
                                <span className="text-xs text-orange-500 font-mono">{symbol.route}</span>
                              )}
                              {symbol.decorators && symbol.decorators.length > 0 && (
                                <span className="text-xs text-pink-500">
                                  @{symbol.decorators.join(', @')}
                                </span>
                              )}
                            </div>
                            {symbol.signature && (
                              <code className="text-xs text-muted-foreground block mt-1 truncate">
                                {symbol.signature}
                              </code>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Exports */}
                {record.exports.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 text-muted-foreground">Exports ({record.exports.length})</h4>
                    <div className="flex flex-wrap gap-2">
                      {record.exports.map((exp, i) => (
                        <span key={i} className="px-2 py-1 bg-green-500/10 text-green-500 rounded text-xs font-mono">
                          {exp}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {records.length === 0 && (
        <div className="text-center py-12 border rounded-lg bg-card">
          <Info className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="font-medium">아직 분석된 파일이 없습니다</p>
          <p className="text-sm text-muted-foreground mt-2">
            에디터에서 AI Chat을 사용하여 100줄 이상의 파일을 분석하면<br />
            결과가 여기에 표시됩니다.
          </p>
          <Button variant="outline" className="mt-4" onClick={() => setShowManualInput(true)}>
            <Code className="h-4 w-4 mr-2" />
            직접 코드 분석하기
          </Button>
        </div>
      )}

      {filteredRecords.length === 0 && records.length > 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>검색 결과가 없습니다</p>
        </div>
      )}
    </div>
  );
}

export default ASTAnalysisViewer;
