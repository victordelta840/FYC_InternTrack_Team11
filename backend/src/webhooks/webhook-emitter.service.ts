import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Webhook } from '../database/entities/webhook.entity';
import { SystemJob } from '../database/entities/system-job.entity';
import { SystemJobStatus, SystemJobType } from '../database/entities/enums';

/**
 * Discovers active webhook subscribers for an event and enqueues one
 * delivery job per matching subscriber. The worker picks these up.
 */
@Injectable()
export class WebhookEmitterService {
  private readonly logger = new Logger(WebhookEmitterService.name);

  constructor(
    @InjectRepository(Webhook) private readonly hooks: Repository<Webhook>,
    @InjectRepository(SystemJob) private readonly jobs: Repository<SystemJob>,
  ) {}

  /**
   * Broadcast an event to all active webhook subscribers matching the
   * event name. Subscribers whose `events` array contains either the
   * exact name or the wildcard `*` receive it.
   */
  async broadcast(event: string, data: Record<string, unknown>): Promise<{ enqueued: number }> {
    const subs = await this.hooks.find({ where: { isActive: true } });
    if (!subs.length) return { enqueued: 0 };

    const matching = subs.filter(
      (s) => Array.isArray(s.events) && (s.events.includes(event) || s.events.includes('*')),
    );
    if (!matching.length) return { enqueued: 0 };

    const rows = matching.map((sub) =>
      this.jobs.create({
        type: SystemJobType.WEBHOOK_DELIVERY,
        status: SystemJobStatus.PENDING,
        maxAttempts: 5,
        payload: {
          webhookId: sub.id,
          event,
          data,
          emittedAt: new Date().toISOString(),
        },
      }),
    );
    await this.jobs.save(rows);
    this.logger.log(`Webhook "${event}" → ${rows.length} subscriber(s) enqueued`);
    return { enqueued: rows.length };
  }
}
