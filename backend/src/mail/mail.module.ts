import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { MAIL_PROVIDER } from './mail-provider.interface';
import { NodemailerMailProvider } from './nodemailer-mail.provider';

/**
 * To replace the mail transport later (e.g. move from Gmail SMTP to
 * SendGrid/Postmark/SES), implement MailProvider in a new class and
 * change only the `useClass` below — MailService and every consumer
 * (AuthService, etc.) stay untouched.
 */
@Module({
  providers: [
    NodemailerMailProvider,
    { provide: MAIL_PROVIDER, useClass: NodemailerMailProvider },
    MailService,
  ],
  exports: [MailService],
})
export class MailModule {}
