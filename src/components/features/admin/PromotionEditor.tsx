"use client";
import { useCallback, useEffect, useState, useTransition } from "react";
import { BOOKING_PACKAGE_CODES, type BookingPackageCode } from "@/types/booking";
import { formatPhp, phpToCentavos, promotionDraftSchema, type OwnerPromotionState, type PromotionDraft } from "@/types/pricing";
import { INPUT_CLASSES } from "@/components/ui/FormField";
import { CtaButton } from "@/components/ui/CtaButton";
import { deactivatePromotionEditor, loadPromotionEditor, publishPromotionEditor, savePromotionEditor } from "@/app/admin/(protected)/rates/actions";

const blank: Omit<PromotionDraft, "package_code"> = {
  former_amount_centavos: 0, promotional_amount_centavos: 0, eligible_from_date: "", eligible_to_date: "",
  minimum_nights: 1, maximum_nights: 1, valid_from: "", valid_until: "", former_price_basis: "SOLD_WITHIN_90_DAYS",
  former_price_period: "", former_price_evidence: "",
};
const localManila = (value: string) => value ? new Date(new Date(value).getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 16) : "";
const manilaIso = (value: string) => value ? new Date(`${value}:00+08:00`).toISOString() : "";
async function safely<T>(operation: Promise<{ data?: T; error?: string }>) { try { return await operation; } catch { return { error: "Could not reach the server. Reload to verify the promotion state." }; } }

