import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { MailMessage, MailProvider } from './mail-provider.interface';

/**
 * Resend-backed MailProvider. Sends over Resend's HTTPS API rather
 * than a raw SMTP socket, which sidesteps the outbound-SMTP-port
 * blocking that platforms like Render can apply to ports 587/465 —
 * this is the root cause of the original "Connection timeout" bug, so
 * Resend is configured as the primary provider by default (see
 * app.mail.primaryProvider).
 */
@Injectable()
export class ResendMailProvider implements MailProvider {
  private readonly logger = new Logger(ResendMailProvider.name);
  private client: Resend | null = null;

  constructor(private readonly config: ConfigService) {}

  private getClient(): Resend {
    if (this.client) return this.client;
    const apiKey = this.config.get<string>('app.mail.resendApiKey')!;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not configured');
    }
    this.client = new Resend(apiKey);
    return this.client;
  }

  async send(message: MailMessage): Promise<void> {
    const from = this.config.get<string>('app.mail.from')!;
    const client = this.getClient();

    const { error } = await client.emails.send({
      from,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });

    if (error) {
      this.logger.error(`Resend send failed for ${message.to}: ${error.message}`);
      throw new Error(`Resend send failed: ${error.message}`);
    }

    this.logger.log(`Email sent via Resend to ${message.to}: "${message.subject}"`);
  }
}
