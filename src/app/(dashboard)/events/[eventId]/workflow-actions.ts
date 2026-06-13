"use server";

import { and, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getDb } from "@/db";
import {
  equipment,
  equipmentStatusLogs,
  eventChecklists,
  eventChecklistItems,
  eventEquipment,
  eventPackingListItems,
  eventPackingLists,
  events,
  maintenanceTickets,
} from "@/db/schema";
import { getCurrentAuthSession, writeAuditLog } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";

export type EventWorkflowActionState = {
  error?: string;
};

const optionalText = z.preprocess((value) => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.string().trim().optional());

const optionalChecklistStage = z.preprocess(
  (value) => (value === "loading" || value === "return" ? value : undefined),
  z.enum(["loading", "return"]).optional(),
);

const workflowSchema = z.object({
  eventId: z.string().uuid("Event tidak valid."),
  equipmentCode: optionalText,
  mode: z.enum(["loading", "return"]),
  damaged: z.preprocess(
    (value) => {
      if (value === undefined || value === null || value === "") {
        return undefined;
      }

      return value === "on" || value === "true" || value === true;
    },
    z.boolean().optional(),
  ),
  damageNote: optionalText,
  checklistStage: optionalChecklistStage,
  redirectTo: z.string().trim().optional(),
});

const checklistToggleSchema = z.object({
  eventId: z.string().uuid("Event tidak valid."),
  checklistId: z.string().uuid("Checklist tidak valid."),
  checklistItemId: z.string().uuid("Item checklist tidak valid."),
  redirectTo: z.string().trim().optional(),
});

function checklistStageItemsFromPackingList(items: Array<{
  equipmentCode: string;
  equipmentName: string;
  equipmentSerialNumber: string | null;
  equipmentCategoryName: string | null;
  equipmentLocationLabel: string | null;
}>) {
  return items.map((item, index) => ({
    label: `${index + 1}. ${item.equipmentCode} - ${item.equipmentName}`,
    itemType: "pack" as const,
    sortOrder: index + 1,
    isRequired: 1,
    status: "pending",
    note:
      [
        item.equipmentCategoryName,
        item.equipmentLocationLabel,
        item.equipmentSerialNumber ? `SN ${item.equipmentSerialNumber}` : null,
      ]
        .filter(Boolean)
        .join(" · ") || "",
    metadata: {
      source: "packing_list",
      equipmentCode: item.equipmentCode,
      equipmentName: item.equipmentName,
    },
    updatedAt: new Date(),
  }));
}

async function requireEventWriteAccess() {
  const session = await getCurrentAuthSession();
  if (!session) {
    redirect("/login");
  }

  if (!hasPermission(session, "events.write")) {
    redirect("/akses-ditolak");
  }

  return session;
}

function safeReturnPath(path?: string) {
  if (path && path.startsWith("/")) {
    return path;
  }

  return "/events";
}

function makeTicketNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const tail = String(now.getTime()).slice(-5);
  return `MT-${year}${month}-${tail}`;
}

async function seedChecklistStage(eventId: string, stage: "loading" | "return", userId: string) {
  const db = getDb();
  const existing = await db.query.eventChecklists.findFirst({
    where: and(eq(eventChecklists.eventId, eventId), eq(eventChecklists.stage, stage)),
  });

  if (existing) {
    return existing.id;
  }

  const [checklistRow] = await db
    .insert(eventChecklists)
    .values({
      eventId,
      stage,
      status: "draft",
      note:
        stage === "loading"
          ? "Checklist untuk serah terima ke loading team."
          : "Checklist untuk return dan penerimaan balik.",
      metadata: {
        createdByUserId: userId,
      },
      updatedAt: new Date(),
    })
    .returning({ id: eventChecklists.id });

  const defaultItems =
    stage === "loading"
      ? [
          { label: "Booking sesuai daftar", required: 1 },
          { label: "Aksesoris lengkap", required: 1 },
          { label: "Kondisi fisik aman", required: 1 },
          { label: "QR terbaca", required: 1 },
          { label: "PIC loading konfirmasi", required: 0 },
        ]
      : [
          { label: "Barang kembali lengkap", required: 1 },
          { label: "Kondisi fisik dicek", required: 1 },
          { label: "Kerusakan dicatat", required: 1 },
          { label: "Foto bukti return", required: 0 },
          { label: "PIC warehouse konfirmasi", required: 0 },
        ];

  await db.insert(eventChecklistItems).values(
    defaultItems.map((item, index) => ({
      checklistId: checklistRow.id,
      label: item.label,
      itemType: "check",
      sortOrder: index + 1,
      isRequired: item.required,
      status: "pending",
      note: "",
      metadata: {},
      updatedAt: new Date(),
    })),
  );

  return checklistRow.id;
}

