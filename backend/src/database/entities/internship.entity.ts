import { Column, Entity, Index, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { InternshipStatus } from './enums';
import { InternshipMentor } from './internship-mentor.entity';
import { InternshipStudent } from './internship-student.entity';
import { Attendance } from './attendance.entity';

@Entity({ name: 'internships' })
@Index('idx_internships_status', ['status'])
export class Internship extends BaseEntity {
  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'varchar', length: 200 })
  organization: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  @Column({ name: 'end_date', type: 'date' })
  endDate: string;

  /** Total working days for the internship (excludes weekends/holidays if configured). */
  @Column({ name: 'total_days', type: 'int' })
  totalDays: number;

  @Column({ type: 'enum', enum: InternshipStatus, default: InternshipStatus.ACTIVE })
  status: InternshipStatus;

  @OneToMany(() => InternshipMentor, (im) => im.internship, { cascade: true })
  mentors: InternshipMentor[];

  @OneToMany(() => InternshipStudent, (is) => is.internship, { cascade: true })
  students: InternshipStudent[];

  @OneToMany(() => Attendance, (a) => a.internship)
  attendances: Attendance[];
}
