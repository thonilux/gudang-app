import "server-only";

import { asc, desc, eq, sql } from "drizzle-orm";

import { getDb } from "@/db";
import {
  warehouseLocations,
  warehouseStockCounts,
  warehouseStockItems,
  warehouseStockMovements,
  warehouseSerialItemMovements,
  warehouseSerialItems,
  users,
} from "@/db/schema";

export type WarehouseLocationOption = {
  id: string;
  label: string;
};

export type WarehouseItemListItem = {
  id: string;
  sku: string;
  name: string;
  unit: string;
  category: string;
  currentQuantity: number;
  minimumQuantity: number;
  locationLabel: string | null;
  status: string;
  notes: string;
  updatedAt: Date;
};

export type WarehouseMovementListItem = {
  id: string;
  movementType: string;
  quantity: number;
  note: string | null;
  createdAt: Date;
  stockItemSku: string;
  stockItemName: string;
  fromLocationLabel: string | null;
  toLocationLabel: string | null;
  changedByName: string | null;
};

export type WarehouseCountListItem = {
  id: string;
  status: string;
  note: string | null;
  countedAt: Date;
  locationLabel: string | null;
  countedByName: string | null;
};

export type WarehouseSerialItemListItem = {
  id: string;
  serialNumber: string;
  name: string;
  category: string;
  status: string;
  notes: string;
  locationLabel: string | null;
  updatedAt: Date;
};

export type WarehouseSerialMovementListItem = {
  id: string;
  note: string | null;
  createdAt: Date;
  serialNumber: string;
  serialName: string;
  fromLocationLabel: string | null;
  toLocationLabel: string | null;
  changedByName: string | null;
};

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

export async function getWarehouseReferenceData() {
  const db = getDb();
  const locationRows = await db
    .select({
      id: warehouseLocations.id,
      code: warehouseLocations.code,
      name: warehouseLocations.name,
      parentLocationId: warehouseLocations.parentLocationId,
    })
    .from(warehouseLocations)
    .orderBy(asc(warehouseLocations.sortOrder), asc(warehouseLocations.code));

  const locationLabelMap = buildLocationLabelMap(locationRows);

  return {
    locations: locationRows.map((row) => ({
      id: row.id,
      label: locationLabelMap.getLabel(row.id),
    })) satisfies WarehouseLocationOption[],
  };
}

