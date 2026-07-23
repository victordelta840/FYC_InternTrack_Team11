import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Complaint } from '../database/entities/complaint.entity';
import { User } from '../database/entities/user.entity';
import { ComplaintStatus, UserRole } from '../database/entities/enums';
import { WebhookEmitterService } from '../webhooks/webhook-emitter.service';

/**
 * State machine (mentor/admin can transition; student can only create/comment):
 *   OPEN ──► IN_REVIEW ──► RESOLVED ──► CLOSED
 *     └────► ESCALATED ─┘
 * ESCALATED is reachable only from OPEN or IN_REVIEW (via SLA cron OR admin).
 */
const TRANSITIONS: Record<ComplaintStatus, ComplaintStatus[]> = {
  [ComplaintStatus.OPEN]: [ComplaintStatus.IN_REVIEW, ComplaintStatus.ESCALATED, ComplaintStatus.RESOLVED],
  [ComplaintStatus.IN_REVIEW]: [ComplaintStatus.ESCALATED, ComplaintStatus.RESOLVED],
  [ComplaintStatus.ESCALATED]: [ComplaintStatus.RESOLVED],
  [ComplaintStatus.RESOLVED]: [ComplaintStatus.CLOSED, ComplaintStatus.IN_REVIEW],
  [ComplaintStatus.CLOSED]: [],
};

const SLA_HOURS_DEFAULT = 48;

@Injectable()
export class ComplaintsService {
  constructor(
    @InjectRepository(Complaint) private readonly repo: Repository<Complaint>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly ds: DataSource,
    private readonly emitter: WebhookEmitterService,
  ) {}

  async create(input: {
    studentId: string;
    category: string;
    subject: string;
    description: string;
    assignedTo?: string;
    slaHours?: number;
  }) {
    const now = new Date();
    const slaHours = input.slaHours ?? SLA_HOURS_DEFAULT;

    let assignedTo = input.assignedTo ?? null;
    if (!assignedTo) {
      // Auto-assign to first active MENTOR (round-robin-lite: least recent).
      const mentor = await this.userRepo.findOne({
        where: { role: UserRole.MENTOR, isActive: true },
        order: { lastLoginAt: 'ASC' },
      });
      assignedTo = mentor?.id ?? null;
    }

    const complaint = this.repo.create({
      studentId: input.studentId,
      category: input.category,
      subject: input.subject,
      description: input.description,
      status: ComplaintStatus.OPEN,
      assignedTo,
      slaBreachAt: new Date(now.getTime() + slaHours * 60 * 60 * 1000),
      lastActivityAt: now,
    });
    const saved = await this.repo.save(complaint);

    // Fire-and-forget webhook broadcast.
    void this.emitter.broadcast('complaint.created', {
      id: saved.id,
      studentId: saved.studentId,
      category: saved.category,
      subject: saved.subject,
      status: saved.status,
      assignedTo: saved.assignedTo,
      slaBreachAt: saved.slaBreachAt,
    });

    return saved;
  }

  async listForUser(userId: string, role: UserRole, status?: ComplaintStatus) {
    const qb = this.repo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.student', 's')
      .leftJoinAndSelect('s.profile', 'sp')
      .leftJoinAndSelect('c.assignee', 'a')
      .leftJoinAndSelect('a.profile', 'ap')
      .orderBy('c.createdAt', 'DESC');

    if (role === UserRole.STUDENT) qb.andWhere('c.student_id = :uid', { uid: userId });
    else if (role === UserRole.MENTOR) qb.andWhere('c.assigned_to = :uid', { uid: userId });
    // ADMIN sees everything.
    if (status) qb.andWhere('c.status = :st', { st: status });

    return qb.getMany();
  }

  async findOne(id: string, requesterId: string, requesterRole: UserRole) {
    const c = await this.repo.findOne({
      where: { id },
      relations: { student: { profile: true } as any, assignee: { profile: true } as any },
    });
    if (!c) throw new NotFoundException('Complaint not found');
    if (requesterRole === UserRole.STUDENT && c.studentId !== requesterId) {
      throw new ForbiddenException('You do not have access to this complaint');
    }
    if (requesterRole === UserRole.MENTOR && c.assignedTo !== requesterId) {
      throw new ForbiddenException('This complaint is not assigned to you');
    }
    return c;
  }

