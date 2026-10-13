import { notFound } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatPhp } from "@/types/pricing";
import { retryBookingNotifications } from "./actions";
function expiredRetry(first: string | null): boolean { return !!first && Date.parse(first) < Date.now() - 23 * 60 * 60 * 1000; }
export const dynamic = "force-dynamic";
export default async function RequestDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await createSupabaseServerClient();
  const auth = await client.rpc("is_ten29_admin");
  if (auth.error || auth.data !== true) notFound();
  const { data: request } = await client.from("booking_requests").select("*").eq("id", id).maybeSingle();
  if (!request) notFound();
  const { data: snapshot } = await client.from("website_booking_intakes").select("estimate").eq("request_id", id).maybeSingle();
  const { data: tasks } = await client.from("booking_notification_outbox").select("recipient_kind,status,attempts,first_attempt_at").eq("request_id", id);
  return <section className="space-y-5 rounded-sm border border-border bg-white p-6">
    <h1 className="font-heading text-3xl text-forest">Booking request</h1>
    {request.inquiry_id && <Link className="underline" href={`/admin/inquiries/${request.inquiry_id}`}>Linked enquiry and guest contact details</Link>}
    <p>Request ID: {request.id}</p><p>Source: {request.source} · Request status: {request.status}</p>
    <p>{request.package_code} · {request.overnight_guest_count} overnight guests · Folding foams: {request.folding_foams_requested ? "Requested" : "No"}</p>
    <p>{request.check_in_date} to {request.check_out_date} · Checkout exclusive · Whole property private</p>
    <p>This request does not reserve dates or indicate confirmed occupancy.</p>
    {snapshot && <div><h2 className="font-heading text-xl">Submitted accommodation estimate</h2>
      <p>{formatPhp(snapshot.estimate.estimated_total_centavos)} · {snapshot.estimate.missing_rates ? "Missing nightly rates; owner quotation required" : "Published accommodation estimate"}</p>
      <ul>{snapshot.estimate.nights.map(n => <li key={n.date}>{n.date}: {formatPhp(n.amount_centavos)} · {n.source}</li>)}</ul>
      <p className="break-all text-sm">Rate version: {snapshot.estimate.version || "No published revision"}</p>
      <p>Historical estimate preserved. No quotation, deposit terms or reservation was automatically created.</p></div>}
    <h2 className="font-heading text-xl">Notification tasks</h2>
    {tasks?.map(t => <p key={t.recipient_kind}>{t.recipient_kind}: {t.status} · attempts {t.attempts}
      {expiredRetry(t.first_attempt_at) && t.status !== "SENT"
        ? " · Automatic retry paused outside the provider deduplication window; check delivery before contacting the guest manually." : ""}</p>)}
    <form action={retryBookingNotifications}><input type="hidden" name="request_id" value={id}/>
      <button className="min-h-11 rounded-sm border border-forest px-4">Retry eligible notification tasks</button></form>
    <p className="text-sm">Retries require configured email credentials, respect retry backoff and reuse a provider idempotency key. SENT means the provider accepted the send, not proof of inbox delivery.</p>
  </section>;
}
