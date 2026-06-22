import { type NextRequest, NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";

import { getDb } from "@/db";
import {
  equipment,
  equipmentCategories,
  equipmentLocations,
  maintenanceTickets,
  warehouseStockItems,
  warehouseLocations,
  equipmentMeasurements,
} from "@/db/schema";
import { getCurrentAuthSession, writeAuditLog } from "@/lib/auth";
import { getEquipmentStatusLabel } from "@/lib/equipment";

export const dynamic = "force-dynamic";

function escapeCSV(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(req: NextRequest) {
  const session = await getCurrentAuthSession();
  if (!session) {
    return new NextResponse("Tidak terautentikasi", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  const db = getDb();

  if (type === "equipment") {
    // 1. Export Equipment
    const rows = await db
      .select({
        id: equipment.id,
        code: equipment.code,
        name: equipment.name,
        category: equipmentCategories.name,
        brand: equipment.brand,
        model: equipment.model,
        serialNumber: equipment.serialNumber,
        status: equipment.status,
        locationCode: equipmentLocations.code,
        locationName: equipmentLocations.name,
        conditionNote: equipment.conditionNote,
        specificationNote: equipment.specificationNote,
        notes: equipment.notes,
        lastInspectionAt: equipment.lastInspectionAt,
        nextInspectionAt: equipment.nextInspectionAt,
      })
      .from(equipment)
      .leftJoin(equipmentCategories, eq(equipment.categoryId, equipmentCategories.id))
      .leftJoin(equipmentLocations, eq(equipment.locationId, equipmentLocations.id))
      .orderBy(equipment.code);

    const measurements = await db
      .select({
        equipmentId: equipmentMeasurements.equipmentId,
        healthScore: equipmentMeasurements.healthScore,
      })
      .from(equipmentMeasurements)
      .orderBy(desc(equipmentMeasurements.measurementDate));

    const latestHealthMap = new Map<string, number>();
    for (const m of measurements) {
      if (!latestHealthMap.has(m.equipmentId)) {
        latestHealthMap.set(m.equipmentId, m.healthScore);
      }
    }

    const headers = [
      "Kode Alat",
      "Nama Alat",
      "Kategori",
      "Merek",
      "Model",
      "Nomor Seri",
      "Status",
      "Skor Kesehatan (%)",
      "Lokasi",
      "Catatan Kondisi",
      "Spesifikasi",
      "Catatan Tambahan",
      "Inspeksi Terakhir",
      "Inspeksi Berikutnya",
    ];

    const csvRows = [headers.join(",")];

    for (const r of rows) {
      const latestHealth = latestHealthMap.has(r.id) ? latestHealthMap.get(r.id) : "-";
      const statusLabel = getEquipmentStatusLabel(r.status);
      const locationLabel = r.locationName ? `${r.locationCode} - ${r.locationName}` : "-";

      const line = [
        escapeCSV(r.code),
        escapeCSV(r.name),
        escapeCSV(r.category ?? "-"),
        escapeCSV(r.brand),
        escapeCSV(r.model),
        escapeCSV(r.serialNumber ?? "-"),
        escapeCSV(statusLabel),
        escapeCSV(latestHealth),
        escapeCSV(locationLabel),
        escapeCSV(r.conditionNote),
        escapeCSV(r.specificationNote),
        escapeCSV(r.notes),
        escapeCSV(r.lastInspectionAt ? r.lastInspectionAt.toLocaleDateString("id-ID") : "-"),
        escapeCSV(r.nextInspectionAt ? r.nextInspectionAt.toLocaleDateString("id-ID") : "-"),
      ];
      csvRows.push(line.join(","));
    }

    await writeAuditLog({
      userId: session.user.id,
      action: "report.export.equipment",
      entityType: "equipment",
      summary: `Mengekspor laporan CSV daftar peralatan (${rows.length} item)`,
    });

    return new NextResponse(csvRows.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="laporan-peralatan.csv"',
      },
    });
  }

  if (type === "maintenance") {
    // 2. Export Maintenance Log
    const tickets = await db
      .select({
        ticketNumber: maintenanceTickets.ticketNumber,
        equipmentCode: equipment.code,
        equipmentName: equipment.name,
        subject: maintenanceTickets.subject,
        complaint: maintenanceTickets.complaint,
        diagnosis: maintenanceTickets.diagnosis,
        actionPlan: maintenanceTickets.actionPlan,
        status: maintenanceTickets.status,
        priority: maintenanceTickets.priority,
        estimatedCost: maintenanceTickets.estimatedCost,
        actualCost: maintenanceTickets.actualCost,
        openedAt: maintenanceTickets.openedAt,
        closedAt: maintenanceTickets.closedAt,
      })
      .from(maintenanceTickets)
      .leftJoin(equipment, eq(maintenanceTickets.equipmentId, equipment.id))
      .orderBy(desc(maintenanceTickets.createdAt));

    const headers = [
      "Nomor Tiket",
      "Kode Alat",
      "Nama Alat",
      "Subjek",
      "Keluhan",
      "Diagnosa",
      "Tindakan",
      "Status",
      "Prioritas",
      "Estimasi Biaya",
      "Biaya Aktual",
      "Tanggal Dibuka",
      "Tanggal Ditutup",
    ];

    const csvRows = [headers.join(",")];

    for (const t of tickets) {
      const line = [
        escapeCSV(t.ticketNumber),
        escapeCSV(t.equipmentCode ?? "-"),
        escapeCSV(t.equipmentName ?? "-"),
        escapeCSV(t.subject),
        escapeCSV(t.complaint),
        escapeCSV(t.diagnosis || "-"),
        escapeCSV(t.actionPlan || "-"),
        escapeCSV(t.status.toUpperCase()),
        escapeCSV(t.priority.toUpperCase()),
        escapeCSV(t.estimatedCost),
        escapeCSV(t.actualCost),
        escapeCSV(t.openedAt.toLocaleDateString("id-ID")),
        escapeCSV(t.closedAt ? t.closedAt.toLocaleDateString("id-ID") : "-"),
      ];
      csvRows.push(line.join(","));
    }

    await writeAuditLog({
      userId: session.user.id,
      action: "report.export.maintenance",
      entityType: "equipment",
      summary: `Mengekspor laporan CSV riwayat pemeliharaan (${tickets.length} tiket)`,
    });

    return new NextResponse(csvRows.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="laporan-pemeliharaan.csv"',
      },
    });
  }

  if (type === "bhp") {
    // 3. Export BHP Stock Summary
    const stockItems = await db
      .select({
        sku: warehouseStockItems.sku,
        name: warehouseStockItems.name,
        category: warehouseStockItems.category,
        unit: warehouseStockItems.unit,
        currentQuantity: warehouseStockItems.currentQuantity,
        minimumQuantity: warehouseStockItems.minimumQuantity,
        status: warehouseStockItems.status,
        notes: warehouseStockItems.notes,
        location: warehouseLocations.name,
      })
      .from(warehouseStockItems)
      .leftJoin(warehouseLocations, eq(warehouseStockItems.locationId, warehouseLocations.id))
      .orderBy(warehouseStockItems.sku);

    const headers = [
      "SKU",
      "Nama Item",
      "Kategori",
      "Satuan",
      "Stok Saat Ini",
      "Stok Minimum",
      "Status",
      "Lokasi Gudang",
      "Catatan",
    ];

    const csvRows = [headers.join(",")];

    for (const item of stockItems) {
      const line = [
        escapeCSV(item.sku),
        escapeCSV(item.name),
        escapeCSV(item.category),
        escapeCSV(item.unit),
        escapeCSV(item.currentQuantity),
        escapeCSV(item.minimumQuantity),
        escapeCSV(item.status),
        escapeCSV(item.location ?? "-"),
        escapeCSV(item.notes),
      ];
      csvRows.push(line.join(","));
    }

    await writeAuditLog({
      userId: session.user.id,
      action: "report.export.bhp",
      entityType: "warehouse",
      summary: `Mengekspor laporan CSV stok BHP (${stockItems.length} item)`,
    });

    return new NextResponse(csvRows.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="laporan-stok-bhp.csv"',
      },
    });
  }

  return new NextResponse("Tipe laporan tidak valid", { status: 400 });
}
