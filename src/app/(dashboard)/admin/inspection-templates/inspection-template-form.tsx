"use client";

import { useActionState, useState } from "react";
import { Loader2 } from "lucide-react";

import {
  createInspectionTemplateAction,
  updateInspectionTemplateAction,
  type InspectionTemplateActionState,
} from "./actions";
import type { EquipmentCategoryOption } from "@/lib/equipment-shared";

type InspectionTemplateValues = {
  id?: string;
  categoryId: string;
  name: string;
  description: string;
  checklistText: string;
  isActive: boolean;
  sortOrder: number;
};

export function InspectionTemplateForm({
  mode,
  categories,
  initialValues,
}: {
  mode: "create" | "edit";
  categories: EquipmentCategoryOption[];
  initialValues?: Partial<InspectionTemplateValues>;
}) {
  const [state, formAction, pending] = useActionState(
    mode === "create" ? createInspectionTemplateAction : updateInspectionTemplateAction,
    {} as InspectionTemplateActionState,
  );
  const [isActive, setIsActive] = useState(initialValues?.isActive ?? true);

  return (
    <form action={formAction} className="space-y-4">
      {mode === "edit" ? <input type="hidden" name="id" value={initialValues?.id ?? ""} /> : null}
      <input type="hidden" name="redirectTo" value="/admin/inspection-templates" />
      <input type="hidden" name="isActive" value={isActive ? "true" : "false"} />

      <label className="block space-y-2">
        <span className="text-sm font-medium text-text">Kategori</span>
        <select
          name="categoryId"
          defaultValue={initialValues?.categoryId ?? ""}
          className="w-full rounded-xl border border-border bg-panel px-4 py-3 text-sm outline-none transition focus:border-accent"
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

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-text">Nama template</span>
          <input
            name="name"
            defaultValue={initialValues?.name ?? ""}
            className="w-full rounded-xl border border-border bg-panel px-4 py-3 text-sm outline-none transition focus:border-accent"
            required
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-text">Urutan</span>
          <input
            name="sortOrder"
            type="number"
            min="0"
            defaultValue={initialValues?.sortOrder ?? 0}
            className="w-full rounded-xl border border-border bg-panel px-4 py-3 text-sm outline-none transition focus:border-accent"
          />
        </label>
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-text">Deskripsi</span>
        <textarea
          name="description"
          rows={3}
          defaultValue={initialValues?.description ?? ""}
          className="w-full rounded-xl border border-border bg-panel px-4 py-3 text-sm outline-none transition focus:border-accent"
        />
      </label>

      <label className="flex items-center gap-3 rounded-2xl border border-border bg-panelAlt px-4 py-3 text-sm text-text">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(event) => setIsActive(event.target.checked)}
          className="h-4 w-4 rounded border-border"
        />
        Aktifkan template ini
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-text">Checklist</span>
        <textarea
          name="checklistText"
          rows={8}
          defaultValue={initialValues?.checklistText ?? ""}
          placeholder={`Gunakan satu baris per item.\nAwali dengan * untuk item wajib.\nContoh:\n* Driver test\nGrill condition\n* Input/output check`}
          className="w-full rounded-xl border border-border bg-panel px-4 py-3 text-sm outline-none transition focus:border-accent"
          required
        />
      </label>

      <div className="rounded-2xl border border-border bg-panelAlt px-4 py-3 text-xs leading-6 text-muted">
        Format checklist: satu item per baris. Awali dengan <code>*</code> untuk item wajib.
      </div>

      {state.error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {mode === "create" ? "Simpan template" : "Simpan perubahan"}
      </button>
    </form>
  );
}
