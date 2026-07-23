import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Attendance } from '../database/entities/attendance.entity';
import { AttendanceRevision } from '../database/entities/attendance-revision.entity';
import { Internship } from '../database/entities/internship.entity';
import { InternshipStudent } from '../database/entities/internship-student.entity';
import { InternshipMentor } from '../database/entities/internship-mentor.entity';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { ImportParserService } from './import-parser.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Attendance,
      AttendanceRevision,
      Internship,
      InternshipStudent,
      InternshipMentor,
    ]),
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService, ImportParserService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
