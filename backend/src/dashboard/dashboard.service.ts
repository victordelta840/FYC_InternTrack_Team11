import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from '../database/entities/user.entity';
import { Internship } from '../database/entities/internship.entity';
import { Certificate } from '../database/entities/certificate.entity';
import { Template } from '../database/entities/template.entity';
import { Complaint } from '../database/entities/complaint.entity';
import { AuditLog } from '../database/entities/audit-log.entity';
import { ComplaintStatus, InternshipStatus } from '../database/entities/enums';

const RECENT_ACTIVITY_LIMIT = 10;

/** Statuses that count as "still needs attention" for the complaints tile. */
const PENDING_COMPLAINT_STATUSES = [ComplaintStatus.OPEN, ComplaintStatus.IN_REVIEW, ComplaintStatus.ESCALATED];

export interface AdminDashboardSummary {
  totals: {
    users: number;
    internships: number;
    certificates: number;
    templates: number;
  };
  activeInternships: number;
  pendingComplaints: number;
  recentActivity: Array<{
    id: string;
    action: string;
    resource: string;
    resourceId: string | null;
    userId: string | null;
    createdAt: Date;
  }>;
}

/**
 * Computes the admin dashboard summary with server-side count queries
 * instead of the previous client-side approach (fetching full resource
 * lists just to read `.length`). This is what makes "Active Internships"
 * and "Pending Complaints" (filtered subsets, not just totals) and
 * "Recent Activity" possible at all — none of that is derivable from
 * the plain list endpoints alone.
 */
@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Internship) private readonly internshipRepo: Repository<Internship>,
    @InjectRepository(Certificate) private readonly certificateRepo: Repository<Certificate>,
    @InjectRepository(Template) private readonly templateRepo: Repository<Template>,
    @InjectRepository(Complaint) private readonly complaintRepo: Repository<Complaint>,
    @InjectRepository(AuditLog) private readonly auditLogRepo: Repository<AuditLog>,
  ) {}

  async getAdminSummary(): Promise<AdminDashboardSummary> {
    const [
      usersCount,
      internshipsCount,
      certificatesCount,
      templatesCount,
      activeInternshipsCount,
      pendingComplaintsCount,
      recentActivity,
    ] = await Promise.all([
      this.userRepo.count(),
      this.internshipRepo.count(),
      this.certificateRepo.count(),
      this.templateRepo.count(),
      this.internshipRepo.count({ where: { status: InternshipStatus.ACTIVE } }),
      this.complaintRepo.count({ where: { status: In(PENDING_COMPLAINT_STATUSES) } }),
      this.auditLogRepo.find({
        order: { createdAt: 'DESC' },
        take: RECENT_ACTIVITY_LIMIT,
      }),
    ]);

    return {
      totals: {
        users: usersCount,
        internships: internshipsCount,
        certificates: certificatesCount,
        templates: templatesCount,
      },
      activeInternships: activeInternshipsCount,
      pendingComplaints: pendingComplaintsCount,
      recentActivity: recentActivity.map((log) => ({
        id: log.id,
        action: log.action,
        resource: log.resource,
        resourceId: log.resourceId,
        userId: log.userId,
        createdAt: log.createdAt,
      })),
    };
  }
}
