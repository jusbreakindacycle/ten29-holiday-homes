"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { BOOKING_PACKAGE_CODES, recommendBookingPackage, type BookingPackageCode } from "@/types/booking";
import { addDays, calendarDate, formatPhp, nightDates, type PublicPriceEstimate } from "@/types/pricing";
import { manilaToday, type BookingReceipt } from "@/types/guest-booking";
import { INPUT_CLASSES } from "@/components/ui/FormField";

type CalendarData = { estimate: PublicPriceEstimate; unavailable: Array<{ check_in_date: string; check_out_date: string }> };
const button = "min-h-11 rounded-sm border border-forest px-4 py-2 text-sm text-forest disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-gold";
const subscribe = () => () => {};
function nextMonth(month: string, offset: number): string { const d = new Date(`${month}-01T00:00:00Z`); d.setUTCMonth(d.getUTCMonth() + offset); return d.toISOString().slice(0, 7); }
export function BookingJourney({ availabilityOnly = false, initial = {}, utm = {} }: {
  availabilityOnly?: boolean; initial?: Record<string, string | undefined>; utm?: Record<string, string | undefined>;
}) {
  const [adults, setAdults] = useState(Number(initial.adults) || 1);
  const [children, setChildren] = useState(Number(initial.children) || 0);
  const [pkg, setPkg] = useState<BookingPackageCode>(BOOKING_PACKAGE_CODES.includes(initial.package_code as BookingPackageCode) ? initial.package_code as BookingPackageCode : "WHOLE_HOME_1BR");
  const [foams, setFoams] = useState(initial.folding_foams_requested === "true");
  const [start, setStart] = useState(calendarDate.safeParse(initial.check_in_date).success ? initial.check_in_date! : "");
  const [end, setEnd] = useState(calendarDate.safeParse(initial.check_out_date).success ? initial.check_out_date! : "");
  const [month, setMonth] = useState((calendarDate.safeParse(initial.check_in_date).success ? initial.check_in_date! : manilaToday()).slice(0, 7));
  const [monthData, setMonthData] = useState<CalendarData | null>(null);
  const [stay, setStay] = useState<CalendarData | null>(null);
  const [reviewed, setReviewed] = useState<PublicPriceEstimate | null>(null);
  const [calendarError, setCalendarError] = useState("");
  const [message, setMessage] = useState("");
  const [changed, setChanged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState("");
  const [sessionRetry, setSessionRetry] = useState(0);
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const [receipt, setReceipt] = useState<BookingReceipt | null>(null);
  const [retry, setRetry] = useState(0);
  const calendarRef = useRef<HTMLDivElement>(null); const pendingFocus = useRef("");
  const guests = adults + children;
  const recommendation = recommendBookingPackage(guests);
  const rooms = BOOKING_PACKAGE_CODES.indexOf(pkg) + 1;
  const eligible = !!recommendation && rooms >= BOOKING_PACKAGE_CODES.indexOf(recommendation.packageCode) + 1 && (guests <= 6 || foams);
  const nights = nightDates(start, end);
  function resetEstimate() { setStay(null); setReviewed(null); setChanged(false); setMessage(""); }
  function changeCount(a: number, c: number) {
    setAdults(a); setChildren(c); resetEstimate(); setMonthData(null);
    const r = recommendBookingPackage(a + c);
    if (r && BOOKING_PACKAGE_CODES.indexOf(pkg) < BOOKING_PACKAGE_CODES.indexOf(r.packageCode)) {
      setPkg(r.packageCode); setMessage(`Your previous package cannot accommodate this group. Selected ${BOOKING_PACKAGE_CODES.indexOf(r.packageCode) + 1} bedrooms.`);
    }
    if (r?.foldingFoamsRequested) setFoams(true);
  }
  useEffect(() => {
    if (availabilityOnly) return;
    fetch("/api/booking-session", { cache: "no-store" }).then(r => { if (!r.ok) throw new Error(); setSessionReady(true); setSessionError(""); })
      .catch(() => setSessionError("Secure request session could not start. Retry or contact TEN29."));
  }, [availabilityOnly, sessionRetry]);
  useEffect(() => {
    if (!eligible || !/^\d{4}-\d{2}$/.test(month)) return;
    const abort = new AbortController();
    const selection = { package_code: pkg, overnight_guest_count: String(guests), folding_foams_requested: String(foams) };
    const read = async (from: string, to: string): Promise<CalendarData> => {
      const response = await fetch(`/api/booking-calendar?${new URLSearchParams({ ...selection, check_in_date: from, check_out_date: to })}`, { cache: "no-store", signal: abort.signal });
      if (!response.ok) throw new Error(); return response.json();
    };
    read(`${month}-01`, `${nextMonth(month, 1)}-01`).then(v => { if (!abort.signal.aborted) { setMonthData(v); setCalendarError("");
      if (pendingFocus.current) requestAnimationFrame(() => { calendarRef.current?.querySelector<HTMLButtonElement>(`[data-date="${pendingFocus.current}"]`)?.focus(); pendingFocus.current = ""; });
    } })
      .catch(() => { if (!abort.signal.aborted) setCalendarError("Calendar could not load. Retry; availability has not been verified."); });
    if (nights.length > 0 && nights.length <= 366) read(start, end).then(v => {
      if (!abort.signal.aborted) { setStay(v); setReviewed(v.estimate); }
    }).catch(() => { if (!abort.signal.aborted) setCalendarError("Could not verify your selected stay. Retry before submitting."); });
    return () => abort.abort();
  }, [pkg, guests, foams, month, start, end, retry, eligible, nights.length]);
  function pick(day: string) {
    resetEstimate();
    if (!start || end || day <= start) { setStart(day); setEnd(""); }
    else setEnd(day);
  }
  function keyboard(event: React.KeyboardEvent<HTMLButtonElement>, day: string) {
    const move = ({ ArrowRight: 1, ArrowLeft: -1, ArrowDown: 7, ArrowUp: -7 } as Record<string, number>)[event.key];
    if (!move) return; event.preventDefault(); const target = addDays(day, move);
    if (target.slice(0, 7) !== month) { pendingFocus.current = target; setMonthData(null); setMonth(target.slice(0, 7)); }
    else calendarRef.current?.querySelector<HTMLButtonElement>(`[data-date="${target}"]`)?.focus();
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage("");
    if (!reviewed || !stay || !eligible || changed) { setMessage("Review the current dates and estimate before submitting."); return; }
    const f = new FormData(event.currentTarget);
    const payload = { full_name: String(f.get("full_name") || ""), mobile_number: String(f.get("mobile_number") || ""), email: String(f.get("email") || ""),
      adults, children, day_visitors: Number(f.get("day_visitors") || 0), vehicles: Number(f.get("vehicles") || 0),
      package_code: pkg, folding_foams_requested: foams, check_in_date: start, check_out_date: end,
      privacy_consent: f.get("privacy_consent") === "on", message: String(f.get("message") || ""), purpose_of_stay: String(f.get("purpose_of_stay") || ""),
      utm_source: utm.utm_source || "", utm_medium: utm.utm_medium || "", utm_campaign: utm.utm_campaign || "",
      website: String(f.get("website") || ""), reviewed_estimate: reviewed };
    const { reviewed_estimate: _estimate, ...identity } = payload;
    void _estimate;
    // Session storage retains only a digest, retry key and non-contact estimate.
    // Refresh/lost-response retries use the exact original reviewed snapshot.
    setBusy(true);
    let digest: string;
    try { digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(identity))))).map(v => v.toString(16).padStart(2, "0")).join(""); }
    catch { setBusy(false); setMessage("Use a secure browser connection to submit, or contact TEN29."); return; }
    let saved: { digest: string; key: string; estimate: PublicPriceEstimate } | null = null;
    try { saved = JSON.parse(sessionStorage.getItem("ten29-request-retry") || "null"); } catch { /* Start a fresh bounded attempt. */ }
    const attempt = saved?.digest === digest ? saved : { digest, key: crypto.randomUUID(), estimate: reviewed };
    try { sessionStorage.setItem("ten29-request-retry", JSON.stringify(attempt)); } catch { setBusy(false); setMessage("Enable session storage to submit with safe refresh/retry protection, or contact TEN29."); return; }
    try {
      const response = await fetch("/api/booking-request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, reviewed_estimate: attempt.estimate, idempotency_key: attempt.key }) });
      const result = await response.json();
      if (response.ok && result.outcome === "SAVED") { setReceipt(result); return; }
      if (result.outcome === "PRICE_CHANGED") {
        setReviewed(result.estimate); setChanged(true); setMessage("Published prices changed. Review the updated nightly breakdown and acknowledge it before continuing.");
        sessionStorage.setItem("ten29-request-retry", JSON.stringify({ ...attempt, estimate: result.estimate }));
      } else if (result.outcome === "UNAVAILABLE") {
        setMonthData(null); setStay(null); setReviewed(null); setRetry(v => v + 1); setMessage("These dates became unavailable. Choose another stay; no request was saved.");
      } else setMessage(result.error || (response.status === 429 ? "Too many requests. Please wait before retrying, or contact TEN29." : "Request was not saved. Retry or contact TEN29."));
    } catch { setMessage("Connection interrupted. Retry with the same details to recover the saved request safely."); }
    finally { setBusy(false); }
  }
  if (receipt) return <section role="status" className="rounded-sm border border-forest bg-white p-6 space-y-3">
    <h2 className="font-heading text-2xl text-forest">Request received</h2><p className="break-all">Reference: <strong>{receipt.reference_code}</strong></p>
    <p>{receipt.overnight_guest_count} overnight guests · {BOOKING_PACKAGE_CODES.indexOf(receipt.package_code) + 1} bedrooms · one private house</p>
    <p>{receipt.check_in_date} to {receipt.check_out_date}</p><p>Estimated accommodation: {formatPhp(receipt.estimate.estimated_total_centavos)}</p>
    <p>Your request is safely saved. A notification task was recorded; this acknowledgement does not verify email delivery.</p>
    <p className="font-semibold">Dates are not reserved. The owner will review availability and final pricing.</p>
    <p>A reservation requires an owner-issued quotation, the owner’s approved down-payment conditions, independently verified receipt of payment and successful owner-authorized confirmation. Do not send payment until those terms are agreed.</p>
  </section>;
  const blockedStay = (stay?.unavailable.length ?? 0) > 0;
  const days = nightDates(`${month}-01`, `${nextMonth(month, 1)}-01`);
  const offset = new Date(`${month}-01T00:00:00Z`).getUTCDay();
  return <form onSubmit={submit} className="space-y-6" aria-label="Request to Book">
    <fieldset disabled={busy || !hydrated} className="space-y-6 min-w-0">
      <section className="rounded-sm border border-border bg-white p-4 sm:p-6 space-y-4">
        <h2 className="font-heading text-2xl text-forest">One private house. Choose how many bedrooms you&apos;d like opened.</h2>
        <p>Every package gives your group exclusive use of the whole house and approved common areas.</p>
        <div className="grid grid-cols-2 gap-3">
          <label htmlFor="adults">Adults staying overnight<input id="adults" type="number" min="1" max="8" required value={adults} onChange={e => changeCount(Number(e.target.value), children)} className={INPUT_CLASSES}/></label>
          <label htmlFor="children">Children staying overnight<input id="children" type="number" min="0" max="7" value={children} onChange={e => changeCount(adults, Number(e.target.value))} className={INPUT_CLASSES}/></label>
        </div>
        <p aria-live="polite"><strong>{guests} overnight guests in total.</strong> All overnight people are included in the eight-person maximum; no child discounts or extra fees are assumed.</p>
        {!recommendation && <p role="alert">Choose between 1 and 8 overnight guests.</p>}
        <div><label htmlFor="package_code">Bedroom package</label><select id="package_code" value={pkg} onChange={e => { setPkg(e.target.value as BookingPackageCode); setFoams(guests > 6); setMonthData(null); resetEstimate(); }} className={INPUT_CLASSES}>
          {BOOKING_PACKAGE_CODES.map((code, i) => <option key={code} value={code} disabled={!recommendation || i < BOOKING_PACKAGE_CODES.indexOf(recommendation.packageCode)}>{i + 1} bedroom{ i ? "s" : ""} · Whole private house</option>)}
        </select></div>
        <p>Rooms {Array.from({ length: rooms }, (_, i) => i + 1).join(", ")} opened.{rooms < 3 ? " Other bedrooms remain locked." : " All three bedrooms opened."}</p>
        <p className="text-sm text-muted">Room 1: queen-size bed.{rooms > 1 ? " Room 2: twin-size bedding." : ""}{rooms > 2 ? " Room 3: single-size double-deck bed." : ""}</p>
        {pkg === "WHOLE_HOME_3BR" && <label className="flex items-start gap-3 min-h-11"><input type="checkbox" checked={foams} required={guests > 6} onChange={e => { setFoams(e.target.checked); setMonthData(null); resetEstimate(); }} className="mt-1 h-5 w-5"/>Additional folding foams (up to two). Required for 7–8 guests. No automatic fee.</label>}
      </section>
      <section className="rounded-sm border border-border bg-white p-2 sm:p-6 space-y-4">
        <h2 className="font-heading text-2xl text-forest">Choose your requested dates</h2>
        <p>Check-in from 3:00 PM · Check-out before 12:00 PM · Asia/Manila.</p>
        <div className="flex items-center justify-between gap-2"><button type="button" className={button} aria-label="Previous month" onClick={() => { setMonthData(null); setMonth(nextMonth(month, -1)); }}>←</button>
          <label className="min-w-0">Calendar month<input type="month" value={month} onChange={e => { if (e.target.value) { setMonthData(null); setMonth(e.target.value); } }} className={INPUT_CLASSES}/></label>
          <button type="button" className={button} aria-label="Next month" onClick={() => { setMonthData(null); setMonth(nextMonth(month, 1)); }}>→</button></div>
        <p className="text-sm">Select check-in, then checkout. Prices are PHP per whole-house package per night. Unavailable nights cannot be requested; checkout may coincide with another stay’s check-in.</p>
        {calendarError && <div role="alert"><p>{calendarError}</p><button type="button" className={button} onClick={() => { setMonthData(null); resetEstimate(); setRetry(v => v + 1); }}>Retry calendar</button></div>}
        {!monthData && !calendarError && <p role="status">{eligible ? "Loading current availability and prices…" : "Choose an eligible package and bedding to load dates."}</p>}
        <div ref={calendarRef} className="grid grid-cols-7 gap-1" aria-label="Booking dates">
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => <span key={d} className="text-center text-xs">{d}</span>)}
          {Array.from({ length: offset }, (_, i) => <span key={`empty${i}`}/>)}
          {days.map(day => { const unavailable = !!monthData?.unavailable.some(b => b.check_in_date <= day && day < b.check_out_date);
            const amount = monthData?.estimate.nights.find(n => n.date === day)?.amount_centavos ?? null;
            const selected = !!start && day >= start && day <= (end || start);
            const unavailableChoice = unavailable && (!start || !!end || day <= start);
            return <button key={day} type="button" data-date={day} onClick={() => { if (unavailableChoice) setMessage("This night is unavailable. Choose another check-in."); else pick(day); }} onKeyDown={e => keyboard(e, day)}
              disabled={!monthData || day < manilaToday()} aria-disabled={unavailableChoice}
              aria-pressed={selected} aria-label={`${day}, ${unavailable ? "unavailable overnight; checkout only" : "requestable"}, ${formatPhp(amount)}`}
              className={`min-h-16 min-w-0 rounded-sm border p-0.5 text-left focus-visible:outline-2 focus-visible:outline-gold ${selected ? "border-forest bg-forest text-white" : unavailable ? "border-border bg-gray-100 text-muted" : "border-border bg-sand/40"} disabled:opacity-60`}>
              <span className="block text-sm font-semibold">{Number(day.slice(-2))}</span><span className="block break-words text-[10px] leading-tight">{unavailable ? "Unavailable" : amount === null ? "Quote" : formatPhp(amount).replace("PHP ", "")}</span>
            </button>; })}
        </div>
        <div className="grid gap-3 sm:grid-cols-2"><label htmlFor="check_in_date">Check-in date<input id="check_in_date" type="date" required value={start} min={manilaToday()} onChange={e => { setStart(e.target.value); resetEstimate(); }} className={INPUT_CLASSES}/></label>
          <label htmlFor="check_out_date">Check-out date<input id="check_out_date" type="date" required value={end} min={start || manilaToday()} onChange={e => { setEnd(e.target.value); resetEstimate(); }} className={INPUT_CLASSES}/></label></div>
        {blockedStay && <p role="alert">This stay includes unavailable nights. Choose different dates.</p>}
        {start && end && !nights.length && <p role="alert">Checkout must be after check-in.</p>}
      </section>
      {reviewed && <section className="rounded-sm border border-border bg-white p-4 space-y-3" aria-label="Accommodation estimate">
        <h2 className="font-heading text-xl text-forest">Your requested stay</h2><p>{guests} guests · {rooms} bedrooms · {start} to {end} · {nights.length} nights</p>
        <ul className="space-y-2">{reviewed.nights.map(n => <li key={n.date} className="flex flex-wrap justify-between gap-2 border-b border-border pb-2"><span>{n.date}<small className="block text-muted">{n.source}</small></span><strong>{formatPhp(n.amount_centavos)}</strong></li>)}</ul>
        <p>Accommodation subtotal: {formatPhp(reviewed.accommodation_subtotal_centavos)}</p><p className="font-semibold">Estimated accommodation total: {formatPhp(reviewed.estimated_total_centavos)}</p>
        {reviewed.missing_rates && <p>Request a quote. Some nightly prices are unpublished. The owner will provide the final quotation; no amount is assumed for missing nights.</p>}
        <p className="text-sm">This is an accommodation estimate, not an owner-issued quotation or payment obligation. No additional charges are automatically included.</p>
        {changed && <button type="button" className={button} onClick={() => { setChanged(false); setMessage("Updated estimate acknowledged. You can now submit your request."); }}>I acknowledge the updated estimate</button>}
      </section>}
      {availabilityOnly ? <Link className={`${button} inline-block`} href={`/book?${new URLSearchParams({ adults: String(adults), children: String(children), package_code: pkg, folding_foams_requested: String(foams), check_in_date: start, check_out_date: end })}`}>Continue to Request to Book</Link> : <section className="rounded-sm border border-border bg-white p-4 sm:p-6 space-y-4">
        <h2 className="font-heading text-2xl text-forest">Your details</h2>
        <label htmlFor="full_name">Full name<input id="full_name" name="full_name" required autoComplete="name" minLength={2} maxLength={120} className={INPUT_CLASSES}/></label>
        <label htmlFor="mobile_number">Mobile number<input id="mobile_number" name="mobile_number" required type="tel" autoComplete="tel" minLength={7} maxLength={20} className={INPUT_CLASSES}/></label>
        <label htmlFor="email">Email (optional)<input id="email" name="email" type="email" autoComplete="email" maxLength={254} className={INPUT_CLASSES}/></label>
        <div className="grid grid-cols-2 gap-3"><label htmlFor="day_visitors">Day visitors (separate)<input id="day_visitors" name="day_visitors" type="number" min={0} defaultValue={0} className={INPUT_CLASSES}/></label>
          <label htmlFor="vehicles">Vehicles (information only)<input id="vehicles" name="vehicles" type="number" min={0} defaultValue={0} className={INPUT_CLASSES}/></label></div>
        <p className="text-sm">Visitor arrangements and parking needs are subject to owner review. No visitor charges or vehicle-capacity promise is assumed.</p>
        <label htmlFor="purpose_of_stay">Purpose of stay<input id="purpose_of_stay" name="purpose_of_stay" maxLength={200} className={INPUT_CLASSES}/></label>
        <label htmlFor="message">Message or requests<textarea id="message" name="message" rows={3} maxLength={1000} className={INPUT_CLASSES}/></label>
        <label className="flex gap-3 min-h-11" htmlFor="privacy_consent"><input id="privacy_consent" name="privacy_consent" type="checkbox" required className="mt-1 h-5 w-5 shrink-0"/><span>I agree to the <Link href="/privacy" className="underline">privacy notice</Link> and understand this is a request, not a confirmed reservation.</span></label>
        {sessionError && <div role="alert"><p>{sessionError}</p><button type="button" className={button} onClick={() => setSessionRetry(v => v + 1)}>Retry secure session</button></div>}
        {!sessionReady && !sessionError && <p role="status">Preparing a secure request session…</p>}
        <div aria-hidden="true" className="absolute left-[-9999px] h-0 overflow-hidden"><label htmlFor="website">Leave empty</label><input id="website" name="website" tabIndex={-1} autoComplete="off"/></div>
        <button type="submit" className={`${button} bg-forest text-white w-full`} disabled={busy || changed || !sessionReady || !reviewed || !stay || blockedStay || !eligible} aria-busy={busy}>{busy ? "Saving your request…" : "Request to Book — Send Enquiry"}</button>
      </section>}
    </fieldset>
    {message && <p role="alert" className="rounded-sm border border-gold bg-sand p-4">{message}</p>}
    <p className="text-sm">Selecting dates or submitting a request does not place a hold or create a reservation. Pending requests do not reserve the house.</p>
  </form>;
}
