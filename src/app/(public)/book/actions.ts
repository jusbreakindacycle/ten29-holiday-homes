"use server";
import type { EnquiryActionState } from "./action-state";
// Retired cached forms cannot create orphan enquiries or fabricate success.
export async function submitInquiryAction(_previous: EnquiryActionState, _form: FormData): Promise<EnquiryActionState> {
  void _previous; void _form;
  return { status: "error", message: "Reload the booking page to use the current Request to Book form. No request was saved." };
}
