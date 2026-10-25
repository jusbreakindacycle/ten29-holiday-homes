"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {OWNER_POLICY_VERSION, occupancy, PACKAGE_POLICY} from "@/types/owner-policy";
import {referencesHouseRules} from '@/lib/nonstored-rules';
import { BOOKING_PACKAGE_CODES, recommendBookingPackage, type BookingPackageCode } from "@/types/booking";
import { addDays, calendarDate, nightDates, publicPromotionTeaserSchema, type PublicPromotionTeaser } from "@/types/pricing";
import { manilaToday, type BookingAcknowledgement } from "@/types/guest-booking";
import { INPUT_CLASSES } from "@/components/ui/FormField";

type CalendarData = { unavailable: Array<{ check_in_date: string; check_out_date: string }> };
const button = "min-h-11 rounded-sm border border-forest px-4 py-2 text-sm text-forest disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-gold";
const subscribe = () => () => {};
function nextMonth(month: string, offset: number): string { const d = new Date(`${month}-01T00:00:00Z`); d.setUTCMonth(d.getUTCMonth() + offset); return d.toISOString().slice(0, 7); }
function formatTeaserPrice(amount: number): string {
  if (!Number.isSafeInteger(amount) || amount < 0) return "Price unavailable";
  return `₱${(amount / 100).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
export function BookingJourney({ initial = {}, utm = {} }: {
  initial?: Record<string, string | undefined>; utm?: Record<string, string | undefined>;
}) {
  const [adults, setAdults] = useState(Number(initial.adults) || 1);
  const [children, setChildren] = useState(Number(initial.children) || 0);
  const [young, setYoung] = useState(Number(initial.young_children) || 0);
  const [pkg, setPkg] = useState<BookingPackageCode>(BOOKING_PACKAGE_CODES.includes(initial.package_code as BookingPackageCode) ? initial.package_code as BookingPackageCode : "WHOLE_HOME_1BR");
  const [foams, setFoams] = useState(initial.folding_foams_requested === "true");
  const [explicitExtra, setExplicitExtra] = useState(initial.folding_foams_requested === "true");
  const [start, setStart] = useState(calendarDate.safeParse(initial.check_in_date).success ? initial.check_in_date! : "");
  const [end, setEnd] = useState(calendarDate.safeParse(initial.check_out_date).success ? initial.check_out_date! : "");
  const [month, setMonth] = useState((calendarDate.safeParse(initial.check_in_date).success ? initial.check_in_date! : manilaToday()).slice(0, 7));
  const [monthData, setMonthData] = useState<CalendarData | null>(null);
  const [stay, setStay] = useState<CalendarData | null>(null);
  const [promotion, setPromotion] = useState<PublicPromotionTeaser | null>(null);
  const [promotionSelection, setPromotionSelection] = useState("");
  const [promotionFailedSelection, setPromotionFailedSelection] = useState("");
  const [promotionRetry, setPromotionRetry] = useState(0);
  const [calendarError, setCalendarError] = useState("");
  const [message, setMessage] = useState("");

  const [busy, setBusy] = useState(false);
  const [mobileNumber,setMobileNumber]=useState("");
  const [mobileError,setMobileError]=useState("");
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState("");
  const [sessionRetry, setSessionRetry] = useState(0);
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const [receipt, setReceipt] = useState<BookingAcknowledgement | null>(null);
  const [retry, setRetry] = useState(0);
  const calendarRef = useRef<HTMLDivElement>(null); const pendingFocus = useRef("");
  const submitLock=useRef(false); const mobileInputRef=useRef<HTMLInputElement>(null);
  const guests = adults + children;
  const recommendation = recommendBookingPackage(guests);
  const rooms = BOOKING_PACKAGE_CODES.indexOf(pkg) + 1;
  const counts = occupancy(adults, children, young, pkg);
  const eligible = !!recommendation && counts.eligible && (counts.extraRequested === 0 || foams);
  const nights = nightDates(start, end);
  const currentPromotionSelection = `${pkg}:${start}:${end}`;
  const promotionReady = promotionSelection === currentPromotionSelection;
  const blockedStay = (stay?.unavailable.length ?? 0) > 0;
  const hasValidStaySelection = start >= manilaToday() && end > start && nights.length > 0 && nights.length <= 366 && eligible;
  const stayQuery = new URLSearchParams({
    adults: String(adults), children: String(children), young_children: String(young),
    package_code: pkg, folding_foams_requested: String(foams), check_in_date: start, check_out_date: end,
    ...(utm.utm_source ? { utm_source: utm.utm_source } : {}),
    ...(utm.utm_medium ? { utm_medium: utm.utm_medium } : {}),
    ...(utm.utm_campaign ? { utm_campaign: utm.utm_campaign } : {}),
  }).toString();
  function resetEstimate() { setStay(null); setMessage(""); }
  function changeCount(a: number, c: number) {
    setAdults(a); setChildren(c); resetEstimate(); setMonthData(null);
    const r = recommendBookingPackage(a + c);
    const changePackage = r && (a + c > PACKAGE_POLICY[pkg].maximum || (!explicitExtra && a + c > PACKAGE_POLICY[pkg].included && BOOKING_PACKAGE_CODES.indexOf(pkg) < BOOKING_PACKAGE_CODES.indexOf(r.packageCode)));
    if (changePackage && r) {
      setPkg(r.packageCode); setMessage(`Recommended package selected for this count; an eligible extra-guest arrangement may be explicitly requested. Selected ${BOOKING_PACKAGE_CODES.indexOf(r.packageCode) + 1} bedrooms.`);
    }
    setFoams(a + c > PACKAGE_POLICY[changePackage && r ? r.packageCode : pkg].included);
  }
  useEffect(() => {
    if (!hasValidStaySelection) return;
    fetch("/api/booking-session", { cache: "no-store" }).then(r => { if (!r.ok) throw new Error(); setSessionReady(true); setSessionError(""); })
      .catch(() => setSessionError("Secure request session could not start. Retry or contact TEN29."));
  }, [hasValidStaySelection, sessionRetry]);
  useEffect(() => {
    if (!eligible || !/^\d{4}-\d{2}$/.test(month)) return;
    const abort = new AbortController();
    const selection = { package_code: pkg, overnight_guest_count: String(guests), folding_foams_requested: String(foams) };
    const read = async (from: string, to: string): Promise<CalendarData> => {
      const response = await fetch(`/api/booking-calendar?${new URLSearchParams({ ...selection, check_in_date: from, check_out_date: to })}`, { cache: "no-store", signal: abort.signal });
      if (!response.ok) throw new Error();
      const body: unknown = await response.json();
      if (!body || typeof body !== 'object' || !('unavailable' in body) || !Array.isArray(body.unavailable)
        || body.unavailable.some(range => !range || typeof range !== 'object'
          || !('check_in_date' in range) || typeof range.check_in_date !== 'string'
          || !('check_out_date' in range) || typeof range.check_out_date !== 'string')) {
        throw new Error('Invalid calendar response');
      }
      return body as CalendarData;
    };
    read(`${month}-01`, `${nextMonth(month, 1)}-01`).then(v => { if (!abort.signal.aborted) { setMonthData(v); setCalendarError(""); } })
      .catch(() => { if (!abort.signal.aborted) setCalendarError("Calendar could not load. Retry; availability has not been verified."); });
    if (nights.length > 0 && nights.length <= 366) read(start, end).then(v => {
      if (!abort.signal.aborted) { setStay(v); setCalendarError(""); }
    }).catch(() => { if (!abort.signal.aborted) setCalendarError("Could not verify your selected stay. Retry before submitting."); });
    return () => abort.abort();
  }, [pkg, guests, young, foams, month, start, end, retry, eligible, nights.length]);
  useEffect(() => {
    if (!hasValidStaySelection || !stay || blockedStay) return;
    const abort = new AbortController();
    const requestKey = `${pkg}:${start}:${end}`;
    const params = new URLSearchParams({ package_code: pkg, check_in_date: start, check_out_date: end });
    fetch(`/api/promotion-teaser?${params}`, { cache: "no-store", signal: abort.signal }).then(async response => {
      if (!response.ok) throw new Error();
      const body: unknown = await response.json();
      if (!body || typeof body !== "object" || !("promotion" in body)) throw new Error();
      const result = body.promotion;
      if (result === null) { setPromotion(null); setPromotionSelection(requestKey); setPromotionFailedSelection(""); return; }
      const parsed = publicPromotionTeaserSchema.safeParse(result);
      if (!parsed.success || parsed.data.package_code !== pkg) throw new Error();
      setPromotion(parsed.data as PublicPromotionTeaser); setPromotionSelection(requestKey); setPromotionFailedSelection("");
    }).catch(() => { if (!abort.signal.aborted) setPromotionFailedSelection(requestKey); });
    return () => abort.abort();
  }, [hasValidStaySelection, stay, blockedStay, pkg, start, end, promotionRetry]);
  useEffect(() => {
    if (!hasValidStaySelection || !stay || blockedStay) return;
    const url = new URL(window.location.href);
    url.search = stayQuery;
    window.history.replaceState({}, "", url);
  }, [hasValidStaySelection, stay, blockedStay, stayQuery]);
  useEffect(() => {
    if (monthData && pendingFocus.current) {
      calendarRef.current?.querySelector<HTMLButtonElement>(`[data-date="${pendingFocus.current}"]`)?.focus();
      pendingFocus.current = "";
    }
  }, [monthData]);
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
    if(submitLock.current)return;
    if (!stay || !eligible) { setMessage("Check the selected dates before submitting. TEN29 will verify availability and send a complete quote."); return; }
    if (!promotionReady) { setMessage("Promotion details must be checked before submitting. Retry the promotion check or contact TEN29."); return; }
    const f = new FormData(event.currentTarget);
    const payload = { full_name: String(f.get("full_name") || ""), mobile_number: String(f.get("mobile_number") || ""), email: String(f.get("email") || ""),
      adults, children, young_children:young, policy_version:OWNER_POLICY_VERSION, day_visitors: Number(f.get("day_visitors") || 0), vehicles: Number(f.get("vehicles") || 0),
      package_code: pkg, folding_foams_requested: foams, check_in_date: start, check_out_date: end,
      privacy_consent: f.get("privacy_consent") === "on", message: String(f.get("message") || ""), purpose_of_stay: String(f.get("purpose_of_stay") || ""),
      utm_source: utm.utm_source || "", utm_medium: utm.utm_medium || "", utm_campaign: utm.utm_campaign || "",
      website: String(f.get("website") || "") };
    const identity = payload;
    if(!/^09[0-9]{9}$/.test(payload.mobile_number)){
      setMobileError("Enter an 11-digit Philippine mobile number starting with 09.");
      mobileInputRef.current?.focus();
      return;
    }
    if(referencesHouseRules(JSON.stringify(identity))){setMessage('House Rules must remain outside TEN29. Please remove the document contents or reference before submitting.');return;}
    // Session storage retains only a digest and retry key. The private rate
    // snapshot is calculated on the server and is never sent to the guest.
    submitLock.current=true;setBusy(true);
    let digest: string;
    try { digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(identity))))).map(v => v.toString(16).padStart(2, "0")).join(""); }
    catch { submitLock.current=false;setBusy(false); setMessage("Use a secure browser connection to submit, or contact TEN29."); return; }
    let saved: { digest: string; key: string } | null = null;
    try {
      const stored = JSON.parse(sessionStorage.getItem("ten29-request-retry") || "null");
      if (stored && typeof stored.digest === "string" && typeof stored.key === "string") saved = { digest: stored.digest, key: stored.key };
    } catch { /* Start a fresh bounded attempt. */ }
    const attempt = saved?.digest === digest ? saved : { digest, key: crypto.randomUUID() };
    try { sessionStorage.setItem("ten29-request-retry", JSON.stringify(attempt)); } catch { submitLock.current=false;setBusy(false); setMessage("Enable session storage to submit with safe refresh/retry protection, or contact TEN29."); return; }
    try {
      const response = await fetch("/api/booking-request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, idempotency_key: attempt.key }) });
      const result = await response.json();
      if (response.ok && result.outcome === "SAVED") { setReceipt(result); return; }
      if (result.outcome === "PRICE_CHANGED") {
        setStay(null); setRetry(v => v + 1); setMessage("The stay details changed while you were submitting. No request was saved; the dates are being checked again before you resubmit for an owner quote.");
      } else if (result.outcome === "UNAVAILABLE") {
        setMonthData(null); setStay(null); setRetry(v => v + 1); setMessage("These dates became unavailable. Choose another stay; no request was saved.");
      } else setMessage(result.error || (response.status === 429 ? "Too many requests. Please wait before retrying, or contact TEN29." : "Request was not saved. Retry or contact TEN29."));
    } catch { setMessage("Connection interrupted. Retry with the same details to recover the saved request safely."); }
    finally { submitLock.current=false;setBusy(false); }
  }
  if (receipt) return <section role="status" aria-label="Saved booking request" className="rounded-sm border border-forest bg-white p-6 space-y-3">
    <h2 className="font-heading text-2xl text-forest">Request received</h2><p className="break-all">Reference: <strong>{receipt.reference_code}</strong></p>
    <p>{receipt.overnight_guest_count} overnight guests · {BOOKING_PACKAGE_CODES.indexOf(receipt.package_code) + 1} bedrooms · one private house</p>
    {receipt.countable_guest_count!==undefined&&<p>Countable guests: {receipt.countable_guest_count} · Exempt young children: {receipt.exempt_children_count} · Actual overnight people: {receipt.overnight_guest_count}</p>}
      <p>{receipt.check_in_date} to {receipt.check_out_date}</p><p>TEN29 does not display rates online. The owner will check availability and send you a quotation before asking for payment. This request does not hold the dates.</p>
    <p>Your request is safely saved. A notification task was recorded; this acknowledgement does not verify email delivery.</p>
    <p>A reservation requires an owner-issued quotation, the owner’s approved down-payment conditions, independently verified receipt of payment and successful owner-authorized confirmation. Do not send payment until those terms are agreed.</p>
  </section>;
  const days = nightDates(`${month}-01`, `${nextMonth(month, 1)}-01`);
  const offset = new Date(`${month}-01T00:00:00Z`).getUTCDay();
  return <form onSubmit={submit} className="space-y-6" aria-label="Request to Book">
    <fieldset disabled={busy || !hydrated} className="space-y-6 min-w-0">
      <section className="rounded-sm border border-border bg-white p-4 sm:p-6 space-y-4">
        <h2 className="font-heading text-2xl text-forest">One private house. Choose how many bedrooms you&apos;d like opened.</h2>
        <p>Every package gives your group exclusive use of the whole house and approved common areas.</p>
        <div className="grid grid-cols-2 gap-3">
          <label htmlFor="adults">Adults staying overnight<input id="adults" type="number" min="1" max="8" required value={adults} onChange={e => changeCount(Number(e.target.value), children)} className={INPUT_CLASSES}/></label>
          <label htmlFor="children">Children older than 3<input id="children" type="number" min="0" max="7" value={children} onChange={e => changeCount(adults, Number(e.target.value))} className={INPUT_CLASSES}/></label>
          <label htmlFor="young_children">Children aged 3 and below<input id="young_children" type="number" min="0" max="31" value={young} onChange={e=>{setYoung(Number(e.target.value));resetEstimate();}} className={INPUT_CLASSES}/></label>
        </div>
        <p>Guests counted toward the package: {counts.countable}. Children aged 3 and under: {young}. People staying overnight: {counts.actual}.</p>
        <p>Your package includes {counts.included} guests. Any additional guests need owner approval before the stay can be accepted.</p>
        {counts.ownerReview&&<p>The owner must review this group size before accepting the request.</p>}
        <p aria-live="polite"><strong>{guests} people staying overnight.</strong> TEN29 will confirm any special arrangements before accepting the stay.</p>
        {!recommendation && <p role="alert">Choose between 1 and 8 countable guests.</p>}
        <div><label htmlFor="package_code">Bedroom package</label><select id="package_code" value={pkg} onChange={e => { setPkg(e.target.value as BookingPackageCode); setExplicitExtra(guests > PACKAGE_POLICY[e.target.value as BookingPackageCode].included); setFoams(guests > PACKAGE_POLICY[e.target.value as BookingPackageCode].included); setMonthData(null); resetEstimate(); }} className={INPUT_CLASSES}>
          {BOOKING_PACKAGE_CODES.map((code, i) => <option key={code} value={code} disabled={!recommendation || guests > PACKAGE_POLICY[code].maximum}>{i + 1} bedroom{ i ? "s" : ""} · Whole private house</option>)}
        </select></div>
        <p>Rooms {Array.from({ length: rooms }, (_, i) => i + 1).join(", ")} opened.{rooms < 3 ? " Other bedrooms remain locked." : " All three bedrooms opened."}</p>
        <p className="text-sm text-muted">Room 1: queen-size bed.{rooms > 1 ? " Room 2: twin-size bedding." : ""}{rooms > 2 ? " Room 3: single-size double-deck bed." : ""}</p>
        {counts.extraRequested > 0 && <label className="flex items-start gap-3 min-h-11"><input type="checkbox" checked={foams} required={counts.extraRequested > 0} onChange={e => { setFoams(e.target.checked); setMonthData(null); resetEstimate(); }} className="mt-1 h-5 w-5"/>Request extra guests or folding foams. Owner approval is required; no fee is assumed.</label>}
      </section>
      <section className="rounded-sm border border-border bg-white p-2 sm:p-6 space-y-4">
        <h2 className="font-heading text-2xl text-forest">Choose your requested dates</h2>
        <p>Check-in from 3:00 PM · Check-out before 12:00 PM · Asia/Manila.</p>
        <div className="flex items-center justify-between gap-2"><button type="button" className={button} aria-label="Previous month" onClick={() => { setMonthData(null); setMonth(nextMonth(month, -1)); }}>←</button>
          <label className="min-w-0">Calendar month<input type="month" value={month} onChange={e => { if (e.target.value) { setMonthData(null); setMonth(e.target.value); } }} className={INPUT_CLASSES}/></label>
          <button type="button" className={button} aria-label="Next month" onClick={() => { setMonthData(null); setMonth(nextMonth(month, 1)); }}>→</button></div>
        <p className="text-sm">Choose your check-in date, then check-out. TEN29 confirms availability; unavailable nights cannot be included. A new stay may begin on the day another stay checks out.</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted" aria-label="Calendar legend"><span>Available to request · owner confirmation needed</span><span>Unavailable · another stay or owner block</span></div>
        {calendarError && <div role="alert"><p>{calendarError}</p><button type="button" className={button} onClick={() => { setMonthData(null); resetEstimate(); setRetry(v => v + 1); }}>Retry calendar</button></div>}
        {!monthData && !calendarError && <p role="status">{eligible ? "Loading date request information…" : "Choose an eligible package and bedding to load dates."}</p>}
        <div ref={calendarRef} className="grid grid-cols-7 gap-1" aria-label="Booking dates">
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => <span key={d} className="text-center text-xs">{d}</span>)}
          {Array.from({ length: offset }, (_, i) => <span key={`empty${i}`}/>)}
          {days.map(day => { const unavailable = !!monthData?.unavailable.some(b => b.check_in_date <= day && day < b.check_out_date);
            const checkout = !!end && day === end;
            const selected = !!start && (end ? day >= start && day < end : day === start);
            const unavailableChoice = unavailable && (!start || !!end || day <= start);
            return <button key={day} type="button" data-date={day} onClick={() => { if (unavailableChoice) setMessage("This night is unavailable. Choose another check-in."); else pick(day); }} onKeyDown={e => keyboard(e, day)}
              disabled={!monthData || day < manilaToday()} aria-disabled={unavailableChoice}
              aria-pressed={selected || checkout} aria-label={checkout ? `${day}, checkout boundary; not a charged night` : `${day}, ${unavailable ? "unavailable overnight; checkout only" : "requestable; owner availability review required"}`}
              className={`min-h-16 min-w-0 rounded-sm border p-0.5 text-left focus-visible:outline-2 focus-visible:outline-gold ${selected ? "border-forest bg-forest text-white" : checkout ? "border-forest bg-sand text-forest" : unavailable ? "border-border bg-gray-100 text-muted" : "border-border bg-sand/40"} disabled:opacity-60`}>
              <span className="block text-sm font-semibold">{Number(day.slice(-2))}</span><span className="block break-words text-[10px] leading-tight">{checkout ? "Checkout" : unavailable ? "Unavailable" : "Requestable"}</span>
            </button>; })}
        </div>
        <div className="grid gap-3 sm:grid-cols-2"><label htmlFor="check_in_date">Check-in date<input id="check_in_date" type="date" required value={start} min={manilaToday()} onChange={e => { setStart(e.target.value); resetEstimate(); if (calendarDate.safeParse(e.target.value).success) { setMonthData(null); setMonth(e.target.value.slice(0, 7)); } }} className={INPUT_CLASSES}/></label>
          <label htmlFor="check_out_date">Check-out date<input id="check_out_date" type="date" required value={end} min={start || manilaToday()} onChange={e => { setEnd(e.target.value); resetEstimate(); }} className={INPUT_CLASSES}/></label></div>
        {blockedStay && <p role="alert">This stay includes unavailable nights. Choose different dates.</p>}
        <section aria-live="polite" aria-label="Promotional accommodation starting price" className="rounded-sm border border-border bg-sand/30 p-4">
          {promotion && promotionReady ? <>
            <p className="text-sm font-semibold text-forest">Promotional nightly rate · {BOOKING_PACKAGE_CODES.indexOf(promotion.package_code) + 1}-bedroom package</p>
            <p className="mt-1 text-sm">Former advertised price: <del>{formatTeaserPrice(promotion.former_amount_centavos)} per night</del></p>
            {promotion.former_price_period && <p className="text-sm">Former price period: {promotion.former_price_period}</p>}
            <p className="mt-1 text-2xl font-semibold text-forest">Starts at {formatTeaserPrice(promotion.promotional_amount_centavos)} <span className="text-base font-medium">per night · {BOOKING_PACKAGE_CODES.indexOf(promotion.package_code) + 1}-bedroom package</span></p>
          </> : <>
            <p className="font-medium text-forest">{promotionFailedSelection === currentPromotionSelection
            ? "Promotional details could not be checked. Retry before sending your request."
            : promotionReady
              ? "No approved promotional starting price applies to this stay. Request a formal quotation."
              : blockedStay ? "A promotional price is shown only for available, eligible dates."
                : "Checking whether an approved promotional starting price applies…"}</p>
            {promotionFailedSelection === currentPromotionSelection && <button type="button" className={`${button} mt-2`} onClick={() => setPromotionRetry(value => value + 1)}>Retry promotion check</button>}
          </>}
          <p className="mt-2 text-sm">Final accommodation pricing depends on your selected dates, bedroom package, guest count, and any approved extras. Request a formal quotation before payment.</p>
        </section>
        {start && end && !nights.length && <p role="alert">Checkout must be after check-in.</p>}
      </section>
      {calendarError && <div role="alert" className="rounded-sm border border-warning bg-white p-4"><p>{calendarError}</p><Link href={`/book?${stayQuery}`} className="mt-3 inline-block underline">Retry this stay</Link></div>}
      {stay && <section className="rounded-sm border border-border bg-white p-4 space-y-3" aria-label="Owner quotation">
        <h2 className="font-heading text-xl text-forest">Owner quotation</h2>
        <p>TEN29 does not display rates online. The owner will check availability and send you a quotation before asking for payment.</p>
      </section>}
      {hasValidStaySelection ? <section className="rounded-sm border border-border bg-white p-4 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
          <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-forest">Your selected stay</p><p className="mt-1 font-medium text-forest">{start} to {end} · {guests} guests · {rooms} bedroom{rooms === 1 ? "" : "s"}</p></div>
          <a href="#check_in_date" className={`${button} inline-flex`}>Edit dates</a>
        </div>
        <h2 className="font-heading text-2xl text-forest">Your details</h2>
        <label htmlFor="full_name">Full name<input id="full_name" name="full_name" required autoComplete="name" minLength={2} maxLength={120} className={INPUT_CLASSES}/></label>
        <label htmlFor="mobile_number">Philippine mobile number<input ref={mobileInputRef} id="mobile_number" name="mobile_number" required type="tel" inputMode="numeric" autoComplete="tel-national" pattern="09[0-9]{9}" minLength={11} maxLength={11} title="Enter 11 digits starting with 09." aria-invalid={Boolean(mobileError)} aria-describedby="mobile-number-help" value={mobileNumber} onChange={event=>{const value=event.currentTarget.value;setMobileNumber(value);setMobileError(value&&!/^09[0-9]{9}$/.test(value)?"Use exactly 11 digits, beginning with 09.":"");}} onBlur={()=>{if(mobileNumber&&!/^09[0-9]{9}$/.test(mobileNumber))setMobileError("Use exactly 11 digits, beginning with 09.");}} className={INPUT_CLASSES}/><span id="mobile-number-help" className={`mt-1 block text-sm ${mobileError?'text-red-800':'text-ink/70'}`} role={mobileError?'alert':undefined}>{mobileError||"Enter 11 digits starting with 09, for example 09558499239."}</span></label>
        <label htmlFor="email">Email (optional)<input id="email" name="email" type="email" autoComplete="email" maxLength={254} className={INPUT_CLASSES}/></label>
        <div className="grid grid-cols-2 gap-3"><label htmlFor="day_visitors">Day visitors (separate)<input id="day_visitors" name="day_visitors" type="number" min={0} defaultValue={0} className={INPUT_CLASSES}/></label>
          <label htmlFor="vehicles">Vehicles (information only)<input id="vehicles" name="vehicles" type="number" min={0} defaultValue={0} className={INPUT_CLASSES}/></label></div>
        <p className="text-sm">TEN29 will review day visitors and parking with your request. Ask the owner about any arrangements before your stay.</p>
        <label htmlFor="purpose_of_stay">Purpose of stay<input id="purpose_of_stay" name="purpose_of_stay" maxLength={200} className={INPUT_CLASSES}/></label>
        <p>TEN29 will share the stay rules and payment instructions before collecting any money. Do not paste House Rules into this form.</p>
        <label htmlFor="message">Message or requests<textarea id="message" name="message" rows={3} maxLength={1000} className={INPUT_CLASSES}/></label>
        <label className="flex gap-3 min-h-11" htmlFor="privacy_consent"><input id="privacy_consent" name="privacy_consent" type="checkbox" required className="mt-1 h-5 w-5 shrink-0"/><span>I agree to the <Link href="/privacy" className="underline">privacy notice</Link> and understand this is a request, not a confirmed reservation.</span></label>
        {sessionError && <div role="alert"><p>{sessionError}</p><button type="button" className={button} onClick={() => setSessionRetry(v => v + 1)}>Retry secure session</button></div>}
        {!sessionReady && !sessionError && <p role="status">Preparing a secure request session…</p>}
        <div aria-hidden="true" className="absolute left-[-9999px] h-0 overflow-hidden"><label htmlFor="website">Leave empty</label><input id="website" name="website" tabIndex={-1} autoComplete="off"/></div>
        <button type="submit" className={`${button} bg-forest text-white w-full`} disabled={busy || !sessionReady || !stay || blockedStay || !eligible || !promotionReady} aria-busy={busy}>{busy ? "Saving your request…" : "Request to Book — Send Enquiry"}</button>
      </section> : <p role="status" className="rounded-sm border border-border bg-white p-4">Choose an eligible stay above to review availability and send your enquiry. Rates are not displayed online. The owner will review availability and provide a complete quote.</p>}
    </fieldset>
    {message && <p role="alert" className="rounded-sm border border-gold bg-sand p-4">{message}</p>}
  </form>;
}
