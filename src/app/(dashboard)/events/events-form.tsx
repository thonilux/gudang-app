"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";

import { createEventAction, updateEventAction, type EventActionState } from "./actions";

type EventFormValues = Partial<{
  id: string;
  name: string;
  clientName: string;
  venueName: string;
  status: "draft" | "booked" | "loading" | "returned" | "cancelled";
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  notes: string;
}>;

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

function ErrorNote({ state }: { state: EventActionState }) {
  if (!state.error) {
    return null;
  }

  return (
    <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
      {state.error}
    </p>
  );
}

function splitDateTime(value?: string | Date | null) {
  if (!value) {
    return { date: "", time: "" };
  }

  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return { date: "", time: "" };
  }

  return {
    date: parsed.toISOString().slice(0, 10),
    time: parsed.toISOString().slice(11, 16),
  };
}

export function EventUpsertForm({
  mode = "create",
  initialValues,
  redirectTo = "/events",
}: {
  mode?: "create" | "edit";
  initialValues?: EventFormValues;
  redirectTo?: string;
}) {
  const [state, formAction, pending] = useActionState(
    mode === "create" ? createEventAction : updateEventAction,
    {} as EventActionState,
  );
  const start = splitDateTime(initialValues?.startDate ?? null);
  const end = splitDateTime(initialValues?.endDate ?? null);

  return (
    <form action={formAction} className="space-y-4">
      {mode === "edit" ? <input type="hidden" name="id" value={initialValues?.id ?? ""} /> : null}
      <input type="hidden" name="redirectTo" value={redirectTo} />

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Nama event</span>
          <input
            name="name"
            defaultValue={initialValues?.name ?? ""}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600"
            placeholder="Contoh: Wedding Sinta & Raka"
            required
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Nama klien</span>
          <input
            name="clientName"
            defaultValue={initialValues?.clientName ?? ""}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600"
            placeholder="Contoh: Sinta"
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Status awal</span>
          <select
            name="status"
            defaultValue={initialValues?.status ?? "draft"}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600"
          >
            <option value="draft">Draft</option>
            <option value="booked">Booked</option>
            <option value="loading">Loading</option>
            <option value="returned">Returned</option>
            <option value="cancelled">Batal</option>
          </select>
          <p className="text-xs leading-5 text-slate-500">
            Bisa mulai dari tahap yang sesuai alur kerja event.
          </p>
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Lokasi venue</span>
          <input
            name="venueName"
            defaultValue={initialValues?.venueName ?? ""}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600"
            placeholder="Contoh: Gedung Serbaguna"
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Tanggal mulai</span>
          <input
            name="startDate"
            type="date"
            defaultValue={start.date}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Jam mulai</span>
          <input
            name="startTime"
            type="time"
            defaultValue={start.time}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600"
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Tanggal selesai</span>
          <input
            name="endDate"
            type="date"
            defaultValue={end.date}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Jam selesai</span>
          <input
            name="endTime"
            type="time"
            defaultValue={end.time}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600"
          />
        </label>
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Catatan</span>
        <input
          name="notes"
          defaultValue={initialValues?.notes ?? ""}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600"
          placeholder="Catatan kebutuhan, kontak, atau info penting"
        />
      </label>

      <ErrorNote state={state} />
      <SubmitButton pending={pending} label={mode === "create" ? "Simpan event" : "Simpan perubahan"} />
    </form>
  );
}

export { EventUpsertForm as EventCreateForm };
