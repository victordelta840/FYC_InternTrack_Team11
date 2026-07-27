import { Inject, Injectable, Logger } from '@nestjs/common';
import { MAIL_PROVIDER, MailProvider } from './mail-provider.interface';

/**
 * Business-facing mail API. Auth (and any future module) depends on
 * this, never on nodemailer or SMTP directly — that indirection lives
 * entirely behind the MailProvider interface, injected via the
 * MAIL_PROVIDER token so the concrete transport is swappable from
 * MailModule alone.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(@Inject(MAIL_PROVIDER) private readonly provider: MailProvider) {}

  async sendPasswordResetEmail(
    to: string,
    firstName: string,
    resetLink: string,
    ttlMinutes: number,
  ): Promise<void> {
    const displayName = firstName?.trim() || 'there';
    const subject = 'Reset your InternTrack password';

    const html = `
      <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; color: #1f2937;">
        <h2 style="color: #111827;">Reset your password</h2>
        <p>Hi ${escapeHtml(displayName)},</p>
        <p>We received a request to reset the password for your InternTrack account.
        This link will expire in ${ttlMinutes} minutes.</p>
        <p style="margin: 24px 0;">
          <a href="${resetLink}"
             style="background: #2563eb; color: #ffffff; padding: 12px 20px; border-radius: 6px; text-decoration: none; display: inline-block;">
            Reset Password
          </a>
        </p>
        <p>If the button above doesn't work, copy and paste this link into your browser:</p>
        <p style="word-break: break-all; font-size: 13px; color: #4b5563;">${resetLink}</p>
        <p>If you did not request a password reset, you can safely ignore this email —
        your password will remain unchanged.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="font-size: 12px; color: #9ca3af;">InternTrack — College Internship Management &amp; Automatic Certification System</p>
      </div>
    `;

    const text = [
      `Hi ${displayName},`,
      '',
      'We received a request to reset the password for your InternTrack account.',
      `This link will expire in ${ttlMinutes} minutes.`,
      '',
      `Reset your password: ${resetLink}`,
      '',
      'If you did not request a password reset, you can safely ignore this email.',
    ].join('\n');

    try {
      await this.provider.send({ to, subject, html, text });
    } catch (err) {
      // Logged with full context here; re-thrown so the caller
      // (AuthService.forgotPassword) can decide the client-facing
      // behavior. AuthService intentionally does NOT let this failure
      // change its response, to avoid leaking account existence and
      // to keep the endpoint resilient to SMTP outages.
      this.logger.error(`sendPasswordResetEmail failed for ${to}: ${(err as Error).message}`);
      throw err;
    }
  }
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
