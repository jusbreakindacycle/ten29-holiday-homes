import { Resend } from "resend";
import { getResendApiKey } from "@/lib/env";
import type { EmailMessage, EmailProvider, EmailResult } from "@/services/email/email-provider";

export class ResendEmailProvider implements EmailProvider {
  async send(message: EmailMessage): Promise<EmailResult> {
    try {
      const resend = new Resend(getResendApiKey());
      const fromEmail = process.env.INQUIRY_FROM_EMAIL || "bookings@ten29holidayhomes.com";

      const { error } = await resend.emails.send({
        from: `TEN29 Holiday Homes <${fromEmail}>`,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
      });

      if (error) {
        return { ok: false, error: error.message ?? "Resend returned an error" };
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Unknown email error" };
    }
  }
}
