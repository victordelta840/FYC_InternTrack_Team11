import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole, InternshipStatus } from '../database/entities/enums';
import { CurrentUser, JwtUserPayload } from '../common/decorators/current-user.decorator';
import { InternshipsService } from './internships.service';
import {
  AssignMentorDto,
  AssignStudentDto,
  CreateInternshipDto,
  UpdateInternshipDto,
  UpdateStatusDto,
} from './internships.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('internships')
export class InternshipsController {
  constructor(private readonly svc: InternshipsService) {}

  @Get()
  list(
    @CurrentUser() user: JwtUserPayload,
    @Query('status') status?: InternshipStatus,
  ) {
    if (user.role === UserRole.ADMIN) return this.svc.list({ status });
    return this.svc.listForUser(user.sub, user.role as UserRole);
  }

  @Get(':id')
  get(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.svc.findOne(id);
  }

  @Roles(UserRole.ADMIN)
  @Post()
  create(@Body() dto: CreateInternshipDto) {
    return this.svc.create(dto);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id/status')
  status(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateStatusDto,
  ) {
    return this.svc.updateStatus(id, dto.status);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateInternshipDto,
  ) {
    return this.svc.update(id, dto);
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    await this.svc.remove(id);
  }

  @Roles(UserRole.ADMIN)
  @Post(':id/mentors')
  assignMentor(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AssignMentorDto,
  ) {
    return this.svc.assignMentor(id, dto.mentorId);
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id/mentors/:mentorId')
  removeMentor(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('mentorId', new ParseUUIDPipe()) mentorId: string,
  ) {
    return this.svc.removeMentor(id, mentorId);
  }

  @Roles(UserRole.ADMIN)
  @Post(':id/students')
  assignStudent(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AssignStudentDto,
  ) {
    return this.svc.assignStudent(id, dto.studentId);
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id/students/:studentId')
  removeStudent(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('studentId', new ParseUUIDPipe()) studentId: string,
  ) {
    return this.svc.removeStudent(id, studentId);
  }
}
