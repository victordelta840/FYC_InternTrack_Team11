import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository, In } from 'typeorm';
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

  /**
   * Shared fetch-with-relations logic, parameterized on the EntityManager.
   * - Outside a transaction, callers pass the DataSource's default manager
   *   (equivalent to using `this.repo` directly).
   * - Inside a transaction, callers MUST pass the transactional manager so
   *   the read sees the not-yet-committed rows instead of hitting a
   *   different connection and finding nothing.
   */
  private async findOneWithManager(manager: EntityManager, id: string) {
    const item = await manager.getRepository(Internship).findOne({
      where: { id },
      relations: {
        mentors: { mentor: { profile: true } },
        students: { student: { profile: true } },
      },
    });
    if (!item) throw new NotFoundException('Internship not found');
    return item;
  }

  async findOne(id: string) {
    return this.findOneWithManager(this.ds.manager, id);
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

      // Read back through the transactional manager `m`, NOT `this.repo` /
      // `this.findOne()` — those go through the pool's default connection
      // and can miss the uncommitted insert, which is what was producing
      // the spurious 404 after create.
      return this.findOneWithManager(m, saved.id);
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
   * Partial update of an internship's core fields (title, organization,
   * description, startDate, endDate, totalDays). Mentor/student rosters are
   * not touched here — see assignMentor/removeMentor/assignStudent/removeStudent.
   */
  async update(
    id: string,
    input: {
      title?: string;
      organization?: string;
      description?: string;
      startDate?: string;
      endDate?: string;
      totalDays?: number;
    },
  ) {
    const it = await this.repo.findOne({ where: { id } });
    if (!it) throw new NotFoundException('Internship not found');

    const nextStart = input.startDate ?? it.startDate;
    const nextEnd = input.endDate ?? it.endDate;
    if (new Date(nextEnd) <= new Date(nextStart)) {
      throw new BadRequestException('endDate must be after startDate');
    }
    if (input.totalDays !== undefined && input.totalDays <= 0) {
      throw new BadRequestException('totalDays must be > 0');
    }

    if (input.title !== undefined) it.title = input.title;
    if (input.organization !== undefined) it.organization = input.organization;
    if (input.description !== undefined) it.description = input.description;
    if (input.startDate !== undefined) it.startDate = input.startDate;
    if (input.endDate !== undefined) it.endDate = input.endDate;
    if (input.totalDays !== undefined) it.totalDays = input.totalDays;

    await this.repo.save(it);
    return this.findOne(id);
  }

  /**
   * Deletes an internship along with its mentor/student join rows, in a
   * single transaction so we never leave orphaned relation rows behind.
   */
  async remove(id: string): Promise<void> {
    const it = await this.repo.findOne({ where: { id } });
    if (!it) throw new NotFoundException('Internship not found');

    await this.ds.transaction(async (m) => {
      await m.getRepository(InternshipMentor).delete({ internshipId: id });
      await m.getRepository(InternshipStudent).delete({ internshipId: id });
      await m.getRepository(Internship).delete({ id });
    });
  }

  async assignMentor(internshipId: string, mentorId: string) {
    const internship = await this.repo.findOne({ where: { id: internshipId } });
    if (!internship) throw new NotFoundException('Internship not found');

    const mentor = await this.userRepo.findOne({ where: { id: mentorId, role: UserRole.MENTOR } });
    if (!mentor) throw new BadRequestException('Invalid mentorId');

    const existing = await this.imRepo.findOne({ where: { internshipId, mentorId } });
    if (existing) throw new BadRequestException('Mentor is already assigned to this internship');

    await this.imRepo.save(this.imRepo.create({ internshipId, mentorId }));
    return this.findOne(internshipId);
  }

  async removeMentor(internshipId: string, mentorId: string) {
    const internship = await this.repo.findOne({ where: { id: internshipId } });
    if (!internship) throw new NotFoundException('Internship not found');

    const existing = await this.imRepo.findOne({ where: { internshipId, mentorId } });
    if (!existing) throw new NotFoundException('Mentor is not assigned to this internship');

    await this.imRepo.delete({ internshipId, mentorId });
    return this.findOne(internshipId);
  }

  async assignStudent(internshipId: string, studentId: string) {
    const internship = await this.repo.findOne({ where: { id: internshipId } });
    if (!internship) throw new NotFoundException('Internship not found');

    const student = await this.userRepo.findOne({ where: { id: studentId, role: UserRole.STUDENT } });
    if (!student) throw new BadRequestException('Invalid studentId');

    const existing = await this.isRepo.findOne({ where: { internshipId, studentId } });
    if (existing) throw new BadRequestException('Student is already assigned to this internship');

    await this.isRepo.save(this.isRepo.create({ internshipId, studentId }));
    return this.findOne(internshipId);
  }

  async removeStudent(internshipId: string, studentId: string) {
    const internship = await this.repo.findOne({ where: { id: internshipId } });
    if (!internship) throw new NotFoundException('Internship not found');

    const existing = await this.isRepo.findOne({ where: { internshipId, studentId } });
    if (!existing) throw new NotFoundException('Student is not assigned to this internship');

    await this.isRepo.delete({ internshipId, studentId });
    return this.findOne(internshipId);
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
