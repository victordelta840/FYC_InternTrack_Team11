import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';
import { MAIL_PROVIDER, MailProvider } from './mail-provider.interface';
import { NodemailerMailProvider } from './nodemailer-mail.provider';
import { ResendMailProvider } from './resend-mail.provider';
import { FallbackMailProvider } from './fallback-mail.provider';

/**
 * Composes the two concrete providers (Resend, Nodemailer/SMTP) behind
 * a single MAIL_PROVIDER token via FallbackMailProvider. Which one is
 * "primary" and which is "fallback" is controlled entirely by the
 * MAIL_PRIMARY_PROVIDER env var (see app.config.ts) — no code change
 * needed to flip the order.
 *
 * To add a third transport later (e.g. Postmark/SES), implement
 * MailProvider in a new class and wire it into the factory below —
 * MailService and every consumer (AuthService, etc.) stay untouched.
 */
@Module({
  providers: [
    NodemailerMailProvider,
    ResendMailProvider,
    {
      provide: MAIL_PROVIDER,
      useFactory: (
        config: ConfigService,
        resend: ResendMailProvider,
        smtp: NodemailerMailProvider,
      ): MailProvider => {
        const primaryName = config.get<string>('app.mail.primaryProvider') === 'smtp' ? 'smtp' : 'resend';
        const [primary, fallback, primaryLabel, fallbackLabel] =
          primaryName === 'smtp' ? [smtp, resend, 'smtp', 'resend'] : [resend, smtp, 'resend', 'smtp'];

        return new FallbackMailProvider(primary, fallback, primaryLabel, fallbackLabel);
      },
      inject: [ConfigService, ResendMailProvider, NodemailerMailProvider],
    },
    MailService,
  ],
  exports: [MailService],
})
export class MailModule {}

