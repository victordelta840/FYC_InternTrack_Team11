import 'reflect-metadata';
import { config as dotenv } from 'dotenv';
import * as argon2 from 'argon2';
import { AppDataSource } from '../data-source';
import { User } from '../entities/user.entity';
import { Profile } from '../entities/profile.entity';
import { Internship } from '../entities/internship.entity';
import { InternshipMentor } from '../entities/internship-mentor.entity';
import { InternshipStudent } from '../entities/internship-student.entity';
import { Attendance } from '../entities/attendance.entity';
import { AttendanceStatus, InternshipStatus, UserRole } from '../entities/enums';

dotenv();

async function hash(pw: string) {
  return argon2.hash(pw, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
}

async function main() {
  await AppDataSource.initialize();
  console.log('[seed] Connected to database');

  const userRepo = AppDataSource.getRepository(User);
  const profileRepo = AppDataSource.getRepository(Profile);
  const internshipRepo = AppDataSource.getRepository(Internship);
  const imRepo = AppDataSource.getRepository(InternshipMentor);
  const isRepo = AppDataSource.getRepository(InternshipStudent);
  const attRepo = AppDataSource.getRepository(Attendance);

  async function upsertUser(input: {
    email: string;
    password: string;
    role: UserRole;
    firstName: string;
    lastName: string;
    rollNumber?: string;
    department?: string;
  }): Promise<User> {
    let user = await userRepo.findOne({ where: { email: input.email }, relations: { profile: true } });
    if (user) {
      console.log(`[seed] User exists: ${input.email}`);
      return user;
    }
    user = userRepo.create({
      email: input.email,
      passwordHash: await hash(input.password),
      role: input.role,
      isActive: true,
    });
    user = await userRepo.save(user);
    const profile = profileRepo.create({
      userId: user.id,
      firstName: input.firstName,
      lastName: input.lastName,
      rollNumber: input.rollNumber ?? null,
      department: input.department ?? null,
    });
    await profileRepo.save(profile);
    console.log(`[seed] Created ${input.role}: ${input.email}`);
    return user;
  }

  const admin = await upsertUser({
    email: 'admin@interntrack.local',
    password: 'Admin@12345',
    role: UserRole.ADMIN,
    firstName: 'System',
    lastName: 'Administrator',
  });

  const mentor = await upsertUser({
    email: 'mentor@interntrack.local',
    password: 'Mentor@12345',
    role: UserRole.MENTOR,
    firstName: 'Priya',
    lastName: 'Sharma',
    department: 'Computer Science',
  });

  const student1 = await upsertUser({
    email: 'student1@interntrack.local',
    password: 'Student@12345',
    role: UserRole.STUDENT,
    firstName: 'Rahul',
    lastName: 'Kumar',
    rollNumber: 'CS2101',
    department: 'Computer Science',
  });

  const student2 = await upsertUser({
    email: 'student2@interntrack.local',
    password: 'Student@12345',
    role: UserRole.STUDENT,
    firstName: 'Ananya',
    lastName: 'Iyer',
    rollNumber: 'CS2102',
    department: 'Computer Science',
  });

  // Sample internship
  let internship = await internshipRepo.findOne({ where: { title: 'Summer Software Internship 2026' } });
  if (!internship) {
    internship = internshipRepo.create({
      title: 'Summer Software Internship 2026',
      organization: 'TechNova Labs',
      description: 'Full-stack engineering internship focused on the InternTrack platform itself.',
      startDate: '2026-01-01',
      endDate: '2026-03-01',
      totalDays: 40,
      status: InternshipStatus.ACTIVE,
    });
    internship = await internshipRepo.save(internship);
    console.log(`[seed] Created internship: ${internship.title}`);

    await imRepo.save(imRepo.create({ internshipId: internship.id, mentorId: mentor.id }));
    await isRepo.save([
      isRepo.create({ internshipId: internship.id, studentId: student1.id }),
      isRepo.create({ internshipId: internship.id, studentId: student2.id }),
    ]);

    // Sample attendance: student1 gets 38/40 = 95.00% (eligible)
    //                    student2 gets 35/40 = 87.50% (BLOCKED at 90% rule)
    const dates: string[] = [];
    const start = new Date('2026-01-01');
    for (let i = 0; i < 40; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      dates.push(d.toISOString().slice(0, 10));
    }

    const s1Rows = dates.map((date, i) => ({
      studentId: student1.id,
      internshipId: internship!.id,
      mentorId: mentor.id,
      date,
      status: i < 38 ? AttendanceStatus.PRESENT : AttendanceStatus.ABSENT,
    }));
    const s2Rows = dates.map((date, i) => ({
      studentId: student2.id,
      internshipId: internship!.id,
      mentorId: mentor.id,
      date,
      status: i < 35 ? AttendanceStatus.PRESENT : AttendanceStatus.ABSENT,
    }));
    await attRepo.save(attRepo.create(s1Rows));
    await attRepo.save(attRepo.create(s2Rows));
    console.log('[seed] Seeded 40 attendance days for both students.');
  } else {
    console.log('[seed] Sample internship already exists.');
  }

  await AppDataSource.destroy();
  console.log('[seed] Complete.');
  console.log('\nLogin credentials:');
  console.log('  ADMIN   admin@interntrack.local    / Admin@12345');
  console.log('  MENTOR  mentor@interntrack.local   / Mentor@12345');
  console.log('  STUDENT student1@interntrack.local / Student@12345  (95.00% attendance - ELIGIBLE)');
  console.log('  STUDENT student2@interntrack.local / Student@12345  (87.50% attendance - BLOCKED)');
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[seed] Failed:', err);
  process.exit(1);
});
