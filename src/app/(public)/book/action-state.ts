// Kept out of actions.ts: a "use server" file may only export async
// functions — a plain object constant like this one is not allowed there.
export interface EnquiryActionState {
  status: "idle" | "success" | "error";
  message?: string;
  referenceCode?: string;
  fieldErrors?: Record<string, string>;
}

export const initialEnquiryState: EnquiryActionState = { status: "idle" };
