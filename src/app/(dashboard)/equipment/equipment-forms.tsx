"use client";

import { useActionState, useState } from "react";
import { Loader2 } from "lucide-react";

import {
  addEquipmentDocumentAction,
  changeEquipmentLocationAction,
  changeEquipmentStatusAction,
  createEquipmentAction,
  updateEquipmentAction,
} from "./actions";
import {
  EQUIPMENT_STATUS_OPTIONS,
  type EquipmentCategoryOption,
  type EquipmentLocationOption,
  type EquipmentStatusValue,
} from "@/lib/equipment-shared";

type EquipmentValues = {
  id?: string;
  code: string;
  name: string;
  categoryId: string;
  locationId: string;
  brand: string;
  model: string;
  serialNumber: string;
  status: EquipmentStatusValue;
  conditionNote: string;
  specificationNote: string;
  notes: string;
  lastInspectionAt: string;
  nextInspectionAt: string;
};

const emptyEquipmentValues: EquipmentValues = {
  code: "",
  name: "",
  categoryId: "",
  locationId: "",
  brand: "",
  model: "",
  serialNumber: "",
  status: "ready",
  conditionNote: "",
  specificationNote: "",
  notes: "",
  lastInspectionAt: "",
  nextInspectionAt: "",
};

export function EquipmentUpsertForm({
  mode,
  categories,
  locations,
  initialValues,
}: {
  mode: "create" | "edit";
  categories: EquipmentCategoryOption[];
  locations: EquipmentLocationOption[];
  initialValues?: Partial<EquipmentValues>;
}) {
  const [state, formAction, pending] = useActionState(
    mode === "create" ? createEquipmentAction : updateEquipmentAction,
    {},
  );
  const [values, setValues] = useState<EquipmentValues>({
    ...emptyEquipmentValues,
    ...initialValues,
  });

  return (
    <form action={formAction} className="space-y-4">
      {mode === "edit" ? <input type="hidden" name="id" value={values.id ?? ""} /> : null}
      <input
        type="hidden"
        name="redirectTo"
        value={
          initialValues?.id ? `/equipment/${initialValues.id}` : "/equipment"
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Kode peralatan</span>
          <input
            name="code"
            value={values.code}
            onChange={(event) => setValues((current) => ({ ...current, code: event.target.value }))}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600"
            required
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Nama peralatan</span>
          <input
            name="name"
            value={values.name}
            onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600"
            required
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Kategori</span>
          <select
            name="categoryId"
            value={values.categoryId}
            onChange={(event) => setValues((current) => ({ ...current, categoryId: event.target.value }))}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600"
            required
          >
            <option value="">Pilih kategori</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Lokasi saat ini</span>
          <select
            name="locationId"
            value={values.locationId}
            onChange={(event) => setValues((current) => ({ ...current, locationId: event.target.value }))}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600"
          >
            <option value="">Tanpa lokasi</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Merek</span>
          <input
            name="brand"
            value={values.brand}
            onChange={(event) => setValues((current) => ({ ...current, brand: event.target.value }))}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Model</span>
          <input
            name="model"
            value={values.model}
            onChange={(event) => setValues((current) => ({ ...current, model: event.target.value }))}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Nomor seri</span>
          <input
            name="serialNumber"
            value={values.serialNumber}
            onChange={(event) =>
              setValues((current) => ({ ...current, serialNumber: event.target.value }))
            }
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600"
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Status</span>
          <select
            name="status"
            value={values.status}
            onChange={(event) =>
              setValues((current) => ({ ...current, status: event.target.value as EquipmentStatusValue }))
            }
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600"
            required
          >
            {EQUIPMENT_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Inspeksi terakhir</span>
          <input
            name="lastInspectionAt"
            type="date"
            value={values.lastInspectionAt}
            onChange={(event) =>
              setValues((current) => ({ ...current, lastInspectionAt: event.target.value }))
            }
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Inspeksi berikutnya</span>
          <input
            name="nextInspectionAt"
            type="date"
            value={values.nextInspectionAt}
            onChange={(event) =>
              setValues((current) => ({ ...current, nextInspectionAt: event.target.value }))
            }
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600"
          />
        </label>
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Catatan kondisi</span>
        <textarea
          name="conditionNote"
          rows={3}
          value={values.conditionNote}
          onChange={(event) =>
            setValues((current) => ({ ...current, conditionNote: event.target.value }))
          }
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Spesifikasi singkat</span>
        <textarea
          name="specificationNote"
          rows={3}
          value={values.specificationNote}
          onChange={(event) =>
            setValues((current) => ({ ...current, specificationNote: event.target.value }))
          }
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Catatan tambahan</span>
        <textarea
          name="notes"
          rows={3}
          value={values.notes}
          onChange={(event) => setValues((current) => ({ ...current, notes: event.target.value }))}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600"
        />
      </label>

      {state.error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {mode === "create" ? "Simpan peralatan" : "Simpan perubahan"}
      </button>
    </form>
  );
}

export function EquipmentStatusForm({
  equipmentId,
  currentStatus,
  redirectTo,
}: {
  equipmentId: string;
  currentStatus: EquipmentStatusValue | string;
  redirectTo: string;
}) {
  const [state, formAction, pending] = useActionState(changeEquipmentStatusAction, {});
  const [status, setStatus] = useState<EquipmentStatusValue | string>(currentStatus);
  const [note, setNote] = useState("");

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="equipmentId" value={equipmentId} />
      <input type="hidden" name="redirectTo" value={redirectTo} />

      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Status baru</span>
        <select
          name="status"
          value={status}
          onChange={(event) => setStatus(event.target.value as EquipmentStatusValue)}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600"
          required
        >
          {EQUIPMENT_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Catatan perubahan</span>
        <textarea
          name="note"
          rows={3}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600"
        />
      </label>

      {state.error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Simpan status
      </button>
    </form>
  );
}

export function EquipmentLocationForm({
  equipmentId,
  locations,
  currentLocationId,
  redirectTo,
}: {
  equipmentId: string;
  locations: EquipmentLocationOption[];
  currentLocationId: string | null;
  redirectTo: string;
}) {
  const [state, formAction, pending] = useActionState(changeEquipmentLocationAction, {});
  const [locationId, setLocationId] = useState(currentLocationId ?? "");
  const [note, setNote] = useState("");

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="equipmentId" value={equipmentId} />
      <input type="hidden" name="redirectTo" value={redirectTo} />

      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Lokasi baru</span>
        <select
          name="locationId"
          value={locationId}
          onChange={(event) => setLocationId(event.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600"
        >
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
        <textarea
          name="note"
          rows={3}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600"
        />
      </label>

      {state.error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Simpan lokasi
      </button>
    </form>
  );
}

export function EquipmentDocumentForm({
  equipmentId,
  redirectTo,
}: {
  equipmentId: string;
  redirectTo: string;
}) {
  const [state, formAction, pending] = useActionState(addEquipmentDocumentAction, {});
  const [kind, setKind] = useState<"photo" | "document" | "manual" | "other">("document");
  const [title, setTitle] = useState("");
  const [fileName, setFileName] = useState("");
  const [storageUrl, setStorageUrl] = useState("");
  const [note, setNote] = useState("");

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="equipmentId" value={equipmentId} />
      <input type="hidden" name="redirectTo" value={redirectTo} />

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Jenis</span>
          <select
            name="kind"
            value={kind}
            onChange={(event) => setKind(event.target.value as typeof kind)}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600"
          >
            <option value="document">Dokumen</option>
            <option value="photo">Foto</option>
            <option value="manual">Manual</option>
            <option value="other">Lainnya</option>
          </select>
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Judul</span>
          <input
            name="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600"
            required
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Nama file</span>
          <input
            name="fileName"
            value={fileName}
            onChange={(event) => setFileName(event.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600"
            required
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Tautan file atau path</span>
          <input
            name="storageUrl"
            value={storageUrl}
            onChange={(event) => setStorageUrl(event.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600"
          />
        </label>
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Catatan</span>
        <textarea
          name="note"
          rows={3}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600"
        />
      </label>

      {state.error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Simpan dokumen
      </button>
    </form>
  );
}
