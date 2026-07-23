import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity({ name: 'webhooks' })
@Index('idx_webhooks_active', ['isActive'])
export class Webhook extends BaseEntity {
  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ name: 'target_url', type: 'varchar', length: 500 })
  targetUrl: string;

  @Column({ type: 'json' })
  events: string[];

  @Column({ name: 'secret_key', type: 'varchar', length: 128 })
  secretKey: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'last_success_at', type: 'datetime', precision: 6, nullable: true })
  lastSuccessAt: Date | null;

  @Column({ name: 'failure_count', type: 'int', default: 0 })
  failureCount: number;
}
