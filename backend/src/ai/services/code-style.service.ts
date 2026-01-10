import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CodeStyleService {
  private readonly logger = new Logger(CodeStyleService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new code style preset
   */
  async createPreset(data: {
    name: string;
    language: string;
    rules: any;
    conventions: string;
    teamId?: string;
    isGlobal?: boolean;
  }) {
    return this.prisma.codeStylePreset.create({
      data: {
        name: data.name,
        language: data.language,
        rules: data.rules,
        conventions: data.conventions,
        teamId: data.teamId,
        isGlobal: data.isGlobal || false,
      },
    });
  }

  /**
   * Get preset by ID
   */
  async getPreset(id: string) {
    return this.prisma.codeStylePreset.findUnique({
      where: { id },
    });
  }

  /**
   * Get preset by name
   */
  async getPresetByName(name: string) {
    return this.prisma.codeStylePreset.findUnique({
      where: { name },
    });
  }

  /**
   * List presets by language
   */
  async listPresets(language?: string, teamId?: string) {
    return this.prisma.codeStylePreset.findMany({
      where: {
        language: language,
        OR: [
          { isGlobal: true },
          { teamId: teamId },
        ],
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Update preset
   */
  async updatePreset(
    id: string,
    data: Partial<{
      rules: any;
      conventions: string;
    }>
  ) {
    return this.prisma.codeStylePreset.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete preset
   */
  async deletePreset(id: string) {
    return this.prisma.codeStylePreset.delete({
      where: { id },
    });
  }

  /**
   * Apply style rules to code
   */
  applyStyleRules(code: string, rules: any): string {
    // This is a simplified implementation
    // In production, you would integrate with ESLint/Prettier
    let styled = code;

    if (rules.indentStyle === 'spaces' && rules.indentSize) {
      // Convert tabs to spaces
      const spaces = ' '.repeat(rules.indentSize);
      styled = styled.replace(/\t/g, spaces);
    }

    if (rules.lineEnding === 'lf') {
      styled = styled.replace(/\r\n/g, '\n');
    } else if (rules.lineEnding === 'crlf') {
      styled = styled.replace(/\n/g, '\r\n');
    }

    if (rules.trimTrailingWhitespace) {
      styled = styled
        .split('\n')
        .map(line => line.trimEnd())
        .join('\n');
    }

    if (rules.insertFinalNewline && !styled.endsWith('\n')) {
      styled += '\n';
    }

    return styled;
  }

  /**
   * Generate conventions summary for AI
   */
  generateConventionsSummary(preset: any): string {
    const rules = preset.rules || {};
    const summary: string[] = [];

    summary.push(`Code Style: ${preset.name} (${preset.language})`);
    summary.push('');
    summary.push('Rules:');
    
    if (rules.indentStyle) {
      summary.push(`- Indentation: ${rules.indentSize || 2} ${rules.indentStyle === 'spaces' ? 'spaces' : 'tabs'}`);
    }
    
    if (rules.quotes) {
      summary.push(`- Quotes: ${rules.quotes === 'single' ? 'single quotes' : 'double quotes'}`);
    }
    
    if (rules.semicolons !== undefined) {
      summary.push(`- Semicolons: ${rules.semicolons ? 'required' : 'not required'}`);
    }
    
    if (rules.lineLength) {
      summary.push(`- Max line length: ${rules.lineLength} characters`);
    }

    if (preset.conventions) {
      summary.push('');
      summary.push('Conventions:');
      summary.push(preset.conventions);
    }

    return summary.join('\n');
  }

  /**
   * Create default presets for common languages
   */
  async createDefaultPresets() {
    const defaults = [
      {
        name: 'TypeScript Standard',
        language: 'typescript',
        rules: {
          indentStyle: 'spaces',
          indentSize: 2,
          quotes: 'single',
          semicolons: true,
          lineLength: 100,
          trimTrailingWhitespace: true,
          insertFinalNewline: true,
        },
        conventions: `- Use PascalCase for classes and interfaces
- Use camelCase for variables and functions
- Use UPPER_SNAKE_CASE for constants
- Add JSDoc comments for public APIs
- Prefer const over let
- Use async/await over raw promises`,
        isGlobal: true,
      },
      {
        name: 'Python PEP 8',
        language: 'python',
        rules: {
          indentStyle: 'spaces',
          indentSize: 4,
          lineLength: 79,
          trimTrailingWhitespace: true,
          insertFinalNewline: true,
        },
        conventions: `- Follow PEP 8 style guide
- Use snake_case for functions and variables
- Use PascalCase for classes
- Use docstrings for functions and classes
- Maximum line length: 79 characters
- Use type hints where applicable`,
        isGlobal: true,
      },
      {
        name: 'Java Google Style',
        language: 'java',
        rules: {
          indentStyle: 'spaces',
          indentSize: 2,
          lineLength: 100,
          trimTrailingWhitespace: true,
        },
        conventions: `- Follow Google Java Style Guide
- Use PascalCase for classes
- Use camelCase for methods and variables
- Use UPPER_SNAKE_CASE for constants
- Add Javadoc for public methods
- One class per file`,
        isGlobal: true,
      },
    ];

    for (const preset of defaults) {
      try {
        const existing = await this.getPresetByName(preset.name);
        if (!existing) {
          await this.createPreset(preset);
          this.logger.log(`Created default preset: ${preset.name}`);
        }
      } catch (error) {
        this.logger.warn(`Failed to create default preset ${preset.name}:`, error);
      }
    }
  }
}
