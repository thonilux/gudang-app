import Link from "next/link";
import { redirect } from "next/navigation";
import { ClipboardCheck, Eye, LayoutGrid, MapPin, Search, ShieldAlert, ShieldCheck, Wrench, PencilLine } from "lucide-react";

import { ActionModal } from "@/components/action-modal";
import { getCurrentAuthSession } from "@/lib/auth";
import {
  buildEquipmentSummaryLine,
  getEquipmentDashboardStats,
  getEquipmentList,
  getEquipmentReferenceData,
  getEquipmentStatusLabel,
} from "@/lib/equipment";
import { type EquipmentStatusValue } from "@/lib/equipment-shared";
import { hasPermission } from "@/lib/rbac";

import { EquipmentUpsertForm } from "./equipment-forms";

export const dynamic = "force-dynamic";

function formatDateInput(value: Date | null) {
  if (!value) {
    return "";
  }

  return value.toISOString().slice(0, 10);
}

function normalizeSearchParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function renderStatusIcon(status: string) {
  const label = getEquipmentStatusLabel(status);
  switch (status) {
    case "ready":
      return (
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 shadow-soft text-base" title={label}>
          ✅
        </span>
      );
    case "in_use":
      return (
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900/50 shadow-soft text-base" title={label}>
          🏃
        </span>
      );
    case "inspection_due":
      return (
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 shadow-soft text-base" title={label}>
          ⚠️
        </span>
      );
    case "maintenance":
      return (
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 shadow-soft text-base" title={label}>
          🔧
        </span>
      );
    case "retired":
      return (
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-soft text-base" title={label}>
          ❌
        </span>
      );
    default:
      return null;
  }
}

