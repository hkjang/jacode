import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FileIndexerService, IndexedFile } from './file-indexer.service';

/**
 * RAG context for prompt injection
 */
export interface RAGContext {
  relevantFiles: RelevantFile[];
  summary: string;
  tokenEstimate: number;
}

export interface RelevantFile {
  path: string;
  language: string;
  symbols: string[];
  snippet?: string;
  relevanceScore: number;
}

/**
 * RAG options
 */
export interface RAGOptions {
  maxFiles?: number;
  maxTokens?: number;
  includeSnippets?: boolean;
  snippetLines?: number;
}

const DEFAULT_RAG_OPTIONS: RAGOptions = {
  maxFiles: 10,
  maxTokens: 4000,
  includeSnippets: true,
  snippetLines: 20,
};

/**
 * RAG Service
 * 
 * Retrieval-Augmented Generation service for injecting
 * relevant code context into LLM prompts.
 */
@Injectable()
export class RAGService {
  private readonly logger = new Logger(RAGService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fileIndexer: FileIndexerService,
  ) {}

  /**
   * Build context from a query and project
   */
  async buildContext(
    goal: string,
    projectId: string,
    options: RAGOptions = {}
  ): Promise<RAGContext> {
    const opts = { ...DEFAULT_RAG_OPTIONS, ...options };
    
    this.logger.debug(`Building RAG context for: ${goal.substring(0, 50)}...`);

    // Get relevant files from index
    const indexedFiles = await this.fileIndexer.getRelevantFiles(
      projectId,
      goal,
      opts.maxFiles || 10
    );

    const relevantFiles: RelevantFile[] = [];
    let totalTokens = 0;

    for (const file of indexedFiles) {
      // Estimate tokens (rough: 1 token ≈ 4 chars)
      const symbolsText = file.symbols.join(', ');
      const estimatedTokens = Math.ceil((file.path.length + symbolsText.length) / 4);
      
      if (opts.maxTokens && totalTokens + estimatedTokens > opts.maxTokens) {
        break;
      }

      relevantFiles.push({
        path: file.relativePath,
        language: file.language,
        symbols: file.symbols.slice(0, 20), // Limit symbols
        relevanceScore: 1.0, // Could calculate actual score
      });

      totalTokens += estimatedTokens;
    }

    // Build summary
    const summary = this.buildSummary(relevantFiles);

    return {
      relevantFiles,
      summary,
      tokenEstimate: totalTokens,
    };
  }

  /**
   * Inject RAG context into system prompt
   */
  injectToPrompt(context: RAGContext, basePrompt: string): string {
    if (context.relevantFiles.length === 0) {
      return basePrompt;
    }

    const contextSection = `
RELEVANT CODE CONTEXT:
${context.summary}

FILES:
${context.relevantFiles.map(f => `- ${f.path} (${f.language}): ${f.symbols.slice(0, 10).join(', ')}`).join('\n')}
`;

    return `${basePrompt}

${contextSection}`;
  }

  /**
   * Build a summary of relevant files
   */
  private buildSummary(files: RelevantFile[]): string {
    if (files.length === 0) {
      return 'No relevant files found.';
    }

    const languageGroups: Record<string, number> = {};
    const allSymbols: string[] = [];

    for (const file of files) {
      languageGroups[file.language] = (languageGroups[file.language] || 0) + 1;
      allSymbols.push(...file.symbols.slice(0, 5));
    }

    const languageSummary = Object.entries(languageGroups)
      .map(([lang, count]) => `${count} ${lang}`)
      .join(', ');

    const uniqueSymbols = [...new Set(allSymbols)].slice(0, 15);

    return `Found ${files.length} relevant files (${languageSummary}). Key symbols: ${uniqueSymbols.join(', ')}`;
  }

  /**
   * Get AST skeleton for files (token-optimized)
   */
  async getASTSkeleton(
    projectId: string,
    filePaths: string[]
  ): Promise<string> {
    const skeletons: string[] = [];

    for (const filePath of filePaths) {
      const file = this.fileIndexer.findFileBySymbol(projectId, filePath);
      if (file) {
        skeletons.push(`
// ${file.relativePath}
// Symbols: ${file.symbols.join(', ')}
`);
      }
    }

    return skeletons.join('\n');
  }

  /**
   * Get function signatures for context
   */
  async getFunctionSignatures(
    projectId: string,
    symbolNames: string[]
  ): Promise<{ name: string; file: string; signature?: string }[]> {
    const result: { name: string; file: string; signature?: string }[] = [];

    for (const name of symbolNames) {
      const file = this.fileIndexer.findFileBySymbol(projectId, name);
      if (file) {
        result.push({
          name,
          file: file.relativePath,
          // In production, would extract actual signature from AST
          signature: undefined,
        });
      }
    }

    return result;
  }
}
