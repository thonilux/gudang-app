"use client";

import { useActionState, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import { performEquipmentInspectionAction, type EquipmentActionState } from "./actions";
import type { InspectionTemplateChecklistItem } from "@/lib/inspection";

type InspectionTemplateView = {
  id: string;
  name: string;
  description: string | null;
  checklist: InspectionTemplateChecklistItem[];
};

export function EquipmentInspectionForm({
  equipmentId,
  templates,
  redirectTo,
}: {
  equipmentId: string;
  templates?: InspectionTemplateView[];
  redirectTo: string;
}) {
  const [state, formAction, pending] = useActionState(
    performEquipmentInspectionAction,
    {} as EquipmentActionState,
  );
  const availableTemplates = useMemo(() => templates ?? [], [templates]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(availableTemplates[0]?.id ?? "");
  const selectedTemplate = useMemo(
    () => availableTemplates.find((item) => item.id === selectedTemplateId) ?? availableTemplates[0] ?? null,
    [availableTemplates, selectedTemplateId],
  );
  const hasTemplate = Boolean(selectedTemplate && selectedTemplate.checklist.length > 0);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="equipmentId" value={equipmentId} />
      <input type="hidden" name="redirectTo" value={redirectTo} />

      {availableTemplates.length > 0 ? (
        <>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-900">Template inspeksi</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Pilih checklist yang sesuai dengan kategori equipment ini.
            </p>

            <label className="mt-4 block space-y-2">
              <span className="text-sm font-medium text-slate-700">Template aktif</span>
              <select
                value={selectedTemplate?.id ?? ""}
                onChange={(event) => setSelectedTemplateId(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600"
              >
                {availableTemplates.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {selectedTemplate ? <input type="hidden" name="templateId" value={selectedTemplate.id} /> : null}

          {hasTemplate ? (
            <div key={selectedTemplate?.id ?? "template"} className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-900">{selectedTemplate?.name}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {selectedTemplate?.description || "Template inspeksi aktif untuk kategori ini."}
                </p>
              </div>

              <div className="space-y-4">
                {selectedTemplate?.checklist.map((item, index) => (
                  <div key={`${item.label}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{item.label}</p>
                        <p className="mt-1 text-xs text-slate-500">{item.required ? "Wajib" : "Opsional"}</p>
                      </div>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                        Item {index + 1}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-[1fr_1fr]">
                      <label className="block space-y-2">
                        <span className="text-sm font-medium text-slate-700">Hasil</span>
                        <select
                          name={`result_${index}`}
                          defaultValue={item.required ? "pass" : "na"}
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600"
                        >
                          <option value="pass">Lulus</option>
                          <option value="fail">Gagal</option>
                          <option value="na">Tidak diuji</option>
                        </select>
                      </label>

                      <label className="block space-y-2">
                        <span className="text-sm font-medium text-slate-700">Catatan item</span>
                        <input
                          name={`note_${index}`}
                          placeholder="Opsional"
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600"
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-900">Template tidak siap</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Template ini belum punya checklist yang valid. Silakan perbaiki di panel admin.
              </p>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-900">Inspeksi umum</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Template belum dipakai dulu. Isi hasil inspeksi ringkas tanpa checklist agar alur tetap jalan.
            </p>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Hasil inspeksi</span>
                <select
                  name="resultStatus"
                  defaultValue="pass"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600"
                >
                  <option value="pass">Lulus</option>
                  <option value="warning">Perlu perhatian</option>
                  <option value="fail">Gagal</option>
                </select>
              </label>
            </div>
          </div>
        </>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Inspeksi berikutnya</span>
          <input
            name="nextInspectionAt"
            type="date"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Catatan inspeksi</span>
          <input
            name="note"
            placeholder="Ringkasan hasil inspeksi"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600"
          />
        </label>
      </div>

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
        Simpan inspeksi
      </button>
    </form>
  );
}
