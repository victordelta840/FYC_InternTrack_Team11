import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { readFileSync } from 'fs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../database/entities/user.entity';

const cookieExtractor = (req: any): string | null => {
  if (req && req.cookies && req.cookies.access_token) {
    return req.cookies.access_token;
  }
  return null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {
    const pubPath = config.get<string>('app.jwt.publicKeyPath')!;

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        cookieExtractor,
      ]),
      ignoreExpiration: false,
      secretOrKey: readFileSync(pubPath, 'utf8'),
      algorithms: ['RS256'],
      issuer: config.get<string>('app.jwt.issuer'),
      audience: config.get<string>('app.jwt.audience'),
    });
  }

  async validate(payload: { sub: string; email: string; role: string }) {
    const user = await this.userRepo.findOne({
      where: {
        id: payload.sub,
        isActive: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid token');
    }

    return {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
  }
}