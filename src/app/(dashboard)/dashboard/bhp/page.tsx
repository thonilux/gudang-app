import { redirect } from "next/navigation";
import { BarChart3, Eye, Package, Scale, Search, Warehouse } from "lucide-react";

import { ActionModal } from "@/components/action-modal";
import { getCurrentAuthSession } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import {
  getWarehouseCountsSummary,
  getWarehouseItemStatusLabel,
  getWarehouseItemStatusTone,
  getWarehouseLocationOptions,
  getWarehouseOverview,
  getWarehouseStockItemOptions,
} from "@/lib/warehouse";
import { getWarehouseMovementLabel } from "@/lib/warehouse-shared";

import {
  WarehouseModal,
  WarehouseMovementForm,
  WarehouseOpnameForm,
  WarehouseStockItemForm,
} from "../warehouse/warehouse-forms";

export const dynamic = "force-dynamic";

function normalizeSearchParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export default async function BhpPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getCurrentAuthSession();
  if (!session) {
    redirect("/login");
  }

  if (!hasPermission(session, "warehouse.read")) {
    redirect("/akses-ditolak");
  }

  const [overview, stockSummary, locationOptions, stockItemOptions] = await Promise.all([
    getWarehouseOverview(),
    getWarehouseCountsSummary(),
    getWarehouseLocationOptions(),
    getWarehouseStockItemOptions(),
  ]);
  const resolvedSearchParams = (await searchParams) ?? {};
  const searchQuery = normalizeSearchParam(resolvedSearchParams.q).trim().toLowerCase();
  const filteredItems = searchQuery
    ? overview.items.filter((item) => {
        const haystack = [
          item.sku,
          item.name,
          item.category,
          item.locationLabel ?? "",
          item.notes,
          item.unit,
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(searchQuery);
      })
    : overview.items;

  const summaryCards = [
    {
      label: "Item BHP",
      value: overview.stats.itemCount.toString(),
      note: "Semua stok quantity-based yang sudah terdaftar.",
      icon: Package,
    },
    {
      label: "Total kuantitas",
      value: stockSummary.totalQuantity.toString(),
      note: "Akumulasi seluruh stok BHP aktif.",
      icon: Warehouse,
    },
    {
      label: "Perlu restock",
      value: stockSummary.lowStockCount.toString(),
      note: "Item yang sudah menyentuh ambang minimum.",
      icon: Scale,
    },
    {
      label: "Mutasi terbaru",
      value: overview.movements.length.toString(),
      note: "Log stok yang terakhir dicatat.",
      icon: BarChart3,
    },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-600">BHP</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Bahan habis pakai</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Semua stok yang dihitung per jumlah dikelola di sini. Fokusnya inventaris quantity-based,
          mutasi stok, dan opname.
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
                <div className="rounded-2xl bg-blue-50 p-3 text-blue-700">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-600">{card.note}</p>
            </article>
          );
        })}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Inventaris BHP</h2>
            <p className="mt-1 text-sm text-slate-500">Stok quantity-based, status, dan lokasi aktif.</p>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-sm text-slate-500">{filteredItems.length} item</p>
            <WarehouseModal
              title="Tambah bahan habis pakai"
              description="Masukkan item quantity-based seperti baterai alkalin, tape, atau part kecil lain."
              triggerLabel="Buka form BHP"
            >
              <WarehouseStockItemForm locations={locationOptions} />
            </WarehouseModal>
          </div>
        </div>

        <form method="get" className="mt-5 flex gap-3">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              name="q"
              defaultValue={searchQuery}
              placeholder="Cari kode, nama, kategori, atau lokasi"
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
            <a
              href="/bhp"
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Reset
            </a>
          ) : null}
        </form>

        <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Kode</th>
                  <th className="px-4 py-3 font-medium">Item</th>
                  <th className="px-4 py-3 font-medium">Jumlah</th>
                  <th className="px-4 py-3 font-medium">Lokasi</th>
                  <th className="px-4 py-3 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td className="px-4 py-5 text-slate-500" colSpan={5}>
                      {searchQuery ? "Tidak ada BHP yang cocok." : "Belum ada BHP."}
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 font-medium text-slate-900">{item.sku}</td>
                      <td className="px-4 py-3 text-slate-700">
                        <p className="font-medium text-slate-900">{item.name}</p>
                        <p className="mt-1 text-xs text-slate-500">{item.category || "Tanpa kategori"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getWarehouseItemStatusTone(
                            item.currentQuantity,
                            item.minimumQuantity,
                          )}`}
                        >
                          {getWarehouseItemStatusLabel(item.currentQuantity, item.minimumQuantity)} - {item.currentQuantity} {item.unit}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{item.locationLabel ?? "-"}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <ActionModal
                            title="Detail BHP"
                            description="Ringkasan stok quantity-based untuk item ini."
                            triggerLabel="Detail BHP"
                            triggerIcon={<Eye className="h-4 w-4" />}
                          >
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <p className="text-sm text-slate-500">Kode</p>
                                <p className="mt-2 font-medium text-slate-900">{item.sku}</p>
                              </div>
                              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <p className="text-sm text-slate-500">Nama</p>
                                <p className="mt-2 font-medium text-slate-900">{item.name}</p>
                              </div>
                              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <p className="text-sm text-slate-500">Kategori</p>
                                <p className="mt-2 font-medium text-slate-900">{item.category || "Tanpa kategori"}</p>
                              </div>
                              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <p className="text-sm text-slate-500">Lokasi</p>
                                <p className="mt-2 font-medium text-slate-900">{item.locationLabel ?? "-"}</p>
                              </div>
                              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <p className="text-sm text-slate-500">Jumlah</p>
                                <p className="mt-2 font-medium text-slate-900">
                                  {item.currentQuantity} {item.unit}
                                </p>
                              </div>
                              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <p className="text-sm text-slate-500">Ambang minimum</p>
                                <p className="mt-2 font-medium text-slate-900">
                                  {item.minimumQuantity} {item.unit}
                                </p>
                              </div>
                            </div>

                            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                              <p className="text-sm text-slate-500">Catatan</p>
                              <p className="mt-2 text-sm leading-6 text-slate-700">
                                {item.notes || "Tidak ada catatan."}
                              </p>
                            </div>
                          </ActionModal>
                          <ActionModal
                            title="Ubah BHP"
                            description="Perbarui data stok quantity-based langsung dari daftar."
                            triggerLabel="Ubah BHP"
                          >
                            <WarehouseStockItemForm
                              mode="edit"
                              locations={locationOptions}
                              initialValues={{
                                id: item.id,
                                sku: item.sku,
                                name: item.name,
                                unit: item.unit,
                                category: item.category,
                                locationId: item.locationId ?? "",
                                currentQuantity: item.currentQuantity,
                                minimumQuantity: item.minimumQuantity,
                                notes: item.notes,
                              }}
                            />
                          </ActionModal>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
          <h2 className="text-lg font-semibold">Mutasi BHP</h2>
          <p className="mt-1 text-sm text-slate-500">Catat masuk, keluar, atau pindah lokasi.</p>
          <div className="mt-5">
            <WarehouseModal
              title="Catat mutasi bahan habis pakai"
              description="Gunakan untuk mencatat barang masuk, keluar, atau transfer antar lokasi."
              triggerLabel="Buka form mutasi"
            >
              <WarehouseMovementForm
                stockItemOptions={stockItemOptions}
                locations={locationOptions}
              />
            </WarehouseModal>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
          <h2 className="text-lg font-semibold">Opname BHP</h2>
          <p className="mt-1 text-sm text-slate-500">Perbaiki stok berdasarkan hasil hitung fisik.</p>
          <div className="mt-5">
            <WarehouseModal
              title="Opname bahan habis pakai"
              description="Sesuaikan angka sistem dengan hasil hitung fisik di lokasi gudang."
              triggerLabel="Buka form opname"
            >
              <WarehouseOpnameForm stockItemOptions={stockItemOptions} />
            </WarehouseModal>
          </div>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Mutasi terbaru BHP</h2>
            <BarChart3 className="h-5 w-5 text-slate-400" />
          </div>
          <div className="mt-4 space-y-4">
            {overview.movements.length === 0 ? (
              <p className="text-sm text-slate-500">Belum ada mutasi stok.</p>
            ) : (
              overview.movements.map((movement) => (
                <div key={movement.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {movement.stockItemSku} - {movement.stockItemName}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {getWarehouseMovementLabel(movement.movementType)} · {movement.quantity}
                      </p>
                    </div>
                    <p className="text-xs text-slate-500">{movement.createdAt.toLocaleString("id-ID")}</p>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{movement.note ?? "Tanpa catatan."}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    {movement.fromLocationLabel ?? "-"} → {movement.toLocationLabel ?? "-"}
                  </p>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Opname terakhir</h2>
            <Warehouse className="h-5 w-5 text-slate-400" />
          </div>
          <div className="mt-4 space-y-4">
            {overview.counts.length === 0 ? (
              <p className="text-sm text-slate-500">Belum ada opname tercatat.</p>
            ) : (
              overview.counts.map((count) => (
                <div key={count.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {count.locationLabel ?? "Tanpa lokasi"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">{count.status}</p>
                    </div>
                    <p className="text-xs text-slate-500">{count.countedAt.toLocaleString("id-ID")}</p>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{count.note ?? "Tanpa catatan."}</p>
                  <p className="mt-2 text-xs text-slate-500">Oleh {count.countedByName ?? "Sistem"}</p>
                </div>
              ))
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
