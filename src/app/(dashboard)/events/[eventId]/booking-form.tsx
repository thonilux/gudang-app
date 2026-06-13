"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";

import {
  bookEventEquipmentAction,
  type EventBookingActionState,
} from "./booking-actions";

type EquipmentOption = {
  id: string;
  code: string;
  name: string;
  categoryName: string | null;
  locationLabel: string | null;
  brand: string;
  model: string;
  serialNumber: string | null;
};

function SubmitButton({ pending }: { pending: boolean }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      Simpan booking
    </button>
  );
}

function ErrorNote({ state }: { state: EventBookingActionState }) {
  if (!state.error) {
    return null;
  }

  return (
    <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
      {state.error}
    </p>
  );
}

export function EventEquipmentBookingForm({
  eventId,
  redirectTo,
  equipmentOptions,
}: {
  eventId: string;
  redirectTo: string;
  equipmentOptions: EquipmentOption[];
}) {
  const [state, formAction, pending] = useActionState(bookEventEquipmentAction, {} as EventBookingActionState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="redirectTo" value={redirectTo} />

      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Equipment siap pakai</span>
        <select
          name="equipmentId"
          required
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600"
        >
          <option value="">Pilih equipment</option>
          {equipmentOptions.map((item) => (
            <option key={item.id} value={item.id}>
              {item.code} - {item.name}
            </option>
          ))}
        </select>
        <p className="text-xs leading-5 text-slate-500">
          Hanya equipment berstatus siap pakai yang ditampilkan.
        </p>
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Catatan booking</span>
        <input
          name="note"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600"
          placeholder="Misal: butuh case tambahan atau kabel cadangan"
        />
      </label>

      <ErrorNote state={state} />
      <SubmitButton pending={pending} />
    </form>
  );
}
