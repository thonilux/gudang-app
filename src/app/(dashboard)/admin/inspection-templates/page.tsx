import Link from "next/link";
import { redirect } from "next/navigation";
import { Layers3, PencilLine, Plus, ShieldCheck } from "lucide-react";

import { getCurrentAuthSession } from "@/lib/auth";
import { getEquipmentReferenceData } from "@/lib/equipment";
import { isAdmin } from "@/lib/rbac";
import { getInspectionTemplates } from "@/lib/inspection";

import { InspectionTemplateForm } from "./inspection-template-form";

export const dynamic = "force-dynamic";

function formatChecklistText(checklist: Array<{ label: string; required: boolean }>) {
  return checklist
    .map((item) => `${item.required ? "* " : ""}${item.label}`)
    .join("\n");
}

export default async function InspectionTemplatesAdminPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getCurrentAuthSession();
  if (!session) {
    redirect("/login");
  }

  if (!isAdmin(session)) {
    redirect("/akses-ditolak");
  }

  const [referenceData, templates] = await Promise.all([
    getEquipmentReferenceData(),
    getInspectionTemplates(),
  ]);

  const resolvedSearchParams = (await searchParams) ?? {};
  const editRaw = resolvedSearchParams.edit;
  const editId = Array.isArray(editRaw) ? editRaw[0] ?? "" : editRaw ?? "";
  const editingTemplate = templates.find((template) => template.id === editId) ?? null;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-panel p-6 shadow-soft">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-600">Admin / Inspection</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text">Template inspeksi</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Template inspeksi per kategori dipakai untuk mengecek kesiapan equipment sebelum
          dinyatakan siap pakai.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-border bg-panel p-5 shadow-soft">
          <p className="text-sm text-muted">Total template</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-text">{templates.length}</p>
        </article>
        <article className="rounded-2xl border border-border bg-panel p-5 shadow-soft">
          <p className="text-sm text-muted">Aktif</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-text">
            {templates.filter((template) => template.isActive).length}
          </p>
        </article>
        <article className="rounded-2xl border border-border bg-panel p-5 shadow-soft">
          <p className="text-sm text-muted">Mode panel</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-text">
            {editingTemplate ? "Edit" : "Tambah"}
          </p>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-2xl border border-border bg-panel p-6 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-text">Daftar template</h2>
              <p className="mt-1 text-sm text-muted">Template aktif dipakai di tab inspeksi equipment.</p>
            </div>
            <Layers3 className="h-5 w-5 text-accent" />
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-border">
            <table className="min-w-full divide-y divide-border text-left text-sm">
              <thead className="bg-panelAlt text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Template</th>
                  <th className="px-4 py-3 font-medium">Kategori</th>
                  <th className="px-4 py-3 font-medium">Checklist</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-panel">
                {templates.length === 0 ? (
                  <tr>
                    <td className="px-4 py-5 text-muted" colSpan={5}>
                      Belum ada template inspeksi.
                    </td>
                  </tr>
                ) : (
                  templates.map((template) => (
                    <tr key={template.id}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-text">{template.name}</p>
                        <p className="mt-1 text-xs text-muted">{template.description || "Tanpa deskripsi"}</p>
                      </td>
                      <td className="px-4 py-3 text-muted">{template.categoryName}</td>
                      <td className="px-4 py-3 text-muted">{template.checklist.length} item</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-panelAlt px-3 py-1 text-xs font-medium text-muted">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          {template.isActive ? "Aktif" : "Nonaktif"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/inspection-templates?edit=${template.id}`}
                          aria-label="Ubah template"
                          title="Ubah template"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-panel text-text transition hover:bg-panelAlt"
                        >
                          <PencilLine className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>

        <aside className="rounded-2xl border border-border bg-panel p-6 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-text">
                {editingTemplate ? "Ubah template" : "Tambah template"}
              </h2>
              <p className="mt-1 text-sm text-muted">
                Checklist bisa diisi dengan satu baris per item. Awali dengan <code>*</code> untuk item wajib.
              </p>
            </div>
            <div className="rounded-2xl bg-panelAlt p-3 text-accent">
              <Plus className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-5">
            <InspectionTemplateForm
              mode={editingTemplate ? "edit" : "create"}
              categories={referenceData.categories}
              initialValues={
                editingTemplate
                  ? {
                      id: editingTemplate.id,
                      categoryId: editingTemplate.categoryId,
                      name: editingTemplate.name,
                      description: editingTemplate.description ?? "",
                      checklistText: formatChecklistText(editingTemplate.checklist),
                      isActive: editingTemplate.isActive,
                      sortOrder: editingTemplate.sortOrder,
                    }
                  : undefined
              }
            />
          </div>

          <div className="mt-6 rounded-2xl border border-border bg-panelAlt p-4 text-sm text-muted">
            <p className="font-medium text-text">Contoh checklist</p>
            <p className="mt-1 leading-6">
              <code>*</code> Driver test <br />
              Grill condition <br />
              <code>*</code> Input/output check
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}
