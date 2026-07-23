import { Injectable, OnModuleInit } from '@nestjs/common';
import * as argon2 from 'argon2';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PasswordService implements OnModuleInit {
  private memoryCost = 19456;
  private timeCost = 2;
  private parallelism = 1;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    this.memoryCost = this.config.get<number>('app.argon2.memoryCost', 19456);
    this.timeCost = this.config.get<number>('app.argon2.timeCost', 2);
    this.parallelism = this.config.get<number>('app.argon2.parallelism', 1);
  }

  async hash(plain: string): Promise<string> {
    return argon2.hash(plain, {
      type: argon2.argon2id,
      memoryCost: this.memoryCost,
      timeCost: this.timeCost,
      parallelism: this.parallelism,
    });
  }

  async verify(hash: string, plain: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plain);
    } catch {
      return false;
    }
  }
}
