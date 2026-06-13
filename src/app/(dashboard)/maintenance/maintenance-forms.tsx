"use client";

import { useActionState, useMemo, useState } from "react";
import { Loader2, Package, Plus, TicketCheck, Trash2, Wrench } from "lucide-react";

import {
  addMaintenanceActionAction,
  addMaintenanceAttachmentAction,
  addMaintenancePartUsageAction,
  deleteMaintenancePartAction,
  deleteMaintenanceVendorAction,
  closeMaintenanceTicketAction,
  createMaintenancePartAction,
  createMaintenanceTicketAction,
  createMaintenanceVendorAction,
  updateMaintenanceTicketAction,
  updateMaintenancePartAction,
  updateMaintenanceVendorAction,
  type MaintenanceActionState,
} from "./actions";

type SelectOption = {
  id: string;
  label: string;
};

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

function ErrorNote({ state }: { state: MaintenanceActionState }) {
  if (!state.error) {
    return null;
  }

  return (
    <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
      {state.error}
    </p>
  );
}

const TICKET_STATUS_OPTIONS = [
  { value: "open", label: "Baru" },
  { value: "in_progress", label: "Berjalan" },
  { value: "waiting_parts", label: "Menunggu part" },
  { value: "closed", label: "Tutup" },
  { value: "cancelled", label: "Batal" },
] as const;

const PRIORITY_OPTIONS = [
  { value: "low", label: "Rendah" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "Tinggi" },
  { value: "urgent", label: "Mendesak" },
] as const;

const ACTION_TYPE_OPTIONS = [
  { value: "diagnosis", label: "Diagnosis" },
  { value: "repair", label: "Perbaikan" },
  { value: "replacement", label: "Penggantian" },
  { value: "note", label: "Catatan" },
  { value: "test", label: "Uji" },
] as const;

const ATTACHMENT_KIND_OPTIONS = [
  { value: "photo", label: "Foto" },
  { value: "document", label: "Dokumen" },
] as const;

const ATTACHMENT_STAGE_OPTIONS = [
  { value: "before", label: "Sebelum" },
  { value: "after", label: "Sesudah" },
  { value: "other", label: "Lainnya" },
] as const;

