import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { ComplaintStatus } from './enums';
import { User } from './user.entity';

@Entity({ name: 'complaints' })
@Index('idx_complaints_status', ['status'])
@Index('idx_complaints_assigned', ['assignedTo'])
export class Complaint extends BaseEntity {
  @Column({ name: 'student_id', type: 'char', length: 36 })
  studentId: string;

  @Column({ type: 'varchar', length: 100 })
  category: string;

  @Column({ type: 'varchar', length: 200 })
  subject: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'enum', enum: ComplaintStatus, default: ComplaintStatus.OPEN })
  status: ComplaintStatus;

  @Column({ name: 'assigned_to', type: 'char', length: 36, nullable: true })
  assignedTo: string | null;

  @Column({ name: 'resolution_notes', type: 'text', nullable: true })
  resolutionNotes: string | null;

  @Column({ name: 'sla_breach_at', type: 'datetime', precision: 6, nullable: true })
  slaBreachAt: Date | null;

  @Column({ name: 'last_activity_at', type: 'datetime', precision: 6, nullable: true })
  lastActivityAt: Date | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'student_id' })
  student: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'assigned_to' })
  assignee: User | null;
}
