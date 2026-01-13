/**
 * AST Analysis History Store
 * 
 * Stores AST analysis results from the editor for display in dedicated pages.
 * Uses localStorage for persistence across sessions.
 */

/**
 * Detailed symbol categories for analysis
 */
export type SymbolCategory = 
  | 'class'
  | 'interface'
  | 'type'
  | 'function'
  | 'method'
  | 'arrow_function'
  | 'api_endpoint'
  | 'decorator'
  | 'variable'
  | 'constant'
  | 'enum'
  | 'hook'
  | 'component'
  | 'unknown';

export interface SymbolInfo {
  name: string;
  type: string;
  category: SymbolCategory;
  signature?: string;
  exported: boolean;
  decorators?: string[];
  httpMethod?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  route?: string;
  isAsync?: boolean;
  parameters?: string[];
}

export interface ASTAnalysisRecord {
  id: string;
  filePath: string;
  language: string;
  lineCount: number;
  symbols: SymbolInfo[];
  imports: string[];
  exports: string[];
  tokenEstimate: number;
  analyzedAt: Date;
  projectId?: string;
  projectName?: string;
  source: 'editor' | 'manual' | 'auto';
}

const STORAGE_KEY = 'ast-analysis-history';
const MAX_RECORDS = 100;

/**
 * Get all AST analysis records
 */
export function getASTHistory(): ASTAnalysisRecord[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const records = JSON.parse(stored);
    return records.map((r: any) => ({
      ...r,
      analyzedAt: new Date(r.analyzedAt),
    }));
  } catch {
    return [];
  }
}

/**
 * Add a new AST analysis record
 */
export function addASTRecord(record: Omit<ASTAnalysisRecord, 'id' | 'analyzedAt'>): ASTAnalysisRecord {
  const newRecord: ASTAnalysisRecord = {
    ...record,
    id: `ast_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    analyzedAt: new Date(),
  };
  
  const existing = getASTHistory();
  
  // Remove duplicate file paths (keep latest)
  const filtered = existing.filter(r => r.filePath !== record.filePath);
  
  // Add new record at beginning
  const updated = [newRecord, ...filtered].slice(0, MAX_RECORDS);
  
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }
  
  // Emit event for real-time updates
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ast-history-updated', { detail: newRecord }));
  }
  
  return newRecord;
}

/**
 * Remove an AST analysis record
 */
export function removeASTRecord(id: string): void {
  const existing = getASTHistory();
  const filtered = existing.filter(r => r.id !== id);
  
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    window.dispatchEvent(new CustomEvent('ast-history-updated'));
  }
}

/**
 * Clear all AST analysis history
 */
export function clearASTHistory(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('ast-history-updated'));
  }
}

/**
 * Get AST records by project
 */
export function getASTHistoryByProject(projectId: string): ASTAnalysisRecord[] {
  return getASTHistory().filter(r => r.projectId === projectId);
}

/**
 * Get summary statistics
 */
export function getASTStats() {
  const records = getASTHistory();
  
  const languages = new Map<string, number>();
  let totalSymbols = 0;
  let totalLines = 0;
  let totalFiles = records.length;
  
  for (const record of records) {
    languages.set(record.language, (languages.get(record.language) || 0) + 1);
    totalSymbols += record.symbols.length;
    totalLines += record.lineCount;
  }
  
  return {
    totalFiles,
    totalSymbols,
    totalLines,
    languages: Object.fromEntries(languages),
    lastAnalyzedAt: records[0]?.analyzedAt,
  };
}
