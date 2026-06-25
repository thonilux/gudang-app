import "server-only";

import { asc, desc, eq, sql } from "drizzle-orm";

import { getDb } from "@/db";
import {
  equipment,
  equipmentCategories,
  equipmentDocuments,
  equipmentLocationLogs,
  equipmentLocations,
  equipmentStatusLogs,
  users,
  warehouseLocations,
} from "@/db/schema";

export const EQUIPMENT_STATUS_OPTIONS = [
  { value: "ready", label: "Siap pakai" },
  { value: "in_use", label: "Sedang dipakai" },
  { value: "inspection_due", label: "Perlu inspeksi" },
  { value: "maintenance", label: "Perbaikan" },
  { value: "retired", label: "Pensiun" },
] as const;

export type EquipmentStatusValue = (typeof EQUIPMENT_STATUS_OPTIONS)[number]["value"];

export type EquipmentListItem = {
  id: string;
  code: string;
  name: string;
  categoryId: string;
  brand: string;
  model: string;
  serialNumber: string | null;
  status: string;
  conditionNote: string;
  categoryName: string | null;
  locationId: string | null;
  locationLabel: string | null;
  specificationNote: string;
  notes: string;
  lastInspectionAt: Date | null;
  nextInspectionAt: Date | null;
  updatedAt: Date;
};

export type EquipmentCategoryOption = {
  id: string;
  label: string;
};

export type EquipmentLocationOption = {
  id: string;
  label: string;
};

export type EquipmentDetail = {
  item: {
    id: string;
    code: string;
    name: string;
    brand: string;
    model: string;
    serialNumber: string | null;
    status: string;
    conditionNote: string;
    specificationNote: string;
    notes: string;
    lastInspectionAt: Date | null;
    nextInspectionAt: Date | null;
    lastStatusChangeAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    categoryId: string;
    categoryName: string | null;
    locationId: string | null;
    locationLabel: string | null;
  };
  categories: EquipmentCategoryOption[];
  locations: EquipmentLocationOption[];
  statusLogs: Array<{
    id: string;
    status: string;
    note: string | null;
    createdAt: Date;
    changedByName: string | null;
  }>;
  locationLogs: Array<{
    id: string;
    fromLocationLabel: string | null;
    toLocationLabel: string | null;
    note: string | null;
    createdAt: Date;
    changedByName: string | null;
  }>;
  documents: Array<{
    id: string;
    kind: string;
    title: string;
    fileName: string;
    storageUrl: string | null;
    note: string | null;
    createdAt: Date;
    createdByName: string | null;
  }>;
};

export function getEquipmentStatusLabel(status: string) {
  return EQUIPMENT_STATUS_OPTIONS.find((item) => item.value === status)?.label ?? status;
}

export function getEquipmentStatusTone(status: string) {
  switch (status) {
    case "ready":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "in_use":
      return "border-sky-200 bg-sky-50 text-sky-800";
    case "inspection_due":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "maintenance":
      return "border-rose-200 bg-rose-50 text-rose-800";
    case "retired":
      return "border-slate-200 bg-slate-100 text-slate-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function buildLocationLabelMap(rows: Array<{
  id: string;
  code: string;
  name: string;
  parentLocationId: string | null;
}>) {
  const byId = new Map(rows.map((row) => [row.id, row]));

  const getLabel = (id: string): string => {
    const row = byId.get(id);
    if (!row) {
      return id;
    }

    const parts = [row.name];
    let parentId = row.parentLocationId;
    while (parentId) {
      const parent = byId.get(parentId);
      if (!parent) {
        break;
      }
      parts.unshift(parent.name);
      parentId = parent.parentLocationId;
    }

    return `${row.code} - ${parts.join(" / ")}`;
  };

  return { getLabel };
}

export async function getEquipmentReferenceData() {
  const db = getDb();

  // Sync missing warehouse locations to equipment locations
  try {
    const missingLocations = await db
      .select({
        id: warehouseLocations.id,
        code: warehouseLocations.code,
        name: warehouseLocations.name,
        parentLocationId: warehouseLocations.parentLocationId,
      })
      .from(warehouseLocations)
      .leftJoin(equipmentLocations, eq(warehouseLocations.id, equipmentLocations.id))
      .where(sql`${equipmentLocations.id} IS NULL`);

    if (missingLocations.length > 0) {
      for (const loc of missingLocations) {
        await db
          .insert(equipmentLocations)
          .values({
            id: loc.id,
            code: loc.code,
            name: loc.name,
            parentLocationId: loc.parentLocationId,
          })
          .onConflictDoNothing();
      }
    }
  } catch (err) {
    console.error("Failed to sync warehouse locations to equipment:", err);
  }

  const [categoryRows, locationRows] = await Promise.all([
    db
      .select({
        id: equipmentCategories.id,
        key: equipmentCategories.key,
        name: equipmentCategories.name,
        sortOrder: equipmentCategories.sortOrder,
      })
      .from(equipmentCategories)
      .orderBy(asc(equipmentCategories.sortOrder), asc(equipmentCategories.name)),
    db
      .select({
        id: equipmentLocations.id,
        code: equipmentLocations.code,
        name: equipmentLocations.name,
        parentLocationId: equipmentLocations.parentLocationId,
      })
      .from(equipmentLocations)
      .orderBy(asc(equipmentLocations.code), asc(equipmentLocations.name)),
  ]);

  const locationLabelMap = buildLocationLabelMap(locationRows);

  return {
    categories: categoryRows.map((row) => ({
      id: row.id,
      label: row.name,
    })),
    locations: locationRows.map((row) => ({
      id: row.id,
      label: locationLabelMap.getLabel(row.id),
    })),
  };
}

