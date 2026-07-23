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
import { UserRole, InternshipStatus } from '../database/entities/enums';
import { CurrentUser, JwtUserPayload } from '../common/decorators/current-user.decorator';
import { InternshipsService } from './internships.service';
import { CreateInternshipDto, UpdateStatusDto } from './internships.dto';

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
}
