import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../database/entities/user.entity';
import { Profile } from '../database/entities/profile.entity';
import { UserRole } from '../database/entities/enums';
import { PasswordService } from '../auth/password.service';

export interface CreateUserInput {
  email: string;
  password: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  rollNumber?: string;
  department?: string;
  phone?: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Profile) private readonly profileRepo: Repository<Profile>,
    private readonly password: PasswordService,
  ) {}

  async listByRole(role?: UserRole) {
    const users = await this.userRepo.find({
      where: role ? { role } : {},
      relations: { profile: true },
      order: { createdAt: 'DESC' },
    });
    return users.map((u) => this.serialize(u));
  }

  async findOne(id: string) {
    const user = await this.userRepo.findOne({ where: { id }, relations: { profile: true } });
    if (!user) throw new NotFoundException('User not found');
    return this.serialize(user);
  }

  async create(input: CreateUserInput) {
    const email = input.email.toLowerCase().trim();
    const passwordHash = await this.password.hash(input.password);
    const user = this.userRepo.create({
      email,
      passwordHash,
      role: input.role,
      isActive: true,
    });
    const saved = await this.userRepo.save(user);
    const profile = this.profileRepo.create({
      userId: saved.id,
      firstName: input.firstName,
      lastName: input.lastName,
      rollNumber: input.rollNumber ?? null,
      department: input.department ?? null,
      phone: input.phone ?? null,
    });
    await this.profileRepo.save(profile);
    return this.findOne(saved.id);
  }

  async setActive(id: string, active: boolean) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    user.isActive = active;
    await this.userRepo.save(user);
    return this.findOne(id);
  }

  private serialize(u: User) {
    return {
      id: u.id,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      lastLoginAt: u.lastLoginAt,
      firstName: u.profile?.firstName ?? '',
      lastName: u.profile?.lastName ?? '',
      rollNumber: u.profile?.rollNumber ?? null,
      department: u.profile?.department ?? null,
      phone: u.profile?.phone ?? null,
      createdAt: u.createdAt,
    };
  }
}
