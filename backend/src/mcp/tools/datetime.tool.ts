import { Injectable } from '@nestjs/common';
import { McpTool, McpToolResult, McpContext, McpToolSchema } from '../interfaces/mcp.interface';

@Injectable()
export class DateTimeTool implements McpTool {
  name = 'datetime';
  description = 'Get current date/time, parse dates, calculate durations, and format dates.';

  inputSchema: McpToolSchema = {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        enum: ['now', 'parse', 'format', 'diff', 'add'],
        description: 'DateTime operation to perform',
      },
      date: {
        type: 'string',
        description: 'Date string to parse or format',
      },
      date2: {
        type: 'string',
        description: 'Second date for diff operation',
      },
      format: {
        type: 'string',
        description: 'Output format (iso, locale, unix, custom)',
      },
      timezone: {
        type: 'string',
        description: 'Timezone (e.g., Asia/Seoul, UTC, America/New_York)',
      },
      amount: {
        type: 'number',
        description: 'Amount to add (for add operation)',
      },
      unit: {
        type: 'string',
        enum: ['seconds', 'minutes', 'hours', 'days', 'weeks', 'months', 'years'],
        description: 'Unit for add operation',
      },
    },
    required: ['operation'],
  };

  async execute(args: any, context: McpContext): Promise<McpToolResult> {
    const { operation, date, date2, format = 'iso', timezone, amount, unit } = args;

    switch (operation) {
      case 'now':
        return this.getNow(format, timezone);

      case 'parse':
        if (!date) return this.error('Date string is required for parse operation');
        return this.parseDate(date);

      case 'format':
        if (!date) return this.error('Date string is required for format operation');
        return this.formatDate(date, format, timezone);

      case 'diff':
        if (!date || !date2) return this.error('Two dates are required for diff operation');
        return this.dateDiff(date, date2);

      case 'add':
        if (!date || amount === undefined || !unit) {
          return this.error('Date, amount, and unit are required for add operation');
        }
        return this.dateAdd(date, amount, unit);

      default:
        return this.error(`Unknown operation: ${operation}`);
    }
  }

  private getNow(format: string, timezone?: string): McpToolResult {
    const now = new Date();
    let result: string;

    try {
      switch (format) {
        case 'unix':
          result = `Unix timestamp: ${Math.floor(now.getTime() / 1000)}`;
          break;
        case 'locale':
          result = timezone 
            ? now.toLocaleString('ko-KR', { timeZone: timezone })
            : now.toLocaleString('ko-KR');
          break;
        case 'iso':
        default:
          result = now.toISOString();
      }

      return {
        content: [{ type: 'text', text: result }],
        metadata: {
          iso: now.toISOString(),
          unix: Math.floor(now.getTime() / 1000),
          timezone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        }
      };
    } catch (e) {
      return this.error(`Failed to get current time: ${e}`);
    }
  }

  private parseDate(dateStr: string): McpToolResult {
    try {
      const parsed = new Date(dateStr);
      if (isNaN(parsed.getTime())) {
        return this.error(`Invalid date string: ${dateStr}`);
      }

      return {
        content: [{ 
          type: 'text', 
          text: `Parsed: ${parsed.toISOString()}\nLocal: ${parsed.toLocaleString('ko-KR')}\nUnix: ${Math.floor(parsed.getTime() / 1000)}`
        }],
        metadata: {
          iso: parsed.toISOString(),
          unix: Math.floor(parsed.getTime() / 1000),
          year: parsed.getFullYear(),
          month: parsed.getMonth() + 1,
          day: parsed.getDate(),
          dayOfWeek: ['일', '월', '화', '수', '목', '금', '토'][parsed.getDay()],
        }
      };
    } catch (e) {
      return this.error(`Failed to parse date: ${e}`);
    }
  }

  private formatDate(dateStr: string, format: string, timezone?: string): McpToolResult {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return this.error(`Invalid date string: ${dateStr}`);
      }

      let result: string;
      const options: Intl.DateTimeFormatOptions = timezone ? { timeZone: timezone } : {};

      switch (format) {
        case 'unix':
          result = String(Math.floor(date.getTime() / 1000));
          break;
        case 'locale':
          result = date.toLocaleString('ko-KR', options);
          break;
        case 'date':
          result = date.toLocaleDateString('ko-KR', options);
          break;
        case 'time':
          result = date.toLocaleTimeString('ko-KR', options);
          break;
        case 'iso':
        default:
          result = date.toISOString();
      }

      return { content: [{ type: 'text', text: result }] };
    } catch (e) {
      return this.error(`Failed to format date: ${e}`);
    }
  }

  private dateDiff(date1Str: string, date2Str: string): McpToolResult {
    try {
      const date1 = new Date(date1Str);
      const date2 = new Date(date2Str);

      if (isNaN(date1.getTime()) || isNaN(date2.getTime())) {
        return this.error('Invalid date string(s)');
      }

      const diffMs = Math.abs(date2.getTime() - date1.getTime());
      const diffSeconds = Math.floor(diffMs / 1000);
      const diffMinutes = Math.floor(diffSeconds / 60);
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);
      const diffWeeks = Math.floor(diffDays / 7);

      return {
        content: [{ 
          type: 'text', 
          text: `Difference:\n- ${diffDays} days\n- ${diffHours} hours\n- ${diffMinutes} minutes\n- ${diffSeconds} seconds`
        }],
        metadata: { days: diffDays, hours: diffHours, minutes: diffMinutes, seconds: diffSeconds, weeks: diffWeeks }
      };
    } catch (e) {
      return this.error(`Failed to calculate difference: ${e}`);
    }
  }

  private dateAdd(dateStr: string, amount: number, unit: string): McpToolResult {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return this.error(`Invalid date string: ${dateStr}`);
      }

      const multipliers: Record<string, number> = {
        seconds: 1000,
        minutes: 60 * 1000,
        hours: 60 * 60 * 1000,
        days: 24 * 60 * 60 * 1000,
        weeks: 7 * 24 * 60 * 60 * 1000,
      };

      if (unit === 'months') {
        date.setMonth(date.getMonth() + amount);
      } else if (unit === 'years') {
        date.setFullYear(date.getFullYear() + amount);
      } else if (multipliers[unit]) {
        date.setTime(date.getTime() + amount * multipliers[unit]);
      } else {
        return this.error(`Unknown unit: ${unit}`);
      }

      return {
        content: [{ type: 'text', text: `Result: ${date.toISOString()}\nLocal: ${date.toLocaleString('ko-KR')}` }],
        metadata: { iso: date.toISOString(), unix: Math.floor(date.getTime() / 1000) }
      };
    } catch (e) {
      return this.error(`Failed to add to date: ${e}`);
    }
  }

  private error(message: string): McpToolResult {
    return { content: [], isError: true, error: { code: -1, message } } as any;
  }
}