export async function getEquipmentList() {
  const db = getDb();
  const [rows, allLocationRows] = await Promise.all([
    db
      .select({
      id: equipment.id,
      code: equipment.code,
      name: equipment.name,
      categoryId: equipment.categoryId,
      brand: equipment.brand,
      model: equipment.model,
      serialNumber: equipment.serialNumber,
      status: equipment.status,
      conditionNote: equipment.conditionNote,
      categoryName: equipmentCategories.name,
      locationId: equipment.locationId,
      specificationNote: equipment.specificationNote,
      notes: equipment.notes,
      lastInspectionAt: equipment.lastInspectionAt,
      nextInspectionAt: equipment.nextInspectionAt,
      updatedAt: equipment.updatedAt,
    })
      .from(equipment)
      .leftJoin(equipmentCategories, eq(equipment.categoryId, equipmentCategories.id))
      .leftJoin(equipmentLocations, eq(equipment.locationId, equipmentLocations.id))
      .orderBy(desc(equipment.updatedAt), desc(equipment.createdAt)),
    db
      .select({
        id: equipmentLocations.id,
        code: equipmentLocations.code,
        name: equipmentLocations.name,
        parentLocationId: equipmentLocations.parentLocationId,
      })
      .from(equipmentLocations)
      .orderBy(asc(equipmentLocations.code), asc(equipmentLocations.name)),
  ]);

  const locationLabelMap = buildLocationLabelMap(allLocationRows);

  return rows.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    categoryId: row.categoryId,
    brand: row.brand,
    model: row.model,
    serialNumber: row.serialNumber,
    status: row.status,
    conditionNote: row.conditionNote,
    categoryName: row.categoryName ?? null,
    locationId: row.locationId,
    locationLabel: row.locationId ? locationLabelMap.getLabel(row.locationId) : null,
    specificationNote: row.specificationNote,
    notes: row.notes,
    lastInspectionAt: row.lastInspectionAt,
    nextInspectionAt: row.nextInspectionAt,
    updatedAt: row.updatedAt,
  })) satisfies EquipmentListItem[];
}

export async function getEquipmentDashboardStats() {
  const db = getDb();

  const totals = await db
    .select({
      status: equipment.status,
      count: sql<number>`count(*)::int`,
    })
    .from(equipment)
    .groupBy(equipment.status);

  const mapped = totals.reduce<Record<string, number>>((acc, row) => {
    acc[row.status] = row.count;
    return acc;
  }, {});

  const total = Object.values(mapped).reduce((sum, count) => sum + count, 0);

  return {
    total,
    ready: mapped.ready ?? 0,
    inUse: mapped.in_use ?? 0,
    attention: (mapped.inspection_due ?? 0) + (mapped.maintenance ?? 0),
    retired: mapped.retired ?? 0,
  };
}

