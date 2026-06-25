import Link from "next/link";
import { redirect } from "next/navigation";
import { BarChart3, MapPinned, Repeat, History, AlertTriangle, Edit2, X, ClipboardList, Layers } from "lucide-react";

import { getCurrentAuthSession } from "@/lib/auth";
import { hasPermission, isAdmin } from "@/lib/rbac";
import {
  getWarehouseLocationOptions,
  getWarehouseOverview,
  getWarehouseSerialOverview,
  getWarehouseStockItemOptions,
  getWarehouseSerialItemOptions,
  getWarehouseItemStatusTone,
  getWarehouseItemStatusLabel,
  getWarehouseSerialStatusTone,
  getWarehouseSerialStatusLabel,
} from "@/lib/warehouse";

import {
  WarehouseLocationForm,
  WarehouseModal,
  WarehouseStockItemForm,
  WarehouseMovementForm,
  WarehouseOpnameForm,
  WarehouseSerialItemForm,
  WarehouseSerialMoveForm,
} from "./warehouse-forms";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function WarehousePage({ searchParams }: PageProps) {
  const session = await getCurrentAuthSession();
  if (!session) {
    redirect("/login");
  }

  if (!hasPermission(session, "warehouse.read")) {
    redirect("/akses-ditolak");
  }

  const canManageLocations = isAdmin(session);
  const canManageStock = hasPermission(session, "warehouse.write");

  // Resolve search parameters
  const resolvedSearchParams = (await searchParams) ?? {};
  const activeTab = (resolvedSearchParams.tab === "nonserial" ? "nonserial" : "serial") as "serial" | "nonserial";
  const action = typeof resolvedSearchParams.action === "string" ? resolvedSearchParams.action : undefined;
  const targetId = typeof resolvedSearchParams.id === "string" ? resolvedSearchParams.id : undefined;

  const [overview, serialOverview, locationOptions, stockItemOptions, serialItemOptions] = await Promise.all([
    getWarehouseOverview(),
    getWarehouseSerialOverview(),
    getWarehouseLocationOptions(),
    getWarehouseStockItemOptions(),
    getWarehouseSerialItemOptions(),
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


  // Build stats cards
  const summaryCards = [
    {
      label: "Lokasi aktif",
      value: overview.stats.locationCount.toString(),
      note: "Struktur gudang yang dipakai saat ini.",
      icon: MapPinned,
      highlight: false,
    },
    {
      label: "Peralatan (Serial)",
      value: serialOverview.stats.serialCount.toString(),
      note: "Item ber-ID unik yang dilacak satuan.",
      icon: Repeat,
      highlight: false,
    },
    {
      label: "Stok Habis Pakai",
      value: overview.stats.itemCount.toString(),
      note: "Barang non-serial consumable.",
      icon: Layers,
      highlight: false,
    },
    {
      label: "Stok Menipis / Habis",
      value: overview.stats.lowStockCount.toString(),
      note: "Barang non-serial di bawah batas minimum.",
      icon: AlertTriangle,
      highlight: overview.stats.lowStockCount > 0,
    },
  ];

  // If action is edit stock, find the item
  let editingStockItem = undefined;
  if (action === "edit-stock" && targetId) {
    editingStockItem = overview.items.find((item) => item.id === targetId);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-600">Warehouse</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Inventaris gudang</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Kelola lokasi penyimpanan, lacak peralatan ber-ID (Serial), serta kendalikan stok barang habis pakai (Non-Serial) dengan pencatatan mutasi otomatis.
        </p>
      </section>

      {/* Stats Section */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-500">{card.label}</p>
                  <p className={`mt-2 text-3xl font-semibold tracking-tight ${card.highlight ? "text-amber-600" : ""}`}>
                    {card.value}
                  </p>
                </div>
                <div className={`rounded-2xl p-3 ${card.highlight ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-700"}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-600">{card.note}</p>
            </article>
          );
        })}
      </section>

      {/* Double Tab Switcher */}
      <div className="border-b border-slate-200">
        <div className="flex gap-6">
          <Link prefetch={false}
            href="/dashboard/warehouse?tab=serial"
            className={`pb-4 text-xs sm:text-sm font-semibold border-b-2 transition ${
              activeTab === "serial"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            Peralatan Ber-ID (Serial)
          </Link>
          <Link prefetch={false}
            href="/dashboard/warehouse?tab=nonserial"
            className={`pb-4 text-xs sm:text-sm font-semibold border-b-2 transition ${
              activeTab === "nonserial"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            Stok Habis Pakai (Non-Serial)
          </Link>
        </div>
      </div>

      {activeTab === "serial" ? (
        /* ==================== TAB 1: SERIAL ==================== */
        <div className="space-y-6">
          <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Lokasi gudang</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Struktur area penyimpanan aktif beserta jumlah peralatan terdaftar.
                  </p>
                </div>
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block mt-5 overflow-x-auto rounded-2xl border border-slate-200">
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

              {/* Mobile Card List View */}
              <div className="md:hidden mt-5 space-y-4">
                {overview.locations.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                    Belum ada lokasi gudang.
                  </div>
                ) : (
                  overview.locations.map((location) => {
                    const locationItems = serialOverview.items.filter((item) => item.locationId === location.id);
                    const countInfo = itemCountByLocationId.get(location.id);
                    return (
                      <div key={location.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">{location.name}</h4>
                            <p className="text-xs text-slate-500 mt-1">Kode: {location.code}</p>
                          </div>
                          {location.parentLocationId && (
                            <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-800">
                              Sub-lokasi
                            </span>
                          )}
                        </div>
                        {location.parentLocationId && (
                          <div className="text-xs text-slate-600">
                            <span className="font-semibold text-slate-700">Induk:</span> {location.label}
                          </div>
                        )}
                        <div className="border-t border-slate-100 pt-3 text-xs text-slate-600">
                          <p className="font-semibold text-slate-700">Peralatan ({countInfo?.count ?? 0} item):</p>
                          <p className="text-slate-500 mt-1 text-[11px] leading-normal">
                            {countInfo?.names.length
                              ? countInfo.names.join(", ")
                              : locationItems.length === 0
                                ? "Belum ada item"
                                : locationItems.slice(0, 3).map((item) => item.name).join(", ")}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </article>

            <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft space-y-6">
              <div>
                <h2 className="text-lg font-semibold">Kelola gudang</h2>
                <p className="mt-1 text-sm text-slate-500 font-normal">
                  Aksi konfigurasi lokasi penyimpanan dan pendaftaran alat ber-ID.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                {canManageLocations && (
                  <WarehouseModal
                    title="Tambah lokasi gudang"
                    description="Buat lokasi induk atau sub-lokasi untuk menata peralatan dan stok."
                    triggerLabel="Tambah lokasi baru"
                  >
                    <WarehouseLocationForm locations={locationOptions} />
                  </WarehouseModal>
                )}

                {canManageStock && (
                  <>
                    <WarehouseModal
                      title="Tambah Peralatan"
                      description="Daftarkan peralatan baru dengan ID unik (serial number)."
                      triggerLabel="Daftar peralatan baru"
                    >
                      <WarehouseSerialItemForm locations={locationOptions} />
                    </WarehouseModal>

                    <WarehouseModal
                      title="Mutasi Peralatan"
                      description="Catat perpindahan peralatan antar lokasi penyimpanan."
                      triggerLabel="Mutasikan peralatan"
                    >
                      <WarehouseSerialMoveForm
                        serialItemOptions={serialItemOptions}
                        locations={locationOptions}
                      />
                    </WarehouseModal>
                  </>
                )}
              </div>
            </aside>
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Daftar peralatan ber-ID</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Status operasional dan penempatan masing-masing peralatan.
                  </p>
                </div>
                <Repeat className="h-5 w-5 text-slate-400" />
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block mt-5 overflow-x-auto rounded-2xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-4 py-3 font-medium">ID (Serial)</th>
                      <th className="px-4 py-3 font-medium">Nama</th>
                      <th className="px-4 py-3 font-medium">Kategori</th>
                      <th className="px-4 py-3 font-medium">Lokasi terakhir</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {serialOverview.items.length === 0 ? (
                      <tr>
                        <td className="px-4 py-5 text-slate-500" colSpan={5}>
                          Belum ada peralatan terdaftar.
                        </td>
                      </tr>
                    ) : (
                      serialOverview.items.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-3 font-medium text-slate-900">{item.serialNumber}</td>
                          <td className="px-4 py-3 text-slate-700">{item.name}</td>
                          <td className="px-4 py-3 text-slate-600">{item.category || "-"}</td>
                          <td className="px-4 py-3 text-slate-600">{item.locationLabel ?? "-"}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getWarehouseSerialStatusTone(item.status)}`}>
                              {getWarehouseSerialStatusLabel(item.status)}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List View */}
              <div className="md:hidden mt-5 space-y-4">
                {serialOverview.items.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                    Belum ada peralatan terdaftar.
                  </div>
                ) : (
                  serialOverview.items.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">{item.name}</h4>
                          <p className="text-xs text-slate-500 mt-1">Serial: {item.serialNumber}</p>
                        </div>
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getWarehouseSerialStatusTone(item.status)}`}>
                          {getWarehouseSerialStatusLabel(item.status)}
                        </span>
                      </div>
                      <div className="border-t border-slate-100 pt-3 text-xs text-slate-600 space-y-1">
                        <p><span className="font-semibold text-slate-700">Kategori:</span> {item.category || "-"}</p>
                        <p><span className="font-semibold text-slate-700">Lokasi:</span> {item.locationLabel ?? "-"}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Log mutasi peralatan</h2>
                  <p className="mt-1 text-sm text-slate-500">Pencatatan perpindahan fisik peralatan terbaru.</p>
                </div>
                <BarChart3 className="h-5 w-5 text-slate-400" />
              </div>
              <div className="mt-5 space-y-4">
                {serialOverview.movements.length === 0 ? (
                  <p className="text-sm text-slate-500">Belum ada mutasi peralatan.</p>
                ) : (
                  serialOverview.movements.map((movement) => (
                    <div key={movement.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {movement.serialNumber} - {movement.serialName}
                          </p>
                          <p className="mt-1 text-[10px] text-slate-500 font-medium">{movement.createdAt.toLocaleString("id-ID")}</p>
                        </div>
                      </div>
                      <p className="mt-2 text-sm text-slate-600 leading-normal">{movement.note ?? "Tanpa catatan."}</p>
                      <p className="mt-2 text-xs text-slate-500 font-medium">
                        {movement.fromLocationLabel ?? "Luar Gudang"} → {movement.toLocationLabel ?? "Luar Gudang"}
                      </p>
                      {movement.changedByName && (
                        <p className="mt-1 text-[10px] text-slate-400">Diproses oleh: {movement.changedByName}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </article>
          </section>
        </div>
      ) : (
        /* ==================== TAB 2: NON-SERIAL ==================== */
        <div className="space-y-6">
          {/* Low Stock Alerts */}
          {overview.items.some((item) => item.currentQuantity <= item.minimumQuantity) && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 flex gap-3 text-amber-800">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-sm">Peringatan Ketersediaan Stok</h4>
                <p className="text-xs text-amber-700 mt-1 leading-normal">
                  Beberapa barang habis pakai telah mencapai atau berada di bawah batas minimum stok yang ditentukan. Silakan lakukan pengadaan atau mutasi masuk segera.
                </p>
              </div>
            </div>
          )}

          <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            {/* Stock Items Table */}
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Daftar stok habis pakai</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Daftar persediaan barang non-serial consumable.
                  </p>
                </div>
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block mt-5 overflow-x-auto rounded-2xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-4 py-3 font-medium">SKU</th>
                      <th className="px-4 py-3 font-medium">Nama barang</th>
                      <th className="px-4 py-3 font-medium">Kategori</th>
                      <th className="px-4 py-3 font-medium text-center">Stok</th>
                      <th className="px-4 py-3 font-medium">Lokasi</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      {canManageStock && <th className="px-4 py-3 font-medium text-center">Aksi</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {overview.items.length === 0 ? (
                      <tr>
                        <td className="px-4 py-5 text-slate-500" colSpan={canManageStock ? 7 : 6}>
                          Belum ada data barang habis pakai.
                        </td>
                      </tr>
                    ) : (
                      overview.items.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-3 font-medium text-slate-900">{item.sku}</td>
                          <td className="px-4 py-3 text-slate-700">{item.name}</td>
                          <td className="px-4 py-3 text-slate-600">{item.category || "-"}</td>
                          <td className="px-4 py-3 text-center font-medium">
                            <span className="text-slate-900">{item.currentQuantity}</span>{" "}
                            <span className="text-slate-500 text-xs">{item.unit}</span>
                            <div className="text-[10px] text-slate-400 font-normal">Min: {item.minimumQuantity}</div>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{item.locationLabel ?? "-"}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getWarehouseItemStatusTone(item.currentQuantity, item.minimumQuantity)}`}>
                              {getWarehouseItemStatusLabel(item.currentQuantity, item.minimumQuantity)}
                            </span>
                          </td>
                          {canManageStock && (
                            <td className="px-4 py-3 text-center">
                              <Link prefetch={false}
                                href={`/dashboard/warehouse?tab=nonserial&action=edit-stock&id=${item.id}`}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900 transition"
                                title="Ubah data stok"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Link>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List View */}
              <div className="md:hidden mt-5 space-y-4">
                {overview.items.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                    Belum ada data barang habis pakai.
                  </div>
                ) : (
                  overview.items.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">{item.name}</h4>
                          <p className="text-xs text-slate-500 mt-1">SKU: {item.sku}</p>
                        </div>
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getWarehouseItemStatusTone(item.currentQuantity, item.minimumQuantity)}`}>
                          {getWarehouseItemStatusLabel(item.currentQuantity, item.minimumQuantity)}
                        </span>
                      </div>
                      <div className="border-t border-slate-100 pt-3 text-xs text-slate-600 space-y-1">
                        <p><span className="font-semibold text-slate-700">Kategori:</span> {item.category || "-"}</p>
                        <p><span className="font-semibold text-slate-700">Lokasi:</span> {item.locationLabel ?? "-"}</p>
                        <p>
                          <span className="font-semibold text-slate-700">Stok saat ini:</span> {item.currentQuantity} {item.unit}{" "}
                          <span className="text-[10px] text-slate-400 font-normal">(Min: {item.minimumQuantity})</span>
                        </p>
                      </div>
                      {canManageStock && (
                        <div className="border-t border-slate-100 pt-3 flex justify-end">
                          <Link prefetch={false}
                            href={`/dashboard/warehouse?tab=nonserial&action=edit-stock&id=${item.id}`}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                          >
                            <Edit2 className="h-3 w-3" />
                            Ubah stok
                          </Link>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </article>

            {/* Manage Stock Actions */}
            <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft space-y-6">
              <div>
                <h2 className="text-lg font-semibold">Kelola stok</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Form mutasi persediaan masuk, keluar, dan pencatatan hasil stock opname.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                {canManageStock && (
                  <>
                    <WarehouseModal
                      title="Tambah Stok Baru"
                      description="Daftarkan barang habis pakai baru ke sistem inventaris gudang."
                      triggerLabel="Tambah stok baru"
                    >
                      <WarehouseStockItemForm
                        locations={locationOptions}
                        redirectTo="/dashboard/warehouse?tab=nonserial"
                      />
                    </WarehouseModal>

                    <WarehouseModal
                      title="Mutasikan Persediaan"
                      description="Sesuaikan kuantitas stok masuk (in) atau keluar (out) dengan catatan perpindahan."
                      triggerLabel="Mutasikan stok"
                    >
                      <WarehouseMovementForm
                        stockItemOptions={stockItemOptions}
                        locations={locationOptions}
                        redirectTo="/dashboard/warehouse?tab=nonserial"
                      />
                    </WarehouseModal>

                    <WarehouseModal
                      title="Stock Opname"
                      description="Sesuaikan stok sistem dengan hasil perhitungan fisik di gudang."
                      triggerLabel="Stock opname"
                    >
                      <WarehouseOpnameForm
                        stockItemOptions={stockItemOptions}
                        redirectTo="/dashboard/warehouse?tab=nonserial"
                      />
                    </WarehouseModal>
                  </>
                )}
              </div>
            </aside>
          </section>

          {/* Mutations and Opname History Logs */}
          <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Log mutasi stok terbaru</h2>
                  <p className="mt-1 text-sm text-slate-500">Riwayat transaksi keluar-masuk barang habis pakai.</p>
                </div>
                <History className="h-5 w-5 text-slate-400" />
              </div>

              <div className="mt-5 space-y-4">
                {overview.movements.length === 0 ? (
                  <p className="text-sm text-slate-500">Belum ada mutasi barang.</p>
                ) : (
                  overview.movements.map((movement) => {
                    const isIncrease = movement.movementType === "in" || (movement.movementType === "opname" && (movement.note?.includes("+") ?? false));
                    const isDecrease = movement.movementType === "out" || movement.movementType === "delete" || (movement.movementType === "opname" && (movement.note?.includes("-") ?? false));

                    let badgeColor = "bg-slate-50 text-slate-700 border-slate-200";
                    if (isIncrease) badgeColor = "bg-emerald-50 text-emerald-800 border-emerald-200";
                    if (isDecrease) badgeColor = "bg-rose-50 text-rose-800 border-rose-200";

                    return (
                      <div key={movement.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {movement.stockItemSku} - {movement.stockItemName}
                            </p>
                            <p className="mt-1 text-[10px] text-slate-500">{movement.createdAt.toLocaleString("id-ID")}</p>
                          </div>
                          <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badgeColor}`}>
                            {movement.movementType.toUpperCase()} ({movement.quantity})
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-slate-600 leading-normal">{movement.note ?? "Tanpa catatan."}</p>
                        <p className="mt-2 text-xs text-slate-500 font-medium">
                          {movement.fromLocationLabel ? `${movement.fromLocationLabel}` : "-"} → {movement.toLocationLabel ? `${movement.toLocationLabel}` : "-"}
                        </p>
                        {movement.changedByName && (
                          <p className="mt-1 text-[10px] text-slate-400">Oleh: {movement.changedByName}</p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </article>

            {/* Opname Audits */}
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Riwayat stock opname</h2>
                  <p className="mt-1 text-sm text-slate-500">Pencocokan fisik inventaris periodik.</p>
                </div>
                <ClipboardList className="h-5 w-5 text-slate-400" />
              </div>
              <div className="mt-5 space-y-4">
                {overview.counts.length === 0 ? (
                  <p className="text-sm text-slate-500">Belum ada riwayat stock opname.</p>
                ) : (
                  overview.counts.map((count) => (
                    <div key={count.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            Opname: {count.locationLabel ?? "Seluruh Gudang"}
                          </p>
                          <p className="mt-1 text-[10px] text-slate-500">{count.countedAt.toLocaleString("id-ID")}</p>
                        </div>
                        <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-800">
                          {count.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-600">{count.note || "Tanpa catatan."}</p>
                      {count.countedByName && (
                        <p className="mt-1 text-[10px] text-slate-400">Petugas: {count.countedByName}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </article>
          </section>
        </div>
      )}

      {/* Edit Stock Modal Overlay */}
      {action === "edit-stock" && editingStockItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Formulir</p>
                <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">Ubah Stok Habis Pakai</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Perbarui detail kuantitas, batas minimum, lokasi, atau deskripsi barang.
                </p>
              </div>
              <Link prefetch={false}
                href="/dashboard/warehouse?tab=nonserial"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
                aria-label="Tutup modal"
              >
                <X className="h-4 w-4" />
              </Link>
            </div>
            <div className="max-h-[calc(100vh-10rem)] overflow-auto px-6 py-6">
              <WarehouseStockItemForm
                mode="edit"
                locations={locationOptions}
                redirectTo="/dashboard/warehouse?tab=nonserial"
                initialValues={{
                  id: editingStockItem.id,
                  sku: editingStockItem.sku,
                  name: editingStockItem.name,
                  unit: editingStockItem.unit,
                  category: editingStockItem.category,
                  locationId: editingStockItem.locationId || "",
                  currentQuantity: editingStockItem.currentQuantity,
                  minimumQuantity: editingStockItem.minimumQuantity,
                  notes: editingStockItem.notes || "",
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

