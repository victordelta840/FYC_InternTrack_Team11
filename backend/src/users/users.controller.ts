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
import { UserRole } from '../database/entities/enums';
import { UsersService } from './users.service';
import { CreateUserDto } from './users.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Roles(UserRole.ADMIN)
  @Get()
  list(@Query('role') role?: UserRole) {
    return this.users.listByRole(role);
  }

  @Roles(UserRole.ADMIN)
  @Get(':id')
  get(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.users.findOne(id);
  }

  @Roles(UserRole.ADMIN)
  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.users.create(dto);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id/status')
  toggle(@Param('id', new ParseUUIDPipe()) id: string, @Body() body: { active: boolean }) {
    return this.users.setActive(id, !!body.active);
  }
}
