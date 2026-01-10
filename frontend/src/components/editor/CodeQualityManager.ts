'use client';

import * as monaco from 'monaco-editor';

export interface LintResult {
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
  source?: string;
  ruleId?: string;
}

export interface CodeQualityConfig {
  enableRealTimeLinting?: boolean;
  lintDelay?: number;
  severityFilter?: ('error' | 'warning' | 'info')[];
  customRules?: any;
}

export class CodeQualityManager {
  private editor: monaco.editor.IStandaloneCodeEditor;
  private monaco: typeof monaco;
  private config: CodeQualityConfig;
  private lintTimeout?: NodeJS.Timeout;
  private markers: monaco.editor.IMarkerData[] = [];

  constructor(
    editor: monaco.editor.IStandaloneCodeEditor,
    monacoInstance: typeof monaco,
    config?: CodeQualityConfig
  ) {
    this.editor = editor;
    this.monaco = monacoInstance;
    this.config = {
      enableRealTimeLinting: true,
      lintDelay: 500,
      severityFilter: ['error', 'warning', 'info'],
      ...config,
    };
  }

  /**
   * Initialize live linting
   */
  init(): void {
    if (this.config.enableRealTimeLinting) {
      this.editor.onDidChangeModelContent(() => {
        this.scheduleLint();
      });
    }
  }

  /**
   * Schedule lint check with debounce
   */
  private scheduleLint(): void {
    if (this.lintTimeout) {
      clearTimeout(this.lintTimeout);
    }

    this.lintTimeout = setTimeout(() => {
      this.runLint();
    }, this.config.lintDelay);
  }

  /**
   * Run lint check
   */
  async runLint(): Promise<void> {
    const model = this.editor.getModel();
    if (!model) return;

    const code = model.getValue();
    const language = model.getLanguageId();

    try {
      // Get lint results from backend or local linter
      const results = await this.getLintResults(code, language);
      
      // Apply results to editor
      this.applyLintResults(results);
    } catch (error) {
      console.error('Lint check failed:', error);
    }
  }

  /**
   * Get lint results (placeholder - integrate with actual linter)
   */
  private async getLintResults(code: string, language: string): Promise<LintResult[]> {
    // This would call your backend API or use a local linter
    // For now, return basic validation

    const results: LintResult[] = [];

    // Example: Check for common issues
    const lines = code.split('\n');
    lines.forEach((line, index) => {
      const lineNumber = index + 1;

      // Check for console.log
      if (line.includes('console.log')) {
        results.push({
          line: lineNumber,
          column: line.indexOf('console.log') + 1,
          message: 'Unexpected console.log statement',
          severity: 'warning',
          source: 'code-quality',
          ruleId: 'no-console',
        });
      }

      // Check for TODO comments
      if (line.includes('TODO') || line.includes('FIXME')) {
        results.push({
          line: lineNumber,
          column: line.search(/TODO|FIXME/) + 1,
          message: 'TODO/FIXME comment found',
          severity: 'info',
          source: 'code-quality',
          ruleId: 'no-todo',
        });
      }

      // Check for long lines (> 120 chars)
      if (line.length > 120) {
        results.push({
          line: lineNumber,
          column: 120,
          message: 'Line exceeds 120 characters',
          severity: 'info',
          source: 'code-quality',
          ruleId: 'max-line-length',
        });
      }
    });

    return results;
  }

  /**
   * Apply lint results to editor
   */
  applyLintResults(results: LintResult[]): void {
    const model = this.editor.getModel();
    if (!model) return;

    // Filter by severity
    const filtered = results.filter(r => 
      this.config.severityFilter?.includes(r.severity)
    );

    // Convert to Monaco markers
    this.markers = filtered.map(result => ({
      startLineNumber: result.line,
      startColumn: result.column,
      endLineNumber: result.endLine || result.line,
      endColumn: result.endColumn || result.column + 1,
      message: result.message,
      severity: this.getSeverityLevel(result.severity),
      source: result.source,
      code: result.ruleId,
    }));

    // Set markers
    this.monaco.editor.setModelMarkers(model, 'code-quality', this.markers);
  }

  /**
   * Get Monaco severity level
   */
  private getSeverityLevel(severity: LintResult['severity']): monaco.MarkerSeverity {
    switch (severity) {
      case 'error':
        return this.monaco.MarkerSeverity.Error;
      case 'warning':
        return this.monaco.MarkerSeverity.Warning;
      case 'info':
        return this.monaco.MarkerSeverity.Info;
      default:
        return this.monaco.MarkerSeverity.Hint;
    }
  }

  /**
   * Clear all markers
   */
  clearMarkers(): void {
    const model = this.editor.getModel();
    if (!model) return;

    this.monaco.editor.setModelMarkers(model, 'code-quality', []);
    this.markers = [];
  }

  /**
   * Get current markers
   */
  getMarkers(): monaco.editor.IMarkerData[] {
    return [...this.markers];
  }

  /**
   * Get markers by severity
   */
  getMarkersBySeverity(severity: LintResult['severity']): monaco.editor.IMarkerData[] {
    const targetSeverity = this.getSeverityLevel(severity);
    return this.markers.filter(m => m.severity === targetSeverity);
  }

  /**
   * Get quality score (0-100)
   */
  getQualityScore(): number {
    if (this.markers.length === 0) return 100;

    const errorCount = this.getMarkersBySeverity('error').length;
    const warningCount = this.getMarkersBySeverity('warning').length;
    const infoCount = this.getMarkersBySeverity('info').length;

    // Weighted score calculation
    const penalty = (errorCount * 10) + (warningCount * 5) + (infoCount * 1);
    const score = Math.max(0, 100 - penalty);

    return score;
  }

  /**
   * Get quality report
   */
  getQualityReport() {
    return {
      score: this.getQualityScore(),
      totalIssues: this.markers.length,
      errors: this.getMarkersBySeverity('error').length,
      warnings: this.getMarkersBySeverity('warning').length,
      info: this.getMarkersBySeverity('info').length,
      markers: this.markers,
    };
  }

  /**
   * Dispose and cleanup
   */
  dispose(): void {
    if (this.lintTimeout) {
      clearTimeout(this.lintTimeout);
    }
    this.clearMarkers();
  }
}

export default CodeQualityManager;
