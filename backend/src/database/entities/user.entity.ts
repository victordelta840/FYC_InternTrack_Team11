import { Column, Entity, Index, OneToMany, OneToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { UserRole } from './enums';
import { Profile } from './profile.entity';
import { InternshipMentor } from './internship-mentor.entity';
import { InternshipStudent } from './internship-student.entity';

@Entity({ name: 'users' })
@Index('idx_users_email', ['email'], { unique: true })
@Index('idx_users_role', ['role'])
@Index('idx_users_reset_password_token_hash', ['resetPasswordTokenHash'])
export class User extends BaseEntity {
  @Column({ type: 'varchar', length: 191, unique: true })
  email: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash: string;

  @Column({ type: 'enum', enum: UserRole })
  role: UserRole;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'last_login_at', type: 'datetime', precision: 6, nullable: true })
  lastLoginAt: Date | null;

  @Column({ name: 'failed_login_attempts', type: 'int', default: 0 })
  failedLoginAttempts: number;

  @Column({ name: 'locked_until', type: 'datetime', precision: 6, nullable: true })
  lockedUntil: Date | null;

  @Column({ name: 'refresh_token_hash', type: 'varchar', length: 255, nullable: true })
  refreshTokenHash: string | null;

  @Column({ name: 'reset_password_token_hash', type: 'varchar', length: 255, nullable: true })
  resetPasswordTokenHash: string | null;

  @Column({ name: 'reset_password_expires_at', type: 'datetime', precision: 6, nullable: true })
  resetPasswordExpiresAt: Date | null;

  @OneToOne(() => Profile, (profile) => profile.user)
  profile: Profile;

  @OneToMany(() => InternshipMentor, (im) => im.mentor)
  mentorAssignments: InternshipMentor[];

  @OneToMany(() => InternshipStudent, (is) => is.student)
  studentAssignments: InternshipStudent[];
}
