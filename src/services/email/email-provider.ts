export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export type EmailResult = { ok: true } | { ok: false; error: string };

/** Isolates the email provider so Resend can be swapped without touching callers. */
export interface EmailProvider {
  send(message: EmailMessage): Promise<EmailResult>;
}
