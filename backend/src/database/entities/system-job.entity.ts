import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { SystemJobStatus, SystemJobType } from './enums';

@Entity({ name: 'system_jobs' })
@Index('idx_jobs_status', ['status'])
@Index('idx_jobs_type_status', ['type', 'status'])
export class SystemJob extends BaseEntity {
  @Column({ type: 'enum', enum: SystemJobType })
  type: SystemJobType;

  @Column({ type: 'enum', enum: SystemJobStatus, default: SystemJobStatus.PENDING })
  status: SystemJobStatus;

  @Column({ type: 'json' })
  payload: Record<string, unknown>;

  @Column({ name: 'attempts', type: 'int', default: 0 })
  attempts: number;

  @Column({ name: 'max_attempts', type: 'int', default: 3 })
  maxAttempts: number;

  @Column({ name: 'error_trace', type: 'text', nullable: true })
  errorTrace: string | null;

  @Column({ name: 'started_at', type: 'datetime', precision: 6, nullable: true })
  startedAt: Date | null;

  @Column({ name: 'completed_at', type: 'datetime', precision: 6, nullable: true })
  completedAt: Date | null;

  @Column({ name: 'created_by', type: 'char', length: 36, nullable: true })
  createdBy: string | null;
}
