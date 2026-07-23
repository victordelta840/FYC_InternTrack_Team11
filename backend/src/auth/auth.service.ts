import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { readFileSync } from 'fs';
import * as crypto from 'crypto';
import { User } from '../database/entities/user.entity';
import { Profile } from '../database/entities/profile.entity';
import { UserRole } from '../database/entities/enums';
import { PasswordService } from './password.service';
import { WebhookEmitterService } from '../webhooks/webhook-emitter.service';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

interface TokenBundle {
  accessToken: string;
  refreshToken: string;
  accessExpiresIn: number;
  refreshExpiresIn: number;
}

@Injectable()
export class AuthService {
  private readonly privateKey: string;
  private readonly publicKey: string;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly password: PasswordService,
    private readonly emitter: WebhookEmitterService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Profile) private readonly profileRepo: Repository<Profile>,
  ) {
    this.privateKey = readFileSync(this.config.get<string>('app.jwt.privateKeyPath')!, 'utf8');
    this.publicKey = readFileSync(this.config.get<string>('app.jwt.publicKeyPath')!, 'utf8');
  }

  /**
   * Portal-scoped login. Admin login is only allowed via the admin gateway;
   * mentor/student login via the standard portal gateway.
   */
  async login(email: string, plainPassword: string, gateway: 'ADMIN' | 'PORTAL'): Promise<{
    tokens: TokenBundle;
    user: { id: string; email: string; role: UserRole; firstName: string; lastName: string };
  }> {
    const user = await this.userRepo.findOne({
      where: { email: email.toLowerCase().trim() },
      relations: { profile: true },
    });

    if (!user || !user.isActive) throw new UnauthorizedException('Invalid credentials');

    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      throw new ForbiddenException('Account temporarily locked. Try again later.');
    }

    // Gateway isolation: Admin cannot log in from PORTAL and vice-versa.
    if (gateway === 'ADMIN' && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('This portal is restricted to administrators');
    }
    if (gateway === 'PORTAL' && user.role === UserRole.ADMIN) {
      throw new ForbiddenException('Administrators must use the admin portal');
    }

    const ok = await this.password.verify(user.passwordHash, plainPassword);
    if (!ok) {
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
        user.lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
        user.failedLoginAttempts = 0;
      }
      await this.userRepo.save(user);
      throw new UnauthorizedException('Invalid credentials');
    }

    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    user.lastLoginAt = new Date();

    const tokens = await this.issueTokens(user);
    user.refreshTokenHash = this.hashToken(tokens.refreshToken);
    await this.userRepo.save(user);

    return {
      tokens,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.profile?.firstName ?? '',
        lastName: user.profile?.lastName ?? '',
      },
    };
  }

  async refresh(userId: string, refreshToken: string): Promise<TokenBundle> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user || !user.refreshTokenHash) throw new UnauthorizedException('Session invalid');
    if (user.refreshTokenHash !== this.hashToken(refreshToken)) {
      // token reuse — invalidate everything.
      user.refreshTokenHash = null;
      await this.userRepo.save(user);
      throw new UnauthorizedException('Session invalid');
    }
    const tokens = await this.issueTokens(user);
    user.refreshTokenHash = this.hashToken(tokens.refreshToken);
    await this.userRepo.save(user);
    return tokens;
  }

  async logout(userId: string): Promise<void> {
    await this.userRepo.update({ id: userId }, { refreshTokenHash: null });
  }

  async me(userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: { profile: true },
    });
    if (!user) throw new UnauthorizedException();
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.profile?.firstName ?? '',
      lastName: user.profile?.lastName ?? '',
      department: user.profile?.department ?? null,
      rollNumber: user.profile?.rollNumber ?? null,
    };
  }

  /**
   * Self-registration for STUDENT role only.
   * Admins/Mentors are provisioned by an Admin.
   */
  async registerStudent(input: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    rollNumber?: string;
    department?: string;
  }) {
    const email = input.email.toLowerCase().trim();
    const existing = await this.userRepo.findOne({ where: { email } });
    if (existing) throw new BadRequestException('Email already in use');

    const passwordHash = await this.password.hash(input.password);
    const user = this.userRepo.create({
      email,
      passwordHash,
      role: UserRole.STUDENT,
      isActive: true,
    });
    const saved = await this.userRepo.save(user);
    const profile = this.profileRepo.create({
      userId: saved.id,
      firstName: input.firstName,
      lastName: input.lastName,
      rollNumber: input.rollNumber ?? null,
      department: input.department ?? null,
    });
    await this.profileRepo.save(profile);

    void this.emitter.broadcast('student.registered', {
      id: saved.id,
      email: saved.email,
      firstName: input.firstName,
      lastName: input.lastName,
      rollNumber: input.rollNumber ?? null,
      department: input.department ?? null,
      registeredAt: new Date().toISOString(),
    });

    return { id: saved.id, email: saved.email, role: saved.role };
  }

  private async issueTokens(user: User): Promise<TokenBundle> {
    const accessTtl = this.config.get<number>('app.jwt.accessTtl')!;
    const refreshTtl = this.config.get<number>('app.jwt.refreshTtl')!;
    const issuer = this.config.get<string>('app.jwt.issuer')!;
    const audience = this.config.get<string>('app.jwt.audience')!;

    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = await this.jwt.signAsync(payload, {
      algorithm: 'RS256',
      privateKey: this.privateKey,
      expiresIn: accessTtl,
      issuer,
      audience,
    });
    const refreshToken = await this.jwt.signAsync(
      { sub: user.id, typ: 'refresh' },
      {
        algorithm: 'RS256',
        privateKey: this.privateKey,
        expiresIn: refreshTtl,
        issuer,
        audience,
      },
    );

    return {
      accessToken,
      refreshToken,
      accessExpiresIn: accessTtl,
      refreshExpiresIn: refreshTtl,
    };
  }

  verifyRefresh(token: string): { sub: string; typ: string } {
    try {
      return this.jwt.verify(token, {
        algorithms: ['RS256'],
        publicKey: this.publicKey,
        issuer: this.config.get<string>('app.jwt.issuer')!,
        audience: this.config.get<string>('app.jwt.audience')!,
      }) as { sub: string; typ: string };
    } catch {
      throw new UnauthorizedException('Refresh token invalid or expired');
    }
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
