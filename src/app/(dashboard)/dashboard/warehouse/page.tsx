import { redirect } from "next/navigation";
import { BarChart3, MapPinned, Repeat, Scale, Warehouse } from "lucide-react";

import { getCurrentAuthSession } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import {
  getWarehouseCountsSummary,
  getWarehouseItemStatusLabel,
  getWarehouseItemStatusTone,
  getWarehouseLocationOptions,
  getWarehouseOverview,
  getWarehouseSerialItemOptions,
  getWarehouseSerialOverview,
  getWarehouseSerialStatusLabel,
  getWarehouseSerialStatusTone,
} from "@/lib/warehouse";
import { getWarehouseMovementLabel } from "@/lib/warehouse-shared";

import {
  WarehouseLocationForm,
  WarehouseMovementForm,
  WarehouseOpnameForm,
  WarehouseModal,
  WarehouseSerialItemForm,
  WarehouseSerialMoveForm,
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

  const [overview, serialOverview, stockSummary, locationOptions, serialItemOptions] =
    await Promise.all([
      getWarehouseOverview(),
      getWarehouseSerialOverview(),
      getWarehouseCountsSummary(),
      getWarehouseLocationOptions(),
      getWarehouseSerialItemOptions(),
    ]);

  const summaryCards = [
    {
      label: "Lokasi gudang",
      value: overview.stats.locationCount.toString(),
      note: "Hierarki lokasi yang aktif.",
      icon: MapPinned,
    },
    {
      label: "Bahan habis pakai",
      value: overview.stats.itemCount.toString(),
      note: "Contoh: baterai alkalin, tape, dan part kecil lain.",
      icon: Warehouse,
    },
    {
      label: "Perlu restock",
      value: overview.stats.lowStockCount.toString(),
      note: "Jumlah item di bawah ambang minimum.",
      icon: Scale,
    },
    {
      label: "Aset unik",
      value: serialOverview.stats.serialCount.toString(),
      note: "Contoh: kabel, konektor, rechargeable battery, unit kecil lain.",
      icon: Repeat,
    },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-600">Warehouse</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Operasi gudang</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Fase ini memisahkan dua model yang berbeda: aset unik yang dilacak satu per satu, dan
          bahan habis pakai yang dihitung per jumlah.
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

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Lokasi gudang</h2>
              <p className="mt-1 text-sm text-slate-500">Struktur lokasi yang dipakai untuk aset unik dan bahan habis pakai.</p>
            </div>
            <WarehouseModal
              title="Tambah lokasi gudang"
              description="Buat lokasi induk atau sub-lokasi untuk menata aset unik dan bahan habis pakai."
              triggerLabel="Tambah lokasi"
            >
              <WarehouseLocationForm locations={locationOptions} />
            </WarehouseModal>
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
                      <td className="px-4 py-3 text-slate-600">{location.parentLocationId ? location.label : "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>

        <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
          <h2 className="text-lg font-semibold">Buat lokasi dengan modal</h2>
          <p className="mt-1 text-sm text-slate-500">
            Form lokasi dibuka sebagai pop-up agar halaman utama tetap fokus ke daftar lokasi.
          </p>
          <div className="mt-5">
            <WarehouseModal
              title="Tambah lokasi gudang"
              description="Buat lokasi induk atau sub-lokasi untuk menata aset unik dan bahan habis pakai."
              triggerLabel="Buka form lokasi"
            >
              <WarehouseLocationForm locations={locationOptions} />
            </WarehouseModal>
          </div>
        </aside>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
          <h2 className="text-lg font-semibold">Bahan habis pakai</h2>
          <p className="mt-1 text-sm text-slate-500">Barang yang dihitung per jumlah, misalnya baterai alkalin dan part kecil lain.</p>

          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Kode</th>
                  <th className="px-4 py-3 font-medium">Item</th>
                  <th className="px-4 py-3 font-medium">Jumlah</th>
                  <th className="px-4 py-3 font-medium">Lokasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {overview.items.length === 0 ? (
                  <tr>
                    <td className="px-4 py-5 text-slate-500" colSpan={4}>
                      Belum ada bahan habis pakai.
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
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>

        <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
          <h2 className="text-lg font-semibold">Tambah bahan habis pakai</h2>
          <p className="mt-1 text-sm text-slate-500">Registrasi stok yang dihitung per jumlah.</p>
          <div className="mt-5">
            <WarehouseModal
              title="Tambah bahan habis pakai"
              description="Masukkan item quantity-based seperti baterai alkalin, tape, atau part kecil lain."
              triggerLabel="Buka form stok"
            >
              <WarehouseStockItemForm locations={locationOptions} />
            </WarehouseModal>
          </div>
        </aside>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
          <h2 className="text-lg font-semibold">Mutasi bahan habis pakai</h2>
          <p className="mt-1 text-sm text-slate-500">Catat masuk, keluar, atau pindah lokasi.</p>
          <div className="mt-5">
            <WarehouseModal
              title="Catat mutasi bahan habis pakai"
              description="Gunakan untuk mencatat barang masuk, keluar, atau transfer antar lokasi."
              triggerLabel="Buka form mutasi"
            >
              <WarehouseMovementForm
                stockItemOptions={overview.items.map((item) => ({
                  id: item.id,
                  label: `${item.sku} - ${item.name}`,
                }))}
                locations={locationOptions}
              />
            </WarehouseModal>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
          <h2 className="text-lg font-semibold">Opname bahan habis pakai</h2>
          <p className="mt-1 text-sm text-slate-500">Perbaiki stok berdasarkan hasil hitung fisik.</p>
          <div className="mt-5">
            <WarehouseModal
              title="Opname bahan habis pakai"
              description="Sesuaikan angka sistem dengan hasil hitung fisik di lokasi gudang."
              triggerLabel="Buka form opname"
            >
              <WarehouseOpnameForm
                stockItemOptions={overview.items.map((item) => ({
                  id: item.id,
                  label: `${item.sku} - ${item.name}`,
                }))}
              />
            </WarehouseModal>
          </div>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Aset unik</h2>
              <p className="mt-1 text-sm text-slate-500">
                Cocok untuk kabel, konektor, rechargeable battery, alat kecil, dan item yang punya identitas sendiri.
              </p>
            </div>
            <Repeat className="h-5 w-5 text-slate-400" />
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">ID aset</th>
                  <th className="px-4 py-3 font-medium">Item</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Lokasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {serialOverview.items.length === 0 ? (
                  <tr>
                    <td className="px-4 py-5 text-slate-500" colSpan={4}>
                      Belum ada aset unik.
                    </td>
                  </tr>
                ) : (
                  serialOverview.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 font-medium text-slate-900">{item.serialNumber}</td>
                      <td className="px-4 py-3 text-slate-700">
                        <p className="font-medium text-slate-900">{item.name}</p>
                        <p className="mt-1 text-xs text-slate-500">{item.category || "Tanpa kategori"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getWarehouseSerialStatusTone(
                            item.status,
                          )}`}
                        >
                          {getWarehouseSerialStatusLabel(item.status)}
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
          <h2 className="text-lg font-semibold">Tambah aset unik</h2>
          <p className="mt-1 text-sm text-slate-500">Untuk item yang dilacak satu per satu, bukan dihitung jumlah.</p>
          <div className="mt-5">
            <WarehouseModal
              title="Tambah aset unik"
              description="Masukkan item ber-ID seperti kabel, konektor, atau rechargeable battery."
              triggerLabel="Buka form aset"
            >
              <WarehouseSerialItemForm locations={locationOptions} />
            </WarehouseModal>
          </div>
        </aside>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
          <h2 className="text-lg font-semibold">Pindah lokasi aset unik</h2>
          <p className="mt-1 text-sm text-slate-500">Riwayat pindah disimpan per item, tanpa quantity.</p>
          <div className="mt-5">
            <WarehouseModal
              title="Pindah lokasi aset unik"
              description="Perbarui lokasi untuk kabel, konektor, atau item ber-ID lain tanpa mengubah jumlah."
              triggerLabel="Buka form pindah"
            >
              <WarehouseSerialMoveForm serialItemOptions={serialItemOptions} locations={locationOptions} />
            </WarehouseModal>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Mutasi aset unik</h2>
            <BarChart3 className="h-5 w-5 text-slate-400" />
          </div>
          <div className="mt-4 space-y-4">
            {serialOverview.movements.length === 0 ? (
              <p className="text-sm text-slate-500">Belum ada mutasi aset unik.</p>
            ) : (
              serialOverview.movements.map((movement) => (
                <div key={movement.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {movement.serialNumber} - {movement.serialName}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {movement.createdAt.toLocaleString("id-ID")}
                      </p>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{movement.note ?? "Tanpa catatan."}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    {movement.fromLocationLabel ?? "-"} - {movement.toLocationLabel ?? "-"}
                  </p>
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Mutasi terbaru bahan habis pakai</h2>
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
                        {getWarehouseMovementLabel(movement.movementType)} - {movement.quantity}
                      </p>
                    </div>
                    <p className="text-xs text-slate-500">{movement.createdAt.toLocaleString("id-ID")}</p>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{movement.note ?? "Tanpa catatan."}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    {movement.fromLocationLabel ?? "-"} - {movement.toLocationLabel ?? "-"}
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

      <section className="rounded-2xl border border-blue-100 bg-blue-50 p-6 text-sm text-blue-900">
        <p className="font-medium">Ringkasan stok</p>
        <p className="mt-2 leading-6">
          Total kuantitas bahan habis pakai: {stockSummary.totalQuantity}. Item di bawah ambang minimum: {stockSummary.lowStockCount}.
        </p>
      </section>
    </div>
  );
}
