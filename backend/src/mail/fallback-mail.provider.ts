import { Logger } from '@nestjs/common';
import { MailMessage, MailProvider } from './mail-provider.interface';

/**
 * Wraps two MailProvider implementations: tries `primary` first, and
 * if it throws, logs the failure and retries once via `fallback`
 * before giving up. This is what implements "Resend primary, Gmail
 * SMTP fallback" — MailService and AuthService are unaware this
 * composition even exists, they just see a single MailProvider.
 */
export class FallbackMailProvider implements MailProvider {
  private readonly logger = new Logger(FallbackMailProvider.name);

  constructor(
    private readonly primary: MailProvider,
    private readonly fallback: MailProvider,
    private readonly primaryName: string,
    private readonly fallbackName: string,
  ) {}

  async send(message: MailMessage): Promise<void> {
    try {
      await this.primary.send(message);
      return;
    } catch (err) {
      this.logger.warn(
        `Primary mail provider (${this.primaryName}) failed for ${message.to}, ` +
          `falling back to ${this.fallbackName}: ${(err as Error).message}`,
      );
    }

    await this.fallback.send(message);
  }
}
