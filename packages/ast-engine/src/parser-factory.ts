import { Parser, IParserFactory } from './types/parser';
import { getLanguageFromExtension } from './types/ast-node';
import { TypeScriptParser } from './parsers/typescript-parser';
import { PythonParser } from './parsers/python-parser';
import { JavaParser } from './parsers/java-parser';
import { GoParser } from './parsers/go-parser';

/**
 * Parser Factory for managing language-specific parsers
 */
export class ParserFactory implements IParserFactory {
  private parsers: Map<string, Parser> = new Map();

  constructor() {
    // Register default parsers
    this.registerParser(new TypeScriptParser());
    this.registerParser(new PythonParser());
    this.registerParser(new JavaParser());
    this.registerParser(new GoParser());
  }

  getParser(language: string): Parser | undefined {
    return this.parsers.get(language.toLowerCase());
  }

  getParserForFile(filePath: string): Parser | undefined {
    const language = getLanguageFromExtension(filePath);
    if (!language) return undefined;
    
    return this.getParser(language);
  }

  registerParser(parser: Parser): void {
    this.parsers.set(parser.language.toLowerCase(), parser);
    
    // Also register any additional extension mappings
    for (const ext of parser.extensions) {
      // Future: could add extension -> parser lookup
    }
  }

  getSupportedLanguages(): string[] {
    return Array.from(this.parsers.keys());
  }

  /**
   * Parse a file using the appropriate parser
   */
  async parseFile(source: string, filePath: string) {
    const parser = this.getParserForFile(filePath);
    if (!parser) {
      throw new Error(`No parser available for file: ${filePath}`);
    }
    return parser.parse(source, filePath);
  }
}

// Default factory instance
export const defaultParserFactory = new ParserFactory();
