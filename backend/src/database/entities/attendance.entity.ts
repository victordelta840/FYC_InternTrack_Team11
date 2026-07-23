import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from './base.entity';
import { AttendanceStatus } from './enums';
import { Internship } from './internship.entity';
import { User } from './user.entity';

@Entity({ name: 'attendances' })
@Unique('uq_attendance_unique_day', ['studentId', 'internshipId', 'date'])
@Index('idx_attendance_internship_date', ['internshipId', 'date'])
@Index('idx_attendance_student', ['studentId'])
export class Attendance extends BaseEntity {
  @Column({ name: 'student_id', type: 'char', length: 36 })
  studentId: string;

  @Column({ name: 'internship_id', type: 'char', length: 36 })
  internshipId: string;

  @Column({ name: 'mentor_id', type: 'char', length: 36 })
  mentorId: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'enum', enum: AttendanceStatus })
  status: AttendanceStatus;

  @Column({ type: 'varchar', length: 500, nullable: true })
  notes: string | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: User;

  @ManyToOne(() => Internship, (i) => i.attendances, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'internship_id' })
  internship: Internship;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'mentor_id' })
  mentor: User;
}
