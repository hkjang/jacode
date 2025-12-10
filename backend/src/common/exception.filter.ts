import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

// Error code system: JACODE-XXX
export const ErrorCodes = {
  // General errors (001-099)
  UNKNOWN: 'JACODE-001',
  VALIDATION: 'JACODE-002',
  NOT_FOUND: 'JACODE-003',
  CONFLICT: 'JACODE-004',
  FORBIDDEN: 'JACODE-005',
  UNAUTHORIZED: 'JACODE-006',
  RATE_LIMITED: 'JACODE-007',
  
  // Auth errors (100-199)
  INVALID_CREDENTIALS: 'JACODE-101',
  TOKEN_EXPIRED: 'JACODE-102',
  SESSION_TIMEOUT: 'JACODE-103',
  IP_BLOCKED: 'JACODE-104',
  
  // Database errors (200-299)
  DB_CONNECTION: 'JACODE-201',
  DB_QUERY: 'JACODE-202',
  DB_CONSTRAINT: 'JACODE-203',
  
  // Model errors (300-399)
  MODEL_UNAVAILABLE: 'JACODE-301',
  MODEL_TIMEOUT: 'JACODE-302',
  MODEL_ERROR: 'JACODE-303',
  
  // Queue errors (400-499)
  QUEUE_FULL: 'JACODE-401',
  QUEUE_TIMEOUT: 'JACODE-402',
  JOB_FAILED: 'JACODE-403',
  
  // Security errors (500-599)
  PROMPT_INJECTION: 'JACODE-501',
  MALICIOUS_INPUT: 'JACODE-502',
  PATH_TRAVERSAL: 'JACODE-503',
};

export interface StandardErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    path: string;
    requestId?: string;
  };
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = ErrorCodes.UNKNOWN;
    let message = 'An unexpected error occurred';
    let details: any = undefined;

    // Handle HttpException
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || exception.message;
        details = (exceptionResponse as any).details;
        code = this.mapStatusToCode(status);
      } else {
        message = exceptionResponse as string;
      }
    }

    // Handle Prisma errors
    if (exception instanceof PrismaClientKnownRequestError) {
      status = HttpStatus.BAD_REQUEST;
      code = ErrorCodes.DB_QUERY;
      
      switch (exception.code) {
        case 'P2002':
          code = ErrorCodes.CONFLICT;
          message = 'Resource already exists';
          break;
        case 'P2025':
          status = HttpStatus.NOT_FOUND;
          code = ErrorCodes.NOT_FOUND;
          message = 'Resource not found';
          break;
        case 'P2003':
          code = ErrorCodes.DB_CONSTRAINT;
          message = 'Foreign key constraint failed';
          break;
      }
    }

    // Log the error
    const errorLog = {
      code,
      status,
      message,
      path: request.url,
      method: request.method,
      ip: request.ip,
      userId: (request as any).user?.id,
    };

    if (status >= 500) {
      this.logger.error(JSON.stringify(errorLog), (exception as Error).stack);
    } else {
      this.logger.warn(JSON.stringify(errorLog));
    }

    // Send standard error response
    const errorResponse: StandardErrorResponse = {
      success: false,
      error: {
        code,
        message,
        details,
        timestamp: new Date().toISOString(),
        path: request.url,
        requestId: request.headers['x-request-id'] as string,
      },
    };

    response.status(status).json(errorResponse);
  }

  private mapStatusToCode(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return ErrorCodes.VALIDATION;
      case HttpStatus.UNAUTHORIZED:
        return ErrorCodes.UNAUTHORIZED;
      case HttpStatus.FORBIDDEN:
        return ErrorCodes.FORBIDDEN;
      case HttpStatus.NOT_FOUND:
        return ErrorCodes.NOT_FOUND;
      case HttpStatus.CONFLICT:
        return ErrorCodes.CONFLICT;
      case HttpStatus.TOO_MANY_REQUESTS:
        return ErrorCodes.RATE_LIMITED;
      default:
        return ErrorCodes.UNKNOWN;
    }
  }
}

// Standard success response helper
export interface StandardSuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    pages?: number;
  };
}

export function successResponse<T>(data: T, meta?: any): StandardSuccessResponse<T> {
  return {
    success: true,
    data,
    ...(meta && { meta }),
  };
}
