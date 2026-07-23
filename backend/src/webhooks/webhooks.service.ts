import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Webhook } from '../database/entities/webhook.entity';
import { SystemJob } from '../database/entities/system-job.entity';
import { SystemJobStatus, SystemJobType } from '../database/entities/enums';
import { newSecret } from './webhook.util';

const ALLOWED_EVENTS = [
  'complaint.created',
  'complaint.in_review',
  'complaint.escalated',
  'complaint.resolved',
  'complaint.closed',
  'complaint.reassigned',
  'certificate.generated',
  'student.registered',
  '*',
];

@Injectable()
export class WebhooksService {
  constructor(
    @InjectRepository(Webhook) private readonly repo: Repository<Webhook>,
    @InjectRepository(SystemJob) private readonly jobs: Repository<SystemJob>,
  ) {}

  async list() {
    const rows = await this.repo.find({ order: { createdAt: 'DESC' } });
    return rows.map((r) => this.serialize(r));
  }

  async findOne(id: string) {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Webhook not found');
    return this.serialize(row);
  }

  async create(input: { name: string; targetUrl: string; events: string[] }) {
    this.validateEvents(input.events);
    try {
      // eslint-disable-next-line no-new
      new URL(input.targetUrl);
    } catch {
      throw new BadRequestException('targetUrl must be a valid URL');
    }
    const row = this.repo.create({
      name: input.name,
      targetUrl: input.targetUrl,
      events: input.events,
      secretKey: newSecret(32),
      isActive: true,
      failureCount: 0,
    });
    const saved = await this.repo.save(row);
    // Return with the secret ONE TIME for the admin to copy.
    return { ...this.serialize(saved), secretKey: saved.secretKey };
  }

  async update(id: string, patch: Partial<{ name: string; targetUrl: string; events: string[]; isActive: boolean }>) {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Webhook not found');
    if (patch.events) this.validateEvents(patch.events);
    if (patch.targetUrl) {
      try { new URL(patch.targetUrl); } catch {
        throw new BadRequestException('targetUrl must be a valid URL');
      }
      row.targetUrl = patch.targetUrl;
    }
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.events !== undefined) row.events = patch.events;
    if (patch.isActive !== undefined) row.isActive = patch.isActive;
    await this.repo.save(row);
    return this.serialize(row);
  }

  async rotateSecret(id: string) {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Webhook not found');
    row.secretKey = newSecret(32);
    await this.repo.save(row);
    return { ...this.serialize(row), secretKey: row.secretKey };
  }

  async delete(id: string) {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Webhook not found');
    await this.repo.softDelete({ id });
    return { deleted: true, id };
  }

  async deliveries(id: string, limit = 50) {
    const rows = await this.jobs
      .createQueryBuilder('j')
      .where('j.type = :t', { t: SystemJobType.WEBHOOK_DELIVERY })
      .andWhere("JSON_UNQUOTE(JSON_EXTRACT(j.payload, '$.webhookId')) = :wid", { wid: id })
      .orderBy('j.createdAt', 'DESC')
      .limit(limit)
      .getMany();
    return rows.map((j) => ({
      id: j.id,
      status: j.status,
      attempts: j.attempts,
      maxAttempts: j.maxAttempts,
      event: (j.payload as any)?.event ?? null,
      createdAt: j.createdAt,
      completedAt: j.completedAt,
      errorTrace: j.errorTrace,
    }));
  }

  async retryJob(jobId: string) {
    const j = await this.jobs.findOne({ where: { id: jobId } });
    if (!j) throw new NotFoundException('Job not found');
    if (j.type !== SystemJobType.WEBHOOK_DELIVERY) {
      throw new BadRequestException('Only WEBHOOK_DELIVERY jobs are retryable here');
    }
    j.status = SystemJobStatus.PENDING;
    j.errorTrace = null;
    j.startedAt = null;
    j.completedAt = null;
    // Reset attempts so this retry is user-driven.
    j.attempts = 0;
    // Clear nextAttemptAt so it runs immediately.
    j.payload = { ...(j.payload as any), nextAttemptAt: undefined };
    await this.jobs.save(j);
    return { queued: true, id: j.id };
  }

  private validateEvents(events: string[]) {
    if (!Array.isArray(events) || !events.length) {
      throw new BadRequestException('events must be a non-empty array');
    }
    const bad = events.filter((e) => !ALLOWED_EVENTS.includes(e));
    if (bad.length) {
      throw new BadRequestException(
        `Unknown event(s): ${bad.join(', ')}. Allowed: ${ALLOWED_EVENTS.join(', ')}`,
      );
    }
  }

  private serialize(w: Webhook) {
    return {
      id: w.id,
      name: w.name,
      targetUrl: w.targetUrl,
      events: w.events,
      isActive: w.isActive,
      lastSuccessAt: w.lastSuccessAt,
      failureCount: w.failureCount,
      // Never leak the secret on list/get. Only exposed on create/rotate.
      hasSecret: !!w.secretKey,
      createdAt: w.createdAt,
      updatedAt: w.updatedAt,
    };
  }
}
