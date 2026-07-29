import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';

import appConfig from './common/config/app.config';
import databaseConfig from './common/config/database.config';

import { GlobalHttpExceptionFilter } from './common/filters/global-http-exception.filter';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { AuditLog } from './database/entities/audit-log.entity';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { InternshipsModule } from './internships/internships.module';
import { AttendanceModule } from './attendance/attendance.module';
import { TemplatesModule } from './templates/templates.module';
import { CertificatesModule } from './certificates/certificates.module';
import { ComplaintsModule } from './complaints/complaints.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { DashboardModule } from './dashboard/dashboard.module';

import { AdminModule } from './admin/admin.module';
import { HealthController } from './health.controller';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig],
      envFilePath: ['.env'],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        ...(config.get('database') as object),
        autoLoadEntities: true,
      }) as any,
    }),
    TypeOrmModule.forFeature([AuditLog]),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>('app.rateLimit.ttl', 60) * 1000,
          limit: config.get<number>('app.rateLimit.max', 120),
        },
      ],
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    UsersModule,
    InternshipsModule,
    AttendanceModule,
    TemplatesModule,
    CertificatesModule,
    ComplaintsModule,
    WebhooksModule,

    DashboardModule,

    AdminModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_FILTER, useClass: GlobalHttpExceptionFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}