import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BarChart3, MapPinned, Repeat, Scale, Warehouse } from "lucide-react";

import { getCurrentAuthSession } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import {
  getWarehouseCountsSummary,
  getWarehouseItemStatusLabel,
  getWarehouseItemStatusTone,
  getWarehouseLocationOptions,
  getWarehouseOverview,
} from "@/lib/warehouse";
import { getWarehouseMovementLabel } from "@/lib/warehouse-shared";

import {
  WarehouseLocationForm,
  WarehouseMovementForm,
  WarehouseOpnameForm,
  WarehouseStockItemForm,
} from "./warehouse-forms";

export const dynamic = "force-dynamic";

export default async function WarehousePage() {
  const session = await getCurrentAuthSession();
  if (!session) {
    redirect("/login");
  }

  if (!hasPermission(session, "warehouse.read")) {
    redirect("/akses-ditolak");
  }

  const [overview, stockSummary, locationOptions] = await Promise.all([
    getWarehouseOverview(),
    getWarehouseCountsSummary(),
    getWarehouseLocationOptions(),
  ]);

  const summaryCards = [
    {
      label: "Lokasi gudang",
      value: overview.stats.locationCount.toString(),
      note: "Hierarki lokasi yang aktif.",
      icon: MapPinned,
    },
    {
      label: "Stok aktif",
      value: overview.stats.itemCount.toString(),
      note: "Item non-serial yang dikelola.",
      icon: Warehouse,
    },
    {
      label: "Perlu restock",
      value: overview.stats.lowStockCount.toString(),
      note: "Jumlah item di bawah ambang minimum.",
      icon: Scale,
    },
    {
      label: "Mutasi terbaru",
      value: overview.stats.movementCount.toString(),
      note: "Log perpindahan stok terkini.",
      icon: Repeat,
    },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-teal-700">Warehouse</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Operasi gudang</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Fase ini menyiapkan lokasi gudang, stok non-serial, mutasi barang, dan opname ringan
          tanpa menjadikan gudang sebagai pusat sistem.
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
              <h2 className="text-lg font-semibold">Lokasi gudang</h2>
              <p className="mt-1 text-sm text-slate-500">Struktur lokasi yang dipakai untuk stok dan opname.</p>
            </div>
            <Link href="#form-lokasi" className="inline-flex items-center gap-2 text-sm font-medium text-teal-700">
              Tambah lokasi <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Kode</th>
                  <th className="px-4 py-3 font-medium">Nama</th>
                  <th className="px-4 py-3 font-medium">Induk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {overview.locations.length === 0 ? (
                  <tr>
                    <td className="px-4 py-5 text-slate-500" colSpan={3}>
                      Belum ada lokasi gudang.
                    </td>
                  </tr>
                ) : (
                  overview.locations.map((location) => (
                    <tr key={location.id}>
                      <td className="px-4 py-3 font-medium text-slate-900">{location.code}</td>
                      <td className="px-4 py-3 text-slate-700">{location.name}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {location.parentLocationId ? location.label : "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>

        <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
          <h2 className="text-lg font-semibold" id="form-lokasi">
            Tambah lokasi
          </h2>
          <p className="mt-1 text-sm text-slate-500">Buat hierarki gudang yang ringan dan mudah dirawat.</p>
          <div className="mt-5">
            <WarehouseLocationForm locations={locationOptions} />
          </div>
        </aside>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
          <h2 className="text-lg font-semibold">Stok gudang</h2>
          <p className="mt-1 text-sm text-slate-500">Item non-serial dengan ambang minimum dan lokasi aktif.</p>

          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">SKU</th>
                  <th className="px-4 py-3 font-medium">Item</th>
                  <th className="px-4 py-3 font-medium">Jumlah</th>
                  <th className="px-4 py-3 font-medium">Lokasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {overview.items.length === 0 ? (
                  <tr>
                    <td className="px-4 py-5 text-slate-500" colSpan={4}>
                      Belum ada item stok.
                    </td>
                  </tr>
                ) : (
                  overview.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 font-medium text-slate-900">{item.sku}</td>
                      <td className="px-4 py-3 text-slate-700">
                        <p className="font-medium text-slate-900">{item.name}</p>
                        <p className="mt-1 text-xs text-slate-500">{item.category || "Tanpa kategori"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getWarehouseItemStatusTone(item.currentQuantity, item.minimumQuantity)}`}>
                          {getWarehouseItemStatusLabel(item.currentQuantity, item.minimumQuantity)} · {item.currentQuantity} {item.unit}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{item.locationLabel ?? "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>

        <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
          <h2 className="text-lg font-semibold">Tambah stok</h2>
          <p className="mt-1 text-sm text-slate-500">Registrasi stok non-serial baru.</p>
          <div className="mt-5">
            <WarehouseStockItemForm locations={locationOptions} />
          </div>
        </aside>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
          <h2 className="text-lg font-semibold">Mutasi stok</h2>
          <p className="mt-1 text-sm text-slate-500">Catat masuk, keluar, atau pindah lokasi.</p>
          <div className="mt-5">
            <WarehouseMovementForm
              stockItemOptions={overview.items.map((item) => ({ id: item.id, label: `${item.sku} - ${item.name}` }))}
              locations={locationOptions}
            />
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
          <h2 className="text-lg font-semibold">Opname ringan</h2>
          <p className="mt-1 text-sm text-slate-500">Perbaiki stok berdasarkan hasil hitung fisik.</p>
          <div className="mt-5">
            <WarehouseOpnameForm
              stockItemOptions={overview.items.map((item) => ({ id: item.id, label: `${item.sku} - ${item.name}` }))}
            />
          </div>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Mutasi terbaru</h2>
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

      <section className="rounded-2xl border border-teal-100 bg-teal-50 p-6 text-sm text-teal-900">
        <p className="font-medium">Ringkasan stok</p>
        <p className="mt-2 leading-6">
          Total kuantitas saat ini: {stockSummary.totalQuantity}. Item yang sudah menyentuh ambang minimum: {stockSummary.lowStockCount}.
        </p>
      </section>
    </div>
  );
}
