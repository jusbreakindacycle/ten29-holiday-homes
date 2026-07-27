"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updateInquiryNotesAction } from "@/app/admin/(protected)/actions";
import { initialAdminActionState } from "@/app/admin/(protected)/action-state";
import { Alert } from "@/components/ui/Alert";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-sm border border-forest px-4 py-2 text-sm font-semibold text-forest disabled:opacity-60"
    >
      {pending ? "Saving…" : "Save Notes"}
    </button>
  );
}

export function NotesForm({ id, currentNotes }: { id: string; currentNotes: string | null }) {
  const [state, formAction] = useActionState(updateInquiryNotesAction, initialAdminActionState);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <label htmlFor="owner_notes" className="block text-xs font-semibold text-muted">
        Owner notes (internal only)
      </label>
      <textarea
        id="owner_notes"
        name="owner_notes"
        rows={4}
        defaultValue={currentNotes ?? ""}
        className="w-full rounded-sm border border-border px-3 py-2 text-sm"
      />
      <SubmitButton />
      {state.status !== "idle" && state.message ? (
        <Alert tone={state.status === "success" ? "success" : "danger"}>{state.message}</Alert>
      ) : null}
    </form>
  );
}
