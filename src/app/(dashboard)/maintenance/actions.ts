"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getDb } from "@/db";
import {
  equipment,
  maintenanceActions,
  maintenanceAttachments,
  maintenancePartCatalog,
  maintenancePartUsages,
  maintenanceTickets,
  maintenanceVendors,
} from "@/db/schema";
import { getCurrentAuthSession, writeAuditLog } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";

export type MaintenanceActionState = {
  error?: string;
};

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

const ticketSchema = z.object({
  id: optionalUuid,
  equipmentId: z.string().uuid("Peralatan tidak valid."),
  vendorId: optionalUuid,
  subject: z.string().trim().min(1, "Judul ticket wajib diisi."),
  complaint: z.string().trim().min(1, "Keluhan wajib diisi."),
  diagnosis: optionalText,
  actionPlan: optionalText,
  status: z.enum(["open", "in_progress", "waiting_parts", "closed", "cancelled"]),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  assignedToUserId: optionalUuid,
  dueAt: optionalDate,
  estimatedCost: z.coerce.number().int().min(0).default(0),
  actualCost: z.coerce.number().int().min(0).default(0),
  redirectTo: z.string().trim().optional(),
});

const ticketStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["open", "in_progress", "waiting_parts", "closed", "cancelled"]),
  actualCost: z.coerce.number().int().min(0).default(0),
  redirectTo: z.string().trim().optional(),
});

const maintenanceActionSchema = z.object({
  ticketId: z.string().uuid(),
  actionType: z.enum(["diagnosis", "repair", "replacement", "note", "test"]),
  description: z.string().trim().min(1, "Deskripsi tindakan wajib diisi."),
  cost: z.coerce.number().int().min(0).default(0),
  redirectTo: z.string().trim().optional(),
});

const maintenanceAttachmentSchema = z.object({
  ticketId: z.string().uuid(),
  kind: z.enum(["photo", "document"]),
  stage: z.enum(["before", "after", "other"]),
  title: z.string().trim().min(1, "Judul lampiran wajib diisi."),
  fileName: z.string().trim().min(1, "Nama file wajib diisi."),
  storageUrl: optionalText,
  note: optionalText,
  redirectTo: z.string().trim().optional(),
});

const vendorSchema = z.object({
  id: optionalUuid,
  code: z.string().trim().min(1, "Kode vendor wajib diisi."),
  name: z.string().trim().min(1, "Nama vendor wajib diisi."),
  contactName: optionalText,
  phone: optionalText,
  email: optionalText,
  notes: optionalText,
  redirectTo: z.string().trim().optional(),
});

const partCatalogSchema = z.object({
  id: optionalUuid,
  code: z.string().trim().min(1, "Kode part wajib diisi."),
  name: z.string().trim().min(1, "Nama part wajib diisi."),
  unit: z.string().trim().min(1, "Satuan wajib diisi."),
  notes: optionalText,
  redirectTo: z.string().trim().optional(),
});

const partUsageSchema = z.object({
  ticketId: z.string().uuid(),
  partId: optionalUuid,
  partNameSnapshot: z.string().trim().min(1, "Nama part wajib diisi."),
  quantity: z.coerce.number().int().positive("Jumlah part harus lebih dari 0."),
  unitCost: z.coerce.number().int().min(0).default(0),
  note: optionalText,
  redirectTo: z.string().trim().optional(),
});

async function requireMaintenanceWriteAccess() {
  const session = await getCurrentAuthSession();
  if (!session) {
    redirect("/login");
  }

  if (!hasPermission(session, "maintenance.write")) {
    redirect("/akses-ditolak");
  }

  return session;
}

function safeReturnPath(path?: string) {
  if (path && path.startsWith("/")) {
    return path;
  }

  return "/maintenance";
}

function makeTicketNumber() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const tail = String(now.getTime()).slice(-6);
  return `MT-${y}${m}-${tail}`;
}