export async function getWarehouseOverview() {
  const db = getDb();
  const [locations, items, movements, counts] = await Promise.all([
    db
      .select({
        id: warehouseLocations.id,
        code: warehouseLocations.code,
        name: warehouseLocations.name,
        parentLocationId: warehouseLocations.parentLocationId,
      })
      .from(warehouseLocations)
      .orderBy(asc(warehouseLocations.sortOrder), asc(warehouseLocations.code)),
    db
      .select({
        id: warehouseStockItems.id,
        sku: warehouseStockItems.sku,
        name: warehouseStockItems.name,
        unit: warehouseStockItems.unit,
        category: warehouseStockItems.category,
        currentQuantity: warehouseStockItems.currentQuantity,
        minimumQuantity: warehouseStockItems.minimumQuantity,
        status: warehouseStockItems.status,
        notes: warehouseStockItems.notes,
        locationId: warehouseStockItems.locationId,
        updatedAt: warehouseStockItems.updatedAt,
      })
      .from(warehouseStockItems)
      .orderBy(desc(warehouseStockItems.updatedAt), desc(warehouseStockItems.createdAt)),
    db
      .select({
        id: warehouseStockMovements.id,
        movementType: warehouseStockMovements.movementType,
        quantity: warehouseStockMovements.quantity,
        note: warehouseStockMovements.note,
        createdAt: warehouseStockMovements.createdAt,
        stockItemSku: warehouseStockItems.sku,
        stockItemName: warehouseStockItems.name,
        fromLocationId: warehouseStockMovements.fromLocationId,
        toLocationId: warehouseStockMovements.toLocationId,
        changedByName: users.name,
      })
      .from(warehouseStockMovements)
      .leftJoin(warehouseStockItems, eq(warehouseStockMovements.stockItemId, warehouseStockItems.id))
      .leftJoin(users, eq(warehouseStockMovements.changedByUserId, users.id))
      .orderBy(desc(warehouseStockMovements.createdAt))
      .limit(10),
    db
      .select({
        id: warehouseStockCounts.id,
        status: warehouseStockCounts.status,
        note: warehouseStockCounts.note,
        countedAt: warehouseStockCounts.countedAt,
        locationId: warehouseStockCounts.locationId,
        countedByName: users.name,
      })
      .from(warehouseStockCounts)
      .leftJoin(users, eq(warehouseStockCounts.countedByUserId, users.id))
      .orderBy(desc(warehouseStockCounts.countedAt))
      .limit(8),
  ]);

  const locationLabelMap = buildLocationLabelMap(locations);

  return {
    stats: {
      locationCount: locations.length,
      itemCount: items.length,
      lowStockCount: items.filter((item) => item.currentQuantity <= item.minimumQuantity).length,
      movementCount: movements.length,
    },
    locations: locations.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      parentLocationId: row.parentLocationId,
      label: locationLabelMap.getLabel(row.id),
    })),
    items: items.map((row) => ({
      id: row.id,
      sku: row.sku,
      name: row.name,
      unit: row.unit,
      category: row.category,
      currentQuantity: row.currentQuantity,
      minimumQuantity: row.minimumQuantity,
      locationLabel: row.locationId ? locationLabelMap.getLabel(row.locationId) : null,
      status:
        row.currentQuantity <= 0
          ? "habis"
          : row.currentQuantity <= row.minimumQuantity
            ? "menipis"
            : row.status,
      notes: row.notes,
      updatedAt: row.updatedAt,
    })) satisfies WarehouseItemListItem[],
    movements: movements.map((row) => ({
      id: row.id,
      movementType: row.movementType,
      quantity: row.quantity,
      note: row.note,
      createdAt: row.createdAt,
      stockItemSku: row.stockItemSku ?? "",
      stockItemName: row.stockItemName ?? "",
      fromLocationLabel: row.fromLocationId ? locationLabelMap.getLabel(row.fromLocationId) : null,
      toLocationLabel: row.toLocationId ? locationLabelMap.getLabel(row.toLocationId) : null,
      changedByName: row.changedByName ?? null,
    })) satisfies WarehouseMovementListItem[],
    counts: counts.map((row) => ({
      id: row.id,
      status: row.status,
      note: row.note,
      countedAt: row.countedAt,
      locationLabel: row.locationId ? locationLabelMap.getLabel(row.locationId) : null,
      countedByName: row.countedByName ?? null,
    })) satisfies WarehouseCountListItem[],
  };
}

export async function getWarehouseSerialOverview() {
  const db = getDb();
  const [locations, items, movements] = await Promise.all([
    db
      .select({
        id: warehouseLocations.id,
        code: warehouseLocations.code,
        name: warehouseLocations.name,
        parentLocationId: warehouseLocations.parentLocationId,
      })
      .from(warehouseLocations)
      .orderBy(asc(warehouseLocations.sortOrder), asc(warehouseLocations.code)),
    db
      .select({
        id: warehouseSerialItems.id,
        serialNumber: warehouseSerialItems.serialNumber,
        name: warehouseSerialItems.name,
        category: warehouseSerialItems.category,
        status: warehouseSerialItems.status,
        notes: warehouseSerialItems.notes,
        locationId: warehouseSerialItems.locationId,
        updatedAt: warehouseSerialItems.updatedAt,
      })
      .from(warehouseSerialItems)
      .orderBy(desc(warehouseSerialItems.updatedAt), desc(warehouseSerialItems.createdAt)),
    db
      .select({
        id: warehouseSerialItemMovements.id,
        note: warehouseSerialItemMovements.note,
        createdAt: warehouseSerialItemMovements.createdAt,
        serialNumber: warehouseSerialItems.serialNumber,
        serialName: warehouseSerialItems.name,
        fromLocationId: warehouseSerialItemMovements.fromLocationId,
        toLocationId: warehouseSerialItemMovements.toLocationId,
        changedByName: users.name,
      })
      .from(warehouseSerialItemMovements)
      .leftJoin(warehouseSerialItems, eq(warehouseSerialItemMovements.serialItemId, warehouseSerialItems.id))
      .leftJoin(users, eq(warehouseSerialItemMovements.changedByUserId, users.id))
      .orderBy(desc(warehouseSerialItemMovements.createdAt))
      .limit(10),
  ]);

  const locationLabelMap = buildLocationLabelMap(locations);

  return {
    stats: {
      serialCount: items.length,
      movementCount: movements.length,
    },
    items: items.map((row) => ({
      id: row.id,
      serialNumber: row.serialNumber,
      name: row.name,
      category: row.category,
      status: row.status,
      notes: row.notes,
      locationLabel: row.locationId ? locationLabelMap.getLabel(row.locationId) : null,
      updatedAt: row.updatedAt,
    })) satisfies WarehouseSerialItemListItem[],
    movements: movements.map((row) => ({
      id: row.id,
      note: row.note,
      createdAt: row.createdAt,
      serialNumber: row.serialNumber ?? "",
      serialName: row.serialName ?? "",
      fromLocationLabel: row.fromLocationId ? locationLabelMap.getLabel(row.fromLocationId) : null,
      toLocationLabel: row.toLocationId ? locationLabelMap.getLabel(row.toLocationId) : null,
      changedByName: row.changedByName ?? null,
    })) satisfies WarehouseSerialMovementListItem[],
  };
}

