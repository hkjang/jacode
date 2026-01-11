import { Injectable } from '@nestjs/common';
import { McpTool, McpToolResult, McpContext, McpToolSchema } from '../interfaces/mcp.interface';

@Injectable()
export class MathTool implements McpTool {
  name = 'math';
  description = 'Perform mathematical calculations. Supports basic arithmetic, percentages, and common math functions.';

  inputSchema: McpToolSchema = {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        enum: ['evaluate', 'percentage', 'convert'],
        description: 'Math operation to perform',
      },
      expression: {
        type: 'string',
        description: 'Mathematical expression to evaluate (e.g., "2 + 3 * 4")',
      },
      value: {
        type: 'number',
        description: 'Value for percentage/conversion operations',
      },
      percent: {
        type: 'number',
        description: 'Percentage value (for percentage operation)',
      },
      from: {
        type: 'string',
        description: 'Source unit for conversion',
      },
      to: {
        type: 'string',
        description: 'Target unit for conversion',
      },
    },
    required: ['operation'],
  };

  async execute(args: any, context: McpContext): Promise<McpToolResult> {
    const { operation, expression, value, percent, from, to } = args;

    switch (operation) {
      case 'evaluate':
        if (!expression) {
          return this.error('Expression is required for evaluate operation');
        }
        return this.evaluateExpression(expression);

      case 'percentage':
        if (value === undefined || percent === undefined) {
          return this.error('Value and percent are required for percentage operation');
        }
        const result = (value * percent) / 100;
        return this.success(`${percent}% of ${value} = ${result}`, { value, percent, result });

      case 'convert':
        if (value === undefined || !from || !to) {
          return this.error('Value, from, and to are required for convert operation');
        }
        return this.convert(value, from, to);

      default:
        return this.error(`Unknown operation: ${operation}`);
    }
  }

  private evaluateExpression(expr: string): McpToolResult {
    // Security: Only allow safe characters
    const safePattern = /^[\d\s+\-*/%().^]+$/;
    if (!safePattern.test(expr)) {
      return this.error('Expression contains invalid characters. Only numbers and basic operators (+, -, *, /, %, ^, ()) are allowed.');
    }

    try {
      // Replace ^ with ** for exponentiation
      const sanitized = expr.replace(/\^/g, '**');
      // Use Function for safe evaluation
      const result = Function(`"use strict"; return (${sanitized})`)();
      
      if (typeof result !== 'number' || !isFinite(result)) {
        return this.error('Invalid result (NaN or Infinity)');
      }

      return this.success(`${expr} = ${result}`, { expression: expr, result });
    } catch (e) {
      return this.error(`Evaluation failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  private convert(value: number, from: string, to: string): McpToolResult {
    const conversions: Record<string, Record<string, number>> = {
      // Length
      'm': { 'cm': 100, 'mm': 1000, 'km': 0.001, 'in': 39.3701, 'ft': 3.28084, 'mi': 0.000621371 },
      'cm': { 'm': 0.01, 'mm': 10, 'in': 0.393701 },
      'km': { 'm': 1000, 'mi': 0.621371 },
      'in': { 'cm': 2.54, 'ft': 0.0833333, 'm': 0.0254 },
      'ft': { 'm': 0.3048, 'in': 12, 'mi': 0.000189394 },
      // Weight
      'kg': { 'g': 1000, 'lb': 2.20462, 'oz': 35.274 },
      'g': { 'kg': 0.001, 'mg': 1000 },
      'lb': { 'kg': 0.453592, 'oz': 16 },
      // Temperature handled separately
    };

    // Temperature conversion
    if (from === 'c' && to === 'f') {
      const result = (value * 9/5) + 32;
      return this.success(`${value}°C = ${result.toFixed(2)}°F`, { value, from, to, result });
    }
    if (from === 'f' && to === 'c') {
      const result = (value - 32) * 5/9;
      return this.success(`${value}°F = ${result.toFixed(2)}°C`, { value, from, to, result });
    }

    const fromLower = from.toLowerCase();
    const toLower = to.toLowerCase();

    if (conversions[fromLower] && conversions[fromLower][toLower]) {
      const result = value * conversions[fromLower][toLower];
      return this.success(`${value} ${from} = ${result.toFixed(4)} ${to}`, { value, from, to, result });
    }

    return this.error(`Conversion from ${from} to ${to} is not supported`);
  }

  private success(text: string, metadata?: any): McpToolResult {
    return { content: [{ type: 'text', text }], metadata };
  }

  private error(message: string): McpToolResult {
    return { content: [], isError: true, error: { code: -1, message } } as any;
  }
}
