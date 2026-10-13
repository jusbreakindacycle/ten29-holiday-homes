"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { deliverBookingNotifications } from "@/services/guest-booking-service";
export async function retryBookingNotifications(form: FormData): Promise<void> {
  const id = z.string().uuid().parse(form.get("request_id"));
  const client = await createSupabaseServerClient();
  const { data, error } = await client.rpc("is_ten29_admin");
  if (error || data !== true) throw new Error("TEN29 authorization required");
  const result = await client.from("booking_requests").select("id").eq("id", id).maybeSingle();
  if (!result.data || result.error) throw new Error("Request unavailable");
  await deliverBookingNotifications(id);
  revalidatePath(`/admin/requests/${id}`);
}
