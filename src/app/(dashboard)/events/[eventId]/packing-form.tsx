"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";

import { generateEventPackingListAction, type EventPackingActionState } from "./packing-actions";

function SubmitButton({ pending }: { pending: boolean }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      Generate packing list
    </button>
  );
}

function ErrorNote({ state }: { state: EventPackingActionState }) {
  if (!state.error) {
    return null;
  }

  return (
    <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
      {state.error}
    </p>
  );
}

export function EventPackingGenerateForm({
  eventId,
  redirectTo,
}: {
  eventId: string;
  redirectTo: string;
}) {
  const [state, formAction, pending] = useActionState(generateEventPackingListAction, {} as EventPackingActionState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="redirectTo" value={redirectTo} />

      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Catatan packing list</span>
        <textarea
          name="note"
          className="min-h-24 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600"
          placeholder="Opsional, misal referensi briefing atau loading team"
        />
      </label>

      <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
        Packing list akan dibuat dari booking aktif event ini dan disimpan sebagai snapshot.
      </p>

      <ErrorNote state={state} />
      <SubmitButton pending={pending} />
    </form>
  );
}
