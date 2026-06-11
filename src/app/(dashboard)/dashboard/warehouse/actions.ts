"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getDb } from "@/db";
import {
  warehouseLocations,
  warehouseStockCounts,
  warehouseStockCountLines,
  warehouseStockItems,
  warehouseStockMovements,
  warehouseSerialItemMovements,
  warehouseSerialItems,
} from "@/db/schema";
import { getCurrentAuthSession, writeAuditLog } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";

export type WarehouseActionState = {
  error?: string;
};

const emptyToUndefined = (value: unknown) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const optionalText = z.preprocess(emptyToUndefined, z.string().trim().optional());
const optionalUuid = z.preprocess(emptyToUndefined, z.string().uuid().optional());

const locationSchema = z.object({
  code: z.string().trim().min(1, "Kode lokasi wajib diisi."),
  name: z.string().trim().min(1, "Nama lokasi wajib diisi."),
  description: optionalText,
  parentLocationId: optionalUuid,
  sortOrder: z.coerce.number().int().min(0).default(0),
});

const stockItemSchema = z.object({
  sku: z.string().trim().min(1, "Kode bahan habis pakai wajib diisi."),
  name: z.string().trim().min(1, "Nama bahan habis pakai wajib diisi."),
  unit: z.string().trim().min(1, "Satuan wajib diisi."),
  category: optionalText,
  locationId: optionalUuid,
  currentQuantity: z.coerce.number().int().min(0),
  minimumQuantity: z.coerce.number().int().min(0),
  notes: optionalText,
});

const movementSchema = z.object({
  stockItemId: z.string().uuid(),
  movementType: z.enum(["in", "out", "transfer"]),
  quantity: z.coerce.number().int().positive("Jumlah harus lebih dari 0."),
  fromLocationId: optionalUuid,
  toLocationId: optionalUuid,
  note: optionalText,
});

const opnameSchema = z.object({
  stockItemId: z.string().uuid(),
  countedQuantity: z.coerce.number().int().min(0),
  note: optionalText,
});

const serialItemSchema = z.object({
  serialNumber: z.string().trim().min(1, "ID aset unik wajib diisi."),
  name: z.string().trim().min(1, "Nama aset wajib diisi."),
  category: optionalText,
  locationId: optionalUuid,
  status: z.enum(["ready", "in_use", "maintenance", "retired"]),
  notes: optionalText,
});

const serialMovementSchema = z.object({
  serialItemId: z.string().uuid(),
  locationId: optionalUuid,
  note: optionalText,
});

async function requireWarehouseWriteAccess() {
  const session = await getCurrentAuthSession();
  if (!session) {
    redirect("/login");
  }

  if (!hasPermission(session, "warehouse.write")) {
    redirect("/akses-ditolak");
  }

  return session;
}

function normalizeStatus(quantity: number, minimumQuantity: number) {
  if (quantity <= 0) {
    return "habis";
  }

  if (quantity <= minimumQuantity) {
    return "menipis";
  }

  return "available";
}

function safeReturnPath(path?: string) {
  if (path && path.startsWith("/")) {
    return path;
  }

  return "/warehouse";
}

export async function createWarehouseLocationAction(
  _state: WarehouseActionState,
  formData: FormData,
): Promise<WarehouseActionState> {
  const session = await requireWarehouseWriteAccess();
  const parsed = locationSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    description: formData.get("description"),
    parentLocationId: formData.get("parentLocationId"),
    sortOrder: formData.get("sortOrder"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data lokasi tidak valid." };
  }

  const db = getDb();
  const [row] = await db
    .insert(warehouseLocations)
    .values({
      code: parsed.data.code,
      name: parsed.data.name,
      description: parsed.data.description ?? "",
      parentLocationId: parsed.data.parentLocationId ?? null,
      sortOrder: parsed.data.sortOrder,
      updatedAt: new Date(),
    })
    .returning({ id: warehouseLocations.id, code: warehouseLocations.code });

  await writeAuditLog({
    userId: session.user.id,
    action: "warehouse.location.create",
    entityType: "warehouse_location",
    entityId: row.id,
    summary: `Menambahkan lokasi gudang ${parsed.data.code}`,
  });

  revalidatePath("/dashboard");
  revalidatePath("/warehouse");
  redirect(safeReturnPath(formData.get("redirectTo") ? String(formData.get("redirectTo")) : undefined));
}

