import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Webhook } from '../database/entities/webhook.entity';
import { SystemJob } from '../database/entities/system-job.entity';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { WebhookEmitterService } from './webhook-emitter.service';
import { WebhookWorkerService } from './webhook-worker.service';

@Module({
  imports: [TypeOrmModule.forFeature([Webhook, SystemJob])],
  controllers: [WebhooksController],
  providers: [WebhooksService, WebhookEmitterService, WebhookWorkerService],
  exports: [WebhookEmitterService],
})
export class WebhooksModule {}
