import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtUserPayload } from '../common/decorators/current-user.decorator';
import { UserRole } from '../database/entities/enums';
import { AttendanceService } from './attendance.service';
import { ImportParserService, StagingResult } from './import-parser.service';
import { EditAttendanceDto, ImportCommitDto, ImportPreviewDto, MarkAttendanceDto } from './attendance.dto';
import type { Request } from 'express';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(
    private readonly svc: AttendanceService,
    private readonly importer: ImportParserService,
  ) {}

  @Roles(UserRole.MENTOR, UserRole.ADMIN)
  @Post('mark')
  mark(
    @Body() dto: MarkAttendanceDto,
    @CurrentUser() user: JwtUserPayload,
    @Req() req: Request,
  ) {
    return this.svc.mark(dto, user.sub, req.ip ?? '');
  }

  @Roles(UserRole.MENTOR, UserRole.ADMIN)
  @Patch(':id')
  edit(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: EditAttendanceDto,
    @CurrentUser() user: JwtUserPayload,
    @Req() req: Request,
  ) {
    return this.svc.edit(id, dto, user.sub, req.ip ?? '');
  }

  @Get('internship/:id')
  listForInternship(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.svc.listForInternship(id);
  }

  @Get('roster/:id')
  roster(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.svc.internshipRoster(id);
  }

  @Get('student/:studentId/stats')
  stats(
    @Param('studentId', new ParseUUIDPipe()) studentId: string,
    @Query('internshipId', new ParseUUIDPipe()) internshipId: string,
  ) {
    return this.svc.stats(studentId, internshipId);
  }

  @Get('student/:studentId')
  listForStudent(
    @Param('studentId', new ParseUUIDPipe()) studentId: string,
    @Query('internshipId') internshipId?: string,
  ) {
    return this.svc.listForStudent(studentId, internshipId);
  }

  // ---------- Import ----------

  @Roles(UserRole.MENTOR, UserRole.ADMIN)
  @Post('import/preview')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async preview(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: ImportPreviewDto,
  ): Promise<StagingResult> {
    if (!file) throw new BadRequestException('CSV/XLS/XLSX file is required (field name: file)');
    return this.importer.preview(file.buffer, file.originalname, dto.internshipId);
  }

  @Roles(UserRole.MENTOR, UserRole.ADMIN)
  @Post('import/commit')
  async commit(
    @Body() dto: ImportCommitDto,
    @CurrentUser() user: JwtUserPayload,
  ) {
    const staging = dto.staging as StagingResult;
    if (!staging || !Array.isArray(staging.rows)) {
      throw new BadRequestException('Invalid staging payload');
    }
    return this.importer.commit(staging, {
      internshipId: dto.internshipId,
      mentorId: user.sub,
    });
  }
}
