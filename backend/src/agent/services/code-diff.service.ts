import { Injectable, Logger } from '@nestjs/common';

/**
 * Diff operation types
 */
export type DiffOperation = 'insert' | 'delete' | 'equal';

/**
 * A single diff chunk
 */
export interface DiffChunk {
  operation: DiffOperation;
  content: string;
  lineStart: number;
  lineEnd: number;
}

/**
 * File diff result
 */
export interface FileDiff {
  filePath: string;
  originalLines: number;
  modifiedLines: number;
  additions: number;
  deletions: number;
  chunks: DiffChunk[];
  unified: string;
}

/**
 * Multi-file diff result
 */
export interface MultiFileDiff {
  files: FileDiff[];
  totalAdditions: number;
  totalDeletions: number;
  totalFilesChanged: number;
}

/**
 * Code Diff Service
 * 
 * Generates diffs for code changes with various output formats.
 */
@Injectable()
export class CodeDiffService {
  private readonly logger = new Logger(CodeDiffService.name);

  /**
   * Generate diff between two strings
   */
  generateDiff(original: string, modified: string, filePath: string = 'file'): FileDiff {
    const originalLines = original.split('\n');
    const modifiedLines = modified.split('\n');
    
    const chunks = this.computeLineDiff(originalLines, modifiedLines);
    const unified = this.generateUnifiedDiff(originalLines, modifiedLines, filePath, chunks);
    
    let additions = 0;
    let deletions = 0;
    for (const chunk of chunks) {
      if (chunk.operation === 'insert') additions += chunk.content.split('\n').length;
      if (chunk.operation === 'delete') deletions += chunk.content.split('\n').length;
    }

    return {
      filePath,
      originalLines: originalLines.length,
      modifiedLines: modifiedLines.length,
      additions,
      deletions,
      chunks,
      unified,
    };
  }

  /**
   * Generate multi-file diff
   */
  generateMultiFileDiff(
    changes: { filePath: string; original: string; modified: string }[]
  ): MultiFileDiff {
    const files: FileDiff[] = [];
    let totalAdditions = 0;
    let totalDeletions = 0;

    for (const change of changes) {
      const diff = this.generateDiff(change.original, change.modified, change.filePath);
      files.push(diff);
      totalAdditions += diff.additions;
      totalDeletions += diff.deletions;
    }

    return {
      files,
      totalAdditions,
      totalDeletions,
      totalFilesChanged: files.length,
    };
  }

  /**
   * Compute line-by-line diff using LCS algorithm
   */
  private computeLineDiff(original: string[], modified: string[]): DiffChunk[] {
    const chunks: DiffChunk[] = [];
    const lcs = this.longestCommonSubsequence(original, modified);
    
    let origIdx = 0;
    let modIdx = 0;
    let lcsIdx = 0;

    while (origIdx < original.length || modIdx < modified.length) {
      if (lcsIdx < lcs.length && origIdx < original.length && original[origIdx] === lcs[lcsIdx]) {
        // Equal line
        if (modIdx < modified.length && modified[modIdx] === lcs[lcsIdx]) {
          chunks.push({
            operation: 'equal',
            content: original[origIdx],
            lineStart: origIdx + 1,
            lineEnd: origIdx + 1,
          });
          origIdx++;
          modIdx++;
          lcsIdx++;
        } else if (modIdx < modified.length) {
          // Insertion
          chunks.push({
            operation: 'insert',
            content: modified[modIdx],
            lineStart: modIdx + 1,
            lineEnd: modIdx + 1,
          });
          modIdx++;
        }
      } else if (origIdx < original.length) {
        // Deletion
        chunks.push({
          operation: 'delete',
          content: original[origIdx],
          lineStart: origIdx + 1,
          lineEnd: origIdx + 1,
        });
        origIdx++;
      } else if (modIdx < modified.length) {
        // Remaining insertions
        chunks.push({
          operation: 'insert',
          content: modified[modIdx],
          lineStart: modIdx + 1,
          lineEnd: modIdx + 1,
        });
        modIdx++;
      }
    }

    // Merge consecutive chunks of same type
    return this.mergeChunks(chunks);
  }

