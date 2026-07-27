import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { MailMessage, MailProvider } from './mail-provider.interface';

/**
 * Gmail/SMTP-backed MailProvider. This is the only file that knows
 * anything about nodemailer or SMTP — everything else in the app talks
 * to the MailProvider interface.
 *
 * The transporter is created lazily and cached (connection pooling),
 * so repeated sends reuse warm connections instead of paying a fresh
 * TLS handshake every time.
 *
 * connectionTimeout / greetingTimeout / socketTimeout are set
 * explicitly (default 10s each, via app.mail.*TimeoutMs). Without
 * these, nodemailer/Node's default socket timeout is ~2 minutes — so a
 * blocked or unreachable SMTP host (a known possibility on Render's
 * outbound network for raw SMTP ports like 587/465 to Gmail) hangs the
 * request for a very long time before finally surfacing as
 * "Connection timeout". Failing fast here lets calling code decide
 * what the user should see instead of the whole request hanging.
 */
@Injectable()
export class NodemailerMailProvider implements MailProvider {
  private readonly logger = new Logger(NodemailerMailProvider.name);
  private transporter: Transporter | null = null;

  constructor(private readonly config: ConfigService) {}

  private getTransporter(): Transporter {
    if (this.transporter) return this.transporter;

    const host = this.config.get<string>('app.mail.host')!;
    const port = this.config.get<number>('app.mail.port')!;
    const secure = this.config.get<boolean>('app.mail.secure')!;
    const user = this.config.get<string>('app.mail.user')!;
    const pass = this.config.get<string>('app.mail.pass')!;

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure, // true = implicit TLS (465), false = STARTTLS (587)
      auth: user ? { user, pass } : undefined,
      pool: true,
      maxConnections: 3,
      maxMessages: 50,
      connectionTimeout: this.config.get<number>('app.mail.connectionTimeoutMs')!,
      greetingTimeout: this.config.get<number>('app.mail.greetingTimeoutMs')!,
      socketTimeout: this.config.get<number>('app.mail.socketTimeoutMs')!,
    });

    return this.transporter;
  }

  async send(message: MailMessage): Promise<void> {
    const from = this.config.get<string>('app.mail.from')!;
    const transporter = this.getTransporter();

    try {
      await transporter.sendMail({
        from,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
      });
      this.logger.log(`Email sent to ${message.to}: "${message.subject}"`);
    } catch (err) {
      this.logger.error(
        `Failed to send email to ${message.to}: ${(err as Error).message}`,
        (err as Error).stack,
      );
      throw err;
    }
  }
}
