import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Certificate } from '../database/entities/certificate.entity';
import { Template } from '../database/entities/template.entity';
import { Internship } from '../database/entities/internship.entity';
import { User } from '../database/entities/user.entity';
import { CertificatesController } from './certificates.controller';
import { CertificatesService } from './certificates.service';
import { TemplatesModule } from '../templates/templates.module';
import { AttendanceModule } from '../attendance/attendance.module';
import { WebhooksModule } from '../webhooks/webhooks.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Certificate, Template, Internship, User]),
    TemplatesModule,
    AttendanceModule,
    WebhooksModule,
  ],
  controllers: [CertificatesController],
  providers: [CertificatesService],
  exports: [CertificatesService],
})
export class CertificatesModule {}
