"use server";

import { inquiryFormSchema, isLikelySpam } from "@/lib/validation/inquiry-schema";
import { submitInquiry, InquiryServiceError } from "@/services/inquiry-service";
import type { EnquiryActionState } from "@/app/(public)/book/action-state";

export async function submitInquiryAction(
  _prevState: EnquiryActionState,
  formData: FormData
): Promise<EnquiryActionState> {
  const raw = Object.fromEntries(formData.entries());

  // Retained compatibility action: never manufacture success for unsaved submissions.
  if (isLikelySpam({ website: typeof raw.website === "string" ? raw.website : undefined })) {
    return { status: "error", message: "Enquiry not saved. Reload or contact TEN29." };
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