export function MaintenanceTicketForm({
  mode,
  equipmentOptions,
  vendorOptions,
  initialValues,
  redirectTo = "/maintenance",
}: {
  mode: "create" | "edit";
  equipmentOptions: SelectOption[];
  vendorOptions: SelectOption[];
  redirectTo?: string;
  initialValues?: Partial<{
    id: string;
    equipmentId: string;
    vendorId: string;
    subject: string;
    complaint: string;
    diagnosis: string;
    actionPlan: string;
    status: (typeof TICKET_STATUS_OPTIONS)[number]["value"];
    priority: (typeof PRIORITY_OPTIONS)[number]["value"];
    dueAt: string;
    estimatedCost: number;
    actualCost: number;
  }>;
}) {
  const [state, formAction, pending] = useActionState(
    mode === "create" ? createMaintenanceTicketAction : updateMaintenanceTicketAction,
    {} as MaintenanceActionState,
  );

  return (
    <form action={formAction} className="space-y-4">
      {mode === "edit" ? <input type="hidden" name="id" value={initialValues?.id ?? ""} /> : null}
      <input type="hidden" name="redirectTo" value={redirectTo} />

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Peralatan</span>
          <select
            name="equipmentId"
            defaultValue={initialValues?.equipmentId ?? ""}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600"
            required
          >
            <option value="">Pilih peralatan</option>
            {equipmentOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Vendor</span>
          <select
            name="vendorId"
            defaultValue={initialValues?.vendorId ?? ""}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600"
          >
            <option value="">Tanpa vendor</option>
            {vendorOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Judul ticket</span>
        <input
          name="subject"
          defaultValue={initialValues?.subject ?? ""}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600"
          required
        />
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Keluhan</span>
          <textarea
            name="complaint"
            rows={4}
            defaultValue={initialValues?.complaint ?? ""}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600"
            required
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Diagnosis</span>
          <textarea
            name="diagnosis"
            rows={4}
            defaultValue={initialValues?.diagnosis ?? ""}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600"
          />
        </label>
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Rencana tindakan</span>
        <textarea
          name="actionPlan"
          rows={3}
          defaultValue={initialValues?.actionPlan ?? ""}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600"
        />
      </label>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Status</span>
          <select
            name="status"
            defaultValue={initialValues?.status ?? "open"}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600"
            required
          >
            {TICKET_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Prioritas</span>
          <select
            name="priority"
            defaultValue={initialValues?.priority ?? "normal"}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600"
            required
          >
            {PRIORITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Target selesai</span>
          <input
            name="dueAt"
            type="date"
            defaultValue={initialValues?.dueAt ?? ""}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600"
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Estimasi biaya</span>
          <input
            name="estimatedCost"
            type="number"
            min="0"
            defaultValue={initialValues?.estimatedCost ?? 0}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Biaya aktual</span>
          <input
            name="actualCost"
            type="number"
            min="0"
            defaultValue={initialValues?.actualCost ?? 0}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600"
          />
        </label>
      </div>

      <ErrorNote state={state} />
      <SubmitButton pending={pending} label={mode === "create" ? "Simpan ticket" : "Simpan perubahan"} />
    </form>
  );
}

export function MaintenanceActionForm({
  ticketId,
  redirectTo = "/maintenance",
}: {
  ticketId: string;
  redirectTo?: string;
}) {
  const [state, formAction, pending] = useActionState(addMaintenanceActionAction, {} as MaintenanceActionState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="ticketId" value={ticketId} />
      <input type="hidden" name="redirectTo" value={redirectTo} />

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Jenis tindakan</span>
          <select
            name="actionType"
            defaultValue="diagnosis"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600"
          >
            {ACTION_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Biaya</span>
          <input
            name="cost"
            type="number"
            min="0"
            defaultValue={0}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600"
          />
        </label>
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Deskripsi tindakan</span>
        <textarea
          name="description"
          rows={4}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600"
          required
        />
      </label>

      <ErrorNote state={state} />
      <SubmitButton pending={pending} label="Simpan tindakan" />
    </form>
  );
}

export function MaintenanceAttachmentForm({
  ticketId,
  redirectTo = "/maintenance",
}: {
  ticketId: string;
  redirectTo?: string;
}) {
  const [state, formAction, pending] = useActionState(
    addMaintenanceAttachmentAction,
    {} as MaintenanceActionState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="ticketId" value={ticketId} />
      <input type="hidden" name="redirectTo" value={redirectTo} />

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Jenis lampiran</span>
          <select
            name="kind"
            defaultValue="photo"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600"
          >
            {ATTACHMENT_KIND_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Tahap</span>
          <select
            name="stage"
            defaultValue="before"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600"
          >
            {ATTACHMENT_STAGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Judul</span>
          <input
            name="title"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600"
            required
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Nama file</span>
          <input
            name="fileName"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600"
            required
          />
        </label>
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Tautan file</span>
        <input
          name="storageUrl"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Catatan</span>
        <textarea
          name="note"
          rows={3}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600"
        />
      </label>

      <ErrorNote state={state} />
      <SubmitButton pending={pending} label="Simpan lampiran" />
    </form>
  );
}

export function MaintenanceVendorForm({
  mode = "create",
  initialValues,
  redirectTo = "/maintenance",
}: {
  mode?: "create" | "edit";
  initialValues?: Partial<{
    id: string;
    code: string;
    name: string;
    contactName: string;
    phone: string;
    email: string;
    notes: string;
  }>;
  redirectTo?: string;
}) {
  const [state, formAction, pending] = useActionState(
    mode === "create" ? createMaintenanceVendorAction : updateMaintenanceVendorAction,
    {} as MaintenanceActionState,
  );

  return (
    <form action={formAction} className="space-y-4">
      {mode === "edit" ? <input type="hidden" name="id" value={initialValues?.id ?? ""} /> : null}
      <input type="hidden" name="redirectTo" value={redirectTo} />

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Kode vendor</span>
          <input
            name="code"
            defaultValue={initialValues?.code ?? ""}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600"
            required
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Nama vendor</span>
          <input
            name="name"
            defaultValue={initialValues?.name ?? ""}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600"
            required
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Kontak</span>
          <input
            name="contactName"
            defaultValue={initialValues?.contactName ?? ""}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Telepon</span>
          <input
            name="phone"
            defaultValue={initialValues?.phone ?? ""}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600"
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Email</span>
          <input
            name="email"
            type="email"
            defaultValue={initialValues?.email ?? ""}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Catatan</span>
          <input
            name="notes"
            defaultValue={initialValues?.notes ?? ""}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600"
          />
        </label>
      </div>

      <ErrorNote state={state} />
      <SubmitButton pending={pending} label={mode === "create" ? "Simpan vendor" : "Simpan perubahan"} />
    </form>
  );
}

export function MaintenancePartForm({
  mode = "create",
  initialValues,
  redirectTo = "/maintenance",
}: {
  mode?: "create" | "edit";
  initialValues?: Partial<{
    id: string;
    code: string;
    name: string;
    unit: string;
    notes: string;
  }>;
  redirectTo?: string;
}) {
  const [state, formAction, pending] = useActionState(
    mode === "create" ? createMaintenancePartAction : updateMaintenancePartAction,
    {} as MaintenanceActionState,
  );

  return (
    <form action={formAction} className="space-y-4">
      {mode === "edit" ? <input type="hidden" name="id" value={initialValues?.id ?? ""} /> : null}
      <input type="hidden" name="redirectTo" value={redirectTo} />

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Kode part</span>
          <input
            name="code"
            defaultValue={initialValues?.code ?? ""}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600"
            required
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Nama part</span>
          <input
            name="name"
            defaultValue={initialValues?.name ?? ""}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600"
            required
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Satuan</span>
          <input
            name="unit"
            defaultValue={initialValues?.unit ?? "pcs"}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600"
            required
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Catatan</span>
          <input
            name="notes"
            defaultValue={initialValues?.notes ?? ""}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600"
          />
        </label>
      </div>

      <ErrorNote state={state} />
      <SubmitButton pending={pending} label={mode === "create" ? "Simpan part" : "Simpan perubahan"} />
    </form>
  );
}

function DestructiveDeleteForm({
  action,
  id,
  redirectTo,
  pendingLabel,
  confirmLabel,
}: {
  action: (state: MaintenanceActionState, formData: FormData) => Promise<MaintenanceActionState>;
  id: string;
  redirectTo?: string;
  pendingLabel: string;
  confirmLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {} as MaintenanceActionState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="redirectTo" value={redirectTo ?? "/maintenance"} />
      <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
        {confirmLabel}
      </p>
      <ErrorNote state={state} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        {pendingLabel}
      </button>
    </form>
  );
}

export function MaintenanceVendorDeleteForm({
  id,
  label,
  redirectTo = "/maintenance",
}: {
  id: string;
  label: string;
  redirectTo?: string;
}) {
  return (
    <DestructiveDeleteForm
      action={deleteMaintenanceVendorAction}
      id={id}
      redirectTo={redirectTo}
      pendingLabel="Hapus vendor"
      confirmLabel={`Vendor ${label} akan dihapus dan tidak bisa dipakai lagi di ticket baru.`}
    />
  );
}

export function MaintenancePartDeleteForm({
  id,
  label,
  redirectTo = "/maintenance",
}: {
  id: string;
  label: string;
  redirectTo?: string;
}) {
  return (
    <DestructiveDeleteForm
      action={deleteMaintenancePartAction}
      id={id}
      redirectTo={redirectTo}
      pendingLabel="Hapus part"
      confirmLabel={`Part ${label} akan dihapus dari master maintenance.`}
    />
  );
}

export function MaintenancePartUsageForm({
  ticketId,
  partOptions,
  redirectTo = "/maintenance",
}: {
  ticketId: string;
  partOptions: SelectOption[];
  redirectTo?: string;
}) {
  const [state, formAction, pending] = useActionState(
    addMaintenancePartUsageAction,
    {} as MaintenanceActionState,
  );
  const [selectedPartId, setSelectedPartId] = useState("");
  const selectedPart = useMemo(
    () => partOptions.find((option) => option.id === selectedPartId),
    [partOptions, selectedPartId],
  );
  const [snapshot, setSnapshot] = useState("");

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="ticketId" value={ticketId} />
      <input type="hidden" name="redirectTo" value={redirectTo} />

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Part</span>
          <select
            name="partId"
            value={selectedPartId}
            onChange={(event) => {
              const nextValue = event.target.value;
              setSelectedPartId(nextValue);
              const nextPart = partOptions.find((option) => option.id === nextValue);
              if (nextPart) {
                setSnapshot(nextPart.label);
              }
            }}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600"
          >
            <option value="">Pilih part</option>
            {partOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Nama snapshot</span>
          <input
            name="partNameSnapshot"
            value={snapshot}
            onChange={(event) => setSnapshot(event.target.value)}
            placeholder={selectedPart?.label ?? "Isi nama part"}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600"
            required
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Jumlah</span>
          <input
            name="quantity"
            type="number"
            min="1"
            defaultValue={1}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600"
            required
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Biaya satuan</span>
          <input
            name="unitCost"
            type="number"
            min="0"
            defaultValue={0}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600"
          />
        </label>
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Catatan</span>
        <textarea
          name="note"
          rows={3}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600"
        />
      </label>

      <ErrorNote state={state} />
      <SubmitButton pending={pending} label="Simpan pemakaian" />
    </form>
  );
}

export function MaintenanceTicketCloseForm({
  ticketId,
  actualCost,
  redirectTo = "/maintenance",
}: {
  ticketId: string;
  actualCost: number;
  redirectTo?: string;
}) {
  const [state, formAction, pending] = useActionState(closeMaintenanceTicketAction, {} as MaintenanceActionState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={ticketId} />
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Biaya aktual saat ini</span>
        <input
          name="actualCost"
          type="number"
          min="0"
          defaultValue={actualCost}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600"
        />
      </label>

      <ErrorNote state={state} />
      <SubmitButton pending={pending} label="Tutup ticket" />
    </form>
  );
}

export {
  Package,
  Plus,
  TicketCheck,
  Wrench,
};
