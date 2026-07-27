import { isResendConfigured } from "@/lib/env";
import { ResendEmailProvider } from "@/services/email/resend-provider";
import type { EmailProvider, EmailResult } from "@/services/email/email-provider";

class UnconfiguredEmailProvider implements EmailProvider {
  async send(): Promise<EmailResult> {
    return { ok: false, error: "Email provider is not configured (RESEND_API_KEY missing)." };
  }
}

/** Lazily selects a provider so a missing RESEND_API_KEY never breaks the build. */
export function getEmailProvider(): EmailProvider {
  return isResendConfigured() ? new ResendEmailProvider() : new UnconfiguredEmailProvider();
}

export type { EmailMessage, EmailResult } from "@/services/email/email-provider";
