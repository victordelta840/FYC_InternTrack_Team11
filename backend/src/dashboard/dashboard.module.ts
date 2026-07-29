import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { User } from '../database/entities/user.entity';
import { Internship } from '../database/entities/internship.entity';
import { Certificate } from '../database/entities/certificate.entity';
import { Template } from '../database/entities/template.entity';
import { Complaint } from '../database/entities/complaint.entity';
import { AuditLog } from '../database/entities/audit-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Internship, Certificate, Template, Complaint, AuditLog])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
