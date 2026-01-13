'use client';

import React, { useState } from 'react';
import { agentApi } from '@/lib/api';
import styles from './CodeAnalyzer.module.css';

interface AnalysisResult {
  language?: string;
  lineCount?: number;
  symbols?: any[];
  imports?: any;
  exports?: any;
  error?: string;
}

interface SkeletonResult {
  filePath: string;
  language: string;
  symbols: any[];
  imports: string[];
  exports: string[];
  lineCount: number;
  tokenEstimate: number;
  formatted: string;
}

interface DiffResult {
  filePath: string;
  additions: number;
  deletions: number;
  unified: string;
  markdown: string;
}

interface SupportedLanguage {
  id: string;
  extensions: string[];
  name: string;
}

export default function CodeAnalyzer() {
  const [activeTab, setActiveTab] = useState<'analyze' | 'skeleton' | 'diff'>('analyze');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Analyze state
  const [filePath, setFilePath] = useState('example.ts');
  const [code, setCode] = useState(`function hello(name: string): string {
  return \`Hello, \${name}!\`;
}

export class UserService {
  private users: Map<string, User> = new Map();
  
  async getUser(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }
  
  async createUser(name: string): Promise<User> {
    const user = { id: crypto.randomUUID(), name };
    this.users.set(user.id, user);
    return user;
  }
}`);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  
  // Skeleton state
  const [skeletonResult, setSkeletonResult] = useState<SkeletonResult | null>(null);
  
  // Diff state
  const [originalCode, setOriginalCode] = useState('');
  const [modifiedCode, setModifiedCode] = useState('');
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null);
  
  // Languages
  const [languages, setLanguages] = useState<SupportedLanguage[]>([]);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await agentApi.analyzeFile(filePath, code);
      setAnalysisResult(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGetSkeleton = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await agentApi.getASTSkeleton(filePath, code);
      setSkeletonResult(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateDiff = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await agentApi.generateCodeDiff(originalCode, modifiedCode, 'file.ts');
      setDiffResult(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadLanguages = async () => {
    try {
      const result = await agentApi.getSupportedLanguages();
      setLanguages(result.languages);
    } catch (err: any) {
      console.error(err);
    }
  };

  React.useEffect(() => {
    loadLanguages();
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>🔍 Code Analyzer</h2>
        <div className={styles.languages}>
          {languages.map(lang => (
            <span key={lang.id} className={styles.langBadge}>{lang.name}</span>
          ))}
        </div>
      </div>

      <div className={styles.tabs}>
        <button 
          className={`${styles.tab} ${activeTab === 'analyze' ? styles.active : ''}`}
          onClick={() => setActiveTab('analyze')}
        >
          Analyze Code
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'skeleton' ? styles.active : ''}`}
          onClick={() => setActiveTab('skeleton')}
        >
          AST Skeleton
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'diff' ? styles.active : ''}`}
          onClick={() => setActiveTab('diff')}
        >
          Code Diff
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.content}>
        {activeTab === 'analyze' && (
          <div className={styles.panel}>
            <div className={styles.inputGroup}>
              <label>File Path</label>
              <input 
                type="text"
                value={filePath}
                onChange={(e) => setFilePath(e.target.value)}
                placeholder="example.ts"
              />
            </div>
            <div className={styles.inputGroup}>
              <label>Code</label>
              <textarea 
                value={code}
                onChange={(e) => setCode(e.target.value)}
                rows={12}
                className={styles.codeInput}
              />
            </div>
            <button 
              className={styles.primaryBtn}
              onClick={handleAnalyze}
              disabled={loading}
            >
              {loading ? 'Analyzing...' : 'Analyze'}
            </button>

            {analysisResult && (
              <div className={styles.result}>
                <div className={styles.resultHeader}>
                  <span>Language: {analysisResult.language}</span>
                  <span>Lines: {analysisResult.lineCount}</span>
                </div>
                
                <h4>Symbols ({analysisResult.symbols?.length || 0})</h4>
                <div className={styles.symbolList}>
                  {analysisResult.symbols?.map((sym, i) => (
                    <div key={i} className={styles.symbolItem}>
                      <span className={`${styles.symbolType} ${styles[sym.type]}`}>
                        {sym.type}
                      </span>
                      <span className={styles.symbolName}>{sym.name}</span>
                      {sym.signature && (
                        <code className={styles.signature}>{sym.signature}</code>
                      )}
                    </div>
                  ))}
                </div>

                {analysisResult.imports?.imports?.length > 0 && (
                  <>
                    <h4>Imports</h4>
                    <ul className={styles.importList}>
                      {analysisResult.imports.imports.map((imp: any, i: number) => (
                        <li key={i}>{imp.name} from "{imp.source}"</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'skeleton' && (
          <div className={styles.panel}>
            <div className={styles.inputGroup}>
              <label>File Path</label>
              <input 
                type="text"
                value={filePath}
                onChange={(e) => setFilePath(e.target.value)}
              />
            </div>
            <div className={styles.inputGroup}>
              <label>Code</label>
              <textarea 
                value={code}
                onChange={(e) => setCode(e.target.value)}
                rows={10}
                className={styles.codeInput}
              />
            </div>
            <button 
              className={styles.primaryBtn}
              onClick={handleGetSkeleton}
              disabled={loading}
            >
              {loading ? 'Generating...' : 'Generate Skeleton'}
            </button>

            {skeletonResult && (
              <div className={styles.result}>
                <div className={styles.resultHeader}>
                  <span>Token Estimate: ~{skeletonResult.tokenEstimate}</span>
                  <span>Symbols: {skeletonResult.symbols?.length}</span>
                </div>
                <h4>Compact Representation</h4>
                <pre className={styles.skeletonOutput}>{skeletonResult.formatted}</pre>
              </div>
            )}
          </div>
        )}

        {activeTab === 'diff' && (
          <div className={styles.panel}>
            <div className={styles.diffInputs}>
              <div className={styles.inputGroup}>
                <label>Original</label>
                <textarea 
                  value={originalCode}
                  onChange={(e) => setOriginalCode(e.target.value)}
                  rows={8}
                  className={styles.codeInput}
                  placeholder="Original code..."
                />
              </div>
              <div className={styles.inputGroup}>
                <label>Modified</label>
                <textarea 
                  value={modifiedCode}
                  onChange={(e) => setModifiedCode(e.target.value)}
                  rows={8}
                  className={styles.codeInput}
                  placeholder="Modified code..."
                />
              </div>
            </div>
            <button 
              className={styles.primaryBtn}
              onClick={handleGenerateDiff}
              disabled={loading}
            >
              {loading ? 'Generating...' : 'Generate Diff'}
            </button>

            {diffResult && (
              <div className={styles.result}>
                <div className={styles.resultHeader}>
                  <span className={styles.additions}>+{diffResult.additions}</span>
                  <span className={styles.deletions}>-{diffResult.deletions}</span>
                </div>
                <pre className={styles.diffOutput}>{diffResult.unified}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