export function PromotionEditor() {
  const [packageCode, setPackageCode] = useState<BookingPackageCode>(BOOKING_PACKAGE_CODES[0]);
  const [state, setState] = useState<OwnerPromotionState | null>(null);
  const [form, setForm] = useState<Omit<PromotionDraft, "package_code">>(blank);
  const [money, setMoney] = useState({ former: "", promotional: "" });
  const [draftId, setDraftId] = useState<string | null>(null);
  const [baseId, setBaseId] = useState<string | null>(null);
  const [formerReviewed, setFormerReviewed] = useState(false);
  const [dtiReviewed, setDtiReviewed] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  const reload = useCallback(async (code = packageCode) => {
    const result = await safely(loadPromotionEditor(code));
    if (result.error) { setError(result.error); return; }
    const next = result.data!;
    setState(next);
    const draft = next.history.find(item => item.status === "DRAFT" && item.base_promotion_id === next.active_promotion_id);
    setDraftId(draft?.id ?? null); setBaseId(next.active_promotion_id);
    if (draft) setForm({
      former_amount_centavos: draft.former_amount_centavos, promotional_amount_centavos: draft.promotional_amount_centavos,
      eligible_from_date: draft.eligible_from_date, eligible_to_date: draft.eligible_to_date,
      minimum_nights: draft.minimum_nights, maximum_nights: draft.maximum_nights,
      valid_from: localManila(draft.valid_from), valid_until: localManila(draft.valid_until),
      former_price_basis: draft.former_price_basis, former_price_period: draft.former_price_period,
      former_price_evidence: draft.former_price_evidence,
    }); else setForm(blank);
    setMoney(draft ? { former: (draft.former_amount_centavos / 100).toFixed(2), promotional: (draft.promotional_amount_centavos / 100).toFixed(2) } : { former: "", promotional: "" });
    setFormerReviewed(false); setDtiReviewed(false);
  }, [packageCode]);
  useEffect(() => { startTransition(() => { void reload(packageCode); }); }, [packageCode, reload]);

  function field<K extends keyof typeof form>(key: K, value: (typeof form)[K]) { setForm(current => ({ ...current, [key]: value })); setDraftId(null); setError(""); }
  function save() {
    setError(""); setMessage("");
    let formerAmount: number, promotionalAmount: number;
    try { formerAmount = phpToCentavos(money.former); promotionalAmount = phpToCentavos(money.promotional); }
    catch { setError("Enter PHP amounts with at most two decimal places."); return; }
    const parsed = promotionDraftSchema.safeParse({ ...form, package_code: packageCode, former_amount_centavos: formerAmount,
      promotional_amount_centavos: promotionalAmount, valid_from: manilaIso(form.valid_from), valid_until: manilaIso(form.valid_until) });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Review the promotion details."); return; }
    startTransition(async () => {
      const result = await safely(savePromotionEditor({ base_promotion_id: baseId, promotion: parsed.data, idempotency_key: crypto.randomUUID() }));
      if (result.error) setError(result.error); else { setMessage("Promotion draft saved privately. It is not public until published."); await reload(); }
    });
  }
  function publish() {
    if (!draftId || !formerReviewed || !dtiReviewed) return;
    startTransition(async () => {
      setError(""); const result = await safely(publishPromotionEditor({ promotion_id: draftId, base_promotion_id: baseId,
        idempotency_key: crypto.randomUUID(), confirmed: true, former_price_reviewed: true, dti_reviewed: true }));
      if (result.error) setError(result.error); else { setMessage("Promotion published for its stated package, dates, and validity period."); await reload(); }
    });
  }
  return <section className="mt-8 space-y-5 rounded-sm border border-border bg-white p-4 sm:p-6" aria-label="Owner promotion management">
    <div><h2 className="text-2xl text-forest">Promotional starting price</h2>
      <p className="mt-2 text-sm text-muted">Manage one private promotion per bedroom package. Publication permits only a qualifying promotional teaser; standard rate rules remain private.</p></div>
    <label htmlFor="promotion-package" className="block font-semibold">Bedroom package</label>
    <select id="promotion-package" className={INPUT_CLASSES} value={packageCode} disabled={pending} onChange={e => setPackageCode(e.target.value as BookingPackageCode)}>
      {BOOKING_PACKAGE_CODES.map((code, i) => <option key={code} value={code}>{i + 1} bedroom{i ? "s" : ""} · whole private house</option>)}
    </select>
    <p role="status">{state?.active ? `Published promotion: ${formatPhp(state.active.promotional_amount_centavos)} per night for ${BOOKING_PACKAGE_CODES.indexOf(packageCode) + 1} bedroom package.` : "No active promotion. Guests will see the non-promotional quotation message."}</p>
    {state?.active && <button type="button" disabled={pending} className="min-h-11 text-danger underline" onClick={() => startTransition(async () => {
      const result = await safely(deactivatePromotionEditor(packageCode, state.active_promotion_id));
      if (result.error) setError(result.error); else { setMessage("Promotion deactivated. Existing issued quotes remain unchanged."); await reload(); }
    })}>Deactivate published promotion</button>}
    <fieldset disabled={pending} className="grid min-w-0 gap-4 sm:grid-cols-2">
      <label>Former advertised amount (PHP per night)<input className={INPUT_CLASSES} inputMode="decimal" value={money.former} onChange={e => { setMoney(current => ({ ...current, former: e.target.value })); setDraftId(null); }}/></label>
      <label>Promotional amount (PHP per night)<input className={INPUT_CLASSES} inputMode="decimal" value={money.promotional} onChange={e => { setMoney(current => ({ ...current, promotional: e.target.value })); setDraftId(null); }}/></label>
      <label>Eligible check-in date<input type="date" className={INPUT_CLASSES} value={form.eligible_from_date} onChange={e => field("eligible_from_date", e.target.value)}/></label>
      <label>Last eligible check-out date<input type="date" className={INPUT_CLASSES} value={form.eligible_to_date} onChange={e => field("eligible_to_date", e.target.value)}/></label>
      <label>Minimum nights<input type="number" min="1" max="366" className={INPUT_CLASSES} value={form.minimum_nights} onChange={e => field("minimum_nights", Number(e.target.value))}/></label>
      <label>Maximum nights<input type="number" min="1" max="366" className={INPUT_CLASSES} value={form.maximum_nights} onChange={e => field("maximum_nights", Number(e.target.value))}/></label>
      <label>Promotion starts (Manila time)<input type="datetime-local" className={INPUT_CLASSES} value={form.valid_from} onChange={e => field("valid_from", e.target.value)}/></label>
      <label>Promotion ends (Manila time)<input type="datetime-local" className={INPUT_CLASSES} value={form.valid_until} onChange={e => field("valid_until", e.target.value)}/></label>
      <label>Former-price basis<select className={INPUT_CLASSES} value={form.former_price_basis} onChange={e => field("former_price_basis", e.target.value as PromotionDraft["former_price_basis"])}>
        <option value="SOLD_WITHIN_90_DAYS">Sold within the previous 90 days</option><option value="OFFERED_4_WEEKS_WITHIN_90_DAYS">Offered for at least four weeks within the previous 90 days</option><option value="OLDER_PERIOD_DISCLOSED">Older period, disclosed to guests</option>
      </select></label>
      <label>Former-price period (disclosed for older comparisons)<input className={INPUT_CLASSES} maxLength={240} value={form.former_price_period} onChange={e => field("former_price_period", e.target.value)}/></label>
      <label className="sm:col-span-2">Owner-held former-price evidence reference<textarea className={INPUT_CLASSES} maxLength={1000} value={form.former_price_evidence} onChange={e => field("former_price_evidence", e.target.value)}/></label>
    </fieldset>
    <p className="text-sm">The guest-facing price is per night for the selected bedroom package. The formal quotation is calculated for the whole selected stay and may include only approved extras.</p>
    <div className="flex flex-wrap gap-3"><CtaButton disabled={pending} onClick={save}>Save promotion draft</CtaButton>
      <CtaButton disabled={pending || !draftId || !formerReviewed || !dtiReviewed} onClick={publish}>Publish promotion</CtaButton></div>
    <label className="flex min-h-11 items-start gap-3"><input type="checkbox" className="mt-1 h-5 w-5" checked={formerReviewed} onChange={e => setFormerReviewed(e.target.checked)}/><span>I reviewed and can substantiate the former advertised price using contemporaneous owner records.</span></label>
    <label className="flex min-h-11 items-start gap-3"><input type="checkbox" className="mt-1 h-5 w-5" checked={dtiReviewed} onChange={e => setDtiReviewed(e.target.checked)}/><span>I reviewed whether this promotion needs any DTI approval and obtained it where required.</span></label>
    <p role="status" aria-live="polite">{message}</p>{error && <p role="alert" className="text-danger">{error}</p>}
  </section>;
}
