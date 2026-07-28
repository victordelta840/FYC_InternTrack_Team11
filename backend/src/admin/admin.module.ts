import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../database/entities/user.entity';
import { Profile } from '../database/entities/profile.entity';
import { Internship } from '../database/entities/internship.entity';
import { Certificate } from '../database/entities/certificate.entity';
import { Template } from '../database/entities/template.entity';
import { Complaint } from '../database/entities/complaint.entity';
import { AuditLog } from '../database/entities/audit-log.entity';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Profile, Internship, Certificate, Template, Complaint, AuditLog]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
