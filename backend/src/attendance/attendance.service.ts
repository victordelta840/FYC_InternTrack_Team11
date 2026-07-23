import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Attendance } from '../database/entities/attendance.entity';
import { AttendanceRevision } from '../database/entities/attendance-revision.entity';
import { AttendanceStatus, UserRole } from '../database/entities/enums';
import { Internship } from '../database/entities/internship.entity';
import { InternshipStudent } from '../database/entities/internship-student.entity';
import { InternshipMentor } from '../database/entities/internship-mentor.entity';
import { computeAttendancePercentage, DayCounters } from '../common/utils/decimal.util';

export interface AttendanceMarkInput {
  internshipId: string;
  studentId: string;
  date: string;
  status: AttendanceStatus;
  notes?: string;
}

export interface AttendanceEditInput {
  status: AttendanceStatus;
  justification: string;
  notes?: string;
}

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(Attendance) private readonly attRepo: Repository<Attendance>,
    @InjectRepository(AttendanceRevision) private readonly revRepo: Repository<AttendanceRevision>,
    @InjectRepository(Internship) private readonly internshipRepo: Repository<Internship>,
    @InjectRepository(InternshipStudent) private readonly istRepo: Repository<InternshipStudent>,
    @InjectRepository(InternshipMentor) private readonly imRepo: Repository<InternshipMentor>,
    private readonly ds: DataSource,
  ) {}

  private async assertMentorOwnsInternship(mentorId: string, internshipId: string) {
    const row = await this.imRepo.findOne({ where: { mentorId, internshipId } });
    if (!row) throw new ForbiddenException('Mentor is not assigned to this internship');
  }

  private async assertStudentInInternship(studentId: string, internshipId: string) {
    const row = await this.istRepo.findOne({ where: { studentId, internshipId } });
    if (!row) throw new BadRequestException('Student is not enrolled in this internship');
  }

  /**
   * Mentor marks/creates attendance for a single day.
   * If a record already exists for (student,internship,date) it triggers `edit()`.
   */
  async mark(input: AttendanceMarkInput, mentorId: string, ip: string) {
    await this.assertMentorOwnsInternship(mentorId, input.internshipId);
    await this.assertStudentInInternship(input.studentId, input.internshipId);

    const existing = await this.attRepo.findOne({
      where: {
        studentId: input.studentId,
        internshipId: input.internshipId,
        date: input.date,
      },
    });

    if (existing) {
      throw new BadRequestException({
        code: 'ATTENDANCE_EXISTS',
        message: 'Attendance already exists for this day. Use edit endpoint with justification.',
        details: { attendanceId: existing.id },
      });
    }

    const record = this.attRepo.create({
      studentId: input.studentId,
      internshipId: input.internshipId,
      mentorId,
      date: input.date,
      status: input.status,
      notes: input.notes ?? null,
    });
    return this.attRepo.save(record);
  }

  async edit(id: string, input: AttendanceEditInput, mentorId: string, ip: string) {
    if (!input.justification || input.justification.trim().length < 5) {
      throw new BadRequestException('Justification (min 5 chars) is required to edit attendance');
    }
    return this.ds.transaction(async (m) => {
      const att = await m.getRepository(Attendance).findOne({ where: { id } });
      if (!att) throw new NotFoundException('Attendance record not found');
      await this.assertMentorOwnsInternship(mentorId, att.internshipId);
      const prev = att.status;
      att.status = input.status;
      att.notes = input.notes ?? att.notes;
      await m.getRepository(Attendance).save(att);

      const rev = m.getRepository(AttendanceRevision).create({
        attendanceId: att.id,
        editorId: mentorId,
        previousStatus: prev,
        newStatus: input.status,
        justification: input.justification.trim(),
        ipAddress: ip,
      });
      await m.getRepository(AttendanceRevision).save(rev);
      return att;
    });
  }

  async listForInternship(internshipId: string) {
    return this.attRepo.find({
      where: { internshipId },
      order: { date: 'DESC' },
    });
  }

  async listForStudent(studentId: string, internshipId?: string) {
    return this.attRepo.find({
      where: {
        studentId,
        ...(internshipId ? { internshipId } : {}),
      },
      order: { date: 'DESC' },
    });
  }

  /**
   * Aggregate attendance stats for a (student, internship) pair.
   * Returns exact DECIMAL(5,2) percentage.
   */
  async stats(studentId: string, internshipId: string) {
    const internship = await this.internshipRepo.findOne({ where: { id: internshipId } });
    if (!internship) throw new NotFoundException('Internship not found');

    const rows = await this.attRepo.find({ where: { studentId, internshipId } });
    const counters: DayCounters = { present: 0, absent: 0, halfDay: 0 };
    for (const r of rows) {
      if (r.status === AttendanceStatus.PRESENT) counters.present += 1;
      else if (r.status === AttendanceStatus.ABSENT) counters.absent += 1;
      else if (r.status === AttendanceStatus.HALF_DAY) counters.halfDay += 1;
    }
    const percentage = computeAttendancePercentage(counters, internship.totalDays);
    return {
      studentId,
      internshipId,
      totalDays: internship.totalDays,
      counted: rows.length,
      present: counters.present,
      absent: counters.absent,
      halfDay: counters.halfDay,
      percentage, // DECIMAL string "89.99"
    };
  }

  /**
   * Aggregate stats for all students of an internship.
   */
  async internshipRoster(internshipId: string) {
    const internship = await this.internshipRepo.findOne({
      where: { id: internshipId },
      relations: { students: { student: { profile: true } } },
    });
    if (!internship) throw new NotFoundException('Internship not found');

    const results: Array<{
      studentId: string;
      firstName: string;
      lastName: string;
      email: string;
      rollNumber: string | null;
      totalDays: number;
      counted: number;
      present: number;
      absent: number;
      halfDay: number;
      percentage: string;
    }> = [];
    for (const ist of internship.students) {
      const s = await this.stats(ist.studentId, internshipId);
      results.push({
        firstName: ist.student.profile?.firstName ?? '',
        lastName: ist.student.profile?.lastName ?? '',
        email: ist.student.email,
        rollNumber: ist.student.profile?.rollNumber ?? null,
        ...s,
      });
    }
    return { internship, roster: results };
  }
}
