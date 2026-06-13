"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getDb } from "@/db";
import {
  equipment,
  equipmentDocuments,
  equipmentLocationLogs,
  equipmentInspectionResults,
  equipmentInspections,
  equipmentInspectionTemplates,
  equipmentStatusLogs,
} from "@/db/schema";
import { getCurrentAuthSession, writeAuditLog } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { EQUIPMENT_STATUS_OPTIONS, type EquipmentStatusValue } from "@/lib/equipment";

export type EquipmentActionState = {
  error?: string;
};

const equipmentStatuses = EQUIPMENT_STATUS_OPTIONS.map((item) => item.value) as [
  EquipmentStatusValue,
  ...EquipmentStatusValue[],
];

const emptyToUndefined = (value: unknown) => {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const optionalText = z.preprocess(emptyToUndefined, z.string().trim().optional());
const optionalUuid = z.preprocess(emptyToUndefined, z.string().uuid().optional());
const optionalDate = z.preprocess(emptyToUndefined, z.string().date().optional());

const equipmentUpsertSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().trim().min(1, "Kode peralatan wajib diisi."),
  name: z.string().trim().min(1, "Nama peralatan wajib diisi."),
  categoryId: z.string().uuid("Kategori tidak valid."),
  locationId: optionalUuid,
  brand: optionalText,
  model: optionalText,
  serialNumber: optionalText,
  status: z.enum(equipmentStatuses),
  conditionNote: optionalText,
  specificationNote: optionalText,
  notes: optionalText,
  lastInspectionAt: optionalDate,
  nextInspectionAt: optionalDate,
  redirectTo: z.string().trim().optional(),
});

const equipmentStatusSchema = z.object({
  equipmentId: z.string().uuid(),
  status: z.enum(equipmentStatuses),
  note: optionalText,
  redirectTo: z.string().trim().optional(),
});

const equipmentLocationSchema = z.object({
  equipmentId: z.string().uuid(),
  locationId: optionalUuid,
  note: optionalText,
  redirectTo: z.string().trim().optional(),
});

const equipmentDocumentSchema = z.object({
  equipmentId: z.string().uuid(),
  kind: z.enum(["photo", "document", "manual", "other"]),
  title: z.string().trim().min(1, "Judul dokumen wajib diisi."),
  fileName: z.string().trim().min(1, "Nama file wajib diisi."),
  storageUrl: optionalText,
  note: optionalText,
  redirectTo: z.string().trim().optional(),
});

const inspectionExecutionSchema = z.object({
  equipmentId: z.string().uuid(),
  templateId: optionalUuid,
  resultStatus: z.preprocess(emptyToUndefined, z.enum(["pass", "warning", "fail"]).optional()),
  note: optionalText,
  nextInspectionAt: optionalDate,
  redirectTo: z.string().trim().optional(),
});

function parseEquipmentDate(value?: string) {
  if (!value) {
    return null;
  }

  return new Date(`${value}T00:00:00`);
}

async function requireEquipmentWriteAccess() {
  const session = await getCurrentAuthSession();
  if (!session) {
    redirect("/login");
  }

  if (!hasPermission(session, "equipment.write")) {
    redirect("/akses-ditolak");
  }

  return session;
}

async function requireEquipmentInspectionAccess() {
  const session = await getCurrentAuthSession();
  if (!session) {
    redirect("/login");
  }

  if (hasPermission(session, "inspections.write") || hasPermission(session, "equipment.write")) {
    return session;
  }

  redirect("/akses-ditolak");
}

function safeReturnPath(path?: string) {
  if (path && path.startsWith("/")) {
    return path;
  }

  return "/equipment";
}

