import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from '../database/entities/user.entity';
import { Profile } from '../database/entities/profile.entity';
import { Internship } from '../database/entities/internship.entity';
import { Certificate } from '../database/entities/certificate.entity';
import { Template } from '../database/entities/template.entity';
import { Complaint } from '../database/entities/complaint.entity';
import { AuditLog } from '../database/entities/audit-log.entity';
import { ComplaintStatus, InternshipStatus, UserRole } from '../database/entities/enums';

/** Complaint states that still require someone's attention. */
const PENDING_COMPLAINT_STATUSES = [
  ComplaintStatus.OPEN,
  ComplaintStatus.IN_REVIEW,
  ComplaintStatus.ESCALATED,
];

const RECENT_ACTIVITY_LIMIT = 15;

export interface AdminOverview {
  counts: {
    totalUsers: number;
    totalInternships: number;
    activeInternships: number;
    totalCertificates: number;
    totalTemplates: number;
    pendingComplaints: number;
  };
  usersByRole: Record<UserRole, number>;
  recentActivity: Array<{
    id: string;
    action: string;
    resource: string;
    resourceId: string | null;
    actor: { id: string | null; name: string; email: string | null };
    createdAt: Date;
  }>;
}

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Profile) private readonly profileRepo: Repository<Profile>,
    @InjectRepository(Internship) private readonly internshipRepo: Repository<Internship>,
    @InjectRepository(Certificate) private readonly certificateRepo: Repository<Certificate>,
    @InjectRepository(Template) private readonly templateRepo: Repository<Template>,
    @InjectRepository(Complaint) private readonly complaintRepo: Repository<Complaint>,
    @InjectRepository(AuditLog) private readonly auditRepo: Repository<AuditLog>,
  ) {}

  /**
   * Single aggregation point for the admin dashboard. Every count is fetched
   * in parallel — this endpoint is read-only and cheap (all backed by
   * indexed columns: role, status, is_active), so there is no need for a
   * cache layer at current expected scale. Revisit with a materialized
   * summary table only if this ever shows up in slow-query logs.
   */
  async getOverview(): Promise<AdminOverview> {
    const [
      totalUsers,
      totalInternships,
      activeInternships,
      totalCertificates,
      totalTemplates,
      pendingComplaints,
      usersByRoleRaw,
      recentLogs,
    ] = await Promise.all([
      this.userRepo.count(),
      this.internshipRepo.count(),
      this.internshipRepo.count({ where: { status: InternshipStatus.ACTIVE } }),
      this.certificateRepo.count(),
      this.templateRepo.count(),
      this.complaintRepo.count({ where: { status: In(PENDING_COMPLAINT_STATUSES) } }),
      this.userRepo
        .createQueryBuilder('u')
        .select('u.role', 'role')
        .addSelect('COUNT(*)', 'count')
        .groupBy('u.role')
        .getRawMany<{ role: UserRole; count: string }>(),
      this.auditRepo.find({
        order: { createdAt: 'DESC' },
        take: RECENT_ACTIVITY_LIMIT,
      }),
    ]);

    const usersByRole = { [UserRole.ADMIN]: 0, [UserRole.MENTOR]: 0, [UserRole.STUDENT]: 0 } as Record<
      UserRole,
      number
    >;
    for (const row of usersByRoleRaw) {
      usersByRole[row.role] = Number(row.count);
    }

    return {
      counts: {
        totalUsers,
        totalInternships,
        activeInternships,
        totalCertificates,
        totalTemplates,
        pendingComplaints,
      },
      usersByRole,
      recentActivity: await this.hydrateActivity(recentLogs),
    };
  }

  /** Resolves audit log actor ids into display names in a single batched query. */
  private async hydrateActivity(logs: AuditLog[]): Promise<AdminOverview['recentActivity']> {
    const actorIds = [...new Set(logs.map((l) => l.userId).filter((id): id is string => !!id))];

    const actors = actorIds.length
      ? await this.userRepo.find({
          where: { id: In(actorIds) },
          relations: { profile: true },
        })
      : [];
    const actorById = new Map(actors.map((a) => [a.id, a]));

    return logs.map((log) => {
      const actor = log.userId ? actorById.get(log.userId) : undefined;
      const name = actor?.profile
        ? `${actor.profile.firstName} ${actor.profile.lastName}`.trim()
        : 'System';
      return {
        id: log.id,
        action: log.action,
        resource: log.resource,
        resourceId: log.resourceId,
        actor: { id: actor?.id ?? null, name, email: actor?.email ?? null },
        createdAt: log.createdAt,
      };
    });
  }
}
