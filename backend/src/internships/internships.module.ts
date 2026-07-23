import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Internship } from '../database/entities/internship.entity';
import { InternshipMentor } from '../database/entities/internship-mentor.entity';
import { InternshipStudent } from '../database/entities/internship-student.entity';
import { User } from '../database/entities/user.entity';
import { InternshipsController } from './internships.controller';
import { InternshipsService } from './internships.service';

@Module({
  imports: [TypeOrmModule.forFeature([Internship, InternshipMentor, InternshipStudent, User])],
  controllers: [InternshipsController],
  providers: [InternshipsService],
  exports: [InternshipsService],
})
export class InternshipsModule {}
