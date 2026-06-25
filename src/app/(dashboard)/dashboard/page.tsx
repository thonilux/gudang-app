import {
  FileClock,
  ShieldAlert,
  Wrench,
  Download,
  Calendar,
  AlertTriangle,
  Package,
} from "lucide-react";
import Link from "next/link";
import { gte, eq, or, desc, sql, inArray } from "drizzle-orm";

import { getDb } from "@/db";
import { getCurrentAuthSession } from "@/lib/auth";
import {
  getEquipmentDashboardStats,
  getEquipmentStatusLabel,
  getEquipmentStatusTone,
} from "@/lib/equipment";
import { getWarehouseCountsSummary } from "@/lib/warehouse";
import { maintenanceTickets, equipment, equipmentCategories, equipmentMeasurements } from "@/db/schema";

export const dynamic = "force-dynamic";

// Formatter for Currency
function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function DashboardPage() {
  const session = await getCurrentAuthSession();
  if (!session) {
    return null;
  }

  const db = getDb();

  // Dates for filtering
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  // 6 months ago for trend
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  // Fetch all necessary dashboard data
  const [
    recentLogs,
    equipmentStats,
    warehouseSummary,
    monthCostResult,
    yearCostResult,
    recentTicketsForCost,
    problematicEquipment,
    upcomingInspections,
  ] = await Promise.all([
    db.query.auditLogs.findMany({
      orderBy: (table, { desc }) => [desc(table.createdAt)],
      limit: 6,
    }),
    getEquipmentDashboardStats(),
    getWarehouseCountsSummary(),
    db
      .select({ value: sql<number>`sum(${maintenanceTickets.actualCost})::int` })
      .from(maintenanceTickets)
      .where(gte(maintenanceTickets.createdAt, startOfMonth)),
    db
      .select({ value: sql<number>`sum(${maintenanceTickets.actualCost})::int` })
      .from(maintenanceTickets)
      .where(gte(maintenanceTickets.createdAt, startOfYear)),
    db
      .select({
        actualCost: maintenanceTickets.actualCost,
        createdAt: maintenanceTickets.createdAt,
      })
      .from(maintenanceTickets)
      .where(gte(maintenanceTickets.createdAt, sixMonthsAgo)),
    db
      .select({
        id: equipment.id,
        code: equipment.code,
        name: equipment.name,
        status: equipment.status,
        conditionNote: equipment.conditionNote,
        categoryName: equipmentCategories.name,
      })
      .from(equipment)
      .leftJoin(equipmentCategories, eq(equipment.categoryId, equipmentCategories.id))
      .where(
        or(
          eq(equipment.status, "maintenance"),
          eq(equipment.status, "inspection_due")
        )
      )
      .limit(5),
    db
      .select({
        id: equipment.id,
        code: equipment.code,
        name: equipment.name,
        status: equipment.status,
        nextInspectionAt: equipment.nextInspectionAt,
      })
      .from(equipment)
      .where(sql`${equipment.nextInspectionAt} is not null`)
      .orderBy(equipment.nextInspectionAt)
      .limit(5),
  ]);

  const costThisMonth = monthCostResult[0]?.value ?? 0;
  const costThisYear = yearCostResult[0]?.value ?? 0;

  // Fetch latest health scores ONLY for the displayed problematic equipment
  const problematicIds = problematicEquipment.map((item) => item.id);
  const latestMeasurements = problematicIds.length > 0 
    ? await db
        .select({
          equipmentId: equipmentMeasurements.equipmentId,
          healthScore: equipmentMeasurements.healthScore,
        })
        .from(equipmentMeasurements)
        .where(inArray(equipmentMeasurements.equipmentId, problematicIds))
        .orderBy(desc(equipmentMeasurements.measurementDate))
    : [];

  // Map health scores
  const latestHealthMap = new Map<string, number>();
  for (const m of latestMeasurements) {
    if (!latestHealthMap.has(m.equipmentId)) {
      latestHealthMap.set(m.equipmentId, m.healthScore);
    }
  }

  // Calculate 6 months cost trend
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
  const trendData: { label: string; amount: number }[] = [];
  
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const mIdx = d.getMonth();
    const yVal = d.getFullYear();
    trendData.push({
      label: `${monthNames[mIdx]} ${yVal.toString().slice(-2)}`,
      amount: 0,
    });
  }

  for (const ticket of recentTicketsForCost) {
    const ticketDate = new Date(ticket.createdAt);
    const tMonth = ticketDate.getMonth();
    const tYear = ticketDate.getFullYear();
    
    // Find matching month in trendData
    const match = trendData.find((t) => {
      const [mName, yStr] = t.label.split(" ");
      const mVal = monthNames.indexOf(mName);
      return mVal === tMonth && yStr === tYear.toString().slice(-2);
    });

    if (match) {
      match.amount += ticket.actualCost;
    }
  }

  const maxTrendAmount = Math.max(...trendData.map((d) => d.amount), 100000);

  // SVG dimensions for trend chart
  const barChartWidth = 500;
  const barChartHeight = 200;
  const barPaddingLeft = 60;
  const barPaddingRight = 20;
  const barPaddingTop = 20;
  const barPaddingBottom = 30;
  const barGraphWidth = barChartWidth - barPaddingLeft - barPaddingRight;
  const barGraphHeight = barChartHeight - barPaddingTop - barPaddingBottom;
  const barWidth = (barGraphWidth / trendData.length) * 0.6;
  const barSpacing = (barGraphWidth / trendData.length) * 0.4;

  // Donut Chart calculations using equipmentStats
  const totalEquip = equipmentStats.total || 1;
  const donutData = [
    { label: "Siap", value: equipmentStats.ready, color: "#10b981" },
    { label: "Dipakai", value: equipmentStats.inUse, color: "#0ea5e9" },
    { label: "Perhatian", value: equipmentStats.attention, color: "#f59e0b" },
    { label: "Pensiun", value: equipmentStats.retired, color: "#64748b" },
  ];

  // Donut center calculation
  let accumulatedAngle = 0;
  const r = 55;
  const cx = 80;
  const cy = 80;
  const donutPaths = donutData.map((slice) => {
    if (slice.value === 0) return null;
    const percentage = slice.value / totalEquip;
    const angle = percentage * 360;
    
    const x1 = cx + r * Math.cos((accumulatedAngle - 90) * Math.PI / 180);
    const y1 = cy + r * Math.sin((accumulatedAngle - 90) * Math.PI / 180);
    
    accumulatedAngle += angle;
    
    const x2 = cx + r * Math.cos((accumulatedAngle - 90) * Math.PI / 180);
    const y2 = cy + r * Math.sin((accumulatedAngle - 90) * Math.PI / 180);
    
    const largeArcFlag = angle > 180 ? 1 : 0;
    
    return {
      path: `M ${x1} ${y1} A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      color: slice.color,
      label: slice.label,
      value: slice.value,
    };
  }).filter(Boolean);

  const mainKPIs = [
    {
      label: "Peralatan Terdaftar",
      value: equipmentStats.total.toString(),
      note: `${equipmentStats.ready} Siap · ${equipmentStats.inUse} Dipakai`,
      icon: Package,
      color: "text-blue-600 bg-blue-50 border-blue-100",
    },
    {
      label: "Butuh Perhatian",
      value: equipmentStats.attention.toString(),
      note: "Status inspeksi/perbaikan aktif",
      icon: ShieldAlert,
      color: "text-amber-600 bg-amber-50 border-amber-100",
    },
    {
      label: "Biaya Servis (Bulan Ini)",
      value: formatRupiah(costThisMonth),
      note: `Total tahun ini: ${formatRupiah(costThisYear)}`,
      icon: Wrench,
      color: "text-rose-600 bg-rose-50 border-rose-100",
    },
    {
      label: "BHP Perlu Restock",
      value: warehouseSummary.lowStockCount.toString(),
      note: "Bahan habis pakai di bawah batas minimum",
      icon: AlertTriangle,
      color: "text-orange-600 bg-orange-50 border-orange-100",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <section className="rounded-2xl border border-border bg-panel p-6 shadow-soft">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Operasional</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">
          Selamat datang kembali, {session.user.name}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          Peta kontrol kesehatan peralatan sewa gudang. Pantau status kesiapan unit, jadwal perawatan terdekat, dan efisiensi biaya perawatan dari satu halaman.
        </p>
      </section>

      {/* KPI Cards */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {mainKPIs.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <article key={kpi.label} className="rounded-2xl border border-border bg-panel p-5 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-muted">{kpi.label}</p>
                  <p className="mt-2 text-2xl font-bold tracking-tight text-text">{kpi.value}</p>
                </div>
                <div className={`rounded-xl p-3 border ${kpi.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-4 text-xs text-muted leading-5">{kpi.note}</p>
            </article>
          );
        })}
      </section>

      {/* Visual Analytics Row */}
      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        {/* Trend Bar Chart */}
        <article className="rounded-2xl border border-border bg-panel p-6 shadow-soft">
          <h2 className="text-base font-bold text-text">Tren Biaya Pemeliharaan</h2>
          <p className="text-xs text-muted mb-4">Total pengeluaran riil servis dalam 6 bulan terakhir</p>
          
          <div className="w-full overflow-hidden">
            <svg viewBox={`0 0 ${barChartWidth} ${barChartHeight}`} className="w-full h-auto text-text overflow-visible">
              {/* Y Axis Gridlines and Labels */}
              {[0, 0.25, 0.5, 0.75, 1].map((p, idx) => {
                const amount = maxTrendAmount * p;
                const y = barPaddingTop + (1 - p) * barGraphHeight;
                return (
                  <g key={idx}>
                    <line
                      x1={barPaddingLeft}
                      y1={y}
                      x2={barChartWidth - barPaddingRight}
                      y2={y}
                      stroke="var(--border)"
                      strokeWidth="0.5"
                      strokeDasharray="4,4"
                    />
                    <text
                      x={barPaddingLeft - 8}
                      y={y + 4}
                      textAnchor="end"
                      className="text-[9px] fill-muted font-medium"
                    >
                      {amount >= 1000000 ? `${(amount / 1000000).toFixed(1)}jt` : `${(amount / 1000).toFixed(0)}k`}
                    </text>
                  </g>
                );
              })}

              {/* Bars */}
              {trendData.map((d, idx) => {
                const x = barPaddingLeft + idx * (barWidth + barSpacing) + barSpacing / 2;
                const barHeight = (d.amount / maxTrendAmount) * barGraphHeight;
                const y = barPaddingTop + barGraphHeight - barHeight;

                return (
                  <g key={idx} className="group">
                    {/* Tooltip trigger area */}
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={barHeight}
                      fill="hsl(var(--accent))"
                      rx="4"
                      className="opacity-80 transition hover:opacity-100 cursor-pointer"
                    />
                    {/* Amount Label on hover or static */}
                    <text
                      x={x + barWidth / 2}
                      y={y - 6}
                      textAnchor="middle"
                      className="text-[9px] fill-text font-bold opacity-0 group-hover:opacity-100 transition duration-200"
                    >
                      {d.amount > 0 ? `${(d.amount / 1000).toFixed(0)}k` : ""}
                    </text>
                    {/* X axis labels */}
                    <text
                      x={x + barWidth / 2}
                      y={barChartHeight - barPaddingBottom + 16}
                      textAnchor="middle"
                      className="text-[9px] fill-muted font-semibold"
                    >
                      {d.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </article>

        {/* Donut Chart Status Distribution */}
        <article className="rounded-2xl border border-border bg-panel p-6 shadow-soft flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-text">Status Inventaris</h2>
            <p className="text-xs text-muted mb-4">Sebaran kondisi unit peralatan aktif</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-6 my-auto justify-center">
            {/* SVG Donut */}
            <svg width="160" height="160" viewBox="0 0 160 160" className="overflow-visible">
              {donutPaths.map((slice, idx) => (
                <path
                  key={idx}
                  d={slice?.path}
                  fill="none"
                  stroke={slice?.color}
                  strokeWidth="16"
                  strokeLinecap="round"
                  className="transition duration-300 hover:stroke-[20px] cursor-pointer"
                />
              ))}
              {/* Center Text */}
              <text x={cx} y={cy - 4} textAnchor="middle" className="text-[20px] font-extrabold fill-text">
                {equipmentStats.total}
              </text>
              <text x={cx} y={cy + 12} textAnchor="middle" className="text-[10px] fill-muted uppercase tracking-wider font-bold">
                Unit Total
              </text>
            </svg>

            {/* Donut Legend */}
            <div className="space-y-1.5">
              {donutData.map((d, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="font-medium text-muted">{d.label}:</span>
                  <span className="font-bold text-text">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </article>
      </section>

      {/* Operational Watchlist Grid */}
      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Problematic Equipment */}
        <article className="rounded-2xl border border-border bg-panel p-6 shadow-soft space-y-4">
          <div>
            <h2 className="text-base font-bold text-text">Peralatan Perlu Tindakan</h2>
            <p className="text-xs text-muted">Daftar peralatan berstatus perbaikan atau perlu inspeksi segera</p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="min-w-[500px] md:min-w-full divide-y divide-border text-left text-xs">
              <thead className="bg-panelAlt text-muted">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Kode / Nama</th>
                  <th className="px-4 py-2.5 font-semibold">Status</th>
                  <th className="px-4 py-2.5 font-semibold">Kesehatan</th>
                  <th className="px-4 py-2.5 font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-panel">
                {problematicEquipment.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 text-muted text-center" colSpan={4}>
                      Semua peralatan dalam kondisi optimal.
                    </td>
                  </tr>
                ) : (
                  problematicEquipment.map((item) => {
                    const health = latestHealthMap.get(item.id);
                    const healthText = health !== undefined ? `${health}%` : "-";
                    const statusTone = getEquipmentStatusTone(item.status);
                    
                    return (
                      <tr key={item.id} className="hover:bg-panelAlt/40 transition">
                        <td className="px-4 py-3">
                          <p className="font-bold text-text">{item.code}</p>
                          <p className="text-muted truncate max-w-[150px]">{item.name}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${statusTone}`}>
                            {getEquipmentStatusLabel(item.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {health !== undefined ? (
                            <span className={`font-bold ${health >= 80 ? 'text-emerald-600' : health >= 60 ? 'text-amber-500' : 'text-rose-600'}`}>
                              {healthText}
                            </span>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Link prefetch={false}
                            href={`/equipment/${item.id}`}
                            className="inline-flex items-center gap-1 font-bold text-accent hover:underline"
                          >
                            Detail
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </article>

        {/* Upcoming Inspections */}
        <article className="rounded-2xl border border-border bg-panel p-6 shadow-soft space-y-4">
          <div>
            <h2 className="text-base font-bold text-text">Jadwal Inspeksi Terdekat</h2>
            <p className="text-xs text-muted">Daftar inspeksi berkala yang harus dilakukan</p>
          </div>

          <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
            {upcomingInspections.length === 0 ? (
              <p className="text-xs text-muted py-4 text-center">Belum ada jadwal inspeksi terstruktur.</p>
            ) : (
              upcomingInspections.map((item) => {
                const date = item.nextInspectionAt ? new Date(item.nextInspectionAt) : null;
                const isOverdue = date && date < new Date();
                
                return (
                  <div key={item.id} className="flex items-center justify-between p-3 border border-border bg-panelAlt/30 rounded-xl hover:bg-panelAlt/60 transition">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg border ${isOverdue ? 'border-rose-100 bg-rose-50 text-rose-600' : 'border-border bg-panel text-muted'}`}>
                        <Calendar className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-text">{item.code}</p>
                        <p className="text-[10px] text-muted truncate max-w-[180px]">{item.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-[10px] font-bold ${isOverdue ? 'text-rose-600' : 'text-text'}`}>
                        {date ? date.toLocaleDateString("id-ID", { dateStyle: "medium" }) : "-"}
                      </p>
                      <p className="text-[9px] text-muted mt-0.5">
                        {isOverdue ? "Terlewat" : "Terjadwal"}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </article>
      </section>

      {/* Export Panel & Audit Log Row */}
      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        {/* Export Laporan */}
        <article className="rounded-2xl border border-border bg-panel p-6 shadow-soft space-y-4 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-text">Ekspor Laporan Dasar</h2>
            <p className="text-xs text-muted">Unduh laporan dalam format CSV untuk diolah dengan Microsoft Excel atau spreadsheet lainnya</p>
          </div>
          
          <div className="grid gap-3 sm:grid-cols-3 pt-2">
            <a
              href="/api/export?type=equipment"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-panelAlt px-4 py-3 text-xs font-semibold text-text transition hover:bg-panel"
            >
              <Download className="h-3.5 w-3.5" />
              Peralatan
            </a>
            <a
              href="/api/export?type=maintenance"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-panelAlt px-4 py-3 text-xs font-semibold text-text transition hover:bg-panel"
            >
              <Download className="h-3.5 w-3.5" />
              Pemeliharaan
            </a>
            <a
              href="/api/export?type=bhp"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-panelAlt px-4 py-3 text-xs font-semibold text-text transition hover:bg-panel"
            >
              <Download className="h-3.5 w-3.5" />
              BHP / Stok
            </a>
          </div>
        </article>

        {/* Audit Log */}
        <article className="rounded-2xl border border-border bg-panel p-6 shadow-soft space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-text">Audit Log Terbaru</h2>
            <FileClock className="h-4 w-4 text-muted" />
          </div>
          <div className="space-y-3 max-h-[160px] overflow-y-auto pr-1">
            {recentLogs.length === 0 ? (
              <p className="text-xs text-muted">Belum ada log audit yang tercatat.</p>
            ) : (
              recentLogs.map((log) => (
                <div key={log.id} className="border-b border-border pb-2 last:border-none last:pb-0">
                  <p className="text-xs font-bold text-text">{log.summary}</p>
                  <p className="mt-0.5 text-[10px] text-muted">
                    {log.action} {log.entityType ? `· ${log.entityType}` : ""} · {new Date(log.createdAt).toLocaleString("id-ID")}
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
