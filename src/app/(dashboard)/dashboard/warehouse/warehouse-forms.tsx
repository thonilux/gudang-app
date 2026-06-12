"use client";

import { useActionState, useEffect, useState, type ReactNode } from "react";
import { Loader2, Plus, X } from "lucide-react";

import {
  createWarehouseLocationAction,
  deleteWarehouseStockItemAction,
  createWarehouseStockItemAction,
  createWarehouseSerialItemAction,
  moveWarehouseSerialItemAction,
  updateWarehouseStockItemAction,
  recordWarehouseMovementAction,
  recordWarehouseOpnameAction,
  type WarehouseActionState,
} from "./actions";
import type { WarehouseLocationOption } from "@/lib/warehouse";
import { WAREHOUSE_MOVEMENT_TYPES } from "@/lib/warehouse-shared";

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

export function WarehouseModal({
  title,
  description,
  triggerLabel,
  children,
}: {
  title: string;
  description: string;
  triggerLabel: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
      >
        <Plus className="h-4 w-4" />
        {triggerLabel}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setOpen(false);
            }
          }}
        >
          <div className="w-full max-w-2xl overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Formulir</p>
                <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
                aria-label="Tutup modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[calc(100vh-10rem)] overflow-auto px-6 py-6">
              {children}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function WarehouseLocationForm({
  locations,
}: {
  locations: WarehouseLocationOption[];
}) {
  const [state, formAction, pending] = useActionState(createWarehouseLocationAction, {} as WarehouseActionState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="redirectTo" value="/warehouse" />
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Kode lokasi</span>
          <input name="code" className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600" required />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Nama lokasi</span>
          <input name="name" className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600" required />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Induk lokasi</span>
          <select name="parentLocationId" className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600" defaultValue="">
            <option value="">Tanpa induk</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Urutan tampil</span>
          <input name="sortOrder" type="number" min="0" defaultValue={0} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600" />
        </label>
      </div>
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Deskripsi</span>
        <textarea name="description" rows={3} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600" />
      </label>
      {state.error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{state.error}</p> : null}
      <SubmitButton pending={pending} label="Simpan lokasi" />
    </form>
  );
}

