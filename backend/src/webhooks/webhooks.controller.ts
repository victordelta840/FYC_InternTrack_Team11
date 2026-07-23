import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../database/entities/enums';
import { WebhooksService } from './webhooks.service';
import { CreateWebhookDto, UpdateWebhookDto } from './webhooks.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly svc: WebhooksService) {}

  @Get()
  list() { return this.svc.list(); }

  @Get(':id')
  get(@Param('id', new ParseUUIDPipe()) id: string) { return this.svc.findOne(id); }

  @Post()
  create(@Body() dto: CreateWebhookDto) {
    return this.svc.create({ name: dto.name, targetUrl: dto.targetUrl, events: dto.events });
  }

  @Patch(':id')
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateWebhookDto) {
    return this.svc.update(id, dto);
  }

  @Post(':id/rotate-secret')
  rotate(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.svc.rotateSecret(id);
  }

  @Get(':id/deliveries')
  deliveries(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.svc.deliveries(id, 50);
  }

  @Post('deliveries/:jobId/retry')
  retry(@Param('jobId', new ParseUUIDPipe()) jobId: string) {
    return this.svc.retryJob(jobId);
  }

  @Delete(':id')
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.svc.delete(id);
  }
}
