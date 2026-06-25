"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import {
  createEquipmentCategoryAction,
  updateEquipmentCategoryAction,
  type EquipmentCategoryActionState,
} from "./actions";

type CategoryValues = {
  id?: string;
  key: string;
  name: string;
  description: string;
};

const emptyValues: CategoryValues = {
  key: "",
  name: "",
  description: "",
};

export function EquipmentCategoryForm({
  mode,
  initialValues,
}: {
  mode: "create" | "edit";
  initialValues?: Partial<CategoryValues>;
}) {
  const [state, formAction, pending] = useActionState<EquipmentCategoryActionState, FormData>(
    mode === "create" ? createEquipmentCategoryAction : updateEquipmentCategoryAction,
    {},
  );
  const [values, setValues] = useState<CategoryValues>({
    ...emptyValues,
    ...initialValues,
  });

  useEffect(() => {
    setValues({
      ...emptyValues,
      ...initialValues,
    });
  }, [initialValues]);

  const suggestedKey = values.name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return (
    <form action={formAction} className="space-y-4">
      {mode === "edit" ? <input type="hidden" name="id" value={values.id ?? ""} /> : null}
      <input type="hidden" name="redirectTo" value="/admin/equipment-categories" />

      <div className="rounded-2xl border border-border bg-panelAlt p-4 text-sm text-muted">
        <p className="font-medium text-text">Tips key</p>
        <p className="mt-1">Kalau key dikosongkan, sistem akan memakai nama kategori sebagai dasar slug.</p>
        <p className="mt-2 text-xs">Saran otomatis: {suggestedKey || "-"}</p>
      </div>

      <div className="rounded-2xl border border-border bg-panel px-4 py-3 text-sm text-muted">
        <span className="font-medium text-text">Urutan tampil</span> akan dibuat otomatis saat
        kategori disimpan. Setelah itu, kamu bisa ubah posisinya dari daftar kategori dengan tombol
        naik/turun.
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-text">Key kategori</span>
        <input
          name="key"
          value={values.key}
          onChange={(event) => setValues((current) => ({ ...current, key: event.target.value }))}
          className="w-full rounded-xl border border-border bg-panel px-4 py-3 text-sm outline-none transition focus:border-accent"
          placeholder="audio-accessories"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-text">Nama kategori</span>
        <input
          name="name"
          value={values.name}
          onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
          className="w-full rounded-xl border border-border bg-panel px-4 py-3 text-sm outline-none transition focus:border-accent"
          required
        />
      </label>

      <div className="grid gap-4">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-text">Deskripsi</span>
          <textarea
            name="description"
            rows={4}
            value={values.description}
            onChange={(event) =>
              setValues((current) => ({ ...current, description: event.target.value }))
            }
            className="w-full rounded-xl border border-border bg-panel px-4 py-3 text-sm outline-none transition focus:border-accent"
          />
        </label>
      </div>

      {state.error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.error}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {mode === "create" ? "Simpan kategori" : "Simpan perubahan"}
        </button>

        {mode === "edit" ? (
          <Link prefetch={false}
            href="/admin/equipment-categories"
            className="inline-flex items-center justify-center rounded-xl border border-border bg-panel px-4 py-3 text-sm font-semibold text-text transition hover:bg-panelAlt"
          >
            Batal
          </Link>
        ) : null}
      </div>
    </form>
  );
}
