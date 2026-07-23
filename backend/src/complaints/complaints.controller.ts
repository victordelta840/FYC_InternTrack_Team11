import {
  Body,
  Controller,
  Get,
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
import { CurrentUser, JwtUserPayload } from '../common/decorators/current-user.decorator';
import { UserRole, ComplaintStatus } from '../database/entities/enums';
import { ComplaintsService } from './complaints.service';
import { AssignDto, CreateComplaintDto, UpdateStatusDto } from './complaints.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('complaints')
export class ComplaintsController {
  constructor(private readonly svc: ComplaintsService) {}

  @Roles(UserRole.STUDENT)
  @Post()
  create(@Body() dto: CreateComplaintDto, @CurrentUser() user: JwtUserPayload) {
    return this.svc.create({
      studentId: user.sub,
      category: dto.category,
      subject: dto.subject,
      description: dto.description,
      assignedTo: dto.assignedTo,
      slaHours: dto.slaHours,
    });
  }

  @Get()
  list(
    @CurrentUser() user: JwtUserPayload,
    @Query('status') status?: ComplaintStatus,
  ) {
    return this.svc.listForUser(user.sub, user.role as UserRole, status);
  }

  @Get(':id')
  get(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: JwtUserPayload,
  ) {
    return this.svc.findOne(id, user.sub, user.role as UserRole);
  }

  @Roles(UserRole.MENTOR, UserRole.ADMIN)
  @Patch(':id/status')
  updateStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateStatusDto,
    @CurrentUser() user: JwtUserPayload,
  ) {
    return this.svc.updateStatus(
      id,
      dto.status,
      { id: user.sub, role: user.role as UserRole },
      dto.resolutionNotes,
    );
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id/assign')
  assign(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AssignDto,
    @CurrentUser() user: JwtUserPayload,
  ) {
    return this.svc.assign(id, dto.assigneeId, {
      id: user.sub,
      role: user.role as UserRole,
    });
  }
}
