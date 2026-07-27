"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { FormField, INPUT_CLASSES } from "@/components/ui/FormField";
import { Alert } from "@/components/ui/Alert";
import { CtaButton } from "@/components/ui/CtaButton";
import { ENQUIRY_SUCCESS_COPY } from "@/content/fallback-copy";
import { submitInquiryAction } from "@/app/(public)/book/actions";
import { initialEnquiryState } from "@/app/(public)/book/action-state";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <CtaButton type="submit" disabled={pending} aria-busy={pending} className="w-full sm:w-auto">
      {pending ? "Sending your enquiry…" : "Send Enquiry"}
    </CtaButton>
  );
}

export function EnquiryForm({
  source,
  utmSource,
  utmMedium,
  utmCampaign,
}: {
  source?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}) {
  const [state, formAction] = useActionState(submitInquiryAction, initialEnquiryState);

  const errors = state.fieldErrors ?? {};

  if (state.status === "success") {
    return (
      <Alert tone="success" title={ENQUIRY_SUCCESS_COPY.heading}>
        <p>{ENQUIRY_SUCCESS_COPY.body}</p>
        <p className="mt-2">{ENQUIRY_SUCCESS_COPY.reminder}</p>
        {state.referenceCode && state.referenceCode !== "TEN29-PENDING" ? (
          <p className="mt-2 font-semibold">Reference code: {state.referenceCode}</p>
        ) : null}
      </Alert>
    );
  }

  return (
    <form action={formAction} noValidate className="space-y-6">
      {state.status === "error" && state.message ? (
        <Alert tone="danger" title="Please review your enquiry">
          {state.message}
        </Alert>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="Full name" htmlFor="full_name" required error={errors.full_name}>
          <input
            id="full_name"
            name="full_name"
            type="text"
            required
            autoComplete="name"
            className={INPUT_CLASSES}
            aria-invalid={Boolean(errors.full_name)}
          />
        </FormField>

        <FormField label="Mobile number" htmlFor="mobile_number" required error={errors.mobile_number}>
          <input
            id="mobile_number"
            name="mobile_number"
            type="tel"
            required
            autoComplete="tel"
            placeholder="0917 123 4567"
            className={INPUT_CLASSES}
            aria-invalid={Boolean(errors.mobile_number)}
          />
        </FormField>

        <FormField
          label="Email"
          htmlFor="email"
          error={errors.email}
          hint="Optional — TEN29 will send an acknowledgement here if supplied."
        >
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            className={INPUT_CLASSES}
            aria-invalid={Boolean(errors.email)}
          />
        </FormField>

        <FormField label="Purpose of stay" htmlFor="purpose_of_stay" error={errors.purpose_of_stay}>
          <input
            id="purpose_of_stay"
            name="purpose_of_stay"
            type="text"
            placeholder="e.g. Family reunion"
            className={INPUT_CLASSES}
            aria-invalid={Boolean(errors.purpose_of_stay)}
          />
        </FormField>

        <FormField label="Check-in date" htmlFor="check_in_date" required error={errors.check_in_date}>
          <input
            id="check_in_date"
            name="check_in_date"
            type="date"
            required
            className={INPUT_CLASSES}
            aria-invalid={Boolean(errors.check_in_date)}
          />
        </FormField>

        <FormField label="Check-out date" htmlFor="check_out_date" required error={errors.check_out_date}>
          <input
            id="check_out_date"
            name="check_out_date"
            type="date"
            required
            className={INPUT_CLASSES}
            aria-invalid={Boolean(errors.check_out_date)}
          />
        </FormField>

        <FormField label="Adults" htmlFor="adults" required error={errors.adults}>
          <input
            id="adults"
            name="adults"
            type="number"
            min={1}
            max={10}
            defaultValue={2}
            required
            className={INPUT_CLASSES}
            aria-invalid={Boolean(errors.adults)}
          />
        </FormField>

        <FormField label="Children" htmlFor="children" error={errors.children}>
          <input
            id="children"
            name="children"
            type="number"
            min={0}
            max={10}
            defaultValue={0}
            className={INPUT_CLASSES}
            aria-invalid={Boolean(errors.children)}
          />
        </FormField>

        <FormField label="Day visitors" htmlFor="day_visitors" error={errors.day_visitors}>
          <input
            id="day_visitors"
            name="day_visitors"
            type="number"
            min={0}
            max={10}
            defaultValue={0}
            className={INPUT_CLASSES}
            aria-invalid={Boolean(errors.day_visitors)}
          />
        </FormField>

        <FormField label="Vehicles" htmlFor="vehicles" error={errors.vehicles}>
          <input
            id="vehicles"
            name="vehicles"
            type="number"
            min={0}
            max={5}
            defaultValue={1}
            className={INPUT_CLASSES}
            aria-invalid={Boolean(errors.vehicles)}
          />
        </FormField>
      </div>

      <FormField label="Message" htmlFor="message" error={errors.message}>
        <textarea
          id="message"
          name="message"
          rows={4}
          placeholder="Anything TEN29 should know about your stay"
          className={INPUT_CLASSES}
          aria-invalid={Boolean(errors.message)}
        />
      </FormField>

      <div className="flex items-start gap-3">
        <input
          id="privacy_consent"
          name="privacy_consent"
          type="checkbox"
          value="true"
          required
          className="mt-1 h-4 w-4 rounded-sm border-border text-forest focus-visible:outline-gold"
          aria-invalid={Boolean(errors.privacy_consent)}
        />
        <label htmlFor="privacy_consent" className="text-sm text-ink">
          I agree to the{" "}
          <a href="/privacy" className="underline text-forest">
            privacy notice
          </a>{" "}
          and understand this is an enquiry, not a confirmed booking.
        </label>
      </div>
      {errors.privacy_consent ? (
        <p role="alert" className="text-xs font-medium text-danger -mt-3">
          {errors.privacy_consent}
        </p>
      ) : null}

      {/* Honeypot field: real visitors never see or fill this. */}
      <div aria-hidden="true" className="absolute left-[-9999px] top-auto h-0 w-0 overflow-hidden">
        <label htmlFor="website">Leave this field empty</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {/*
        Client-only timestamp for the anti-bot timing check (src/lib/validation/inquiry-schema.ts).
        Set imperatively via a ref callback — which only runs in the browser,
        never during server rendering — instead of state+effect, so there's no
        server/client value mismatch and no render triggered by an effect.
      */}
      <input
        type="hidden"
        name="form_rendered_at"
        ref={(el) => {
          if (el && !el.value) el.value = String(Date.now());
        }}
      />
      <input type="hidden" name="source" value={source || "website"} />
      <input type="hidden" name="utm_source" value={utmSource || ""} />
      <input type="hidden" name="utm_medium" value={utmMedium || ""} />
      <input type="hidden" name="utm_campaign" value={utmCampaign || ""} />

      <SubmitButton />
    </form>
  );
}
