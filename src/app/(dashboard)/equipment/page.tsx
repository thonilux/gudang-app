import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, LayoutGrid, MapPin, ShieldAlert, ShieldCheck, Wrench } from "lucide-react";

import { getCurrentAuthSession } from "@/lib/auth";
import {
  buildEquipmentSummaryLine,
  getEquipmentDashboardStats,
  getEquipmentList,
  getEquipmentReferenceData,
  getEquipmentStatusLabel,
  getEquipmentStatusTone,
} from "@/lib/equipment";
import { hasPermission } from "@/lib/rbac";

import { EquipmentUpsertForm } from "./equipment-forms";

export const dynamic = "force-dynamic";

export default async function EquipmentPage() {
  const session = await getCurrentAuthSession();
  if (!session) {
    redirect("/login");
  }

  if (!hasPermission(session, "equipment.read")) {
    redirect("/akses-ditolak");
  }

  const [stats, items, referenceData] = await Promise.all([
    getEquipmentDashboardStats(),
    getEquipmentList(),
    getEquipmentReferenceData(),
  ]);

  const summaryCards = [
    {
      label: "Total peralatan",
      value: stats.total.toString(),
      note: "Seluruh aset yang sudah terdaftar.",
      icon: LayoutGrid,
    },
    {
      label: "Siap pakai",
      value: stats.ready.toString(),
      note: "Status aman untuk dipakai operasional.",
      icon: ShieldCheck,
    },
    {
      label: "Perlu perhatian",
      value: stats.attention.toString(),
      note: "Perlu inspeksi atau perbaikan.",
      icon: ShieldAlert,
    },
    {
      label: "Pensiun",
      value: stats.retired.toString(),
      note: "Sudah ditandai tidak aktif.",
      icon: Wrench,
    },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-teal-700">Peralatan</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Inventaris peralatan</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Semua aset inti dicatat di sini supaya status, lokasi, dan riwayat dasarnya mudah
          ditelusuri.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <article key={card.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-500">{card.label}</p>
                    <p className="mt-2 text-3xl font-semibold tracking-tight">{card.value}</p>
                  </div>
                  <div className="rounded-2xl bg-white p-3 text-teal-700">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-600">{card.note}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Daftar peralatan</h2>
              <p className="mt-1 text-sm text-slate-500">
                Detail singkat per aset dan status terkininya.
              </p>
            </div>
            <p className="text-sm text-slate-500">{items.length} item</p>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Kode</th>
                  <th className="px-4 py-3 font-medium">Peralatan</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Lokasi</th>
                  <th className="px-4 py-3 font-medium">Perbarui</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {items.length === 0 ? (
                  <tr>
                    <td className="px-4 py-5 text-slate-500" colSpan={5}>
                      Belum ada peralatan. Tambahkan item pertama dari panel samping.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 font-medium text-slate-900">{item.code}</td>
                      <td className="px-4 py-3 text-slate-700">
                        <p className="font-medium text-slate-900">{item.name}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {buildEquipmentSummaryLine({
                            brand: item.brand,
                            model: item.model,
                            serialNumber: item.serialNumber,
                            categoryName: item.categoryName,
                          })}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getEquipmentStatusTone(item.status)}`}
                        >
                          {getEquipmentStatusLabel(item.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-slate-400" />
                          <span>{item.locationLabel ?? "Belum ditentukan"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {item.updatedAt.toLocaleDateString("id-ID")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>

        <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Tambah peralatan</h2>
              <p className="mt-1 text-sm text-slate-500">
                Isi data dasar untuk mulai melacak aset.
              </p>
            </div>
          </div>

          <div className="mt-5">
            <EquipmentUpsertForm
              mode="create"
              categories={referenceData.categories}
              locations={referenceData.locations}
            />
          </div>

          <div className="mt-6 rounded-2xl border border-teal-100 bg-teal-50 p-4 text-sm text-teal-900">
            <p className="font-medium">Catatan fase 2</p>
            <p className="mt-1 leading-6">
              Fokus fase ini adalah aset inti: status, lokasi, riwayat dasar, foto, dan dokumen
              pendukung.
            </p>
            <Link
              href="/dashboard"
              className="mt-4 inline-flex items-center gap-2 font-medium text-teal-800 transition hover:text-teal-950"
            >
              Lihat dasbor <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </aside>
      </section>
    </div>
  );
}
