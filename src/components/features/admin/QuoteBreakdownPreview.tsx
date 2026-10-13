"use client";
import { useState, useTransition } from "react";
import { loadQuotePreview } from "@/app/admin/(protected)/rates/actions";
import { formatPhp, type QuoteBreakdown } from "@/types/pricing";
import { CtaButton } from "@/components/ui/CtaButton";
import { INPUT_CLASSES } from "@/components/ui/FormField";
export type QuoteChoice = { id: string; revision: number; status: string; request_id: string };
export function QuoteBreakdownPreview({ quotes }: { quotes: QuoteChoice[] }) {
  const [id, setId] = useState(quotes[0]?.id ?? "");
  const [quote, setQuote] = useState<QuoteBreakdown | null>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return <section className="mt-12 rounded-sm border border-border bg-white p-4 sm:p-6" aria-labelledby="quote-preview-title">
    <h2 id="quote-preview-title" className="text-2xl text-forest">Quotation breakdown preview</h2>
    <p className="mt-2 text-sm text-muted">Private booking arrangements are separate from public nightly rates. Issued quotes retain their recorded prices.</p>
    {quotes.length === 0 ? <p className="mt-4">No quotations recorded yet. The per-booking adjustment editor is a future feature.</p> : <>
      <label className="mt-4 block" htmlFor="quote-choice">Recorded quotation</label>
      <select id="quote-choice" className={INPUT_CLASSES} value={id} onChange={(e) => { setId(e.target.value); setQuote(null); }}>
        {quotes.map((q) => <option key={q.id} value={q.id}>{q.request_id.slice(0, 8)} · Revision {q.revision} · {q.status}</option>)}
      </select>
      <CtaButton className="mt-3" disabled={pending} onClick={() => start(async () => {
        setError(""); const response = await loadQuotePreview(id);
        if (response.error) setError(response.error); else setQuote(response.data!);
      })}>{pending ? "Loading quotation…" : "Preview quotation"}</CtaButton>
    </>}
    {error && <p role="alert" className="mt-4 text-danger">{error}</p>}
    {quote && <div className="mt-6 space-y-6" data-testid="quote-breakdown">
      <div><h3 className="text-xl">Booking details</h3><p className="break-all">Reference: {quote.booking.reference}</p>
        <p>Revision {quote.revision} · {quote.status}</p><p>{quote.booking.bedrooms_opened} bedrooms · {quote.booking.guest_count ?? "Unrecorded"} guests</p>
        <p>Rooms {Array.from({ length: quote.booking.bedrooms_opened }, (_, i) => i + 1).join(", ")} opened. One exclusive private house.</p>
        <p>{quote.booking.check_in_date} to {quote.booking.check_out_date} · {quote.booking.nights} nights</p>
      </div>
      <div><h3 className="text-xl">Accommodation charges</h3>
        {quote.legacy && <p className="text-warning">Historical aggregate quote: nightly itemization and adjustment allocation were not recorded. No breakdown is inferred.</p>}
        <ul>{quote.accommodation.nights.map((night) => <li key={night.date} className="flex flex-wrap justify-between gap-2 border-b border-border py-2">
          <span>{night.date} · {night.source}<small className="block break-all text-muted">{night.rate_revision_id ? `Rate revision ${night.rate_revision_id}` : "Owner-approved manual nightly rate"}</small></span>
          <span>{formatPhp(night.amount_centavos)}</span>
        </li>)}</ul><p className="mt-3">Accommodation subtotal: {formatPhp(quote.accommodation.subtotal_centavos)}</p>
      </div>
      <div><h3 className="text-xl">Booking adjustments</h3>
        {quote.adjustments.length === 0 ? <p>No recorded adjustments.</p> : <ul>{quote.adjustments.map((a, index) => <li key={index} className="border-b border-border py-2">
          {a.description} · {a.type} · {a.quantity} × {formatPhp(a.unit_amount_centavos)} = {formatPhp(a.line_total_centavos)}
          <small className="block break-all">{a.status} · Owner {a.approved_by} · {a.approved_at} · {a.reason}</small>
        </li>)}</ul>}
        <p>Approved additional charges: {quote.additional_charges_centavos === null ? "Unrecorded" : formatPhp(quote.additional_charges_centavos)}</p>
        <p>Approved discounts (reduction): {quote.discounts_centavos === null ? "Unrecorded" : formatPhp(quote.discounts_centavos)}</p>
        <p className="mt-3 font-semibold">Final quoted accommodation total: {formatPhp(quote.final_total_centavos)}</p>
      </div>
      <div><h3 className="text-xl">Payment summary</h3>
        <p>Required booking down payment: {quote.payment.required_down_payment_centavos === null ? "Not approved" : formatPhp(quote.payment.required_down_payment_centavos)}</p>
        <p>Verified payments received: {formatPhp(quote.verified_payments_centavos)}</p>
        <p>Remaining accommodation balance: {formatPhp(quote.remaining_balance_centavos)}</p>
        {!!quote.overpayment_centavos && <p>Overpayment requiring owner resolution: {formatPhp(quote.overpayment_centavos)}</p>}
        <p>Refundable security deposit (separate): {quote.payment.refundable_security_deposit_centavos === null ? "Not approved or recorded" : formatPhp(quote.payment.refundable_security_deposit_centavos)}</p>
        <p className="mt-2 text-sm text-muted">Down payment is applied toward the accommodation obligation; it is not an extra charge. A separately recorded refundable security deposit is excluded from the accommodation total.</p>
        {quote.payment.conditions && <p>Payment conditions: {quote.payment.conditions}</p>}
      </div>
    </div>}
  </section>;
}
