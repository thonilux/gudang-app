import { redirect } from "next/navigation";
import { BarChart3, MapPinned, Repeat, Warehouse } from "lucide-react";

import { getCurrentAuthSession } from "@/lib/auth";
import { hasPermission, isAdmin } from "@/lib/rbac";
import {
  getWarehouseLocationOptions,
  getWarehouseOverview,
  getWarehouseSerialOverview,
} from "@/lib/warehouse";

import { WarehouseLocationForm, WarehouseModal } from "./warehouse-forms";

export const dynamic = "force-dynamic";

export default async function WarehousePage() {
  const session = await getCurrentAuthSession();
  if (!session) {
    redirect("/login");
  }

  if (!hasPermission(session, "warehouse.read")) {
    redirect("/akses-ditolak");
  }

  const canManageLocations = isAdmin(session);

  const [overview, serialOverview, locationOptions] = await Promise.all([
    getWarehouseOverview(),
    getWarehouseSerialOverview(),
    getWarehouseLocationOptions(),
  ]);

  const itemCountByLocationId = new Map<string, { count: number; names: string[] }>();
  for (const item of serialOverview.items) {
    if (!item.locationId) {
      continue;
    }

    const entry = itemCountByLocationId.get(item.locationId) ?? { count: 0, names: [] };
    entry.count += 1;
    if (entry.names.length < 3) {
      entry.names.push(item.name);
    }
    itemCountByLocationId.set(item.locationId, entry);
  }

  const filledLocationCount = overview.locations.filter((location) => itemCountByLocationId.has(location.id)).length;

  const summaryCards = [
    {
      label: "Lokasi aktif",
      value: overview.stats.locationCount.toString(),
      note: "Struktur gudang yang dipakai saat ini.",
      icon: MapPinned,
    },
    {
      label: "Peralatan",
      value: serialOverview.stats.serialCount.toString(),
      note: "Item ber-ID yang ditelusuri satu per satu.",
      icon: Repeat,
    },
    {
      label: "Lokasi terisi",
      value: filledLocationCount.toString(),
      note: "Lokasi yang sudah punya item masuk.",
      icon: Warehouse,
    },
    {
      label: "Mutasi peralatan",
      value: serialOverview.movements.length.toString(),
      note: "Log pindah dan pembaruan lokasi.",
      icon: BarChart3,
    },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-600">Warehouse</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Inventaris gudang</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Halaman ini fokus ke lokasi gudang, distribusi peralatan ber-ID per lokasi, dan log
          mutasi peralatan.
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

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Lokasi gudang</h2>
              <p className="mt-1 text-sm text-slate-500">
                Lihat lokasi aktif dan item yang tersimpan di masing-masing lokasi.
              </p>
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Kode</th>
                  <th className="px-4 py-3 font-medium">Nama</th>
                  <th className="px-4 py-3 font-medium">Induk</th>
                  <th className="px-4 py-3 font-medium">Peralatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {overview.locations.length === 0 ? (
                  <tr>
                    <td className="px-4 py-5 text-slate-500" colSpan={4}>
                      Belum ada lokasi gudang.
                    </td>
                  </tr>
                ) : (
                  overview.locations.map((location) => {
                    const locationItems = serialOverview.items.filter((item) => item.locationId === location.id);
                    const countInfo = itemCountByLocationId.get(location.id);

                    return (
                      <tr key={location.id}>
                        <td className="px-4 py-3 font-medium text-slate-900">{location.code}</td>
                        <td className="px-4 py-3 text-slate-700">{location.name}</td>
                        <td className="px-4 py-3 text-slate-600">{location.parentLocationId ? location.label : "-"}</td>
                        <td className="px-4 py-3 text-slate-600">
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-slate-900">{countInfo?.count ?? 0} item</p>
                            <p className="text-xs text-slate-500">
                              {countInfo?.names.length
                                ? countInfo.names.join(", ")
                                : locationItems.length === 0
                                  ? "Belum ada item"
                                  : locationItems.slice(0, 3).map((item) => item.name).join(", ")}
                            </p>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </article>

        <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
          <h2 className="text-lg font-semibold">Kelola lokasi</h2>
          <p className="mt-1 text-sm text-slate-500">
            Hanya admin yang bisa menambah lokasi agar struktur gudang tetap terkendali.
          </p>
          {canManageLocations ? (
            <div className="mt-5">
              <WarehouseModal
                title="Tambah lokasi gudang"
                description="Buat lokasi induk atau sub-lokasi untuk menata peralatan dan stok."
                triggerLabel="Buka form lokasi"
              >
                <WarehouseLocationForm locations={locationOptions} />
              </WarehouseModal>
            </div>
          ) : null}
        </aside>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Peralatan per lokasi</h2>
              <p className="mt-1 text-sm text-slate-500">
                Daftar item ber-ID dan lokasi terakhirnya.
              </p>
            </div>
            <Repeat className="h-5 w-5 text-slate-400" />
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">ID</th>
                  <th className="px-4 py-3 font-medium">Nama</th>
                  <th className="px-4 py-3 font-medium">Lokasi</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {serialOverview.items.length === 0 ? (
                  <tr>
                    <td className="px-4 py-5 text-slate-500" colSpan={4}>
                      Belum ada peralatan.
                    </td>
                  </tr>
                ) : (
                  serialOverview.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 font-medium text-slate-900">{item.serialNumber}</td>
                      <td className="px-4 py-3 text-slate-700">{item.name}</td>
                      <td className="px-4 py-3 text-slate-600">{item.locationLabel ?? "-"}</td>
                      <td className="px-4 py-3 text-slate-600">{item.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Log mutasi peralatan</h2>
            <BarChart3 className="h-5 w-5 text-slate-400" />
          </div>
          <div className="mt-4 space-y-4">
            {serialOverview.movements.length === 0 ? (
              <p className="text-sm text-slate-500">Belum ada mutasi peralatan.</p>
            ) : (
              serialOverview.movements.map((movement) => (
                <div key={movement.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {movement.serialNumber} - {movement.serialName}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">{movement.createdAt.toLocaleString("id-ID")}</p>
                    </div>
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
      </section>
    </div>
  );
}