  async updateStatus(
    id: string,
    nextStatus: ComplaintStatus,
    actor: { id: string; role: UserRole },
    resolutionNotes?: string,
  ) {
    return this.ds.transaction(async (m) => {
      const c = await m.getRepository(Complaint).findOne({ where: { id } });
      if (!c) throw new NotFoundException('Complaint not found');

      if (actor.role === UserRole.MENTOR && c.assignedTo !== actor.id) {
        throw new ForbiddenException('This complaint is not assigned to you');
      }
      if (actor.role === UserRole.STUDENT) {
        throw new ForbiddenException('Students cannot change complaint status');
      }

      const allowed = TRANSITIONS[c.status] ?? [];
      if (!allowed.includes(nextStatus)) {
        throw new BadRequestException(
          `Illegal transition ${c.status} → ${nextStatus}. Allowed: ${allowed.join(', ') || 'none'}`,
        );
      }

      if (nextStatus === ComplaintStatus.RESOLVED && (!resolutionNotes || resolutionNotes.trim().length < 5)) {
        throw new BadRequestException('Resolution notes (min 5 chars) required when resolving');
      }

      c.status = nextStatus;
      c.lastActivityAt = new Date();
      if (resolutionNotes) c.resolutionNotes = resolutionNotes.trim();
      await m.getRepository(Complaint).save(c);

      void this.emitter.broadcast(`complaint.${nextStatus.toLowerCase()}`, {
        id: c.id,
        studentId: c.studentId,
        status: c.status,
        assignedTo: c.assignedTo,
        resolutionNotes: c.resolutionNotes,
        transitionedBy: actor.id,
      });

      return c;
    });
  }

  async assign(id: string, assigneeId: string, actor: { id: string; role: UserRole }) {
    if (actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins may reassign complaints');
    }
    const c = await this.repo.findOne({ where: { id } });
    if (!c) throw new NotFoundException('Complaint not found');
    const assignee = await this.userRepo.findOne({ where: { id: assigneeId } });
    if (!assignee || (assignee.role !== UserRole.MENTOR && assignee.role !== UserRole.ADMIN)) {
      throw new BadRequestException('Assignee must be a MENTOR or ADMIN');
    }
    c.assignedTo = assigneeId;
    c.lastActivityAt = new Date();
    await this.repo.save(c);
    void this.emitter.broadcast('complaint.reassigned', {
      id: c.id,
      assignedTo: c.assignedTo,
      byAdmin: actor.id,
    });
    return c;
  }

  /**
   * Called by the SLA cron. Escalates all OPEN|IN_REVIEW complaints
   * whose `sla_breach_at` has passed. Reassigns them to the first active admin.
   * Returns count of escalated rows.
   */
  async runSlaEscalation(): Promise<{ escalated: number }> {
    return this.ds.transaction(async (m) => {
      const repo = m.getRepository(Complaint);
      const admin = await m.getRepository(User).findOne({
        where: { role: UserRole.ADMIN, isActive: true },
        order: { createdAt: 'ASC' },
      });

      const breaches = await repo
        .createQueryBuilder('c')
        .where('c.status IN (:...s)', { s: [ComplaintStatus.OPEN, ComplaintStatus.IN_REVIEW] })
        .andWhere('c.sla_breach_at IS NOT NULL')
        .andWhere('c.sla_breach_at <= :now', { now: new Date() })
        .getMany();

      if (!breaches.length) return { escalated: 0 };

      for (const c of breaches) {
        c.status = ComplaintStatus.ESCALATED;
        c.lastActivityAt = new Date();
        if (admin) c.assignedTo = admin.id;
        await repo.save(c);

        void this.emitter.broadcast('complaint.escalated', {
          id: c.id,
          studentId: c.studentId,
          reason: 'SLA_BREACH',
          previousStatus: c.status,
          assignedTo: c.assignedTo,
          breachedAt: c.slaBreachAt,
        });
      }
      return { escalated: breaches.length };
    });
  }
}
