// Kept out of actions.ts: a "use server" file may only export async
// functions — a plain object constant like this one is not allowed there.
export interface AdminActionState {
  status: "idle" | "success" | "error";
  message?: string;
}

export const initialAdminActionState: AdminActionState = { status: "idle" };
