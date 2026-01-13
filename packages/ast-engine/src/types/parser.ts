import { ASTNode, ParsedFile, ParseError, Location } from './ast-node';

/**
 * Abstract parser interface that all language parsers must implement
 */
export interface Parser {
  /** Supported language name */
  readonly language: string;
  
  /** Supported file extensions */
  readonly extensions: string[];
  
  /**
   * Parse source code into an AST
   * @param source Source code string
   * @param filePath Path to the file (for error reporting)
   * @returns Parsed file with AST
   */
  parse(source: string, filePath: string): Promise<ParsedFile>;
  
  /**
   * Serialize AST back to source code
   * @param node AST node to serialize
   * @returns Source code string
   */
  serialize(node: ASTNode): string;
  
  /**
   * Check if this parser supports the given file
   * @param filePath Path to check
   */
  supports(filePath: string): boolean;
}

/**
 * Symbol extraction result
 */
export interface ExtractedSymbol {
  name: string;
  type: 'function' | 'class' | 'method' | 'variable' | 'interface' | 'type' | 'constant' | 'struct' | 'package' | 'import';
  location: Location;
  signature?: string;
  docstring?: string;
  exported: boolean;
  async?: boolean;
  static?: boolean;
  abstract?: boolean;
  visibility?: 'public' | 'private' | 'protected' | 'package';
  parameters?: ParameterInfo[] | { name: string; type?: string; default?: string }[];
  returnType?: string;
}

/**
 * Function/method parameter information
 */
export interface ParameterInfo {
  name: string;
  type?: string;
  optional?: boolean;
  default?: string;
  defaultValue?: string;
}

/**
 * Import statement information
 */
export interface ImportInfo {
  /** Module path or package name */
  source: string;
  
  /** Imported names */
  imports: {
    name: string;
    alias?: string;
    isDefault?: boolean;
    isNamespace?: boolean;
  }[];
  
  /** Location in source */
  location: Location;
  
  /** Whether it's a type-only import */
  isTypeOnly?: boolean;
}

/**
 * Export statement information
 */
export interface ExportInfo {
  /** Exported name */
  name: string;
  
  /** Local name if different */
  localName?: string;
  
  /** Whether it's a default export */
  isDefault: boolean;
  
  /** Whether it's a re-export */
  isReExport: boolean;
  
  /** Source module for re-exports */
  source?: string;
  
  /** Location in source */
  location: Location;
}

/**
 * Parser factory interface
 */
export interface IParserFactory {
  /**
   * Get parser for a specific language
   */
  getParser(language: string): Parser | undefined;
  
  /**
   * Get parser for a file path based on extension
   */
  getParserForFile(filePath: string): Parser | undefined;
  
  /**
   * Register a new parser
   */
  registerParser(parser: Parser): void;
  
  /**
   * Get all registered languages
   */
  getSupportedLanguages(): string[];
}
