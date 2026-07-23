import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Complaint } from '../database/entities/complaint.entity';
import { User } from '../database/entities/user.entity';
import { ComplaintsController } from './complaints.controller';
import { ComplaintsService } from './complaints.service';
import { SlaCronService } from './sla-cron.service';
import { WebhooksModule } from '../webhooks/webhooks.module';

@Module({
  imports: [TypeOrmModule.forFeature([Complaint, User]), WebhooksModule],
  controllers: [ComplaintsController],
  providers: [ComplaintsService, SlaCronService],
  exports: [ComplaintsService],
})
export class ComplaintsModule {}
