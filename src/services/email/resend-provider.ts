import { Resend } from "resend";
import { getInquiryFromEmail, getResendApiKey } from "@/lib/env";
import type { EmailMessage, EmailProvider, EmailResult } from "@/services/email/email-provider";

export class ResendEmailProvider implements EmailProvider {
  async send(message: EmailMessage): Promise<EmailResult> {
    try {
      const resend = new Resend(getResendApiKey());
      const fromEmail = getInquiryFromEmail();

      const { data, error } = await resend.emails.send({
        from: `TEN29 Holiday Homes <${fromEmail}>`,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
      }, message.idempotencyKey ? { idempotencyKey: message.idempotencyKey } : undefined);

      if (error) {
        return { ok: false, error: "Email provider rejected delivery. Review configuration and retry safely." };
      }
      if (!data?.id) return { ok: false, error: "Email provider did not confirm acceptance." };
      return { ok: true };
    } catch {
      return { ok: false, error: "Email delivery unavailable. Review configuration and retry safely." };
    }
  }
}
