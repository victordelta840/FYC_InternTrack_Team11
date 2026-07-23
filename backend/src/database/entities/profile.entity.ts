import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

@Entity({ name: 'profiles' })
export class Profile extends BaseEntity {
  @Column({ name: 'user_id', type: 'char', length: 36 })
  userId: string;

  @OneToOne(() => User, (user) => user.profile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'first_name', type: 'varchar', length: 80 })
  firstName: string;

  @Column({ name: 'last_name', type: 'varchar', length: 80 })
  lastName: string;

  @Column({ name: 'phone', type: 'varchar', length: 30, nullable: true })
  phone: string | null;

  @Column({ name: 'roll_number', type: 'varchar', length: 60, nullable: true })
  rollNumber: string | null;

  @Column({ name: 'department', type: 'varchar', length: 120, nullable: true })
  department: string | null;

  @Column({ name: 'avatar_path', type: 'varchar', length: 255, nullable: true })
  avatarPath: string | null;

  @Column({ name: 'metadata', type: 'json', nullable: true })
  metadata: Record<string, unknown> | null;
}
