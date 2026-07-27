"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  updateInquiryStatus as updateInquiryStatusService,
  updateInquiryNotes as updateInquiryNotesService,
  InquiryServiceError,
} from "@/services/inquiry-service";
import { getAdminUser } from "@/lib/supabase/get-admin-user";
import type { InquiryStatus } from "@/types/inquiry";
import { INQUIRY_STATUSES } from "@/types/inquiry";
import type { AdminActionState } from "@/app/admin/(protected)/action-state";

async function requireAdmin() {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");
  return user;
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

export async function updateInquiryStatusAction(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const user = await requireAdmin();
  const id = String(formData.get("id") || "");
  const nextStatus = String(formData.get("status") || "");

  if (!id || !INQUIRY_STATUSES.includes(nextStatus as InquiryStatus)) {
    return { status: "error", message: "Invalid status update." };
  }

  try {
    const client = await createSupabaseServerClient();
    await updateInquiryStatusService(client, id, nextStatus as InquiryStatus, user.email ?? user.id);
    return { status: "success", message: "Status updated." };
  } catch (err) {
    const message = err instanceof InquiryServiceError ? err.message : "Failed to update status.";
    return { status: "error", message };
  }
}

export async function updateInquiryNotesAction(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const user = await requireAdmin();
  const id = String(formData.get("id") || "");
  const notes = String(formData.get("owner_notes") || "");

  if (!id) {
    return { status: "error", message: "Invalid note update." };
  }

  try {
    const client = await createSupabaseServerClient();
    await updateInquiryNotesService(client, id, notes, user.email ?? user.id);
    return { status: "success", message: "Notes saved." };
  } catch (err) {
    const message = err instanceof InquiryServiceError ? err.message : "Failed to save notes.";
    return { status: "error", message };
  }
}
