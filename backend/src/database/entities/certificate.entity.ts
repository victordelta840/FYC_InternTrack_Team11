import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Internship } from './internship.entity';
import { Template } from './template.entity';

@Entity({ name: 'certificates' })
@Unique('uq_cert_student_internship', ['studentId', 'internshipId'])
@Index('idx_cert_student', ['studentId'])
export class Certificate extends BaseEntity {
  @Column({ name: 'student_id', type: 'char', length: 36 })
  studentId: string;

  @Column({ name: 'internship_id', type: 'char', length: 36 })
  internshipId: string;

  @Column({ name: 'template_id', type: 'char', length: 36 })
  templateId: string;

  @Column({ name: 'local_pdf_path', type: 'varchar', length: 500 })
  localPdfPath: string;

  @Column({ name: 'attendance_percentage', type: 'decimal', precision: 5, scale: 2 })
  attendancePercentage: string;

  @Column({ name: 'issued_at', type: 'datetime', precision: 6 })
  issuedAt: Date;

  @Column({ name: 'issued_by', type: 'char', length: 36 })
  issuedBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'student_id' })
  student: User;

  @ManyToOne(() => Internship)
  @JoinColumn({ name: 'internship_id' })
  internship: Internship;

  @ManyToOne(() => Template)
  @JoinColumn({ name: 'template_id' })
  template: Template;
}
