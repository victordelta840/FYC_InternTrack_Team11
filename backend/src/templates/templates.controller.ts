import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../database/entities/enums';
import { CurrentUser, JwtUserPayload } from '../common/decorators/current-user.decorator';
import { TemplatesService, MappingConfig } from './templates.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('templates')
export class TemplatesController {
  constructor(private readonly svc: TemplatesService) {}

  @Roles(UserRole.ADMIN, UserRole.MENTOR)
  @Get()
  list() {
    return this.svc.list();
  }

  @Get('active')
  active() {
    return this.svc.getActive();
  }

  @Roles(UserRole.ADMIN)
  @Get(':id')
  get(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.svc.findOne(id);
  }

  @Roles(UserRole.ADMIN)
  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 15 * 1024 * 1024 } }))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('name') name: string,
    @CurrentUser() user: JwtUserPayload,
  ) {
    if (!file) throw new BadRequestException('file is required');
    if (!name) throw new BadRequestException('name is required');
    return this.svc.upload({ name, file, createdBy: user.sub });
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id/mapping')
  saveMapping(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() mapping: MappingConfig,
  ) {
    return this.svc.saveMapping(id, mapping);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id/activate')
  activate(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.svc.setActive(id);
  }
@Roles(UserRole.ADMIN)
@Delete(':id')
async remove(@Param('id', new ParseUUIDPipe()) id: string) {
  return this.svc.remove(id);
}
  @Get(':id/file')
  async file(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Res() res: Response,
  ) {
    const f = await this.svc.fileBuffer(id);
    const mime =
      f.format === 'PDF' ? 'application/pdf' : f.format === 'PNG' ? 'image/png' : 'image/jpeg';
    res.setHeader('Content-Type', mime);
    res.setHeader('Cache-Control', 'private, max-age=60');
    res.send(f.buffer);
  }
}
