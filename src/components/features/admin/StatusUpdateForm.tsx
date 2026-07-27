"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updateInquiryStatusAction } from "@/app/admin/(protected)/actions";
import { initialAdminActionState } from "@/app/admin/(protected)/action-state";
import { INQUIRY_STATUSES, type InquiryStatus } from "@/types/inquiry";
import { Alert } from "@/components/ui/Alert";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-sm bg-forest px-4 py-2 text-sm font-semibold text-ivory disabled:opacity-60"
    >
      {pending ? "Saving…" : "Update Status"}
    </button>
  );
}

export function StatusUpdateForm({ id, currentStatus }: { id: string; currentStatus: InquiryStatus }) {
  const [state, formAction] = useActionState(updateInquiryStatusAction, initialAdminActionState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="id" value={id} />
      <div>
        <label htmlFor="status" className="block text-xs font-semibold text-muted mb-1">
          Status
        </label>
        <select
          id="status"
          name="status"
          defaultValue={currentStatus}
          className="rounded-sm border border-border px-3 py-2 text-sm"
        >
          {INQUIRY_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <SubmitButton />
      {state.status !== "idle" && state.message ? (
        <Alert tone={state.status === "success" ? "success" : "danger"} className="w-full">
          {state.message}
        </Alert>
      ) : null}
    </form>
  );
}
