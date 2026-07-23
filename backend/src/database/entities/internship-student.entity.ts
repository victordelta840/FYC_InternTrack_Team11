import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Internship } from './internship.entity';
import { User } from './user.entity';

@Entity({ name: 'internship_students' })
@Unique('uq_internship_student', ['internshipId', 'studentId'])
export class InternshipStudent extends BaseEntity {
  @Column({ name: 'internship_id', type: 'char', length: 36 })
  internshipId: string;

  @Column({ name: 'student_id', type: 'char', length: 36 })
  studentId: string;

  @ManyToOne(() => Internship, (i) => i.students, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'internship_id' })
  internship: Internship;

  @ManyToOne(() => User, (u) => u.studentAssignments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: User;
}
