'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, CheckCircle2, XCircle, Play, Info, Server, HelpCircle, Zap, Shield, RefreshCw, Database, FileCode, Lock } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/lib/api";

interface McpTool {
  name: string;
  description: string;
  inputSchema: any;
  requiredPermissions?: string[];
}

export default function McpToolsPage() {
  const [tools, setTools] = useState<McpTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTools();
  }, []);

  const fetchTools = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE_URL}/api/admin/mcp/tools`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch tools');
      }
      const data = await response.json();
      setTools(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading tools...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">MCP 도구 관리</h2>
          <p className="text-muted-foreground">Model Context Protocol 도구를 관리하고 모니터링합니다.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-green-600 border-green-600 bg-green-50">
            <Zap className="w-3 h-3 mr-1" />
            Active
          </Badge>
          <HowItWorksDialog />
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 도구 수</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tools.length}</div>
            <p className="text-xs text-muted-foreground">
              등록된 MCP 도구 (Standard + Custom)
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>도구 목록</CardTitle>
          <CardDescription>
            사용 가능한 모든 MCP 도구입니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>이름</TableHead>
                <TableHead>설명</TableHead>
                <TableHead>권한</TableHead>
                <TableHead>상태</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tools.map((tool) => (
                <TableRow key={tool.name}>
                  <TableCell className="font-medium">
                    <div className="flex items-center space-x-2">
                        <span>{tool.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{tool.description}</TableCell>
                  <TableCell>
                    {tool.requiredPermissions && tool.requiredPermissions.length > 0 ? (
                      <div className="flex gap-1">
                        {tool.requiredPermissions.map((perm) => (
                          <Badge key={perm} variant="secondary" className="text-xs">
                            <Lock className="w-3 h-3 mr-1" />
                            {perm}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-gray-500">Public</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-green-500 hover:bg-green-600">Active</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Schema Viewer (Optional, for debugging) */}
      <Card>
        <CardHeader>
            <CardTitle>Input Schemas</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="space-y-4">
                {tools.map(tool => (
                    <div key={tool.name} className="border rounded p-4 bg-slate-50 dark:bg-slate-900">
                        <h4 className="font-semibold mb-2 text-sm">{tool.name}</h4>
                        <pre className="text-xs overflow-auto max-h-40">
                            {JSON.stringify(tool.inputSchema, null, 2)}
                        </pre>
                    </div>
                ))}
            </div>
        </CardContent>
      </Card>

      {/* Tool Playground */}
      <Card>
        <CardHeader>
          <CardTitle>Tool Playground</CardTitle>
          <CardDescription>
            Test MCP tools directly from the admin panel.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <Playground tools={tools} />
        </CardContent>
      </Card>

      {/* Execution Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Execution Logs</CardTitle>
          <CardDescription>
            Recent tool execution activity.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LogsTable />
        </CardContent>
      </Card>
    </div>
  );
}

function Playground({ tools }: { tools: McpTool[] }) {
    const [selectedTool, setSelectedTool] = useState<string>('');
    const [args, setArgs] = useState<string>('{}');
    const [projectId, setProjectId] = useState<string>('');
    const [result, setResult] = useState<any>(null);
    const [executing, setExecuting] = useState(false);

    const handleExecute = async () => {
        if (!selectedTool) return;
        setExecuting(true);
        setResult(null);
        
        try {
            const parsedArgs = JSON.parse(args);
            const token = localStorage.getItem('accessToken');
            const response = await fetch(`${API_BASE_URL}/api/admin/mcp/execute`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: selectedTool,
                    args: parsedArgs,
                    projectId: projectId || undefined // Send undefined if empty
                })
            });
            const data = await response.json();
            setResult(data);
        } catch (e) {
            setResult({ isError: true, error: { message: e instanceof Error ? e.message : String(e) } });
        } finally {
            setExecuting(false);
        }
    };

    const handleResetCircuit = async () => {
        if (!selectedTool) return;
        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch(`${API_BASE_URL}/api/admin/mcp/reset-circuit`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ toolName: selectedTool })
            });
            const data = await response.json();
            setResult(data);
        } catch (e) {
            setResult({ isError: true, error: { message: e instanceof Error ? e.message : String(e) } });
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col space-y-2">
                <label className="text-sm font-medium">Select Tool</label>
                <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={selectedTool}
                    onChange={(e) => {
                        setSelectedTool(e.target.value);
                        // Pre-fill args with example values based on tool schema
                        const tool = tools.find(t => t.name === e.target.value);
                        if (tool && tool.inputSchema?.properties) {
                            const exampleArgs: Record<string, any> = {};
                            for (const [key, schema] of Object.entries(tool.inputSchema.properties as Record<string, any>)) {
                                // Generate example value based on type
                                if (schema.enum && schema.enum.length > 0) {
                                    exampleArgs[key] = schema.enum[0]; // Use first enum value
                                } else if (schema.type === 'string') {
                                    exampleArgs[key] = schema.default || '.';
                                } else if (schema.type === 'number' || schema.type === 'integer') {
                                    exampleArgs[key] = schema.default || 0;
                                } else if (schema.type === 'boolean') {
                                    exampleArgs[key] = schema.default || false;
                                } else if (schema.type === 'array') {
                                    exampleArgs[key] = [];
                                } else {
                                    exampleArgs[key] = '';
                                }
                            }
                            setArgs(JSON.stringify(exampleArgs, null, 2));
                        } else {
                            setArgs('{}');
                        }
                    }}
                >
                    <option value="">-- Choose a tool --</option>
                    {tools.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                </select>
            </div>
            
            <div className="flex flex-col space-y-2">
                <label className="text-sm font-medium">Arguments (JSON)</label>
                <textarea 
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
                    value={args}
                    onChange={(e) => setArgs(e.target.value)}
                />
            </div>

            <div className="flex flex-col space-y-2">
                <label className="text-sm font-medium">Project ID (Optional)</label>
                <input 
                    type="text"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Enter Project UUID to test project-scoped tools"
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                />
            </div>

            <div className="flex gap-2">
                <button 
                    className={`inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 ${executing ? 'opacity-70' : ''}`}
                    onClick={handleExecute}
                    disabled={executing || !selectedTool}
                >
                    {executing ? 'Running...' : 'Execute Tool'}
                </button>
                <button 
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
                    onClick={handleResetCircuit}
                    disabled={!selectedTool}
                    title="Reset circuit breaker if the tool is blocked"
                >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reset Circuit
                </button>
            </div>

            {result && (
                <div className={`p-4 rounded-lg border text-sm overflow-auto max-h-60 ${result.isError ? 'bg-red-50 dark:bg-red-950/20 border-red-200' : 'bg-slate-50 dark:bg-slate-900 border-slate-200'}`}>
                    <pre className="font-mono whitespace-pre-wrap break-all">
                        {JSON.stringify(result, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
}

function LogsTable() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE_URL}/api/admin/audit/logs?action=MCP_TOOL_EXECUTE&limit=20`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        // Handle both paginated response ({ items: [] }) and direct array
        const logItems = Array.isArray(data) ? data : (data.items || []);
        setLogs(logItems);
      }
    } catch (e) {
      console.error('Failed to fetch logs', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-sm text-muted-foreground">Loading logs...</div>;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Time</TableHead>
          <TableHead>User</TableHead>
          <TableHead>Tool</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Details</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {!logs || logs.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center text-muted-foreground">No execution logs found</TableCell>
          </TableRow>
        ) : (
          logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell className="text-xs">{new Date(log.createdAt).toLocaleString()}</TableCell>
              <TableCell className="text-xs">{log.user?.email || log.userId}</TableCell>
              <TableCell className="font-medium">{log.resource}</TableCell>
              <TableCell>
                {log.metadata?.success ? (
                  <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200">Success</Badge>
                ) : (
                  <Badge variant="destructive">Failed</Badge>
                )}
              </TableCell>
              <TableCell className="text-xs font-mono max-w-[200px] truncate" title={JSON.stringify(log.metadata, null, 2)}>
                {JSON.stringify(log.metadata?.inputs || {})}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

function HowItWorksDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <HelpCircle className="h-4 w-4 mr-2" />
          동작 원리
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            MCP (Model Context Protocol) 동작 원리
          </DialogTitle>
          <DialogDescription>
            AI가 안전하게 시스템과 상호작용하는 방법을 알아보세요.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">개요</TabsTrigger>
            <TabsTrigger value="flow">실행 흐름</TabsTrigger>
            <TabsTrigger value="tools">도구 목록</TabsTrigger>
            <TabsTrigger value="editor">에디터 연동</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-yellow-500" />
                    <CardTitle className="text-sm">MCP란?</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Model Context Protocol은 AI 모델이 외부 시스템(파일, Git, DB 등)과 
                  안전하게 상호작용할 수 있도록 하는 표준 프로토콜입니다.
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-green-500" />
                    <CardTitle className="text-sm">보안</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  모든 도구 실행은 권한 검사를 거칩니다. 
                  ADMIN 권한이 필요한 도구는 관리자만 사용 가능합니다.
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-blue-500" />
                    <CardTitle className="text-sm">캐싱 & 안정성</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  읽기 전용 작업은 60초 캐싱됩니다. 
                  Circuit Breaker가 연속 실패 시 도구를 일시 비활성화합니다.
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-purple-500" />
                    <CardTitle className="text-sm">감사 로그</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  모든 도구 실행은 ActivityLog에 기록됩니다.
                  사용자, 도구 이름, 입력값, 성공 여부가 저장됩니다.
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="flow" className="space-y-4 mt-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-3">실행 흐름도</h4>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="shrink-0">1</Badge>
                  <div>
                    <p className="font-medium">사용자 요청</p>
                    <p className="text-muted-foreground">에디터에서 AI에게 질문 (예: "src 폴더의 파일 목록을 보여줘")</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="shrink-0">2</Badge>
                  <div>
                    <p className="font-medium">AI 모델 판단</p>
                    <p className="text-muted-foreground">AI가 요청을 분석하고 적절한 도구 호출 결정 (예: filesystem_list)</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="shrink-0">3</Badge>
                  <div>
                    <p className="font-medium">권한 검사</p>
                    <p className="text-muted-foreground">McpHostService가 사용자의 도구/프로젝트 접근 권한 확인</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="shrink-0">4</Badge>
                  <div>
                    <p className="font-medium">도구 실행</p>
                    <p className="text-muted-foreground">권한이 있으면 도구 실행, 결과를 AI에게 반환</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="shrink-0">5</Badge>
                  <div>
                    <p className="font-medium">최종 응답</p>
                    <p className="text-muted-foreground">AI가 도구 결과를 해석하여 사용자에게 자연어로 응답</p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="tools" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <FileCode className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="font-medium">filesystem_read / filesystem_list</p>
                  <p className="text-sm text-muted-foreground">파일 내용 읽기 및 디렉토리 목록 조회</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Database className="h-5 w-5 text-green-500" />
                <div>
                  <p className="font-medium">git_diff / git_log / git_status</p>
                  <p className="text-sm text-muted-foreground">Git 변경사항, 커밋 히스토리, 상태 조회</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Server className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="font-medium">search_code</p>
                  <p className="text-sm text-muted-foreground">코드베이스 내 패턴 검색 (grep 기반)</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Info className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="font-medium">get_project_metadata</p>
                  <p className="text-sm text-muted-foreground">프로젝트 메타데이터(DB 스키마 등) 조회</p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="editor" className="space-y-4 mt-4">
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>에디터 통합 완료</AlertTitle>
              <AlertDescription>
                MCP는 에디터의 AI 채팅에 완전히 통합되어 있습니다.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-3">
              <h4 className="font-medium">사용 방법</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li><strong>프로젝트 열기:</strong> 에디터에서 프로젝트를 엽니다.</li>
                <li><strong>AI 채팅:</strong> 우측 AI 패널에서 질문합니다.</li>
                <li><strong>예시 질문:</strong>
                  <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                    <li>"이 프로젝트의 파일 구조를 보여줘"</li>
                    <li>"src/utils에서 TODO 주석을 찾아줘"</li>
                    <li>"최근 git 변경사항이 뭐야?"</li>
                  </ul>
                </li>
                <li><strong>도구 실행 확인:</strong> 채팅에서 "Executed: [도구명]" 접힌 블록 확인</li>
              </ol>
            </div>

            <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 rounded-lg p-4">
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                ✅ 현재 상태: 정상 작동 중
              </p>
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                AI 채팅에서 파일 시스템, Git, 코드 검색 도구를 사용할 수 있습니다.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
