import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorPayload {
  statusCode: number;
  code: string;
  message: string | string[];
  path: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalHttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let code = 'INTERNAL_ERROR';
    let details: Record<string, unknown> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const resp = exception.getResponse();
      if (typeof resp === 'string') {
        message = resp;
      } else if (typeof resp === 'object' && resp !== null) {
        const r = resp as Record<string, unknown>;
        message = (r.message as string | string[]) ?? exception.message;
        code = (r.code as string) ?? `HTTP_${status}`;
        details = (r.details as Record<string, unknown>) ?? undefined;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(exception.stack);
    }

    const payload: ErrorPayload = {
      statusCode: status,
      code,
      message,
      path: req.originalUrl,
      timestamp: new Date().toISOString(),
      ...(details ? { details } : {}),
    };

    res.status(status).json(payload);
  }
}
