import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ComplaintsService } from './complaints.service';

@Injectable()
export class SlaCronService {
  private readonly logger = new Logger(SlaCronService.name);

  constructor(private readonly complaints: ComplaintsService) {}

  /**
   * Runs every 10 minutes. Cheap query — indexed on (status, sla_breach_at).
   * Change frequency by editing the expression.
   */
  @Cron(CronExpression.EVERY_10_MINUTES, { name: 'complaints-sla' })
  async tick() {
    try {
      const { escalated } = await this.complaints.runSlaEscalation();
      if (escalated > 0) {
        this.logger.warn(`SLA escalation: transitioned ${escalated} complaint(s) to ESCALATED.`);
      }
    } catch (err) {
      this.logger.error('SLA escalation cron failed', err as Error);
    }
  }
}
