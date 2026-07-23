import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { AttendanceStatus } from './enums';
import { Attendance } from './attendance.entity';
import { User } from './user.entity';

/**
 * Immutable lineage table. Every manual edit of an existing attendance
 * record MUST write a new row here with the before/after status and
 * a mandatory justification message.
 */
@Entity({ name: 'attendance_revisions' })
@Index('idx_att_rev_attendance', ['attendanceId'])
export class AttendanceRevision extends BaseEntity {
  @Column({ name: 'attendance_id', type: 'char', length: 36 })
  attendanceId: string;

  @Column({ name: 'editor_id', type: 'char', length: 36 })
  editorId: string;

  @Column({ name: 'previous_status', type: 'enum', enum: AttendanceStatus })
  previousStatus: AttendanceStatus;

  @Column({ name: 'new_status', type: 'enum', enum: AttendanceStatus })
  newStatus: AttendanceStatus;

  @Column({ name: 'justification', type: 'varchar', length: 1000 })
  justification: string;

  @Column({ name: 'ip_address', type: 'varchar', length: 64, nullable: true })
  ipAddress: string | null;

  @ManyToOne(() => Attendance, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'attendance_id' })
  attendance: Attendance;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'editor_id' })
  editor: User;
}