export function WarehouseStockItemForm({
  mode = "create",
  locations,
  initialValues,
  redirectTo = "/bhp",
}: {
  mode?: "create" | "edit";
  locations: WarehouseLocationOption[];
  redirectTo?: string;
  initialValues?: Partial<{
    id: string;
    sku: string;
    name: string;
    unit: string;
    category: string;
    locationId: string;
    currentQuantity: number;
    minimumQuantity: number;
    notes: string;
  }>;
}) {
  const [state, formAction, pending] = useActionState(
    mode === "create" ? createWarehouseStockItemAction : updateWarehouseStockItemAction,
    {} as WarehouseActionState,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteWarehouseStockItemAction,
    {} as WarehouseActionState,
  );
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <div className="space-y-4">
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="redirectTo" value={redirectTo} />
        {mode === "edit" ? <input type="hidden" name="id" value={initialValues?.id ?? ""} /> : null}
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Kode bahan habis pakai</span>
            <input name="sku" defaultValue={initialValues?.sku ?? ""} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600" required />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Nama bahan habis pakai</span>
            <input name="name" defaultValue={initialValues?.name ?? ""} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600" required />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Satuan</span>
            <input name="unit" defaultValue={initialValues?.unit ?? "pcs"} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600" required />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Kategori</span>
            <input name="category" defaultValue={initialValues?.category ?? ""} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600" />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Lokasi</span>
            <select name="locationId" className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600" defaultValue={initialValues?.locationId ?? ""}>
              <option value="">Tanpa lokasi</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.label}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Jumlah awal</span>
              <input name="currentQuantity" type="number" min="0" defaultValue={initialValues?.currentQuantity ?? 0} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600" />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Batas minimum</span>
              <input name="minimumQuantity" type="number" min="0" defaultValue={initialValues?.minimumQuantity ?? 0} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600" />
            </label>
          </div>
        </div>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Catatan</span>
          <textarea name="notes" rows={3} defaultValue={initialValues?.notes ?? ""} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600" />
        </label>
        {state.error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{state.error}</p> : null}
        <SubmitButton pending={pending} label={mode === "create" ? "Simpan stok" : "Simpan perubahan"} />
      </form>

      {mode === "edit" && initialValues?.id ? (
        <>
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
          >
            Hapus stok
          </button>

          {deleteOpen ? (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                  setDeleteOpen(false);
                }
              }}
            >
              <div className="w-full max-w-lg overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-2xl">
                <div className="border-b border-slate-200 bg-slate-50 px-6 py-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-600">Konfirmasi</p>
                  <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">
                    Hapus stok {initialValues.sku}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Aksi ini akan menandai stok sebagai terhapus, lalu menambahkan log mutasi
                    penghapusan. Riwayat tetap tersimpan untuk audit dan penelusuran.
                  </p>
                </div>
                <div className="px-6 py-6">
                  <form
                    action={deleteAction}
                    className="space-y-3"
                  >
                    <input type="hidden" name="id" value={initialValues.id} />
                    <input type="hidden" name="redirectTo" value={redirectTo} />
                    {deleteState.error ? (
                      <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                        {deleteState.error}
                      </p>
                    ) : null}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setDeleteOpen(false)}
                        className="inline-flex items-center justify-center rounded-xl border border-border bg-panel px-4 py-3 text-sm font-semibold text-text transition hover:bg-panelAlt"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={deletePending}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deletePending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        Understand
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export function WarehouseMovementForm({
  stockItemOptions,
  locations,
  redirectTo = "/bhp",
}: {
  stockItemOptions: Array<{ id: string; label: string }>;
  locations: WarehouseLocationOption[];
  redirectTo?: string;
}) {
  const [state, formAction, pending] = useActionState(recordWarehouseMovementAction, {} as WarehouseActionState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Stok</span>
        <select name="stockItemId" className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600" required defaultValue="">
          <option value="">Pilih stok</option>
          {stockItemOptions.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Jenis mutasi</span>
          <select name="movementType" className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600" defaultValue="in">
            {WAREHOUSE_MOVEMENT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Jumlah</span>
          <input name="quantity" type="number" min="1" defaultValue={1} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600" required />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Dari lokasi</span>
          <select name="fromLocationId" className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600" defaultValue="">
            <option value="">Tidak diisi</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Ke lokasi</span>
          <select name="toLocationId" className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600" defaultValue="">
            <option value="">Tidak diisi</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Catatan</span>
        <textarea name="note" rows={3} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600" />
      </label>
      {state.error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{state.error}</p> : null}
      <SubmitButton pending={pending} label="Simpan mutasi" />
    </form>
  );
}

export function WarehouseOpnameForm({
  stockItemOptions,
  redirectTo = "/bhp",
}: {
  stockItemOptions: Array<{ id: string; label: string }>;
  redirectTo?: string;
}) {
  const [state, formAction, pending] = useActionState(recordWarehouseOpnameAction, {} as WarehouseActionState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Stok</span>
        <select name="stockItemId" className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600" required defaultValue="">
          <option value="">Pilih stok</option>
          {stockItemOptions.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Hasil hitung</span>
        <input name="countedQuantity" type="number" min="0" defaultValue={0} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600" required />
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Catatan opname</span>
        <textarea name="note" rows={3} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600" />
      </label>
      {state.error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{state.error}</p> : null}
      <SubmitButton pending={pending} label="Simpan opname" />
    </form>
  );
}

const SERIAL_STATUS_OPTIONS = [
  { value: "ready", label: "Siap" },
  { value: "in_use", label: "Dipakai" },
  { value: "maintenance", label: "Perbaikan" },
  { value: "retired", label: "Pensiun" },
] as const;

export function WarehouseSerialItemForm({
  locations,
}: {
  locations: WarehouseLocationOption[];
}) {
  const [state, formAction, pending] = useActionState(createWarehouseSerialItemAction, {} as WarehouseActionState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="redirectTo" value="/warehouse" />
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">ID peralatan</span>
          <input name="serialNumber" className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600" required />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Nama peralatan</span>
          <input name="name" className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600" required />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Kategori</span>
          <input name="category" className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600" />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Status</span>
          <select name="status" defaultValue="ready" className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600">
            {SERIAL_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Lokasi</span>
        <select name="locationId" className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600" defaultValue="">
          <option value="">Tanpa lokasi</option>
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Catatan</span>
        <textarea name="notes" rows={3} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600" />
      </label>
      {state.error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{state.error}</p> : null}
      <SubmitButton pending={pending} label="Simpan peralatan" />
    </form>
  );
}

export function WarehouseSerialMoveForm({
  serialItemOptions,
  locations,
}: {
  serialItemOptions: Array<{ id: string; label: string }>;
  locations: WarehouseLocationOption[];
}) {
  const [state, formAction, pending] = useActionState(moveWarehouseSerialItemAction, {} as WarehouseActionState);

  return (
    <form action={formAction} className="space-y-4">
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Peralatan</span>
        <select name="serialItemId" className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600" required defaultValue="">
          <option value="">Pilih peralatan</option>
          {serialItemOptions.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Lokasi baru</span>
        <select name="locationId" className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600" defaultValue="">
          <option value="">Tanpa lokasi</option>
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Catatan perpindahan</span>
        <textarea name="note" rows={3} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600" />
      </label>
      {state.error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{state.error}</p> : null}
      <SubmitButton pending={pending} label="Simpan perpindahan" />
    </form>
  );
}
