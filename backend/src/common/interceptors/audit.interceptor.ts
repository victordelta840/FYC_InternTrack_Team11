import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../../database/entities/audit-log.entity';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    @InjectRepository(AuditLog) private readonly auditRepo: Repository<AuditLog>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    return next.handle().pipe(
      tap(async () => {
        try {
          if (!MUTATING.has(req.method)) return;
          const user = req.user as { sub?: string } | undefined;
          const record = this.auditRepo.create({
            userId: user?.sub ?? null,
            action: req.method,
            resource: req.route?.path ?? req.originalUrl,
            resourceId: req.params?.id ?? null,
            ipAddress: (req.ip || req.headers['x-forwarded-for'] || '').toString().slice(0, 64),
            userAgent: (req.headers['user-agent'] || '').toString().slice(0, 255),
            details: {
              body: this.sanitize(req.body),
              query: req.query,
              params: req.params,
            } as any,
          });
          await this.auditRepo.insert(record as any);
        } catch {
          // Never let audit failures break the request.
        }
      }),
    );
  }

  private sanitize(body: unknown): unknown {
    if (!body || typeof body !== 'object') return body;
    const clone: Record<string, unknown> = { ...(body as Record<string, unknown>) };
    for (const key of Object.keys(clone)) {
      if (/password|secret|token/i.test(key)) clone[key] = '[REDACTED]';
    }
    return clone;
  }
}
