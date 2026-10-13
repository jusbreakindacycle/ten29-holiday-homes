"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { BOOKING_PACKAGE_CODES, type BookingPackageCode } from "@/types/booking";
import { addDays, formatPhp, nightDates, phpToCentavos, rateRulesSchema, type NightlyPrice, type OwnerRateState, type RateRule } from "@/types/pricing";
import { previewRateRules } from "@/lib/pricing";
import { loadRateEditor, previewRateEditor, publishRateEditor, saveRateEditor } from "@/app/admin/(protected)/rates/actions";
import { CtaButton } from "@/components/ui/CtaButton";
import { INPUT_CLASSES } from "@/components/ui/FormField";

function monthBounds(month: string) {
  const first = `${month}-01`, next = new Date(`${first}T00:00:00Z`);
  next.setUTCMonth(next.getUTCMonth() + 1);
  return [first, next.toISOString().slice(0, 10)] as const;
}
export function RateEditor({ initial, initialMonth }: { initial: OwnerRateState; initialMonth: string }) {
  const [state, setState] = useState(initial), [month, setMonth] = useState(initialMonth);
  const initialDraft = initial.history.find((h) => h.status === "DRAFT" && h.base_revision_id === initial.published_revision_id);
  const [rules, setRules] = useState<RateRule[]>(initialDraft?.rules ?? initial.published_rules);
  const [draftId, setDraftId] = useState<string | null>(initialDraft?.id ?? null);
  const [kind, setKind] = useState<RateRule["kind"] | "MONTH">("DATE"), [weekday, setWeekday] = useState(0);
  const [startDate, setStartDate] = useState(`${initialMonth}-01`), [endDate, setEndDate] = useState(`${initialMonth}-01`);
  const [price, setPrice] = useState(""), [dirty, setDirty] = useState(false), [choosingEnd, setChoosingEnd] = useState(false);
  const [preview, setPreview] = useState<NightlyPrice[] | null>(null), [message, setMessage] = useState(""), [error, setError] = useState("");
  const [pending, begin] = useTransition(); const dialog = useRef<HTMLDialogElement>(null);
  const saveKey = useRef(crypto.randomUUID()), publishKey = useRef(crypto.randomUUID());
  const [first, next] = monthBounds(month), dates = nightDates(first, next);
  const published = previewRateRules(state.package_code, state.published_rules, first, next);
  const draftPrices = previewRateRules(state.package_code, rules, first, next);
  useEffect(() => {
    if (!dirty && !price.trim()) return;
    const unload = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    const navigation = (e: MouseEvent) => {
      const link = (e.target as Element).closest?.("a[href]");
      if (link && !window.confirm("You have unsaved rate changes. Leave without saving?")) { e.preventDefault(); e.stopPropagation(); }
    };
    window.addEventListener("beforeunload", unload); document.addEventListener("click", navigation, true);
    return () => { window.removeEventListener("beforeunload", unload); document.removeEventListener("click", navigation, true); };
  }, [dirty, price]);
  function edited(nextRules: RateRule[]) {
    setRules(nextRules); setDirty(true); setDraftId(null); setPreview(null); setMessage(""); saveKey.current = crypto.randomUUID();
  }
  function acceptState(updated: OwnerRateState) {
    setState(updated); const draft = updated.history.find((h) => h.status === "DRAFT" && h.base_revision_id === updated.published_revision_id);
    setRules(draft?.rules ?? updated.published_rules); setDraftId(draft?.id ?? null); setDirty(false); setPreview(null); setPrice("");
  }
  function changePackage(packageCode: BookingPackageCode) {
    if ((dirty || price.trim()) && !window.confirm("Discard unsaved rate changes?")) return;
    begin(async () => { setError(""); const result = await loadRateEditor(packageCode); if (result.error) setError(result.error); else acceptState(result.data!); });
  }
  function changeMonth(offset: number) {
    const date = new Date(`${first}T00:00:00Z`); date.setUTCMonth(date.getUTCMonth() + offset); setMonth(date.toISOString().slice(0, 7)); setPreview(null);
  }
  function applyRule() {
    setError("");
    try {
      const [monthStart, monthEnd] = monthBounds(month);
      const rule: RateRule = { kind: kind === "MONTH" ? "RANGE" : kind, amount_centavos: phpToCentavos(price), weekday: kind === "WEEKDAY" ? weekday : null,
        start_date: kind === "MONTH" ? monthStart : kind === "DATE" || kind === "RANGE" ? startDate : null,
        end_date: kind === "MONTH" ? monthEnd : kind === "DATE" ? addDays(startDate, 1) : kind === "RANGE" ? addDays(endDate, 1) : null };
      const updated = rules.filter((r) => !(r.kind === rule.kind && (
        r.kind === "DEFAULT" || (r.kind === "WEEKDAY" && r.weekday === rule.weekday)
        || (r.kind === "DATE" && r.start_date === rule.start_date)
        || (r.kind === "RANGE" && r.start_date === rule.start_date && r.end_date === rule.end_date))));
      updated.push(rule); const parsed = rateRulesSchema.safeParse(updated);
      if (!parsed.success) throw new Error(parsed.error.issues[0].message);
      edited(parsed.data); setPrice("");
    } catch (e) { setError(e instanceof Error ? e.message : "Invalid rate rule."); }
  }
  function selectDay(date: string) {
    if (!choosingEnd) { setStartDate(date); setEndDate(date); setKind("DATE"); setChoosingEnd(true); }
    else { const from = date < startDate ? date : startDate, to = date < startDate ? startDate : date;
      setStartDate(from); setEndDate(to); setKind(from === to ? "DATE" : "RANGE"); setChoosingEnd(false); }
  }
  return <section aria-label="Calendar rate editor" className="space-y-6">
    <div className="rounded-sm border border-border bg-white p-4 sm:p-6">
      <label className="block font-semibold" htmlFor="rate-package">Bedroom package</label>
      <select id="rate-package" className={`${INPUT_CLASSES} mt-2`} value={state.package_code} disabled={pending} onChange={(e) => changePackage(e.target.value as BookingPackageCode)}>
        {BOOKING_PACKAGE_CODES.map((code, index) => <option value={code} key={code}>{index + 1} bedroom{index ? "s" : ""} · Whole private house</option>)}
      </select>
      <p className="mt-2 text-sm text-muted">One private house. This is the nightly package price, not a per-person price. Current publication: {state.published_revision_id ? `revision ${state.history.find((h) => h.id === state.published_revision_id)?.revision ?? state.published_revision_id}` : "No rates published"}.</p>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
        <CtaButton variant="secondary" onClick={() => changeMonth(-1)} aria-label="Previous month">←</CtaButton>
        <h2 className="text-xl">{new Date(`${first}T00:00:00Z`).toLocaleDateString("en-PH", { month: "long", year: "numeric", timeZone: "UTC" })}</h2>
        <CtaButton variant="secondary" onClick={() => changeMonth(1)} aria-label="Next month">→</CtaButton>
      </div>
      <label className="mt-3 block text-sm" htmlFor="rate-month">Go to month</label>
      <input id="rate-month" type="month" className={INPUT_CLASSES} value={month} onChange={(e) => { if (/^\d{4}-\d{2}$/.test(e.target.value)) { setMonth(e.target.value); setPreview(null); } }} />
      <p className="my-3 text-sm">Tap a date, then another date to select a range. Draft values remain private until publication.</p>
      <div className="grid grid-cols-7 gap-1" aria-label="Monthly nightly prices">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <div key={day} className="text-center text-xs font-semibold">{day}</div>)}
        {Array.from({ length: new Date(`${first}T00:00:00Z`).getUTCDay() }, (_, i) => <div key={`blank-${i}`} />)}
        {dates.map((date, i) => <button key={date} type="button" onClick={() => selectDay(date)}
          aria-pressed={date >= startDate && date <= endDate} aria-label={`${date}, published ${formatPhp(published[i].amount_centavos)}, draft ${formatPhp(draftPrices[i].amount_centavos)}`}
          className={`min-h-24 min-w-0 rounded-sm border p-1 text-left ${date >= startDate && date <= endDate ? "border-gold bg-gold-soft/30" : "border-border bg-ivory"}`}>
          <span className="block font-semibold">{Number(date.slice(-2))}</span>
          <span className="block break-words text-[10px] text-forest">Published<br />{published[i].amount_centavos === null ? "—" : formatPhp(published[i].amount_centavos)}</span>
          <span className="mt-1 block break-words text-[10px] text-warning">Draft<br />{draftPrices[i].amount_centavos === null ? "—" : formatPhp(draftPrices[i].amount_centavos)}</span>
        </button>)}
      </div>
    </div>
    <div className="rounded-sm border border-border bg-white p-4 sm:p-6">
      <h2 className="text-2xl text-forest">Edit nightly rates</h2>
      <p className="mt-2 text-sm text-muted">Priority: single date → range or month → weekday → default. Overlapping range rules are rejected; remove or replace the existing range explicitly.</p>
      <label className="mt-4 block" htmlFor="rule-kind">Apply price to</label>
      <select id="rule-kind" className={INPUT_CLASSES} value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
        <option value="DATE">One date</option><option value="RANGE">Date range</option><option value="MONTH">Whole displayed month</option>
        <option value="WEEKDAY">Day of week</option><option value="DEFAULT">Default nightly price</option>
      </select>
      {(kind === "DATE" || kind === "RANGE") && <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label>Start date<input type="date" className={INPUT_CLASSES} value={startDate} onChange={(e) => setStartDate(e.target.value)} /></label>
        {kind === "RANGE" && <label>Last night (inclusive)<input type="date" className={INPUT_CLASSES} value={endDate} onChange={(e) => setEndDate(e.target.value)} /></label>}
      </div>}
      {kind === "WEEKDAY" && <label className="mt-3 block">Day of week<select className={INPUT_CLASSES} value={weekday} onChange={(e) => setWeekday(Number(e.target.value))}>{["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day, i) => <option value={i} key={day}>{day}</option>)}</select></label>}
      <label className="mt-3 block" htmlFor="nightly-price">Nightly price (PHP)</label>
      <input id="nightly-price" inputMode="decimal" className={INPUT_CLASSES} value={price} placeholder="Enter an owner-chosen amount" onChange={(e) => setPrice(e.target.value)} />
      <CtaButton className="mt-3" variant="secondary" disabled={pending} onClick={applyRule}>Apply to draft</CtaButton>
      <ul className="mt-4 space-y-2">{rules.map((r, i) => <li key={i} className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-2 text-sm">
        <span>{r.kind} {r.weekday !== null ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][r.weekday] : r.start_date ? `${r.start_date} through ${addDays(r.end_date!, -1)}` : "Every night"} · {formatPhp(r.amount_centavos)}</span>
        <button className="min-h-11 px-3 text-danger underline" onClick={() => edited(rules.filter((_, j) => j !== i))} aria-label={`Remove rule ${i + 1}`}>Remove</button>
      </li>)}</ul>
      <p className="mt-4 text-sm">{dirty ? "Unsaved changes" : draftId ? "Saved private draft" : "Published values loaded"}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <CtaButton disabled={pending || !dirty} onClick={() => begin(async () => {
          setError(""); const response = await saveRateEditor({ package_code: state.package_code, base_revision_id: state.published_revision_id, rules, idempotency_key: saveKey.current });
          if (response.error) setError(response.error); else { setDraftId(response.data!); setDirty(false); publishKey.current = crypto.randomUUID(); setMessage("Draft saved. Public rates are unchanged."); const updated = await loadRateEditor(state.package_code); if (updated.data) setState(updated.data); }
        })}>Save Draft</CtaButton>
        <CtaButton variant="secondary" disabled={pending} onClick={() => begin(async () => {
          setError(""); const response = await previewRateEditor({ rules, selection: { package_code: state.package_code, check_in_date: first, check_out_date: next, overnight_guest_count: 1, folding_foams_requested: false } });
          if (response.error) setError(response.error); else { setPreview(response.data!); setMessage("Preview ready. No rates published."); }
        })}>Preview</CtaButton>
        <CtaButton disabled={pending || dirty || !!price.trim() || !draftId || !preview} onClick={() => dialog.current?.showModal()}>Publish</CtaButton>
        <CtaButton variant="ghost" disabled={pending} onClick={() => { if (!dirty || window.confirm("Discard unsaved changes and reload?")) changePackage(state.package_code); }}>Reload</CtaButton>
      </div>
      {pending && <p role="status" className="mt-3">Working…</p>}
      <p role="status" aria-live="polite" className="mt-3 text-success">{message}</p>
      {error && <p role="alert" className="mt-3 text-danger">{error}</p>}
      {preview && <div className="mt-5"><h3 className="text-xl">Private draft preview · {month}</h3><ul className="mt-2 grid gap-1 sm:grid-cols-2">
        {preview.map((n) => <li key={n.date} className="flex justify-between gap-3 text-sm"><span>{n.date} · {n.source}</span><span>{formatPhp(n.amount_centavos)}</span></li>)}
      </ul></div>}
      <dialog ref={dialog} className="m-auto w-[calc(100%-2rem)] max-w-md rounded-sm border border-border bg-ivory p-6 backdrop:bg-ink/50" aria-labelledby="publish-title">
        <h3 id="publish-title" className="text-2xl">Publish package rates?</h3>
        <p className="mt-3">{state.package_code}: publish this complete rule set, including {rules.filter((r) => r.start_date).map((r) => `${r.start_date} through ${addDays(r.end_date!, -1)}`).join(", ") || (rules.length ? "default/weekday rules" : "no active rules (all dates will require a quote)")}. Saved rules apply to their stated dates; this is not limited to the displayed month.</p>
        <p className="mt-2">These rates become public. Previously issued quotations remain unchanged.</p>
        <div className="mt-5 flex flex-wrap gap-3"><CtaButton variant="secondary" onClick={() => dialog.current?.close()}>Cancel</CtaButton>
          <CtaButton disabled={pending} onClick={() => begin(async () => {
            setError(""); const response = await publishRateEditor({ revision_id: draftId, base_revision_id: state.published_revision_id, idempotency_key: publishKey.current, confirmed: true });
            dialog.current?.close(); if (response.error) setError(response.error); else {
              const updated = await loadRateEditor(state.package_code); if (updated.data) acceptState(updated.data);
              setMessage("Rates published successfully. New calendar views use this revision.");
            }
          })}>Confirm publication</CtaButton></div>
      </dialog>
    </div>
    <section className="rounded-sm border border-border bg-white p-4 sm:p-6" aria-label="Rate revision history">
      <h2 className="text-2xl text-forest">Rate history</h2>
      {state.history.length === 0 ? <p className="mt-2">No rate revisions yet. Add the first owner-chosen price above.</p> : <ul>{state.history.map((h) => <li key={h.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-3 text-sm">
        <span>Revision {h.revision} · {h.status}{h.id === state.published_revision_id ? " · Current" : ""}<small className="block">Saved {new Date(h.created_at).toLocaleString("en-PH", { timeZone: "Asia/Manila" })}{h.published_at ? ` · Published ${new Date(h.published_at).toLocaleString("en-PH", { timeZone: "Asia/Manila" })}` : ""} (Manila)</small>
          <small className="block">{h.rules.filter((r) => r.start_date).map((r) => `${r.start_date} through ${addDays(r.end_date!, -1)}`).join(", ") || "Default/weekday applicability"}</small></span>
        <button className="min-h-11 px-3 text-forest underline" onClick={() => { if (!dirty || window.confirm("Discard unsaved changes?")) edited(h.rules); }}>Use revision {h.revision} as draft</button>
      </li>)}</ul>}
    </section>
  </section>;
}
