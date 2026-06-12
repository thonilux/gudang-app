"use server";

import { asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getDb } from "@/db";
import { equipmentInspectionTemplates } from "@/db/schema";
import { getCurrentAuthSession, writeAuditLog } from "@/lib/auth";
import { isAdmin } from "@/lib/rbac";

export type InspectionTemplateActionState = {
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

const templateSchema = z.object({
  id: z.string().uuid().optional(),
  categoryId: z.string().uuid("Kategori tidak valid."),
  name: z.string().trim().min(1, "Nama template wajib diisi."),
  description: optionalText,
  checklistText: z.string().trim().min(1, "Checklist wajib diisi."),
  isActive: z.coerce.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).default(0),
  redirectTo: z.string().trim().optional(),
});

const deleteSchema = z.object({
  id: z.string().uuid(),
  redirectTo: z.string().trim().optional(),
});

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

  return "/admin/inspection-templates";
}

function parseChecklist(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const required = line.startsWith("*");
      const label = line.replace(/^\*\s*/, "").trim();
      return {
        label,
        required,
      };
    })
    .filter((item) => item.label.length > 0);
}

async function getNextSortOrder(categoryId: string) {
  const db = getDb();
  const rows = await db
    .select({
      sortOrder: equipmentInspectionTemplates.sortOrder,
    })
    .from(equipmentInspectionTemplates)
    .where(eq(equipmentInspectionTemplates.categoryId, categoryId))
    .orderBy(asc(equipmentInspectionTemplates.sortOrder), asc(equipmentInspectionTemplates.name));

  return (rows.at(-1)?.sortOrder ?? 0) + 10;
}

export async function createInspectionTemplateAction(
  _state: InspectionTemplateActionState,
  formData: FormData,
): Promise<InspectionTemplateActionState> {
  const session = await requireAdminAccess();
  const parsed = templateSchema.safeParse({
    id: formData.get("id"),
    categoryId: formData.get("categoryId"),
    name: formData.get("name"),
    description: formData.get("description"),
    checklistText: formData.get("checklistText"),
    isActive: formData.get("isActive"),
    sortOrder: formData.get("sortOrder"),
    redirectTo: formData.get("redirectTo"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data template tidak valid." };
  }

  const checklist = parseChecklist(parsed.data.checklistText);
  if (checklist.length === 0) {
    return { error: "Checklist tidak boleh kosong." };
  }

  const db = getDb();
  const sortOrder = parsed.data.sortOrder || (await getNextSortOrder(parsed.data.categoryId));
  const [created] = await db
    .insert(equipmentInspectionTemplates)
    .values({
      categoryId: parsed.data.categoryId,
      name: parsed.data.name,
      description: parsed.data.description ?? "",
      checklist,
      isActive: parsed.data.isActive,
      sortOrder,
      updatedAt: new Date(),
    })
    .returning({ id: equipmentInspectionTemplates.id, name: equipmentInspectionTemplates.name });

  await writeAuditLog({
    userId: session.user.id,
    action: "inspection_template.create",
    entityType: "inspection_template",
    entityId: created.id,
    summary: `Menambahkan template inspeksi ${parsed.data.name}`,
    metadata: {
      categoryId: parsed.data.categoryId,
      sortOrder,
      itemCount: checklist.length,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/inspection-templates");
  revalidatePath("/equipment");
  redirect(safeReturnPath(parsed.data.redirectTo));
}

export async function updateInspectionTemplateAction(
  _state: InspectionTemplateActionState,
  formData: FormData,
): Promise<InspectionTemplateActionState> {
  const session = await requireAdminAccess();
  const parsed = templateSchema.safeParse({
    id: formData.get("id"),
    categoryId: formData.get("categoryId"),
    name: formData.get("name"),
    description: formData.get("description"),
    checklistText: formData.get("checklistText"),
    isActive: formData.get("isActive"),
    sortOrder: formData.get("sortOrder"),
    redirectTo: formData.get("redirectTo"),
  });

  if (!parsed.success || !parsed.data.id) {
    return { error: parsed.error?.issues[0]?.message ?? "Data template tidak valid." };
  }

  const checklist = parseChecklist(parsed.data.checklistText);
  if (checklist.length === 0) {
    return { error: "Checklist tidak boleh kosong." };
  }

  const db = getDb();
  const existing = await db.query.equipmentInspectionTemplates.findFirst({
    where: eq(equipmentInspectionTemplates.id, parsed.data.id),
  });

  if (!existing) {
    return { error: "Template tidak ditemukan." };
  }

  await db
    .update(equipmentInspectionTemplates)
    .set({
      categoryId: parsed.data.categoryId,
      name: parsed.data.name,
      description: parsed.data.description ?? "",
      checklist,
      isActive: parsed.data.isActive,
      sortOrder: parsed.data.sortOrder,
      updatedAt: new Date(),
    })
    .where(eq(equipmentInspectionTemplates.id, parsed.data.id));

  await writeAuditLog({
    userId: session.user.id,
    action: "inspection_template.update",
    entityType: "inspection_template",
    entityId: parsed.data.id,
    summary: `Memperbarui template inspeksi ${parsed.data.name}`,
    metadata: {
      categoryId: parsed.data.categoryId,
      itemCount: checklist.length,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/inspection-templates");
  revalidatePath("/equipment");
  redirect(safeReturnPath(parsed.data.redirectTo));
}

export async function deleteInspectionTemplateAction(
  _state: InspectionTemplateActionState,
  formData: FormData,
): Promise<InspectionTemplateActionState> {
  const session = await requireAdminAccess();
  const parsed = deleteSchema.safeParse({
    id: formData.get("id"),
    redirectTo: formData.get("redirectTo"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data template tidak valid." };
  }

  const db = getDb();
  const existing = await db.query.equipmentInspectionTemplates.findFirst({
    where: eq(equipmentInspectionTemplates.id, parsed.data.id),
  });

  if (!existing) {
    return { error: "Template tidak ditemukan." };
  }

  await db.delete(equipmentInspectionTemplates).where(eq(equipmentInspectionTemplates.id, parsed.data.id));

  await writeAuditLog({
    userId: session.user.id,
    action: "inspection_template.delete",
    entityType: "inspection_template",
    entityId: parsed.data.id,
    summary: `Menghapus template inspeksi ${existing.name}`,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/inspection-templates");
  revalidatePath("/equipment");
  redirect(safeReturnPath(parsed.data.redirectTo));
}
