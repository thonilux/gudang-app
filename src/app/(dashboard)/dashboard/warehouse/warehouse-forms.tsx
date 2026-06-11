"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";

import {
  createWarehouseLocationAction,
  createWarehouseStockItemAction,
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
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {label}
    </button>
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
      <input type="hidden" name="redirectTo" value="/dashboard/warehouse" />
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
  locations,
}: {
  locations: WarehouseLocationOption[];
}) {
  const [state, formAction, pending] = useActionState(createWarehouseStockItemAction, {} as WarehouseActionState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="redirectTo" value="/dashboard/warehouse" />
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">SKU</span>
          <input name="sku" className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600" required />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Nama stok</span>
          <input name="name" className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600" required />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Satuan</span>
          <input name="unit" defaultValue="pcs" className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600" required />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Kategori</span>
          <input name="category" className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600" />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
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
        <div className="grid grid-cols-2 gap-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Jumlah awal</span>
            <input name="currentQuantity" type="number" min="0" defaultValue={0} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600" />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Batas minimum</span>
            <input name="minimumQuantity" type="number" min="0" defaultValue={0} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600" />
          </label>
        </div>
      </div>
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Catatan</span>
        <textarea name="notes" rows={3} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600" />
      </label>
      {state.error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{state.error}</p> : null}
      <SubmitButton pending={pending} label="Simpan stok" />
    </form>
  );
}

export function WarehouseMovementForm({
  stockItemOptions,
  locations,
}: {
  stockItemOptions: Array<{ id: string; label: string }>;
  locations: WarehouseLocationOption[];
}) {
  const [state, formAction, pending] = useActionState(recordWarehouseMovementAction, {} as WarehouseActionState);

  return (
    <form action={formAction} className="space-y-4">
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
}: {
  stockItemOptions: Array<{ id: string; label: string }>;
}) {
  const [state, formAction, pending] = useActionState(recordWarehouseOpnameAction, {} as WarehouseActionState);

  return (
    <form action={formAction} className="space-y-4">
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