async function refreshChecklistProgress(checklistId: string, userId: string) {
  const db = getDb();
  const checklist = await db.query.eventChecklists.findFirst({
    where: eq(eventChecklists.id, checklistId),
  });

  if (!checklist) {
    return { ok: false as const, error: "Checklist tidak ditemukan." };
  }

  const items = await db
    .select({ status: eventChecklistItems.status })
    .from(eventChecklistItems)
    .where(eq(eventChecklistItems.checklistId, checklistId));

  const totalCount = items.length;
  const completedCount = items.filter((item) => item.status === "completed").length;
  const nextStatus =
    totalCount === 0 ? "draft" : completedCount === 0 ? "draft" : completedCount === totalCount ? "done" : "in_progress";
  const now = new Date();

  await db
    .update(eventChecklists)
    .set({
      status: nextStatus,
      checkedByUserId: nextStatus === "done" ? userId : checklist.checkedByUserId,
      checkedAt: nextStatus === "done" ? now : checklist.checkedAt,
      updatedAt: now,
    })
    .where(eq(eventChecklists.id, checklistId));

  return { ok: true as const, status: nextStatus };
}

async function syncLoadingChecklistFromPackingList(eventId: string, userId: string) {
  const db = getDb();
  const packingList = await db.query.eventPackingLists.findFirst({
    where: eq(eventPackingLists.eventId, eventId),
  });

  if (!packingList) {
    return { ok: false as const, error: "Packing list harus dibuat terlebih dahulu sebelum checklist loading." };
  }

  const packingItems = await db
    .select({
      equipmentName: eventPackingListItems.equipmentName,
      equipmentCode: eventPackingListItems.equipmentCode,
      equipmentSerialNumber: eventPackingListItems.equipmentSerialNumber,
      equipmentCategoryName: eventPackingListItems.equipmentCategoryName,
      equipmentLocationLabel: eventPackingListItems.equipmentLocationLabel,
    })
    .from(eventPackingListItems)
    .where(eq(eventPackingListItems.packingListId, packingList.id))
    .orderBy(eventPackingListItems.sortOrder);

  const loadingChecklistId = await seedChecklistStage(eventId, "loading", userId);
  const returnChecklistId = await seedChecklistStage(eventId, "return", userId);

  await db.delete(eventChecklistItems).where(eq(eventChecklistItems.checklistId, loadingChecklistId));

  const loadingItems = [
    ...checklistStageItemsFromPackingList(packingItems),
    {
      checklistId: loadingChecklistId,
      label: "PIC loading konfirmasi",
      itemType: "check",
      sortOrder: packingItems.length + 1,
      isRequired: 0,
      status: "pending",
      note: "Konfirmasi akhir sebelum barang keluar.",
      metadata: {
        source: "packing_list",
      },
      updatedAt: new Date(),
    },
  ];

  if (loadingItems.length > 0) {
    await db.insert(eventChecklistItems).values(
      loadingItems.map((item) => ({
        checklistId: loadingChecklistId,
        label: item.label,
        itemType: item.itemType,
        sortOrder: item.sortOrder,
        isRequired: item.isRequired,
        status: item.status,
        note: item.note,
        metadata: item.metadata,
        updatedAt: item.updatedAt,
      })),
    );
  }

  await db.delete(eventChecklistItems).where(eq(eventChecklistItems.checklistId, returnChecklistId));
  await db.insert(eventChecklistItems).values([
    {
      checklistId: returnChecklistId,
      label: "Barang kembali lengkap",
      itemType: "check",
      sortOrder: 1,
      isRequired: 1,
      status: "pending",
      note: "",
      metadata: { source: "return_checklist" },
      updatedAt: new Date(),
    },
    {
      checklistId: returnChecklistId,
      label: "Kondisi fisik dicek",
      itemType: "check",
      sortOrder: 2,
      isRequired: 1,
      status: "pending",
      note: "",
      metadata: { source: "return_checklist" },
      updatedAt: new Date(),
    },
    {
      checklistId: returnChecklistId,
      label: "Kerusakan dicatat",
      itemType: "check",
      sortOrder: 3,
      isRequired: 1,
      status: "pending",
      note: "",
      metadata: { source: "return_checklist" },
      updatedAt: new Date(),
    },
    {
      checklistId: returnChecklistId,
      label: "Foto bukti return",
      itemType: "check",
      sortOrder: 4,
      isRequired: 0,
      status: "pending",
      note: "",
      metadata: { source: "return_checklist" },
      updatedAt: new Date(),
    },
    {
      checklistId: returnChecklistId,
      label: "PIC warehouse konfirmasi",
      itemType: "check",
      sortOrder: 5,
      isRequired: 0,
      status: "pending",
      note: "",
      metadata: { source: "return_checklist" },
      updatedAt: new Date(),
    },
  ]);

  await db
    .update(eventChecklists)
    .set({
      note: "Checklist loading diturunkan dari packing list aktif.",
      metadata: {
        generatedFromPackingListId: packingList.id,
        generatedByUserId: userId,
      },
      status: "in_progress",
      updatedAt: new Date(),
    })
    .where(eq(eventChecklists.id, loadingChecklistId));

  await db
    .update(eventChecklists)
    .set({
      note: "Checklist return untuk verifikasi barang setelah event.",
      metadata: {
        generatedByUserId: userId,
      },
      status: "draft",
      updatedAt: new Date(),
    })
    .where(eq(eventChecklists.id, returnChecklistId));

  return { ok: true as const, packingListId: packingList.id };
}

