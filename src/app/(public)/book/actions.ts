"use server";

import { inquiryFormSchema, isLikelySpam } from "@/lib/validation/inquiry-schema";
import { submitInquiry, InquiryServiceError } from "@/services/inquiry-service";
import type { EnquiryActionState } from "@/app/(public)/book/action-state";

export async function submitInquiryAction(
  _prevState: EnquiryActionState,
  formData: FormData
): Promise<EnquiryActionState> {
  const raw = Object.fromEntries(formData.entries());

  // Honeypot / timing check: silently pretend success so bots gain no signal,
  // and nothing is written to the database. See docs/16_TEST_STRATEGY.md (FR-INQ-008/009).
  if (
    isLikelySpam({
      website: typeof raw.website === "string" ? raw.website : undefined,
      form_rendered_at:
        typeof raw.form_rendered_at === "string" ? Number(raw.form_rendered_at) : undefined,
    })
  ) {
    return { status: "success", referenceCode: "TEN29-PENDING" };
  }

  const parsed = inquiryFormSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return {
      status: "error",
      message: "Please check the highlighted fields and try again.",
      fieldErrors,
    };
  }

  try {
    const inquiry = await submitInquiry(parsed.data);
    return { status: "success", referenceCode: inquiry.reference_code };
  } catch (err) {
    const message =
      err instanceof InquiryServiceError
        ? "TEN29 could not save your enquiry right now. Please try again, or contact TEN29 directly."
        : "Something went wrong. Please try again, or contact TEN29 directly.";
    return { status: "error", message };
  }
}