export default async function EquipmentPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
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
  const resolvedSearchParams = (await searchParams) ?? {};
  const searchQuery = normalizeSearchParam(resolvedSearchParams.q).trim().toLowerCase();
  const activeItems = items.filter((item) => item.status !== "retired");
  const filteredItems = searchQuery
    ? activeItems.filter((item) => {
        const haystack = [
          item.code,
          item.name,
          item.brand ?? "",
          item.model ?? "",
          item.serialNumber ?? "",
          item.categoryName ?? "",
          item.locationLabel ?? "",
          item.status,
          item.conditionNote ?? "",
          item.specificationNote ?? "",
          item.notes ?? "",
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(searchQuery);
      })
    : activeItems;

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

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Daftar peralatan</h2>
            <p className="mt-1 text-sm text-slate-500">Detail singkat per aset dan status terkininya.</p>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-sm text-slate-500">{filteredItems.length} item</p>
            <ActionModal title="Tambah peralatan" description="Isi data dasar untuk mulai melacak aset." triggerLabel="Buka form peralatan">
              <EquipmentUpsertForm
                mode="create"
                categories={referenceData.categories}
                locations={referenceData.locations}
              />
            </ActionModal>
          </div>
        </div>

        <form method="get" className="mt-5 flex flex-col sm:flex-row gap-3">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              name="q"
              defaultValue={searchQuery}
              placeholder="Cari kode, nama, merek, model, serial, kategori, atau lokasi"
              className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-teal-600"
            />
          </label>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Cari
          </button>
          {searchQuery ? (
            <Link prefetch={false}
              href="/equipment"
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Reset
            </Link>
          ) : null}
        </form>

          <>
            {/* Desktop Table View */}
            <div className="hidden md:block mt-5 overflow-hidden rounded-2xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Kode</th>
                    <th className="px-4 py-3 font-medium">Peralatan</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Lokasi</th>
                    <th className="px-4 py-3 font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td className="px-4 py-5 text-slate-500" colSpan={5}>
                        {searchQuery ? "Tidak ada peralatan yang cocok." : "Belum ada peralatan."}
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3 font-medium text-slate-900">{item.code}</td>
                        <td className="px-4 py-3 text-slate-700">
                          <Link prefetch={false}
                            href={`/equipment/${item.id}?tab=ikhtisar`}
                            className="font-medium text-slate-900 transition hover:text-teal-700"
                          >
                            {item.name}
                          </Link>
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
                          {renderStatusIcon(item.status)}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-slate-400" />
                            <span>{item.locationLabel ?? "Belum ditentukan"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <ActionModal
                              title="Ubah peralatan"
                              description="Perbarui data dasar peralatan tanpa keluar dari daftar."
                              triggerLabel="Ubah peralatan"
                            >
                              <EquipmentUpsertForm
                                mode="edit"
                                categories={referenceData.categories}
                                locations={referenceData.locations}
                                initialValues={{
                                  id: item.id,
                                  code: item.code,
                                  name: item.name,
                                  categoryId: item.categoryId,
                                  locationId: item.locationId ?? "",
                                  brand: item.brand,
                                  model: item.model,
                                  serialNumber: item.serialNumber ?? "",
                                  status: item.status as EquipmentStatusValue,
                                  conditionNote: item.conditionNote,
                                  specificationNote: item.specificationNote,
                                  notes: item.notes,
                                  lastInspectionAt: formatDateInput(item.lastInspectionAt),
                                  nextInspectionAt: formatDateInput(item.nextInspectionAt),
                                }}
                              />
                            </ActionModal>
                            <Link prefetch={false}
                              href={`/equipment/${item.id}?tab=inspeksi`}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50"
                              aria-label="Inspeksi"
                              title="Inspeksi"
                            >
                              <ClipboardCheck className="h-4 w-4" />
                              <span className="sr-only">Inspeksi</span>
                            </Link>
                            <Link prefetch={false}
                              href={`/equipment/${item.id}?tab=ikhtisar`}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50"
                              aria-label="Detail"
                              title="Detail"
                            >
                              <Eye className="h-4 w-4" />
                              <span className="sr-only">Detail</span>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="md:hidden mt-5 space-y-4">
              {filteredItems.length === 0 ? (
                <p className="text-sm text-slate-500 py-4 text-center">
                  {searchQuery ? "Tidak ada peralatan yang cocok." : "Belum ada peralatan."}
                </p>
              ) : (
                filteredItems.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block">{item.code}</span>
                        <Link prefetch={false}
                          href={`/equipment/${item.id}?tab=ikhtisar`}
                          className="font-bold text-slate-900 hover:text-teal-700 transition mt-1 block text-sm"
                        >
                          {item.name}
                        </Link>
                        <p className="mt-1 text-xs text-slate-500">
                          {buildEquipmentSummaryLine({
                            brand: item.brand,
                            model: item.model,
                            serialNumber: item.serialNumber,
                            categoryName: item.categoryName,
                          })}
                        </p>
                      </div>
                      {renderStatusIcon(item.status)}
                    </div>

                    <div className="border-t border-slate-100 pt-3 flex items-center gap-2 text-xs text-slate-600">
                      <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                      <span>{item.locationLabel ?? "Belum ditentukan"}</span>
                    </div>

                    <div className="border-t border-slate-100 pt-3 flex items-center justify-end gap-2">
                      <ActionModal
                        title="Ubah peralatan"
                        description="Perbarui data dasar peralatan tanpa keluar dari daftar."
                        triggerLabel="Ubah peralatan"
                        triggerIcon={<PencilLine className="h-3.5 w-3.5" />}
                      >
                        <EquipmentUpsertForm
                          mode="edit"
                          categories={referenceData.categories}
                          locations={referenceData.locations}
                          initialValues={{
                            id: item.id,
                            code: item.code,
                            name: item.name,
                            categoryId: item.categoryId,
                            locationId: item.locationId ?? "",
                            brand: item.brand,
                            model: item.model,
                            serialNumber: item.serialNumber ?? "",
                            status: item.status as EquipmentStatusValue,
                            conditionNote: item.conditionNote,
                            specificationNote: item.specificationNote,
                            notes: item.notes,
                            lastInspectionAt: formatDateInput(item.lastInspectionAt),
                            nextInspectionAt: formatDateInput(item.nextInspectionAt),
                          }}
                        />
                      </ActionModal>
                      <Link prefetch={false}
                        href={`/equipment/${item.id}?tab=inspeksi`}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition"
                        title="Inspeksi"
                      >
                        <ClipboardCheck className="h-4 w-4" />
                      </Link>
                      <Link prefetch={false}
                        href={`/equipment/${item.id}?tab=ikhtisar`}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition"
                        title="Detail"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
      </section>
    </div>
  );
}
