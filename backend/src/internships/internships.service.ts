import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, In } from 'typeorm';
import { Internship } from '../database/entities/internship.entity';
import { InternshipMentor } from '../database/entities/internship-mentor.entity';
import { InternshipStudent } from '../database/entities/internship-student.entity';
import { InternshipStatus, UserRole } from '../database/entities/enums';
import { User } from '../database/entities/user.entity';

@Injectable()
export class InternshipsService {
  constructor(
    @InjectRepository(Internship) private readonly repo: Repository<Internship>,
    @InjectRepository(InternshipMentor) private readonly imRepo: Repository<InternshipMentor>,
    @InjectRepository(InternshipStudent) private readonly isRepo: Repository<InternshipStudent>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly ds: DataSource,
  ) {}

  async list(filters: { status?: InternshipStatus; mentorId?: string; studentId?: string }) {
    const qb = this.repo
      .createQueryBuilder('i')
      .leftJoinAndSelect('i.mentors', 'im')
      .leftJoinAndSelect('im.mentor', 'mentor')
      .leftJoinAndSelect('mentor.profile', 'mentorProfile')
      .leftJoinAndSelect('i.students', 'ist')
      .leftJoinAndSelect('ist.student', 'student')
      .leftJoinAndSelect('student.profile', 'studentProfile')
      .orderBy('i.createdAt', 'DESC');

    if (filters.status) qb.andWhere('i.status = :s', { s: filters.status });
    if (filters.mentorId) qb.andWhere('im.mentor_id = :m', { m: filters.mentorId });
    if (filters.studentId) qb.andWhere('ist.student_id = :st', { st: filters.studentId });

    return qb.getMany();
  }

  async findOne(id: string) {
    const item = await this.repo.findOne({
      where: { id },
      relations: {
        mentors: { mentor: { profile: true } },
        students: { student: { profile: true } },
      },
    });
    if (!item) throw new NotFoundException('Internship not found');
    return item;
  }

  async create(input: {
    title: string;
    organization: string;
    description?: string;
    startDate: string;
    endDate: string;
    totalDays: number;
    mentorIds: string[];
    studentIds: string[];
  }) {
    if (new Date(input.endDate) <= new Date(input.startDate)) {
      throw new BadRequestException('endDate must be after startDate');
    }
    if (input.totalDays <= 0) throw new BadRequestException('totalDays must be > 0');

    // Validate mentors & students exist with correct roles.
    if (input.mentorIds.length) {
      const mentors = await this.userRepo.findBy({
        id: In(input.mentorIds),
        role: UserRole.MENTOR,
      });
      if (mentors.length !== input.mentorIds.length) {
        throw new BadRequestException('One or more mentorIds are invalid');
      }
    }
    if (input.studentIds.length) {
      const students = await this.userRepo.findBy({
        id: In(input.studentIds),
        role: UserRole.STUDENT,
      });
      if (students.length !== input.studentIds.length) {
        throw new BadRequestException('One or more studentIds are invalid');
      }
    }

    return this.ds.transaction(async (m) => {
      const internship = m.getRepository(Internship).create({
        title: input.title,
        organization: input.organization,
        description: input.description ?? null,
        startDate: input.startDate,
        endDate: input.endDate,
        totalDays: input.totalDays,
        status: InternshipStatus.ACTIVE,
      });
      const saved = await m.getRepository(Internship).save(internship);

      if (input.mentorIds.length) {
        const rows = input.mentorIds.map((mentorId) =>
          m.getRepository(InternshipMentor).create({ internshipId: saved.id, mentorId }),
        );
        await m.getRepository(InternshipMentor).save(rows);
      }
      if (input.studentIds.length) {
        const rows = input.studentIds.map((studentId) =>
          m.getRepository(InternshipStudent).create({ internshipId: saved.id, studentId }),
        );
        await m.getRepository(InternshipStudent).save(rows);
      }
      return this.findOne(saved.id);
    });
  }

  async updateStatus(id: string, status: InternshipStatus) {
    const it = await this.repo.findOne({ where: { id } });
    if (!it) throw new NotFoundException('Internship not found');
    it.status = status;
    await this.repo.save(it);
    return this.findOne(id);
  }

  /**
   * Returns the internships visible to a given user, based on role.
   */
  async listForUser(userId: string, role: UserRole) {
    if (role === UserRole.ADMIN) return this.list({});
    if (role === UserRole.MENTOR) return this.list({ mentorId: userId });
    return this.list({ studentId: userId });
  }
}