export function getWarehouseItemStatusTone(currentQuantity: number, minimumQuantity: number) {
  if (currentQuantity <= 0) {
    return "border-rose-200 bg-rose-50 text-rose-800";
  }

  if (currentQuantity <= minimumQuantity) {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-800";
}

export function getWarehouseItemStatusLabel(currentQuantity: number, minimumQuantity: number) {
  if (currentQuantity <= 0) {
    return "Habis";
  }

  if (currentQuantity <= minimumQuantity) {
    return "Stok menipis";
  }

  return "Aman";
}

export function getWarehouseSerialStatusTone(status: string) {
  switch (status) {
    case "ready":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "in_use":
      return "border-sky-200 bg-sky-50 text-sky-800";
    case "maintenance":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "retired":
      return "border-slate-200 bg-slate-100 text-slate-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

export function getWarehouseSerialStatusLabel(status: string) {
  switch (status) {
    case "ready":
      return "Siap";
    case "in_use":
      return "Dipakai";
    case "maintenance":
      return "Perbaikan";
    case "retired":
      return "Pensiun";
    default:
      return status;
  }
}

export async function getWarehouseSerialItemOptions() {
  const db = getDb();
  const items = await db
    .select({
      id: warehouseSerialItems.id,
      serialNumber: warehouseSerialItems.serialNumber,
      name: warehouseSerialItems.name,
    })
    .from(warehouseSerialItems)
    .orderBy(asc(warehouseSerialItems.serialNumber));

  return items.map((item) => ({
    id: item.id,
    label: `${item.serialNumber} - ${item.name}`,
  }));
}

export async function getWarehouseStockItemOptions() {
  const db = getDb();
  const items = await db
    .select({
      id: warehouseStockItems.id,
      sku: warehouseStockItems.sku,
      name: warehouseStockItems.name,
    })
    .from(warehouseStockItems)
    .orderBy(asc(warehouseStockItems.sku));

  return items.map((item) => ({
    id: item.id,
    label: `${item.sku} - ${item.name}`,
  }));
}

export async function getWarehouseLocationOptions() {
  return (await getWarehouseReferenceData()).locations;
}

export async function getWarehouseCountsSummary() {
  const db = getDb();
  const result = await db
    .select({
      totalQuantity: sql<number>`coalesce(sum(${warehouseStockItems.currentQuantity}), 0)::int`,
      lowStockCount: sql<number>`
        sum(
          case
            when ${warehouseStockItems.currentQuantity} <= ${warehouseStockItems.minimumQuantity}
            then 1
            else 0
          end
        )::int
      `,
    })
    .from(warehouseStockItems);

  return {
    totalQuantity: result[0]?.totalQuantity ?? 0,
    lowStockCount: result[0]?.lowStockCount ?? 0,
  };
}
