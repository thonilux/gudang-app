import { Activity, FileClock, ShieldAlert, ShieldCheck, Users } from "lucide-react";

import { getDb } from "@/db";
import { getCurrentAuthSession } from "@/lib/auth";
import {
  getEquipmentDashboardStats,
  getEquipmentList,
  getEquipmentStatusLabel,
  getEquipmentStatusTone,
} from "@/lib/equipment";
import { getWarehouseCountsSummary, getWarehouseOverview } from "@/lib/warehouse";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getCurrentAuthSession();
  if (!session) {
    return null;
  }

  const db = getDb();
  const [recentLogs, equipmentStats, equipmentItems, warehouseOverview, warehouseSummary] = await Promise.all([
    db.query.auditLogs.findMany({
      orderBy: (table, { desc }) => [desc(table.createdAt)],
      limit: 6,
    }),
    getEquipmentDashboardStats(),
    getEquipmentList(),
    getWarehouseOverview(),
    getWarehouseCountsSummary(),
  ]);

  const cards = [
    {
      label: "Peran aktif",
      value: session.roles.length.toString(),
      note: session.roles.map((role) => role.name).join(", "),
      icon: Users,
    },
    {
      label: "Hak akses",
      value: session.permissions.length.toString(),
      note: "Akses mengikuti role yang ditetapkan.",
      icon: ShieldCheck,
    },
    {
      label: "Audit terbaru",
      value: recentLogs.length.toString(),
      note: "Aksi sensitif terakhir tercatat di sini.",
      icon: FileClock,
    },
    {
      label: "Peralatan terdaftar",
      value: equipmentStats.total.toString(),
      note: "Aset inti yang sudah masuk inventaris.",
      icon: ShieldCheck,
    },
    {
      label: "Perlu perhatian",
      value: equipmentStats.attention.toString(),
      note: "Status inspeksi atau perbaikan terbuka.",
      icon: ShieldAlert,
    },
    {
      label: "Lokasi gudang",
      value: warehouseOverview.stats.locationCount.toString(),
      note: "Struktur lokasi non-serial.",
      icon: FileClock,
    },
    {
      label: "Restock",
      value: warehouseSummary.lowStockCount.toString(),
      note: "Item gudang di bawah ambang minimum.",
      icon: ShieldAlert,
    },
    {
      label: "Mode operasi",
      value: "Siap",
      note: "Fase 3 berjalan di mode lokal.",
      icon: Activity,
    },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-teal-700">Dasbor</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Selamat datang, {session.user.name}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Anda sudah masuk ke sistem. Fase 1 menyiapkan autentikasi, akses berbasis peran, dan
          pencatatan audit sebagai fondasi untuk modul berikutnya.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
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

      <section className="grid gap-4 lg:grid-cols-[1.3fr_0.9fr]">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Akses dan peran aktif</h2>
              <p className="mt-1 text-sm text-slate-500">
                Hak akses yang dimuat dari session sekarang.
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {session.roles.map((role) => (
              <span
                key={role.key}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700"
              >
                {role.name}
              </span>
            ))}
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-semibold text-slate-900">Hak akses yang tersedia</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {session.permissions.map((permission) => (
                <span
                  key={permission}
                  className="rounded-xl border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-800"
                >
                  {permission}
                </span>
              ))}
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
          <h2 className="text-lg font-semibold">Audit terbaru</h2>
          <div className="mt-4 space-y-4">
            {recentLogs.length === 0 ? (
              <p className="text-sm text-slate-500">Belum ada log audit yang tercatat.</p>
            ) : (
              recentLogs.map((log) => (
                <div key={log.id} className="border-b border-slate-100 pb-3 last:border-none last:pb-0">
                  <p className="text-sm font-medium text-slate-900">{log.summary}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {log.action} {log.entityType ? `- ${log.entityType}` : ""}
                  </p>
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Peralatan yang perlu dilihat</h2>
            <p className="mt-1 text-sm text-slate-500">
              Lima item terbaru untuk cek cepat kondisi inventaris.
            </p>
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Kode</th>
                <th className="px-4 py-3 font-medium">Nama</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Lokasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {equipmentItems.slice(0, 5).length === 0 ? (
                <tr>
                  <td className="px-4 py-5 text-slate-500" colSpan={4}>
                    Belum ada peralatan yang terdaftar.
                  </td>
                </tr>
              ) : (
                equipmentItems.slice(0, 5).map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">{item.code}</td>
                    <td className="px-4 py-3 text-slate-700">{item.name}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getEquipmentStatusTone(item.status)}`}
                      >
                        {getEquipmentStatusLabel(item.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{item.locationLabel ?? "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
          <h2 className="text-lg font-semibold">Gudang yang aktif</h2>
          <p className="mt-1 text-sm text-slate-500">
            Struktur gudang dan stok yang sekarang sudah terdaftar.
          </p>
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">SKU</th>
                  <th className="px-4 py-3 font-medium">Stok</th>
                  <th className="px-4 py-3 font-medium">Jumlah</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {warehouseOverview.items.length === 0 ? (
                  <tr>
                    <td className="px-4 py-5 text-slate-500" colSpan={3}>
                      Belum ada stok gudang.
                    </td>
                  </tr>
                ) : (
                  warehouseOverview.items.slice(0, 5).map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 font-medium text-slate-900">{item.sku}</td>
                      <td className="px-4 py-3 text-slate-700">{item.name}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {item.currentQuantity} {item.unit}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
          <h2 className="text-lg font-semibold">Mutasi gudang terbaru</h2>
          <p className="mt-1 text-sm text-slate-500">
            Ringkasan pergerakan stok non-serial yang baru masuk ke log.
          </p>
          <div className="mt-4 space-y-4">
            {warehouseOverview.movements.length === 0 ? (
              <p className="text-sm text-slate-500">Belum ada mutasi gudang.</p>
            ) : (
              warehouseOverview.movements.slice(0, 4).map((movement) => (
                <div key={movement.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-900">
                    {movement.stockItemSku} - {movement.stockItemName}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {movement.movementType} · {movement.quantity} ·{" "}
                    {movement.createdAt.toLocaleString("id-ID")}
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