export async function getEquipmentDetail(equipmentId: string): Promise<EquipmentDetail | null> {
  const db = getDb();

  const itemRow = await db
    .select({
      id: equipment.id,
      code: equipment.code,
      name: equipment.name,
      brand: equipment.brand,
      model: equipment.model,
      serialNumber: equipment.serialNumber,
      status: equipment.status,
      conditionNote: equipment.conditionNote,
      specificationNote: equipment.specificationNote,
      notes: equipment.notes,
      lastInspectionAt: equipment.lastInspectionAt,
      nextInspectionAt: equipment.nextInspectionAt,
      lastStatusChangeAt: equipment.lastStatusChangeAt,
      createdAt: equipment.createdAt,
      updatedAt: equipment.updatedAt,
      categoryId: equipment.categoryId,
      categoryName: equipmentCategories.name,
      locationId: equipment.locationId,
      locationCode: equipmentLocations.code,
      locationName: equipmentLocations.name,
      locationParentId: equipmentLocations.parentLocationId,
    })
    .from(equipment)
    .leftJoin(equipmentCategories, eq(equipment.categoryId, equipmentCategories.id))
    .leftJoin(equipmentLocations, eq(equipment.locationId, equipmentLocations.id))
    .where(eq(equipment.id, equipmentId))
    .limit(1);

  const item = itemRow[0];
  if (!item) {
    return null;
  }

  const [referenceData, statusLogs, locationLogs, documents] = await Promise.all([
    getEquipmentReferenceData(),
    db
      .select({
        id: equipmentStatusLogs.id,
        status: equipmentStatusLogs.status,
        note: equipmentStatusLogs.note,
        createdAt: equipmentStatusLogs.createdAt,
        changedByName: users.name,
      })
      .from(equipmentStatusLogs)
      .leftJoin(users, eq(equipmentStatusLogs.changedByUserId, users.id))
      .where(eq(equipmentStatusLogs.equipmentId, equipmentId))
      .orderBy(desc(equipmentStatusLogs.createdAt)),
    db
      .select({
        id: equipmentLocationLogs.id,
        fromLocationId: equipmentLocationLogs.fromLocationId,
        toLocationId: equipmentLocationLogs.toLocationId,
        note: equipmentLocationLogs.note,
        createdAt: equipmentLocationLogs.createdAt,
        changedByName: users.name,
      })
      .from(equipmentLocationLogs)
      .leftJoin(users, eq(equipmentLocationLogs.changedByUserId, users.id))
      .where(eq(equipmentLocationLogs.equipmentId, equipmentId))
      .orderBy(desc(equipmentLocationLogs.createdAt)),
    db
      .select({
        id: equipmentDocuments.id,
        kind: equipmentDocuments.kind,
        title: equipmentDocuments.title,
        fileName: equipmentDocuments.fileName,
        storageUrl: equipmentDocuments.storageUrl,
        note: equipmentDocuments.note,
        createdAt: equipmentDocuments.createdAt,
        createdByName: users.name,
      })
      .from(equipmentDocuments)
      .leftJoin(users, eq(equipmentDocuments.createdByUserId, users.id))
      .where(eq(equipmentDocuments.equipmentId, equipmentId))
      .orderBy(desc(equipmentDocuments.createdAt)),
  ]);

  const locationRows = await db
    .select({
      id: equipmentLocations.id,
      code: equipmentLocations.code,
      name: equipmentLocations.name,
      parentLocationId: equipmentLocations.parentLocationId,
    })
    .from(equipmentLocations)
    .orderBy(asc(equipmentLocations.code), asc(equipmentLocations.name));
  const locationLabelMap = buildLocationLabelMap(locationRows);

  return {
    item: {
      id: item.id,
      code: item.code,
      name: item.name,
      brand: item.brand,
      model: item.model,
      serialNumber: item.serialNumber,
      status: item.status,
      conditionNote: item.conditionNote,
      specificationNote: item.specificationNote,
      notes: item.notes,
      lastInspectionAt: item.lastInspectionAt,
      nextInspectionAt: item.nextInspectionAt,
      lastStatusChangeAt: item.lastStatusChangeAt,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      categoryId: item.categoryId,
      categoryName: item.categoryName ?? null,
      locationId: item.locationId,
      locationLabel: item.locationId ? locationLabelMap.getLabel(item.locationId) : null,
    },
    categories: referenceData.categories,
    locations: referenceData.locations,
    statusLogs: statusLogs.map((row) => ({
      id: row.id,
      status: row.status,
      note: row.note,
      createdAt: row.createdAt,
      changedByName: row.changedByName ?? null,
    })),
    locationLogs: locationLogs.map((row) => ({
      id: row.id,
      fromLocationLabel: row.fromLocationId ? locationLabelMap.getLabel(row.fromLocationId) : null,
      toLocationLabel: row.toLocationId ? locationLabelMap.getLabel(row.toLocationId) : null,
      note: row.note,
      createdAt: row.createdAt,
      changedByName: row.changedByName ?? null,
    })),
    documents: documents.map((row) => ({
      id: row.id,
      kind: row.kind,
      title: row.title,
      fileName: row.fileName,
      storageUrl: row.storageUrl,
      note: row.note,
      createdAt: row.createdAt,
      createdByName: row.createdByName ?? null,
    })),
  } satisfies EquipmentDetail;
}

export function buildEquipmentSummaryLine(item: {
  brand: string;
  model: string;
  serialNumber: string | null;
  categoryName: string | null;
}) {
  const parts = [item.categoryName ?? "Tanpa kategori"];
  if (item.brand) {
    parts.push(item.brand);
  }
  if (item.model) {
    parts.push(item.model);
  }
  if (item.serialNumber) {
    parts.push(`SN ${item.serialNumber}`);
  }
  return parts.join(" - ");
}
