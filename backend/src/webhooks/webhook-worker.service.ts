import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';
import { Webhook } from '../database/entities/webhook.entity';
import { SystemJob } from '../database/entities/system-job.entity';
import { SystemJobStatus, SystemJobType } from '../database/entities/enums';
import { backoffMs, signPayload } from './webhook.util';

interface WebhookJobPayload {
  webhookId: string;
  event: string;
  data: Record<string, unknown>;
  emittedAt: string;
  nextAttemptAt?: string;
}

/**
 * Polling worker: MySQL-backed queue. Reads `system_jobs` where
 * `type = WEBHOOK_DELIVERY AND status = PENDING` and delivers them with
 * HMAC-SHA256 signatures + truncated exponential backoff.
 */
@Injectable()
export class WebhookWorkerService implements OnModuleInit {
  private readonly logger = new Logger(WebhookWorkerService.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    @InjectRepository(SystemJob) private readonly jobs: Repository<SystemJob>,
    @InjectRepository(Webhook) private readonly hooks: Repository<Webhook>,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    const interval = this.config.get<number>('app.jobs.pollIntervalMs', 5000);
    this.timer = setInterval(() => void this.tick(), interval);
    this.logger.log(`Webhook worker polling every ${interval}ms`);
  }

  async tick() {
    if (this.running) return;
    this.running = true;
    try {
      const concurrency = this.config.get<number>('app.jobs.concurrency', 2);
      const pending = await this.jobs.find({
        where: { type: SystemJobType.WEBHOOK_DELIVERY, status: SystemJobStatus.PENDING },
        order: { createdAt: 'ASC' },
        take: concurrency,
      });
      await Promise.all(pending.map((j) => this.process(j)));
    } catch (err) {
      this.logger.error('Worker tick failed', err as Error);
    } finally {
      this.running = false;
    }
  }

  private async process(job: SystemJob) {
    const payload = job.payload as unknown as WebhookJobPayload;

    // Respect nextAttemptAt (backoff delay).
    if (payload.nextAttemptAt && new Date(payload.nextAttemptAt).getTime() > Date.now()) return;

    // Optimistic lock: only pick up if still pending.
    const claim = await this.jobs.update(
      { id: job.id, status: SystemJobStatus.PENDING },
      { status: SystemJobStatus.PROCESSING, startedAt: new Date(), attempts: job.attempts + 1 },
    );
    if (!claim.affected) return;

    const attempt = job.attempts + 1;
    const hook = await this.hooks.findOne({ where: { id: payload.webhookId } });
    if (!hook || !hook.isActive) {
      await this.jobs.update(
        { id: job.id },
        {
          status: SystemJobStatus.COMPLETED,
          completedAt: new Date(),
          errorTrace: 'Webhook missing or inactive; delivery skipped.',
        },
      );
      return;
    }

    try {
      await this.deliver(hook, payload);
      hook.lastSuccessAt = new Date();
      hook.failureCount = 0;
      await this.hooks.save(hook);
      await this.jobs.update(
        { id: job.id },
        { status: SystemJobStatus.COMPLETED, completedAt: new Date(), errorTrace: null as any },
      );
    } catch (err) {
      hook.failureCount = (hook.failureCount ?? 0) + 1;
      await this.hooks.save(hook);
      const trace = this.sanitize(err);
      const isTerminal = attempt >= job.maxAttempts;
      if (isTerminal) {
        await this.jobs.update(
          { id: job.id },
          { status: SystemJobStatus.FAILED, completedAt: new Date(), errorTrace: trace },
        );
        this.logger.error(`Webhook ${payload.event} → ${hook.targetUrl} FAILED after ${attempt} attempts`);
      } else {
        const nextAttemptAt = new Date(Date.now() + backoffMs(attempt)).toISOString();
        await this.jobs.update(
          { id: job.id },
          {
            status: SystemJobStatus.PENDING,
            errorTrace: trace,
            payload: { ...payload, nextAttemptAt } as any,
          },
        );
        this.logger.warn(
          `Webhook ${payload.event} → ${hook.targetUrl} failed (attempt ${attempt}/${job.maxAttempts}). Retrying at ${nextAttemptAt}`,
        );
      }
    }
  }

  private deliver(hook: Webhook, payload: WebhookJobPayload): Promise<void> {
    const body = JSON.stringify({ event: payload.event, data: payload.data, emittedAt: payload.emittedAt });
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = signPayload(hook.secretKey, timestamp, body);

    return new Promise<void>((resolve, reject) => {
      let url: URL;
      try {
        url = new URL(hook.targetUrl);
      } catch {
        reject(new Error(`Invalid webhook URL: ${hook.targetUrl}`));
        return;
      }
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        reject(new Error(`Unsupported protocol: ${url.protocol}`));
        return;
      }
      const client = url.protocol === 'https:' ? https : http;

      const req = client.request(
        {
          hostname: url.hostname,
          port: url.port || (url.protocol === 'https:' ? 443 : 80),
          path: `${url.pathname}${url.search}`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body),
            'User-Agent': 'InternTrack-Webhooks/1.0',
            'X-Webhook-Event': payload.event,
            'X-Webhook-Timestamp': String(timestamp),
            'X-Webhook-Signature': `sha256=${signature}`,
            'X-Webhook-Id': hook.id,
          },
          timeout: 10_000,
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (c: Buffer) => chunks.push(c));
          res.on('end', () => {
            const status = res.statusCode ?? 0;
            if (status >= 200 && status < 300) resolve();
            else {
              const preview = Buffer.concat(chunks).toString('utf8').slice(0, 200);
              reject(new Error(`HTTP ${status}: ${preview || '<empty body>'}`));
            }
          });
        },
      );
      req.on('timeout', () => {
        req.destroy(new Error('Request timed out after 10s'));
      });
      req.on('error', (e) => reject(e));
      req.write(body);
      req.end();
    });
  }

  private sanitize(err: unknown): string {
    if (err instanceof Error) {
      // strip absolute filesystem paths from the stack for the audit trail
      const stack = (err.stack ?? err.message).replace(/([\/\\]Users[\/\\][^\/\s]+|[\/\\]home[\/\\][^\/\s]+)/g, '~');
      return stack.slice(0, 2000);
    }
    return String(err).slice(0, 500);
  }
}
