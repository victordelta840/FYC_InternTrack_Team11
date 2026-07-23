import { Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Column } from 'typeorm';
import { Internship } from './internship.entity';
import { User } from './user.entity';

@Entity({ name: 'internship_mentors' })
@Unique('uq_internship_mentor', ['internshipId', 'mentorId'])
export class InternshipMentor extends BaseEntity {
  @Column({ name: 'internship_id', type: 'char', length: 36 })
  internshipId: string;

  @Column({ name: 'mentor_id', type: 'char', length: 36 })
  mentorId: string;

  @ManyToOne(() => Internship, (i) => i.mentors, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'internship_id' })
  internship: Internship;

  @ManyToOne(() => User, (u) => u.mentorAssignments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mentor_id' })
  mentor: User;
}