export async function createEquipmentAction(
  _state: EquipmentActionState,
  formData: FormData,
): Promise<EquipmentActionState> {
  const session = await requireEquipmentWriteAccess();
  const parsed = equipmentUpsertSchema.safeParse({
    id: formData.get("id"),
    code: formData.get("code"),
    name: formData.get("name"),
    categoryId: formData.get("categoryId"),
    locationId: formData.get("locationId"),
    brand: formData.get("brand"),
    model: formData.get("model"),
    serialNumber: formData.get("serialNumber"),
    status: formData.get("status"),
    conditionNote: formData.get("conditionNote"),
    specificationNote: formData.get("specificationNote"),
    notes: formData.get("notes"),
    lastInspectionAt: formData.get("lastInspectionAt"),
    nextInspectionAt: formData.get("nextInspectionAt"),
    redirectTo: formData.get("redirectTo"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Data peralatan tidak valid.",
    };
  }

  const db = getDb();
  const now = new Date();

  const created = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(equipment)
      .values({
        code: parsed.data.code,
        name: parsed.data.name,
        categoryId: parsed.data.categoryId,
        locationId: parsed.data.locationId ?? null,
        brand: parsed.data.brand ?? "",
        model: parsed.data.model ?? "",
        serialNumber: parsed.data.serialNumber ?? null,
        status: parsed.data.status,
        conditionNote: parsed.data.conditionNote ?? "",
        specificationNote: parsed.data.specificationNote ?? "",
        notes: parsed.data.notes ?? "",
        lastInspectionAt: parseEquipmentDate(parsed.data.lastInspectionAt),
        nextInspectionAt: parseEquipmentDate(parsed.data.nextInspectionAt),
        lastStatusChangeAt: now,
        updatedAt: now,
      })
      .returning({ id: equipment.id });

    await tx.insert(equipmentStatusLogs).values({
      equipmentId: row.id,
      status: parsed.data.status,
      note: "Peralatan dibuat.",
      changedByUserId: session.user.id,
    });

    if (parsed.data.locationId) {
      await tx.insert(equipmentLocationLogs).values({
        equipmentId: row.id,
        fromLocationId: null,
        toLocationId: parsed.data.locationId,
        note: "Lokasi awal peralatan.",
        changedByUserId: session.user.id,
      });
    }

    return row;
  });

  await writeAuditLog({
    userId: session.user.id,
    action: "equipment.create",
    entityType: "equipment",
    entityId: created.id,
    summary: `Menambahkan peralatan ${parsed.data.code}`,
    metadata: {
      code: parsed.data.code,
      name: parsed.data.name,
      status: parsed.data.status,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/equipment");
  redirect(`/equipment/${created.id}`);
}

export async function updateEquipmentAction(
  _state: EquipmentActionState,
  formData: FormData,
): Promise<EquipmentActionState> {
  const session = await requireEquipmentWriteAccess();
  const parsed = equipmentUpsertSchema.safeParse({
    id: formData.get("id"),
    code: formData.get("code"),
    name: formData.get("name"),
    categoryId: formData.get("categoryId"),
    locationId: formData.get("locationId"),
    brand: formData.get("brand"),
    model: formData.get("model"),
    serialNumber: formData.get("serialNumber"),
    status: formData.get("status"),
    conditionNote: formData.get("conditionNote"),
    specificationNote: formData.get("specificationNote"),
    notes: formData.get("notes"),
    lastInspectionAt: formData.get("lastInspectionAt"),
    nextInspectionAt: formData.get("nextInspectionAt"),
    redirectTo: formData.get("redirectTo"),
  });

  if (!parsed.success || !parsed.data.id) {
    return {
      error: parsed.error?.issues[0]?.message ?? "Data peralatan tidak valid.",
    };
  }

  const db = getDb();
  const existing = await db.query.equipment.findFirst({
    where: eq(equipment.id, parsed.data.id),
  });

  if (!existing) {
    return {
      error: "Peralatan tidak ditemukan.",
    };
  }

  const now = new Date();
  const [updated] = await db
    .update(equipment)
    .set({
      code: parsed.data.code,
      name: parsed.data.name,
      categoryId: parsed.data.categoryId,
      locationId: parsed.data.locationId ?? null,
      brand: parsed.data.brand ?? "",
      model: parsed.data.model ?? "",
      serialNumber: parsed.data.serialNumber ?? null,
      status: parsed.data.status,
      conditionNote: parsed.data.conditionNote ?? "",
      specificationNote: parsed.data.specificationNote ?? "",
      notes: parsed.data.notes ?? "",
      lastInspectionAt: parseEquipmentDate(parsed.data.lastInspectionAt),
      nextInspectionAt: parseEquipmentDate(parsed.data.nextInspectionAt),
      lastStatusChangeAt: existing.status === parsed.data.status ? existing.lastStatusChangeAt : now,
      updatedAt: now,
    })
    .where(eq(equipment.id, parsed.data.id))
    .returning({ id: equipment.id, status: equipment.status, locationId: equipment.locationId });

  if (existing.status !== parsed.data.status) {
    await db.insert(equipmentStatusLogs).values({
      equipmentId: updated.id,
      status: parsed.data.status,
      note: "Status diperbarui.",
      changedByUserId: session.user.id,
    });
  }

  if (existing.locationId !== parsed.data.locationId) {
    await db.insert(equipmentLocationLogs).values({
      equipmentId: updated.id,
      fromLocationId: existing.locationId,
      toLocationId: parsed.data.locationId ?? null,
      note: "Lokasi diperbarui.",
      changedByUserId: session.user.id,
    });
  }

  await writeAuditLog({
    userId: session.user.id,
    action: "equipment.update",
    entityType: "equipment",
    entityId: updated.id,
    summary: `Memperbarui peralatan ${parsed.data.code}`,
    metadata: {
      code: parsed.data.code,
      status: parsed.data.status,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/equipment");
  revalidatePath(`/equipment/${updated.id}`);
  redirect(safeReturnPath(parsed.data.redirectTo ?? `/equipment/${updated.id}`));
}

export async function changeEquipmentStatusAction(
  _state: EquipmentActionState,
  formData: FormData,
): Promise<EquipmentActionState> {
  const session = await requireEquipmentWriteAccess();
  const parsed = equipmentStatusSchema.safeParse({
    equipmentId: formData.get("equipmentId"),
    status: formData.get("status"),
    note: formData.get("note"),
    redirectTo: formData.get("redirectTo"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Status tidak valid.",
    };
  }

  const db = getDb();
  const existing = await db.query.equipment.findFirst({
    where: eq(equipment.id, parsed.data.equipmentId),
  });

  if (!existing) {
    return {
      error: "Peralatan tidak ditemukan.",
    };
  }

  const now = new Date();
  await db
    .update(equipment)
    .set({
      status: parsed.data.status,
      lastStatusChangeAt: now,
      updatedAt: now,
    })
    .where(eq(equipment.id, parsed.data.equipmentId));

  await db.insert(equipmentStatusLogs).values({
    equipmentId: parsed.data.equipmentId,
    status: parsed.data.status,
    note: parsed.data.note ?? "Status diperbarui.",
    changedByUserId: session.user.id,
  });

  await writeAuditLog({
    userId: session.user.id,
    action: "equipment.status.update",
    entityType: "equipment",
    entityId: parsed.data.equipmentId,
    summary: `Mengubah status peralatan ${existing.code}`,
    metadata: {
      status: parsed.data.status,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/equipment");
  revalidatePath(`/equipment/${parsed.data.equipmentId}`);
  redirect(safeReturnPath(parsed.data.redirectTo ?? `/equipment/${parsed.data.equipmentId}`));

  return {};
}

export async function changeEquipmentLocationAction(
  _state: EquipmentActionState,
  formData: FormData,
): Promise<EquipmentActionState> {
  const session = await requireEquipmentWriteAccess();
  const parsed = equipmentLocationSchema.safeParse({
    equipmentId: formData.get("equipmentId"),
    locationId: formData.get("locationId"),
    note: formData.get("note"),
    redirectTo: formData.get("redirectTo"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Lokasi tidak valid.",
    };
  }

  const db = getDb();
  const existing = await db.query.equipment.findFirst({
    where: eq(equipment.id, parsed.data.equipmentId),
  });

  if (!existing) {
    return {
      error: "Peralatan tidak ditemukan.",
    };
  }

  const now = new Date();
  await db
    .update(equipment)
    .set({
      locationId: parsed.data.locationId ?? null,
      updatedAt: now,
    })
    .where(eq(equipment.id, parsed.data.equipmentId));

  if (existing.locationId !== parsed.data.locationId) {
    await db.insert(equipmentLocationLogs).values({
      equipmentId: parsed.data.equipmentId,
      fromLocationId: existing.locationId,
      toLocationId: parsed.data.locationId ?? null,
      note: parsed.data.note ?? "Lokasi diperbarui.",
      changedByUserId: session.user.id,
    });
  }

  await writeAuditLog({
    userId: session.user.id,
    action: "equipment.location.update",
    entityType: "equipment",
    entityId: parsed.data.equipmentId,
    summary: `Memindahkan peralatan ${existing.code}`,
    metadata: {
      locationId: parsed.data.locationId ?? null,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/equipment");
  revalidatePath(`/equipment/${parsed.data.equipmentId}`);
  redirect(safeReturnPath(parsed.data.redirectTo ?? `/equipment/${parsed.data.equipmentId}`));

  return {};
}

export async function addEquipmentDocumentAction(
  _state: EquipmentActionState,
  formData: FormData,
): Promise<EquipmentActionState> {
  const session = await requireEquipmentWriteAccess();
  const parsed = equipmentDocumentSchema.safeParse({
    equipmentId: formData.get("equipmentId"),
    kind: formData.get("kind"),
    title: formData.get("title"),
    fileName: formData.get("fileName"),
    storageUrl: formData.get("storageUrl"),
    note: formData.get("note"),
    redirectTo: formData.get("redirectTo"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Data dokumen tidak valid.",
    };
  }

  const db = getDb();
  await db.insert(equipmentDocuments).values({
    equipmentId: parsed.data.equipmentId,
    kind: parsed.data.kind,
    title: parsed.data.title,
    fileName: parsed.data.fileName,
    storageKey: parsed.data.storageUrl ?? parsed.data.fileName,
    storageUrl: parsed.data.storageUrl ?? null,
    note: parsed.data.note ?? "",
    createdByUserId: session.user.id,
  });

  await writeAuditLog({
    userId: session.user.id,
    action: "equipment.document.add",
    entityType: "equipment",
    entityId: parsed.data.equipmentId,
    summary: `Menambahkan dokumen peralatan`,
    metadata: {
      title: parsed.data.title,
      kind: parsed.data.kind,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/equipment");
  revalidatePath(`/equipment/${parsed.data.equipmentId}`);
  redirect(safeReturnPath(parsed.data.redirectTo ?? `/equipment/${parsed.data.equipmentId}`));
}

export async function archiveEquipmentAction(formData: FormData) {
  const session = await requireEquipmentWriteAccess();
  const equipmentId = String(formData.get("equipmentId") ?? "");
  if (!equipmentId) {
    redirect("/equipment");
  }

  const db = getDb();
  const existing = await db.query.equipment.findFirst({
    where: eq(equipment.id, equipmentId),
  });

  if (!existing) {
    redirect("/equipment");
  }

  const now = new Date();
  await db
    .update(equipment)
    .set({
      status: "retired",
      lastStatusChangeAt: now,
      updatedAt: now,
    })
    .where(eq(equipment.id, equipmentId));

  await db.insert(equipmentStatusLogs).values({
    equipmentId,
    status: "retired",
    note: "Peralatan diarsipkan.",
    changedByUserId: session.user.id,
  });

  await writeAuditLog({
    userId: session.user.id,
    action: "equipment.archive",
    entityType: "equipment",
    entityId: equipmentId,
    summary: `Mengarsipkan peralatan ${existing.code}`,
  });

  revalidatePath("/dashboard");
  revalidatePath("/equipment");
  revalidatePath(`/equipment/${equipmentId}`);
  redirect(`/equipment/${equipmentId}`);
}

export async function performEquipmentInspectionAction(
  _state: EquipmentActionState,
  formData: FormData,
): Promise<EquipmentActionState> {
  const session = await requireEquipmentInspectionAccess();
  const parsed = inspectionExecutionSchema.safeParse({
    equipmentId: formData.get("equipmentId"),
    templateId: formData.get("templateId"),
    resultStatus: formData.get("resultStatus"),
    note: formData.get("note"),
    nextInspectionAt: formData.get("nextInspectionAt"),
    redirectTo: formData.get("redirectTo"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data inspeksi tidak valid." };
  }

  const db = getDb();
  const templateId = parsed.data.templateId ?? null;
  const [equipmentRow, templateRow] = await Promise.all([
    db.query.equipment.findFirst({
      where: eq(equipment.id, parsed.data.equipmentId),
    }),
    templateId
      ? db.query.equipmentInspectionTemplates.findFirst({
          where: eq(equipmentInspectionTemplates.id, templateId),
        })
      : Promise.resolve(null),
  ]);

  if (!equipmentRow) {
    return { error: "Peralatan tidak ditemukan." };
  }

  const useTemplate = Boolean(templateRow);
  const resultStatus = useTemplate
    ? null
    : parsed.data.resultStatus ?? "pass";

  if (templateId && !templateRow) {
    return { error: "Template inspeksi tidak ditemukan." };
  }

  const checklist = useTemplate && templateRow ? (Array.isArray(templateRow.checklist) ? templateRow.checklist : []) : [];

  const normalizedChecks = useTemplate
    ? checklist.map((item, index) => {
        const label = String((item as { label?: unknown }).label ?? "").trim();
        const required = Boolean((item as { required?: unknown }).required);
        const resultValue = String(formData.get(`result_${index}`) ?? "na");
        const noteValue = String(formData.get(`note_${index}`) ?? "").trim();

        if (!label) {
          return null;
        }

        if (!["pass", "fail", "na"].includes(resultValue)) {
          return null;
        }

        return {
          checklistIndex: index,
          label,
          required,
          result: resultValue,
          note: noteValue.length > 0 ? noteValue : null,
        };
      })
    : [];

  if (useTemplate && normalizedChecks.some((item) => item === null)) {
    return { error: "Hasil inspeksi tidak lengkap." };
  }

  const typedChecks = normalizedChecks as Array<{
    checklistIndex: number;
    label: string;
    required: boolean;
    result: "pass" | "fail" | "na";
    note: string | null;
  }>;

  const hasRequiredFailure = typedChecks.some((item) => item.required && item.result !== "pass");
  const hasAnyFailure = typedChecks.some((item) => item.result === "fail");
  const hasAnySkipped = typedChecks.some((item) => item.result === "na");

  let finalStatus: "pass" | "warning" | "fail";
  if (useTemplate) {
    finalStatus = hasRequiredFailure ? "fail" : hasAnyFailure || hasAnySkipped ? "warning" : "pass";
  } else {
    finalStatus = resultStatus ?? "pass";
  }

  const nextInspectionAt = parsed.data.nextInspectionAt
    ? new Date(`${parsed.data.nextInspectionAt}T00:00:00`)
    : new Date(Date.now() + 1000 * 60 * 60 * 24 * 90);

  const now = new Date();
  await db.transaction(async (tx) => {
    const [inspection] = await tx
      .insert(equipmentInspections)
      .values({
        equipmentId: equipmentRow.id,
        templateId: templateRow?.id ?? null,
        templateNameSnapshot: templateRow?.name ?? "Inspeksi umum",
        resultStatus: finalStatus,
        note: parsed.data.note ?? "",
        checklistSnapshot: checklist,
        summary: {
          total: typedChecks.length,
          passed: typedChecks.filter((item) => item.result === "pass").length,
          failed: typedChecks.filter((item) => item.result === "fail").length,
          na: typedChecks.filter((item) => item.result === "na").length,
        },
        inspectedByUserId: session.user.id,
        inspectedAt: now,
        createdAt: now,
      })
      .returning({ id: equipmentInspections.id });

    if (typedChecks.length > 0) {
      await tx.insert(equipmentInspectionResults).values(
        typedChecks.map((item) => ({
          inspectionId: inspection.id,
          checklistIndex: item.checklistIndex,
          label: item.label,
          required: item.required,
          result: item.result,
          note: item.note,
        })),
      );
    }

    await tx
      .update(equipment)
      .set({
        lastInspectionAt: now,
        nextInspectionAt,
        status:
          finalStatus === "pass" ? "ready" : finalStatus === "warning" ? "inspection_due" : "maintenance",
        lastStatusChangeAt: now,
        updatedAt: now,
      })
      .where(eq(equipment.id, equipmentRow.id));

    await tx.insert(equipmentStatusLogs).values({
      equipmentId: equipmentRow.id,
      status:
        finalStatus === "pass" ? "ready" : finalStatus === "warning" ? "inspection_due" : "maintenance",
      note: `Hasil inspeksi: ${finalStatus}`,
      changedByUserId: session.user.id,
    });
  });

  await writeAuditLog({
    userId: session.user.id,
    action: "equipment.inspection.create",
    entityType: "equipment",
    entityId: equipmentRow.id,
    summary: `Mencatat inspeksi peralatan ${equipmentRow.code}`,
    metadata: {
      templateId: templateRow?.id ?? null,
      templateNameSnapshot: templateRow?.name ?? "Inspeksi umum",
      resultStatus: finalStatus,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/equipment");
  revalidatePath(`/equipment/${equipmentRow.id}`);
  const defaultRedirect = hasPermission(session, "equipment.read")
    ? `/equipment/${equipmentRow.id}?tab=inspeksi`
    : "/dashboard";
  const redirectTarget =
    parsed.data.redirectTo && hasPermission(session, "equipment.read")
      ? parsed.data.redirectTo
      : defaultRedirect;
  redirect(safeReturnPath(redirectTarget));
}