  /**
   * LCS algorithm for line matching
   */
  private longestCommonSubsequence(a: string[], b: string[]): string[] {
    const m = a.length;
    const n = b.length;
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (a[i - 1] === b[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    // Backtrack to find LCS
    const lcs: string[] = [];
    let i = m, j = n;
    while (i > 0 && j > 0) {
      if (a[i - 1] === b[j - 1]) {
        lcs.unshift(a[i - 1]);
        i--;
        j--;
      } else if (dp[i - 1][j] > dp[i][j - 1]) {
        i--;
      } else {
        j--;
      }
    }

    return lcs;
  }

  /**
   * Merge consecutive chunks of same type
   */
  private mergeChunks(chunks: DiffChunk[]): DiffChunk[] {
    if (chunks.length === 0) return [];

    const merged: DiffChunk[] = [];
    let current = { ...chunks[0] };

    for (let i = 1; i < chunks.length; i++) {
      if (chunks[i].operation === current.operation) {
        current.content += '\n' + chunks[i].content;
        current.lineEnd = chunks[i].lineEnd;
      } else {
        merged.push(current);
        current = { ...chunks[i] };
      }
    }
    merged.push(current);

    return merged;
  }

  /**
   * Generate unified diff format
   */
  private generateUnifiedDiff(
    original: string[],
    modified: string[],
    filePath: string,
    chunks: DiffChunk[]
  ): string {
    const lines: string[] = [
      `--- a/${filePath}`,
      `+++ b/${filePath}`,
    ];

    // Group chunks into hunks
    const hunks = this.groupIntoHunks(chunks, 3); // 3 lines of context

    for (const hunk of hunks) {
      const origStart = hunk.origStart;
      const origCount = hunk.origCount;
      const modStart = hunk.modStart;
      const modCount = hunk.modCount;

      lines.push(`@@ -${origStart},${origCount} +${modStart},${modCount} @@`);
      
      for (const chunk of hunk.chunks) {
        const prefix = chunk.operation === 'insert' ? '+' : 
                       chunk.operation === 'delete' ? '-' : ' ';
        for (const line of chunk.content.split('\n')) {
          lines.push(prefix + line);
        }
      }
    }

    return lines.join('\n');
  }

  /**
   * Group diff chunks into hunks with context
   */
  private groupIntoHunks(chunks: DiffChunk[], contextLines: number) {
    const hunks: {
      origStart: number;
      origCount: number;
      modStart: number;
      modCount: number;
      chunks: DiffChunk[];
    }[] = [];

    let currentHunk: typeof hunks[0] | null = null;
    let origLine = 1;
    let modLine = 1;

    for (const chunk of chunks) {
      if (chunk.operation !== 'equal') {
        if (!currentHunk) {
          currentHunk = {
            origStart: Math.max(1, origLine - contextLines),
            origCount: 0,
            modStart: Math.max(1, modLine - contextLines),
            modCount: 0,
            chunks: [],
          };
        }
        currentHunk.chunks.push(chunk);
        
        if (chunk.operation === 'delete') {
          currentHunk.origCount++;
          origLine++;
        } else if (chunk.operation === 'insert') {
          currentHunk.modCount++;
          modLine++;
        }
      } else {
        if (currentHunk) {
          currentHunk.chunks.push(chunk);
          currentHunk.origCount++;
          currentHunk.modCount++;
          hunks.push(currentHunk);
          currentHunk = null;
        }
        origLine++;
        modLine++;
      }
    }

    if (currentHunk) {
      hunks.push(currentHunk);
    }

    return hunks;
  }

  /**
   * Format diff for display in terminal/markdown
   */
  formatForDisplay(diff: FileDiff): string {
    const lines: string[] = [
      `📁 ${diff.filePath}`,
      `   +${diff.additions} -${diff.deletions}`,
      '',
    ];

    for (const chunk of diff.chunks) {
      if (chunk.operation === 'insert') {
        for (const line of chunk.content.split('\n')) {
          lines.push(`+ ${line}`);
        }
      } else if (chunk.operation === 'delete') {
        for (const line of chunk.content.split('\n')) {
          lines.push(`- ${line}`);
        }
      }
    }

    return lines.join('\n');
  }

  /**
   * Format diff as markdown code block
   */
  formatAsMarkdown(diff: FileDiff): string {
    return [
      `### ${diff.filePath}`,
      `> +${diff.additions} -${diff.deletions}`,
      '',
      '```diff',
      diff.unified,
      '```',
    ].join('\n');
  }
}
