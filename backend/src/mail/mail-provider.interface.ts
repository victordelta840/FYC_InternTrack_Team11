/**
 * Contract every concrete mail transport must satisfy. Keeping this
 * interface tiny and provider-agnostic is what makes it possible to
 * swap Gmail SMTP for SendGrid/Postmark/SES/etc. later by adding a new
 * class that implements it and rebinding MAIL_PROVIDER in MailModule —
 * with zero changes required in MailService or AuthService.
 */
export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface MailProvider {
  send(message: MailMessage): Promise<void>;
}

/** DI token used to bind whichever MailProvider implementation is active. */
export const MAIL_PROVIDER = Symbol('MAIL_PROVIDER');
