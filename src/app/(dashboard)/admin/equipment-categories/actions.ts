"use server";

import { asc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getDb } from "@/db";
import { equipment, equipmentCategories } from "@/db/schema";
import { getCurrentAuthSession, writeAuditLog } from "@/lib/auth";
import { isAdmin } from "@/lib/rbac";

export type EquipmentCategoryActionState = {
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

const categorySchema = z.object({
  id: z.string().uuid().optional(),
  key: optionalText,
  name: z.string().trim().min(1, "Nama kategori wajib diisi."),
  description: optionalText,
  redirectTo: z.string().trim().optional(),
});

const deleteSchema = z.object({
  id: z.string().uuid(),
  redirectTo: z.string().trim().optional(),
});

const moveSchema = z.object({
  id: z.string().uuid(),
  direction: z.enum(["up", "down"]),
  redirectTo: z.string().trim().optional(),
});

function slugifyCategoryKey(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

async function requireAdminAccess() {
  const session = await getCurrentAuthSession();
  if (!session) {
    redirect("/login");
  }

  if (!isAdmin(session)) {
    redirect("/akses-ditolak");
  }

  return session;
}

function safeReturnPath(path?: string) {
  if (path && path.startsWith("/")) {
    return path;
  }

  return "/admin/equipment-categories";
}

async function getNextSortOrder() {
  const db = getDb();
  const rows = await db
    .select({
      sortOrder: equipmentCategories.sortOrder,
    })
    .from(equipmentCategories)
    .orderBy(asc(equipmentCategories.sortOrder), asc(equipmentCategories.name));

  const lastSortOrder = rows.at(-1)?.sortOrder ?? 0;
  return lastSortOrder + 10;
}

export async function createEquipmentCategoryAction(
  _state: EquipmentCategoryActionState,
  formData: FormData,
): Promise<EquipmentCategoryActionState> {
  const session = await requireAdminAccess();
  const parsed = categorySchema.safeParse({
    key: formData.get("key"),
    name: formData.get("name"),
    description: formData.get("description"),
    redirectTo: formData.get("redirectTo"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data kategori tidak valid." };
  }

  const key = slugifyCategoryKey(parsed.data.key ?? parsed.data.name);
  if (!key) {
    return { error: "Key kategori tidak valid." };
  }

  const db = getDb();
  const existing = await db.query.equipmentCategories.findFirst({
    where: eq(equipmentCategories.key, key),
  });
  if (existing) {
    return { error: "Key kategori sudah dipakai." };
  }

  const sortOrder = await getNextSortOrder();

  const [created] = await db
    .insert(equipmentCategories)
    .values({
      key,
      name: parsed.data.name,
      description: parsed.data.description ?? "",
      sortOrder,
      updatedAt: new Date(),
    })
    .returning({ id: equipmentCategories.id, name: equipmentCategories.name });

  await writeAuditLog({
    userId: session.user.id,
    action: "equipment_category.create",
    entityType: "equipment_category",
    entityId: created.id,
    summary: `Menambahkan kategori equipment ${parsed.data.name}`,
    metadata: {
      key,
      sortOrder,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/equipment-categories");
  revalidatePath("/equipment");
  redirect(safeReturnPath(parsed.data.redirectTo));
}

export async function updateEquipmentCategoryAction(
  _state: EquipmentCategoryActionState,
  formData: FormData,
): Promise<EquipmentCategoryActionState> {
  const session = await requireAdminAccess();
  const parsed = categorySchema.safeParse({
    id: formData.get("id"),
    key: formData.get("key"),
    name: formData.get("name"),
    description: formData.get("description"),
    redirectTo: formData.get("redirectTo"),
  });

  if (!parsed.success || !parsed.data.id) {
    return { error: parsed.error?.issues[0]?.message ?? "Data kategori tidak valid." };
  }

  const key = slugifyCategoryKey(parsed.data.key ?? parsed.data.name);
  if (!key) {
    return { error: "Key kategori tidak valid." };
  }

  const db = getDb();
  const existing = await db.query.equipmentCategories.findFirst({
    where: eq(equipmentCategories.id, parsed.data.id),
  });
  if (!existing) {
    return { error: "Kategori tidak ditemukan." };
  }

  const duplicateKey = await db.query.equipmentCategories.findFirst({
    where: eq(equipmentCategories.key, key),
  });
  if (duplicateKey && duplicateKey.id !== existing.id) {
    return { error: "Key kategori sudah dipakai." };
  }

  await db
    .update(equipmentCategories)
    .set({
      key,
      name: parsed.data.name,
      description: parsed.data.description ?? "",
      updatedAt: new Date(),
    })
    .where(eq(equipmentCategories.id, parsed.data.id));

  await writeAuditLog({
    userId: session.user.id,
    action: "equipment_category.update",
    entityType: "equipment_category",
    entityId: parsed.data.id,
    summary: `Memperbarui kategori equipment ${parsed.data.name}`,
    metadata: {
      key,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/equipment-categories");
  revalidatePath("/equipment");
  redirect(safeReturnPath(parsed.data.redirectTo));
}

export async function moveEquipmentCategoryAction(formData: FormData): Promise<void> {
  const session = await requireAdminAccess();
  const parsed = moveSchema.safeParse({
    id: formData.get("id"),
    direction: formData.get("direction"),
    redirectTo: formData.get("redirectTo"),
  });

  if (!parsed.success) {
    redirect(safeReturnPath(formData.get("redirectTo") ? String(formData.get("redirectTo")) : undefined));
  }

  const db = getDb();
  const categories = await db
    .select({
      id: equipmentCategories.id,
      sortOrder: equipmentCategories.sortOrder,
      name: equipmentCategories.name,
    })
    .from(equipmentCategories)
    .orderBy(asc(equipmentCategories.sortOrder), asc(equipmentCategories.name), asc(equipmentCategories.id));

  const currentIndex = categories.findIndex((category) => category.id === parsed.data.id);
  if (currentIndex === -1) {
    redirect(safeReturnPath(parsed.data.redirectTo));
  }

  const targetIndex = parsed.data.direction === "up" ? currentIndex - 1 : currentIndex + 1;
  if (targetIndex < 0 || targetIndex >= categories.length) {
    redirect(safeReturnPath(parsed.data.redirectTo));
  }

  const current = categories[currentIndex];
  const target = categories[targetIndex];

  await db.transaction(async (tx) => {
    await tx
      .update(equipmentCategories)
      .set({ sortOrder: target.sortOrder, updatedAt: new Date() })
      .where(eq(equipmentCategories.id, current.id));

    await tx
      .update(equipmentCategories)
      .set({ sortOrder: current.sortOrder, updatedAt: new Date() })
      .where(eq(equipmentCategories.id, target.id));
  });

  await writeAuditLog({
    userId: session.user.id,
    action: "equipment_category.reorder",
    entityType: "equipment_category",
    entityId: current.id,
    summary: `Mengubah urutan kategori equipment ${current.name}`,
    metadata: {
      direction: parsed.data.direction,
      targetId: target.id,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/equipment-categories");
  revalidatePath("/equipment");
  redirect(safeReturnPath(parsed.data.redirectTo));
}

export async function deleteEquipmentCategoryAction(
  _state: EquipmentCategoryActionState,
  formData: FormData,
): Promise<EquipmentCategoryActionState> {
  const session = await requireAdminAccess();
  const parsed = deleteSchema.safeParse({
    id: formData.get("id"),
    redirectTo: formData.get("redirectTo"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data kategori tidak valid." };
  }

  const db = getDb();
  const existing = await db.query.equipmentCategories.findFirst({
    where: eq(equipmentCategories.id, parsed.data.id),
  });
  if (!existing) {
    return { error: "Kategori tidak ditemukan." };
  }

  const usageRow = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(equipment)
    .where(eq(equipment.categoryId, parsed.data.id));

  const usageCount = usageRow[0]?.count ?? 0;
  if (usageCount > 0) {
    return { error: "Kategori masih dipakai oleh peralatan. Pindahkan dulu item terkait." };
  }

  await db.delete(equipmentCategories).where(eq(equipmentCategories.id, parsed.data.id));

  await writeAuditLog({
    userId: session.user.id,
    action: "equipment_category.delete",
    entityType: "equipment_category",
    entityId: parsed.data.id,
    summary: `Menghapus kategori equipment ${existing.name}`,
    metadata: {
      key: existing.key,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/equipment-categories");
  revalidatePath("/equipment");
  redirect(safeReturnPath(parsed.data.redirectTo));
}
