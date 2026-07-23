import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../database/entities/enums';
import { CurrentUser, JwtUserPayload } from '../common/decorators/current-user.decorator';
import { CertificatesService } from './certificates.service';
import { IssueCertificateDto } from './certificates.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('certificates')
export class CertificatesController {
  constructor(private readonly svc: CertificatesService) {}

  @Get('precheck')
  precheck(
    @Query('studentId', new ParseUUIDPipe()) studentId: string,
    @Query('internshipId', new ParseUUIDPipe()) internshipId: string,
    @CurrentUser() user: JwtUserPayload,
  ) {
    if (user.role === UserRole.STUDENT && studentId !== user.sub) {
      throw new ForbiddenException('Students may only precheck their own certificate.');
    }
    return this.svc.precheck(studentId, internshipId);
  }

  @Roles(UserRole.ADMIN, UserRole.MENTOR)
  @Post('issue')
  async issue(@Body() dto: IssueCertificateDto, @CurrentUser() user: JwtUserPayload) {
    return this.svc.issue({
      studentId: dto.studentId,
      internshipId: dto.internshipId,
      issuedBy: user.sub,
    });
  }

  /**
   * Student self-issue: enforced 90.00% rule — students CAN request their own
   * certificate; the service will hard-block if ineligible.
   */
  @Roles(UserRole.STUDENT)
  @Post('self-issue')
  async selfIssue(
    @Body() body: { internshipId: string },
    @CurrentUser() user: JwtUserPayload,
  ) {
    return this.svc.issue({
      studentId: user.sub,
      internshipId: body.internshipId,
      issuedBy: user.sub,
    });
  }

  @Get('mine')
  mine(@CurrentUser() user: JwtUserPayload) {
    return this.svc.listForStudent(user.sub);
  }

  @Roles(UserRole.ADMIN)
  @Get()
  all() {
    return this.svc.listAll();
  }

  @Get(':id/download')
  async download(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: JwtUserPayload,
    @Res() res: Response,
  ) {
    const isAdmin = user.role === UserRole.ADMIN || user.role === UserRole.MENTOR;
    const { buffer, filename } = await this.svc.downloadBuffer(id, user.sub, isAdmin);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }
}