export async function createWarehouseStockItemAction(
  _state: WarehouseActionState,
  formData: FormData,
): Promise<WarehouseActionState> {
  const session = await requireWarehouseWriteAccess();
  const parsed = stockItemSchema.safeParse({
    sku: formData.get("sku"),
    name: formData.get("name"),
    unit: formData.get("unit"),
    category: formData.get("category"),
    locationId: formData.get("locationId"),
    currentQuantity: formData.get("currentQuantity"),
    minimumQuantity: formData.get("minimumQuantity"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data stok tidak valid." };
  }

  const db = getDb();
  const status = normalizeStatus(parsed.data.currentQuantity, parsed.data.minimumQuantity);
  const [row] = await db
    .insert(warehouseStockItems)
    .values({
      sku: parsed.data.sku,
      name: parsed.data.name,
      unit: parsed.data.unit,
      category: parsed.data.category ?? "",
      locationId: parsed.data.locationId ?? null,
      currentQuantity: parsed.data.currentQuantity,
      minimumQuantity: parsed.data.minimumQuantity,
      status,
      notes: parsed.data.notes ?? "",
      updatedAt: new Date(),
    })
    .returning({ id: warehouseStockItems.id, sku: warehouseStockItems.sku });

  await writeAuditLog({
    userId: session.user.id,
    action: "warehouse.stock_item.create",
    entityType: "warehouse_stock_item",
    entityId: row.id,
    summary: `Menambahkan stok gudang ${parsed.data.sku}`,
  });

  revalidatePath("/dashboard");
  revalidatePath("/warehouse");
  redirect(safeReturnPath(formData.get("redirectTo") ? String(formData.get("redirectTo")) : undefined));
}

export async function recordWarehouseMovementAction(
  _state: WarehouseActionState,
  formData: FormData,
): Promise<WarehouseActionState> {
  const session = await requireWarehouseWriteAccess();
  const parsed = movementSchema.safeParse({
    stockItemId: formData.get("stockItemId"),
    movementType: formData.get("movementType"),
    quantity: formData.get("quantity"),
    fromLocationId: formData.get("fromLocationId"),
    toLocationId: formData.get("toLocationId"),
    note: formData.get("note"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data mutasi tidak valid." };
  }

  const db = getDb();
  const item = await db.query.warehouseStockItems.findFirst({
    where: eq(warehouseStockItems.id, parsed.data.stockItemId),
  });

  if (!item) {
    return { error: "Stok tidak ditemukan." };
  }

  const now = new Date();
  let nextQuantity = item.currentQuantity;
  let nextLocationId = item.locationId;

  if (parsed.data.movementType === "in") {
    nextQuantity = item.currentQuantity + parsed.data.quantity;
    nextLocationId = parsed.data.toLocationId ?? item.locationId;
  }

  if (parsed.data.movementType === "out") {
    nextQuantity = Math.max(0, item.currentQuantity - parsed.data.quantity);
    nextLocationId = parsed.data.fromLocationId ?? item.locationId;
  }

  if (parsed.data.movementType === "transfer") {
    nextLocationId = parsed.data.toLocationId ?? item.locationId;
  }

  await db
    .insert(warehouseStockMovements)
    .values({
      stockItemId: item.id,
      movementType: parsed.data.movementType,
      quantity: parsed.data.quantity,
      fromLocationId: parsed.data.fromLocationId ?? item.locationId,
      toLocationId: parsed.data.toLocationId ?? item.locationId,
      note: parsed.data.note ?? "",
      changedByUserId: session.user.id,
    })
    .returning({ id: warehouseStockMovements.id });

  await db
    .update(warehouseStockItems)
    .set({
      currentQuantity: nextQuantity,
      locationId: nextLocationId,
      status: normalizeStatus(nextQuantity, item.minimumQuantity),
      updatedAt: now,
    })
    .where(eq(warehouseStockItems.id, item.id));

  await writeAuditLog({
    userId: session.user.id,
    action: "warehouse.movement.create",
    entityType: "warehouse_stock_item",
    entityId: item.id,
    summary: `Mencatat mutasi stok ${item.sku}`,
    metadata: {
      movementType: parsed.data.movementType,
      quantity: parsed.data.quantity,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/warehouse");
  return {};
}

export async function recordWarehouseOpnameAction(
  _state: WarehouseActionState,
  formData: FormData,
): Promise<WarehouseActionState> {
  const session = await requireWarehouseWriteAccess();
  const parsed = opnameSchema.safeParse({
    stockItemId: formData.get("stockItemId"),
    countedQuantity: formData.get("countedQuantity"),
    note: formData.get("note"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data opname tidak valid." };
  }

  const db = getDb();
  const item = await db.query.warehouseStockItems.findFirst({
    where: eq(warehouseStockItems.id, parsed.data.stockItemId),
  });

  if (!item) {
    return { error: "Stok tidak ditemukan." };
  }

  const now = new Date();
  const difference = parsed.data.countedQuantity - item.currentQuantity;
  await db.transaction(async (tx) => {
    const [count] = await tx
      .insert(warehouseStockCounts)
      .values({
        locationId: item.locationId,
        countedByUserId: session.user.id,
        status: "completed",
        note: parsed.data.note ?? "",
        countedAt: now,
        createdAt: now,
      })
      .returning({ id: warehouseStockCounts.id });

    await tx.insert(warehouseStockCountLines).values({
      countId: count.id,
      stockItemId: item.id,
      systemQuantity: item.currentQuantity,
      countedQuantity: parsed.data.countedQuantity,
      difference,
      note: parsed.data.note ?? "",
    });

    await tx
      .update(warehouseStockItems)
      .set({
        currentQuantity: parsed.data.countedQuantity,
        status: normalizeStatus(parsed.data.countedQuantity, item.minimumQuantity),
        updatedAt: now,
      })
      .where(eq(warehouseStockItems.id, item.id));

    if (difference !== 0) {
      await tx.insert(warehouseStockMovements).values({
        stockItemId: item.id,
        movementType: "opname",
        quantity: Math.abs(difference),
        fromLocationId: item.locationId,
        toLocationId: item.locationId,
        note: `Penyesuaian opname: ${difference > 0 ? "+" : ""}${difference}`,
        referenceType: "warehouse_stock_count",
        referenceId: count.id,
        changedByUserId: session.user.id,
      });
    }

  });

  await writeAuditLog({
    userId: session.user.id,
    action: "warehouse.opname.create",
    entityType: "warehouse_stock_item",
    entityId: item.id,
    summary: `Mencatat opname stok ${item.sku}`,
    metadata: { difference },
  });

  revalidatePath("/dashboard");
  revalidatePath("/warehouse");
  return {};
}

export async function createWarehouseSerialItemAction(
  _state: WarehouseActionState,
  formData: FormData,
): Promise<WarehouseActionState> {
  const session = await requireWarehouseWriteAccess();
  const parsed = serialItemSchema.safeParse({
    serialNumber: formData.get("serialNumber"),
    name: formData.get("name"),
    category: formData.get("category"),
    locationId: formData.get("locationId"),
    status: formData.get("status"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data item tidak valid." };
  }

  const db = getDb();
  const [row] = await db
    .insert(warehouseSerialItems)
    .values({
      serialNumber: parsed.data.serialNumber,
      name: parsed.data.name,
      category: parsed.data.category ?? "",
      locationId: parsed.data.locationId ?? null,
      status: parsed.data.status,
      notes: parsed.data.notes ?? "",
      updatedAt: new Date(),
    })
    .returning({ id: warehouseSerialItems.id, serialNumber: warehouseSerialItems.serialNumber });

  await writeAuditLog({
    userId: session.user.id,
    action: "warehouse.serial_item.create",
    entityType: "warehouse_serial_item",
    entityId: row.id,
    summary: `Menambahkan aset unik ${parsed.data.serialNumber}`,
  });

  revalidatePath("/dashboard");
  revalidatePath("/warehouse");
  return {};
}

export async function moveWarehouseSerialItemAction(
  _state: WarehouseActionState,
  formData: FormData,
): Promise<WarehouseActionState> {
  const session = await requireWarehouseWriteAccess();
  const parsed = serialMovementSchema.safeParse({
    serialItemId: formData.get("serialItemId"),
    locationId: formData.get("locationId"),
    note: formData.get("note"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data perpindahan tidak valid." };
  }

  const db = getDb();
  const item = await db.query.warehouseSerialItems.findFirst({
    where: eq(warehouseSerialItems.id, parsed.data.serialItemId),
  });

  if (!item) {
    return { error: "Barang tidak ditemukan." };
  }

  const now = new Date();
  await db
    .update(warehouseSerialItems)
    .set({
      locationId: parsed.data.locationId ?? null,
      updatedAt: now,
    })
    .where(eq(warehouseSerialItems.id, parsed.data.serialItemId));

  if (item.locationId !== parsed.data.locationId) {
    await db.insert(warehouseSerialItemMovements).values({
      serialItemId: item.id,
      fromLocationId: item.locationId,
      toLocationId: parsed.data.locationId ?? null,
      note: parsed.data.note ?? "Lokasi diperbarui.",
      changedByUserId: session.user.id,
    });
  }

  await writeAuditLog({
    userId: session.user.id,
    action: "warehouse.serial_item.move",
    entityType: "warehouse_serial_item",
    entityId: item.id,
    summary: `Memindahkan aset unik ${item.serialNumber}`,
  });

  revalidatePath("/dashboard");
  revalidatePath("/warehouse");
  return {};
}