export async function toggleEventChecklistItemAction(
  _state: EventWorkflowActionState,
  formData: FormData,
): Promise<EventWorkflowActionState> {
  const session = await requireEventWriteAccess();
  const parsed = checklistToggleSchema.safeParse({
    eventId: formData.get("eventId"),
    checklistId: formData.get("checklistId"),
    checklistItemId: formData.get("checklistItemId"),
    redirectTo: formData.get("redirectTo"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data checklist tidak valid." };
  }

  const db = getDb();
  const checklist = await db.query.eventChecklists.findFirst({
    where: eq(eventChecklists.id, parsed.data.checklistId),
  });
  if (!checklist || checklist.eventId !== parsed.data.eventId) {
    return { error: "Checklist tidak ditemukan." };
  }

  const checklistItem = await db.query.eventChecklistItems.findFirst({
    where: eq(eventChecklistItems.id, parsed.data.checklistItemId),
  });
  if (!checklistItem || checklistItem.checklistId !== checklist.id) {
    return { error: "Item checklist tidak ditemukan." };
  }

  const now = new Date();
  const nextStatus = checklistItem.status === "completed" ? "pending" : "completed";
  const currentMetadata =
    checklistItem.metadata && typeof checklistItem.metadata === "object" && !Array.isArray(checklistItem.metadata)
      ? (checklistItem.metadata as Record<string, unknown>)
      : {};

  await db
    .update(eventChecklistItems)
    .set({
      status: nextStatus,
      metadata: {
        ...currentMetadata,
        checkedByUserId: session.user.id,
        checkedAt: now.toISOString(),
        executionSource: "manual_toggle",
      },
      updatedAt: now,
    })
    .where(eq(eventChecklistItems.id, checklistItem.id));

  const progress = await refreshChecklistProgress(checklist.id, session.user.id);
  if (!progress.ok) {
    return { error: progress.error };
  }

  await writeAuditLog({
    userId: session.user.id,
    action: "events.checklists.toggle_item",
    entityType: "event_checklist_item",
    entityId: checklistItem.id,
    summary: `${nextStatus === "completed" ? "Selesaikan" : "Buka kembali"} item checklist ${checklistItem.label}`,
    metadata: {
      eventId: parsed.data.eventId,
      checklistId: checklist.id,
      checklistItemId: checklistItem.id,
      status: nextStatus,
    },
  });

  redirect(safeReturnPath(parsed.data.redirectTo ?? `/events/${parsed.data.eventId}?tab=checklist`));
}

export async function generateEventChecklistsAction(
  _state: EventWorkflowActionState,
  formData: FormData,
): Promise<EventWorkflowActionState> {
  const session = await requireEventWriteAccess();
  const parsed = workflowSchema.safeParse({
    eventId: formData.get("eventId"),
    mode: formData.get("mode"),
    damaged: formData.get("damaged"),
    damageNote: formData.get("damageNote"),
    checklistStage: formData.get("checklistStage"),
    redirectTo: formData.get("redirectTo"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data checklist tidak valid." };
  }

  const syncResult = await syncLoadingChecklistFromPackingList(parsed.data.eventId, session.user.id);
  if (!syncResult.ok) {
    return { error: syncResult.error };
  }

  await writeAuditLog({
    userId: session.user.id,
    action: "events.checklists.generate",
    entityType: "event",
    entityId: parsed.data.eventId,
    summary: `Generate checklist event ${parsed.data.eventId}`,
    metadata: {
      stage: parsed.data.checklistStage ?? "loading",
      packingListId: syncResult.packingListId,
    },
  });

  redirect(safeReturnPath(parsed.data.redirectTo ?? `/events/${parsed.data.eventId}?tab=checklist`));
}

export async function recordEventWorkflowScanAction(
  _state: EventWorkflowActionState,
  formData: FormData,
): Promise<EventWorkflowActionState> {
  const session = await requireEventWriteAccess();
  const parsed = workflowSchema.safeParse({
    eventId: formData.get("eventId"),
    equipmentCode: formData.get("equipmentCode"),
    mode: formData.get("mode"),
    damaged: formData.get("damaged"),
    damageNote: formData.get("damageNote"),
    checklistStage: formData.get("checklistStage"),
    redirectTo: formData.get("redirectTo"),
  });

  if (!parsed.success || !parsed.data.equipmentCode) {
    return { error: parsed.error?.issues[0]?.message ?? "Kode equipment wajib diisi." };
  }

  const db = getDb();
  const eventRow = await db.query.events.findFirst({
    where: eq(events.id, parsed.data.eventId),
  });
  if (!eventRow) {
    return { error: "Event tidak ditemukan." };
  }

  const equipmentRow = await db.query.equipment.findFirst({
    where: eq(equipment.code, parsed.data.equipmentCode),
  });
  if (!equipmentRow) {
    return { error: "Equipment tidak ditemukan." };
  }

  const bookingRow = await db.query.eventEquipment.findFirst({
    where: and(eq(eventEquipment.eventId, parsed.data.eventId), eq(eventEquipment.equipmentId, equipmentRow.id)),
  });
  if (!bookingRow || bookingRow.bookingStatus === "cancelled") {
    return { error: "Equipment ini belum dibooking ke event tersebut." };
  }

  const now = new Date();
  if (parsed.data.mode === "loading") {
    await db
      .update(eventEquipment)
      .set({
        bookingStatus: "confirmed",
        packingStatus: "packed",
        loadingStatus: "loaded",
        checkedOutAt: bookingRow.checkedOutAt ?? now,
        updatedAt: now,
      })
      .where(eq(eventEquipment.id, bookingRow.id));

    await db
      .update(equipment)
      .set({
        status: "in_use",
        lastStatusChangeAt: now,
        updatedAt: now,
      })
      .where(eq(equipment.id, equipmentRow.id));

    await db.insert(equipmentStatusLogs).values({
      equipmentId: equipmentRow.id,
      status: "in_use",
      note: `Loading scan event ${eventRow.eventNumber}`,
      changedByUserId: session.user.id,
      createdAt: now,
    });

    await db
      .update(events)
      .set({
        status: eventRow.status === "draft" ? "booked" : "loading",
        updatedAt: now,
      })
      .where(eq(events.id, eventRow.id));

    const syncResult = await syncLoadingChecklistFromPackingList(eventRow.id, session.user.id);
    if (!syncResult.ok) {
      return { error: syncResult.error };
    }

    await writeAuditLog({
      userId: session.user.id,
      action: "events.scan.loading",
      entityType: "event_equipment",
      entityId: bookingRow.id,
      summary: `Scan loading ${equipmentRow.code} pada event ${eventRow.eventNumber}`,
      metadata: {
        eventId: eventRow.id,
        equipmentId: equipmentRow.id,
        packingListId: syncResult.packingListId,
      },
    });
  } else {
    const damaged = parsed.data.damaged ?? false;
    const returnStatus = damaged ? "damaged" : "returned";

    await db
      .update(eventEquipment)
      .set({
        bookingStatus: "completed",
        loadingStatus: "returned",
        returnStatus,
        returnedAt: now,
        updatedAt: now,
      })
      .where(eq(eventEquipment.id, bookingRow.id));

    const nextEquipmentStatus = damaged ? "maintenance" : "ready";
    await db
      .update(equipment)
      .set({
        status: nextEquipmentStatus,
        lastStatusChangeAt: now,
        updatedAt: now,
      })
      .where(eq(equipment.id, equipmentRow.id));

    await db.insert(equipmentStatusLogs).values({
      equipmentId: equipmentRow.id,
      status: nextEquipmentStatus,
      note: damaged
        ? `Return rusak dari event ${eventRow.eventNumber}`
        : `Return selesai dari event ${eventRow.eventNumber}`,
      changedByUserId: session.user.id,
      createdAt: now,
    });

    if (damaged) {
      await db.insert(maintenanceTickets).values({
        ticketNumber: makeTicketNumber(),
        equipmentId: equipmentRow.id,
        subject: `Return rusak dari event ${eventRow.eventNumber}`,
        complaint: parsed.data.damageNote ?? "Equipment kembali dalam kondisi rusak setelah event.",
        diagnosis: "",
        actionPlan: "",
        status: "open",
        priority: "high",
        openedByUserId: session.user.id,
        openedAt: now,
        estimatedCost: 0,
        actualCost: 0,
        metadata: {
          eventId: eventRow.id,
          eventNumber: eventRow.eventNumber,
          source: "event_return_scan",
        },
        updatedAt: now,
      });
    }

    const remainingOpenItems = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(eventEquipment)
      .where(and(eq(eventEquipment.eventId, eventRow.id), eq(eventEquipment.returnStatus, "pending")));

    if ((remainingOpenItems[0]?.count ?? 0) === 0) {
      await db
        .update(events)
        .set({
          status: "returned",
          updatedAt: now,
        })
        .where(eq(events.id, eventRow.id));
    }

    await writeAuditLog({
      userId: session.user.id,
      action: "events.scan.return",
      entityType: "event_equipment",
      entityId: bookingRow.id,
      summary: `Scan return ${equipmentRow.code} pada event ${eventRow.eventNumber}`,
      metadata: {
        eventId: eventRow.id,
        equipmentId: equipmentRow.id,
        damaged,
        damageNote: parsed.data.damageNote ?? "",
      },
    });
  }

  redirect(safeReturnPath(parsed.data.redirectTo ?? `/events/${parsed.data.eventId}?tab=operasional`));
}
