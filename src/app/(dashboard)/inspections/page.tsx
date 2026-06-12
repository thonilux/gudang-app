import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, ClipboardCheck, Layers3, ShieldAlert, ShieldCheck, Sparkles } from "lucide-react";

import { getCurrentAuthSession } from "@/lib/auth";
import { getEquipmentStatusLabel, getEquipmentStatusTone } from "@/lib/equipment";
import { hasPermission } from "@/lib/rbac";
import {
  getInspectionDashboardOverview,
  getInspectionStatusLabel,
  getInspectionStatusTone,
  getInspectionTemplates,
} from "@/lib/inspection";

export const dynamic = "force-dynamic";

export default async function InspectionsPage() {
  const session = await getCurrentAuthSession();
  if (!session) {
    redirect("/login");
  }

  if (!hasPermission(session, "equipment.read")) {
    redirect("/akses-ditolak");
  }

  const [overview, templates] = await Promise.all([
    getInspectionDashboardOverview(),
    getInspectionTemplates(),
  ]);

  const activeTemplates = templates.filter((template) => template.isActive);

  const summaryCards = [
    {
      label: "Inspeksi tercatat",
      value: overview.totalInspections.toString(),
      note: "Semua inspeksi yang sudah disimpan.",
      icon: ClipboardCheck,
    },
    {
      label: "Perlu tindak lanjut",
      value: overview.dueCount.toString(),
      note: "Equipment yang harus dicek ulang.",
      icon: ShieldAlert,
    },
    {
      label: "Template aktif",
      value: overview.activeTemplateCount.toString(),
      note: "Checklist yang siap dipakai.",
      icon: Layers3,
    },
    {
      label: "Inspeksi non-pass",
      value: overview.warningCount.toString(),
      note: "Hasil warning atau gagal terbaru.",
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-teal-700">Inspeksi</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Pusat inspeksi equipment</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Halaman ini merangkum inspeksi terbaru, equipment yang jatuh tempo, dan template yang
          sudah siap dipakai untuk pemeriksaan lapangan.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-500">{card.label}</p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight">{card.value}</p>
                </div>
                <div className="rounded-2xl bg-teal-50 p-3 text-teal-700">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-600">{card.note}</p>
            </article>
          );
        })}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Inspeksi terbaru</h2>
              <p className="mt-1 text-sm text-slate-500">
                Rekap inspeksi yang baru saja disimpan dari tab equipment.
              </p>
            </div>
            <ClipboardCheck className="h-5 w-5 text-slate-400" />
          </div>

          <div className="mt-5 space-y-4">
            {overview.recentInspections.length === 0 ? (
              <p className="text-sm text-slate-500">Belum ada inspeksi tercatat.</p>
            ) : (
              overview.recentInspections.map((inspection) => (
                <div key={inspection.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {inspection.equipmentCode} - {inspection.equipmentName}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {inspection.templateNameSnapshot} · {inspection.inspectedAt.toLocaleString("id-ID")}
                      </p>
                    </div>
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getInspectionStatusTone(
                        inspection.resultStatus,
                      )}`}
                    >
                      {getInspectionStatusLabel(inspection.resultStatus)}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-slate-600">{inspection.note ?? "Tanpa catatan."}</p>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-600">
                      Total {inspection.summary.total}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-600">
                      Lulus {inspection.summary.passed}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-600">
                      Gagal {inspection.summary.failed}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                    <span>{inspection.inspectedByName ?? "Sistem"}</span>
                    <span>{inspection.locationLabel ?? "Lokasi belum dicatat"}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Equipment jatuh tempo</h2>
              <p className="mt-1 text-sm text-slate-500">
                Item yang perlu dibuka ke tab inspeksi secepatnya.
              </p>
            </div>
            <ShieldAlert className="h-5 w-5 text-slate-400" />
          </div>

          <div className="mt-5 space-y-4">
            {overview.dueEquipment.length === 0 ? (
              <p className="text-sm text-slate-500">Belum ada equipment yang jatuh tempo.</p>
            ) : (
              overview.dueEquipment.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {item.code} - {item.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {item.categoryName ?? "Tanpa kategori"}
                      </p>
                    </div>
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getEquipmentStatusTone(
                        item.status,
                      )}`}
                    >
                      {getEquipmentStatusLabel(item.status)}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-slate-600">{item.locationLabel ?? "Lokasi belum ditentukan"}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Jadwal berikutnya {item.nextInspectionAt ? item.nextInspectionAt.toLocaleDateString("id-ID") : "-"}
                  </p>

                  <Link
                    href={`/equipment/${item.id}?tab=inspeksi`}
                    className="mt-3 inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Buka inspeksi
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Template aktif</h2>
            <p className="mt-1 text-sm text-slate-500">
              Template yang siap dipakai di tab inspeksi equipment.
            </p>
          </div>
          <Link
            href="/admin/inspection-templates"
            className="inline-flex items-center gap-2 font-medium text-teal-800 transition hover:text-teal-950"
          >
            Kelola template <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Template</th>
                <th className="px-4 py-3 font-medium">Kategori</th>
                <th className="px-4 py-3 font-medium">Checklist</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {activeTemplates.length === 0 ? (
                <tr>
                  <td className="px-4 py-5 text-slate-500" colSpan={4}>
                    Belum ada template aktif.
                  </td>
                </tr>
              ) : (
                activeTemplates.map((template) => (
                  <tr key={template.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">{template.name}</td>
                    <td className="px-4 py-3 text-slate-600">{template.categoryName}</td>
                    <td className="px-4 py-3 text-slate-600">{template.checklist.length} item</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">
                        <Sparkles className="h-3.5 w-3.5" />
                        Aktif
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
