"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";

import {
  generateEventChecklistsAction,
  recordEventWorkflowScanAction,
  toggleEventChecklistItemAction,
  type EventWorkflowActionState,
} from "./workflow-actions";

function SubmitButton({ pending, label }: { pending: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {label}
    </button>
  );
}

function ErrorNote({ state }: { state: EventWorkflowActionState }) {
  if (!state.error) {
    return null;
  }

  return (
    <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
      {state.error}
    </p>
  );
}

export function EventWorkflowScanForm({
  eventId,
  redirectTo,
  mode,
}: {
  eventId: string;
  redirectTo: string;
  mode: "loading" | "return";
}) {
  const [state, formAction, pending] = useActionState(recordEventWorkflowScanAction, {} as EventWorkflowActionState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="redirectTo" value={redirectTo} />

      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Kode equipment</span>
        <input
          name="equipmentCode"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600"
          placeholder="Scan QR atau ketik kode equipment"
          required
        />
      </label>

      {mode === "return" ? (
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Equipment rusak?</span>
          <select
            name="damaged"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600"
            defaultValue="false"
          >
            <option value="false">Tidak</option>
            <option value="true">Ya</option>
          </select>
        </label>
      ) : null}

      {mode === "return" ? (
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Catatan kerusakan</span>
          <textarea
            name="damageNote"
            className="min-h-24 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600"
            placeholder="Isi bila ada damage atau temuan"
          />
        </label>
      ) : null}

      <ErrorNote state={state} />
      <SubmitButton pending={pending} label={mode === "loading" ? "Scan loading" : "Scan return"} />
    </form>
  );
}

export function EventChecklistGenerateForm({
  eventId,
  redirectTo,
}: {
  eventId: string;
  redirectTo: string;
}) {
  const [state, formAction, pending] = useActionState(generateEventChecklistsAction, {} as EventWorkflowActionState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="checklistStage" value="loading" />
      <input type="hidden" name="mode" value="loading" />
      <input type="hidden" name="redirectTo" value={redirectTo} />

      <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
        Sistem akan menurunkan checklist loading dari packing list aktif, lalu menyiapkan checklist return standar.
      </p>

      <ErrorNote state={state} />
      <SubmitButton pending={pending} label="Generate checklist" />
    </form>
  );
}

export function ChecklistItemToggleForm({
  eventId,
  checklistId,
  checklistItemId,
  redirectTo,
  completed,
  label,
}: {
  eventId: string;
  checklistId: string;
  checklistItemId: string;
  redirectTo: string;
  completed: boolean;
  label: string;
}) {
  const [state, formAction, pending] = useActionState(toggleEventChecklistItemAction, {} as EventWorkflowActionState);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="checklistId" value={checklistId} />
      <input type="hidden" name="checklistItemId" value={checklistItemId} />
      <input type="hidden" name="redirectTo" value={redirectTo} />

      <button
        type="submit"
        disabled={pending}
        className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-70 ${
          completed
            ? "border-emerald-200 bg-emerald-600 text-white hover:bg-emerald-700"
            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
        }`}
      >
        {label}
      </button>

      <ErrorNote state={state} />
    </form>
  );
}