export async function createMaintenanceTicketAction(
  _state: MaintenanceActionState,
  formData: FormData,
): Promise<MaintenanceActionState> {
  const session = await requireMaintenanceWriteAccess();
  const parsed = ticketSchema.safeParse({
    equipmentId: formData.get("equipmentId"),
    vendorId: formData.get("vendorId"),
    subject: formData.get("subject"),
    complaint: formData.get("complaint"),
    diagnosis: formData.get("diagnosis"),
    actionPlan: formData.get("actionPlan"),
    status: formData.get("status"),
    priority: formData.get("priority"),
    assignedToUserId: formData.get("assignedToUserId"),
    dueAt: formData.get("dueAt"),
    estimatedCost: formData.get("estimatedCost"),
    actualCost: formData.get("actualCost"),
    redirectTo: formData.get("redirectTo"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data ticket tidak valid." };
  }

  const db = getDb();
  const equipmentRow = await db.query.equipment.findFirst({
    where: eq(equipment.id, parsed.data.equipmentId),
  });

  if (!equipmentRow) {
    return { error: "Peralatan tidak ditemukan." };
  }

  const [row] = await db
    .insert(maintenanceTickets)
    .values({
      ticketNumber: makeTicketNumber(),
      equipmentId: parsed.data.equipmentId,
      vendorId: parsed.data.vendorId ?? null,
      subject: parsed.data.subject,
      complaint: parsed.data.complaint,
      diagnosis: parsed.data.diagnosis ?? "",
      actionPlan: parsed.data.actionPlan ?? "",
      status: parsed.data.status,
      priority: parsed.data.priority,
      assignedToUserId: parsed.data.assignedToUserId ?? null,
      openedByUserId: session.user.id,
      openedAt: new Date(),
      dueAt: parsed.data.dueAt ? new Date(`${parsed.data.dueAt}T00:00:00`) : null,
      estimatedCost: parsed.data.estimatedCost,
      actualCost: parsed.data.actualCost,
      updatedAt: new Date(),
    })
    .returning({ id: maintenanceTickets.id, ticketNumber: maintenanceTickets.ticketNumber });

  await writeAuditLog({
    userId: session.user.id,
    action: "maintenance.ticket.create",
    entityType: "maintenance_ticket",
    entityId: row.id,
    summary: `Membuat ticket maintenance ${row.ticketNumber}`,
    metadata: {
      equipmentId: parsed.data.equipmentId,
      status: parsed.data.status,
      priority: parsed.data.priority,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/maintenance");
  revalidatePath(`/equipment/${equipmentRow.id}`);
  redirect(safeReturnPath(parsed.data.redirectTo ?? `/maintenance?ticket=${row.id}`));
}

export async function updateMaintenanceTicketAction(
  _state: MaintenanceActionState,
  formData: FormData,
): Promise<MaintenanceActionState> {
  const session = await requireMaintenanceWriteAccess();
  const parsed = ticketSchema.safeParse({
    id: formData.get("id"),
    equipmentId: formData.get("equipmentId"),
    vendorId: formData.get("vendorId"),
    subject: formData.get("subject"),
    complaint: formData.get("complaint"),
    diagnosis: formData.get("diagnosis"),
    actionPlan: formData.get("actionPlan"),
    status: formData.get("status"),
    priority: formData.get("priority"),
    assignedToUserId: formData.get("assignedToUserId"),
    dueAt: formData.get("dueAt"),
    estimatedCost: formData.get("estimatedCost"),
    actualCost: formData.get("actualCost"),
    redirectTo: formData.get("redirectTo"),
  });

  if (!parsed.success || !parsed.data.id) {
    return { error: parsed.error?.issues[0]?.message ?? "Data ticket tidak valid." };
  }

  const db = getDb();
  const existing = await db.query.maintenanceTickets.findFirst({
    where: eq(maintenanceTickets.id, parsed.data.id),
  });

  if (!existing) {
    return { error: "Ticket tidak ditemukan." };
  }

  await db
    .update(maintenanceTickets)
    .set({
      equipmentId: parsed.data.equipmentId,
      vendorId: parsed.data.vendorId ?? null,
      subject: parsed.data.subject,
      complaint: parsed.data.complaint,
      diagnosis: parsed.data.diagnosis ?? "",
      actionPlan: parsed.data.actionPlan ?? "",
      status: parsed.data.status,
      priority: parsed.data.priority,
      assignedToUserId: parsed.data.assignedToUserId ?? null,
      dueAt: parsed.data.dueAt ? new Date(`${parsed.data.dueAt}T00:00:00`) : null,
      estimatedCost: parsed.data.estimatedCost,
      actualCost: parsed.data.actualCost,
      closedAt: parsed.data.status === "closed" ? existing.closedAt ?? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(maintenanceTickets.id, parsed.data.id));

  await writeAuditLog({
    userId: session.user.id,
    action: "maintenance.ticket.update",
    entityType: "maintenance_ticket",
    entityId: parsed.data.id,
    summary: `Memperbarui ticket maintenance ${existing.ticketNumber}`,
    metadata: {
      status: parsed.data.status,
      priority: parsed.data.priority,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/maintenance");
  revalidatePath(`/maintenance?ticket=${parsed.data.id}`);
  redirect(safeReturnPath(parsed.data.redirectTo ?? `/maintenance?ticket=${parsed.data.id}`));
}

export async function closeMaintenanceTicketAction(
  _state: MaintenanceActionState,
  formData: FormData,
): Promise<MaintenanceActionState> {
  const session = await requireMaintenanceWriteAccess();
  const parsed = ticketStatusSchema.safeParse({
    id: formData.get("id"),
    status: "closed",
    actualCost: formData.get("actualCost"),
    redirectTo: formData.get("redirectTo"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ticket tidak valid." };
  }

  const db = getDb();
  const existing = await db.query.maintenanceTickets.findFirst({
    where: eq(maintenanceTickets.id, parsed.data.id),
  });

  if (!existing) {
    return { error: "Ticket tidak ditemukan." };
  }

  await db
    .update(maintenanceTickets)
    .set({
      status: "closed",
      actualCost: parsed.data.actualCost,
      closedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(maintenanceTickets.id, parsed.data.id));

  await writeAuditLog({
    userId: session.user.id,
    action: "maintenance.ticket.close",
    entityType: "maintenance_ticket",
    entityId: parsed.data.id,
    summary: `Menutup ticket maintenance ${existing.ticketNumber}`,
    metadata: {
      actualCost: parsed.data.actualCost,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/maintenance");
  redirect(safeReturnPath(parsed.data.redirectTo ?? `/maintenance?ticket=${parsed.data.id}`));
}

export async function addMaintenanceActionAction(
  _state: MaintenanceActionState,
  formData: FormData,
): Promise<MaintenanceActionState> {
  const session = await requireMaintenanceWriteAccess();
  const parsed = maintenanceActionSchema.safeParse({
    ticketId: formData.get("ticketId"),
    actionType: formData.get("actionType"),
    description: formData.get("description"),
    cost: formData.get("cost"),
    redirectTo: formData.get("redirectTo"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tindakan tidak valid." };
  }

  const db = getDb();
  const ticket = await db.query.maintenanceTickets.findFirst({
    where: eq(maintenanceTickets.id, parsed.data.ticketId),
  });
  if (!ticket) {
    return { error: "Ticket tidak ditemukan." };
  }

  await db.insert(maintenanceActions).values({
    ticketId: parsed.data.ticketId,
    actionType: parsed.data.actionType,
    description: parsed.data.description,
    cost: parsed.data.cost,
    performedByUserId: session.user.id,
    performedAt: new Date(),
  });

  await db
    .update(maintenanceTickets)
    .set({
      actualCost: ticket.actualCost + parsed.data.cost,
      status: ticket.status === "open" ? "in_progress" : ticket.status,
      updatedAt: new Date(),
    })
    .where(eq(maintenanceTickets.id, parsed.data.ticketId));

  await writeAuditLog({
    userId: session.user.id,
    action: "maintenance.action.create",
    entityType: "maintenance_ticket",
    entityId: parsed.data.ticketId,
    summary: `Menambah tindakan maintenance ${ticket.ticketNumber}`,
    metadata: {
      actionType: parsed.data.actionType,
      cost: parsed.data.cost,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/maintenance");
  redirect(safeReturnPath(parsed.data.redirectTo ?? `/maintenance?ticket=${parsed.data.ticketId}`));
}

export async function addMaintenanceAttachmentAction(
  _state: MaintenanceActionState,
  formData: FormData,
): Promise<MaintenanceActionState> {
  const session = await requireMaintenanceWriteAccess();
  const parsed = maintenanceAttachmentSchema.safeParse({
    ticketId: formData.get("ticketId"),
    kind: formData.get("kind"),
    stage: formData.get("stage"),
    title: formData.get("title"),
    fileName: formData.get("fileName"),
    storageUrl: formData.get("storageUrl"),
    note: formData.get("note"),
    redirectTo: formData.get("redirectTo"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data lampiran tidak valid." };
  }

  const db = getDb();
  const ticket = await db.query.maintenanceTickets.findFirst({
    where: eq(maintenanceTickets.id, parsed.data.ticketId),
  });
  if (!ticket) {
    return { error: "Ticket tidak ditemukan." };
  }

  await db.insert(maintenanceAttachments).values({
    ticketId: parsed.data.ticketId,
    kind: parsed.data.kind,
    stage: parsed.data.stage,
    title: parsed.data.title,
    fileName: parsed.data.fileName,
    storageUrl: parsed.data.storageUrl ?? null,
    note: parsed.data.note ?? "",
    createdByUserId: session.user.id,
  });

  await writeAuditLog({
    userId: session.user.id,
    action: "maintenance.attachment.add",
    entityType: "maintenance_ticket",
    entityId: parsed.data.ticketId,
    summary: `Menambah lampiran maintenance ${ticket.ticketNumber}`,
    metadata: {
      kind: parsed.data.kind,
      stage: parsed.data.stage,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/maintenance");
  redirect(safeReturnPath(parsed.data.redirectTo ?? `/maintenance?ticket=${parsed.data.ticketId}`));
}

export async function createMaintenanceVendorAction(
  _state: MaintenanceActionState,
  formData: FormData,
): Promise<MaintenanceActionState> {
  const session = await requireMaintenanceWriteAccess();
  const parsed = vendorSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    contactName: formData.get("contactName"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    notes: formData.get("notes"),
    redirectTo: formData.get("redirectTo"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data vendor tidak valid." };
  }

  const db = getDb();
  await db.insert(maintenanceVendors).values({
    code: parsed.data.code,
    name: parsed.data.name,
    contactName: parsed.data.contactName ?? "",
    phone: parsed.data.phone ?? "",
    email: parsed.data.email ?? "",
    notes: parsed.data.notes ?? "",
    updatedAt: new Date(),
  });

  await writeAuditLog({
    userId: session.user.id,
    action: "maintenance.vendor.create",
    entityType: "maintenance_vendor",
    summary: `Menambahkan vendor maintenance ${parsed.data.code}`,
  });

  revalidatePath("/dashboard");
  revalidatePath("/maintenance");
  redirect(safeReturnPath(parsed.data.redirectTo ?? "/maintenance"));
}

export async function updateMaintenanceVendorAction(
  _state: MaintenanceActionState,
  formData: FormData,
): Promise<MaintenanceActionState> {
  const session = await requireMaintenanceWriteAccess();
  const parsed = vendorSchema.safeParse({
    id: formData.get("id"),
    code: formData.get("code"),
    name: formData.get("name"),
    contactName: formData.get("contactName"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    notes: formData.get("notes"),
    redirectTo: formData.get("redirectTo"),
  });

  if (!parsed.success || !parsed.data.id) {
    return { error: parsed.error?.issues[0]?.message ?? "Data vendor tidak valid." };
  }

  const db = getDb();
  const existing = await db.query.maintenanceVendors.findFirst({
    where: eq(maintenanceVendors.id, parsed.data.id),
  });

  if (!existing) {
    return { error: "Vendor tidak ditemukan." };
  }

  await db
    .update(maintenanceVendors)
    .set({
      code: parsed.data.code,
      name: parsed.data.name,
      contactName: parsed.data.contactName ?? "",
      phone: parsed.data.phone ?? "",
      email: parsed.data.email ?? "",
      notes: parsed.data.notes ?? "",
      updatedAt: new Date(),
    })
    .where(eq(maintenanceVendors.id, parsed.data.id));

  await writeAuditLog({
    userId: session.user.id,
    action: "maintenance.vendor.update",
    entityType: "maintenance_vendor",
    entityId: parsed.data.id,
    summary: `Memperbarui vendor maintenance ${existing.code}`,
  });

  revalidatePath("/dashboard");
  revalidatePath("/maintenance");
  redirect(safeReturnPath(parsed.data.redirectTo ?? "/maintenance"));
}

export async function deleteMaintenanceVendorAction(
  _state: MaintenanceActionState,
  formData: FormData,
): Promise<MaintenanceActionState> {
  const session = await requireMaintenanceWriteAccess();
  const parsed = z
    .object({
      id: z.string().uuid("Vendor tidak valid."),
      redirectTo: z.string().trim().optional(),
    })
    .safeParse({
      id: formData.get("id"),
      redirectTo: formData.get("redirectTo"),
    });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Vendor tidak valid." };
  }

  const db = getDb();
  const existing = await db.query.maintenanceVendors.findFirst({
    where: eq(maintenanceVendors.id, parsed.data.id),
  });

  if (!existing) {
    return { error: "Vendor tidak ditemukan." };
  }

  await db.delete(maintenanceVendors).where(eq(maintenanceVendors.id, parsed.data.id));

  await writeAuditLog({
    userId: session.user.id,
    action: "maintenance.vendor.delete",
    entityType: "maintenance_vendor",
    entityId: parsed.data.id,
    summary: `Menghapus vendor maintenance ${existing.code}`,
  });

  revalidatePath("/dashboard");
  revalidatePath("/maintenance");
  redirect(safeReturnPath(parsed.data.redirectTo ?? "/maintenance"));
}

export async function createMaintenancePartAction(
  _state: MaintenanceActionState,
  formData: FormData,
): Promise<MaintenanceActionState> {
  const session = await requireMaintenanceWriteAccess();
  const parsed = partCatalogSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    unit: formData.get("unit"),
    notes: formData.get("notes"),
    redirectTo: formData.get("redirectTo"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data part tidak valid." };
  }

  const db = getDb();
  await db.insert(maintenancePartCatalog).values({
    code: parsed.data.code,
    name: parsed.data.name,
    unit: parsed.data.unit,
    notes: parsed.data.notes ?? "",
    updatedAt: new Date(),
  });

  await writeAuditLog({
    userId: session.user.id,
    action: "maintenance.part.create",
    entityType: "maintenance_part",
    summary: `Menambahkan part maintenance ${parsed.data.code}`,
  });

  revalidatePath("/dashboard");
  revalidatePath("/maintenance");
  redirect(safeReturnPath(parsed.data.redirectTo ?? "/maintenance"));
}

export async function updateMaintenancePartAction(
  _state: MaintenanceActionState,
  formData: FormData,
): Promise<MaintenanceActionState> {
  const session = await requireMaintenanceWriteAccess();
  const parsed = partCatalogSchema.safeParse({
    id: formData.get("id"),
    code: formData.get("code"),
    name: formData.get("name"),
    unit: formData.get("unit"),
    notes: formData.get("notes"),
    redirectTo: formData.get("redirectTo"),
  });

  if (!parsed.success || !parsed.data.id) {
    return { error: parsed.error?.issues[0]?.message ?? "Data part tidak valid." };
  }

  const db = getDb();
  const existing = await db.query.maintenancePartCatalog.findFirst({
    where: eq(maintenancePartCatalog.id, parsed.data.id),
  });

  if (!existing) {
    return { error: "Part tidak ditemukan." };
  }

  await db
    .update(maintenancePartCatalog)
    .set({
      code: parsed.data.code,
      name: parsed.data.name,
      unit: parsed.data.unit,
      notes: parsed.data.notes ?? "",
      updatedAt: new Date(),
    })
    .where(eq(maintenancePartCatalog.id, parsed.data.id));

  await writeAuditLog({
    userId: session.user.id,
    action: "maintenance.part.update",
    entityType: "maintenance_part",
    entityId: parsed.data.id,
    summary: `Memperbarui part maintenance ${existing.code}`,
  });

  revalidatePath("/dashboard");
  revalidatePath("/maintenance");
  redirect(safeReturnPath(parsed.data.redirectTo ?? "/maintenance"));
}

export async function deleteMaintenancePartAction(
  _state: MaintenanceActionState,
  formData: FormData,
): Promise<MaintenanceActionState> {
  const session = await requireMaintenanceWriteAccess();
  const parsed = z
    .object({
      id: z.string().uuid("Part tidak valid."),
      redirectTo: z.string().trim().optional(),
    })
    .safeParse({
      id: formData.get("id"),
      redirectTo: formData.get("redirectTo"),
    });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Part tidak valid." };
  }

  const db = getDb();
  const existing = await db.query.maintenancePartCatalog.findFirst({
    where: eq(maintenancePartCatalog.id, parsed.data.id),
  });

  if (!existing) {
    return { error: "Part tidak ditemukan." };
  }

  await db.delete(maintenancePartCatalog).where(eq(maintenancePartCatalog.id, parsed.data.id));

  await writeAuditLog({
    userId: session.user.id,
    action: "maintenance.part.delete",
    entityType: "maintenance_part",
    entityId: parsed.data.id,
    summary: `Menghapus part maintenance ${existing.code}`,
  });

  revalidatePath("/dashboard");
  revalidatePath("/maintenance");
  redirect(safeReturnPath(parsed.data.redirectTo ?? "/maintenance"));
}

export async function addMaintenancePartUsageAction(
  _state: MaintenanceActionState,
  formData: FormData,
): Promise<MaintenanceActionState> {
  const session = await requireMaintenanceWriteAccess();
  const parsed = partUsageSchema.safeParse({
    ticketId: formData.get("ticketId"),
    partId: formData.get("partId"),
    partNameSnapshot: formData.get("partNameSnapshot"),
    quantity: formData.get("quantity"),
    unitCost: formData.get("unitCost"),
    note: formData.get("note"),
    redirectTo: formData.get("redirectTo"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data part usage tidak valid." };
  }

  const db = getDb();
  const ticket = await db.query.maintenanceTickets.findFirst({
    where: eq(maintenanceTickets.id, parsed.data.ticketId),
  });
  if (!ticket) {
    return { error: "Ticket tidak ditemukan." };
  }

  await db.insert(maintenancePartUsages).values({
    ticketId: parsed.data.ticketId,
    partId: parsed.data.partId ?? null,
    partNameSnapshot: parsed.data.partNameSnapshot,
    quantity: parsed.data.quantity,
    unitCost: parsed.data.unitCost,
    note: parsed.data.note ?? "",
    createdByUserId: session.user.id,
  });

  await db
    .update(maintenanceTickets)
    .set({
      actualCost: ticket.actualCost + parsed.data.quantity * parsed.data.unitCost,
      status: ticket.status === "open" ? "in_progress" : ticket.status,
      updatedAt: new Date(),
    })
    .where(eq(maintenanceTickets.id, parsed.data.ticketId));

  await writeAuditLog({
    userId: session.user.id,
    action: "maintenance.part_usage.create",
    entityType: "maintenance_ticket",
    entityId: parsed.data.ticketId,
    summary: `Menambah pemakaian part pada ${ticket.ticketNumber}`,
    metadata: {
      partNameSnapshot: parsed.data.partNameSnapshot,
      quantity: parsed.data.quantity,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/maintenance");
  redirect(safeReturnPath(parsed.data.redirectTo ?? `/maintenance?ticket=${parsed.data.ticketId}`));
}
