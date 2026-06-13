"use server";

import { and, asc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getDb } from "@/db";
import {
  equipment,
  equipmentCategories,
  equipmentLocations,
  eventEquipment,
  eventPackingListItems,
  eventPackingLists,
  events,
} from "@/db/schema";
import { getCurrentAuthSession, writeAuditLog } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";

export type EventPackingActionState = {
  error?: string;
};

const optionalText = z.preprocess((value) => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.string().trim().optional());

const packingSchema = z.object({
  eventId: z.string().uuid("Event tidak valid."),
  note: optionalText,
  redirectTo: z.string().trim().optional(),
});

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

export async function generateEventPackingListAction(
  _state: EventPackingActionState,
  formData: FormData,
): Promise<EventPackingActionState> {
  const session = await requireEventWriteAccess();
  const parsed = packingSchema.safeParse({
    eventId: formData.get("eventId"),
    note: formData.get("note"),
    redirectTo: formData.get("redirectTo"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data packing list tidak valid." };
  }

  const db = getDb();
  const eventRow = await db.query.events.findFirst({
    where: eq(events.id, parsed.data.eventId),
  });

  if (!eventRow) {
    return { error: "Event tidak ditemukan." };
  }

  const bookingRows = await db
    .select({
      id: eventEquipment.id,
      equipmentId: eventEquipment.equipmentId,
      eventId: eventEquipment.eventId,
      bookingStatus: eventEquipment.bookingStatus,
      packingStatus: eventEquipment.packingStatus,
      note: eventEquipment.note,
      equipmentCode: equipment.code,
      equipmentName: equipment.name,
      equipmentCategoryName: equipmentCategories.name,
      equipmentLocationCode: equipmentLocations.code,
      equipmentLocationName: equipmentLocations.name,
      equipmentBrand: equipment.brand,
      equipmentModel: equipment.model,
      equipmentSerialNumber: equipment.serialNumber,
    })
    .from(eventEquipment)
    .innerJoin(equipment, eq(eventEquipment.equipmentId, equipment.id))
    .leftJoin(equipmentCategories, eq(equipment.categoryId, equipmentCategories.id))
    .leftJoin(equipmentLocations, eq(equipment.locationId, equipmentLocations.id))
    .where(and(eq(eventEquipment.eventId, parsed.data.eventId), eq(eventEquipment.bookingStatus, "reserved")))
    .orderBy(asc(eventEquipment.createdAt));

  if (bookingRows.length === 0) {
    return { error: "Belum ada booking aktif untuk dibuat packing list." };
  }

  const existingPackingList = await db.query.eventPackingLists.findFirst({
    where: eq(eventPackingLists.eventId, parsed.data.eventId),
  });

  const now = new Date();
  const note = parsed.data.note ?? `Packing list event ${eventRow.eventNumber}`;
  const packingListRow = existingPackingList
    ? await db
        .update(eventPackingLists)
        .set({
          status: "generated",
          generatedByUserId: session.user.id,
          generatedAt: now,
          note,
          metadata: {
            source: "events.packing.generate",
            bookingCount: bookingRows.length,
          },
          updatedAt: now,
        })
        .where(eq(eventPackingLists.id, existingPackingList.id))
        .returning({ id: eventPackingLists.id })
        .then((rows) => rows[0] ?? existingPackingList)
    : (
        await db
          .insert(eventPackingLists)
          .values({
            eventId: parsed.data.eventId,
            status: "generated",
            generatedByUserId: session.user.id,
            generatedAt: now,
            note,
            metadata: {
              source: "events.packing.generate",
              bookingCount: bookingRows.length,
            },
            updatedAt: now,
          })
          .returning({ id: eventPackingLists.id })
      )[0];

  await db.delete(eventPackingListItems).where(eq(eventPackingListItems.packingListId, packingListRow.id));

  await db.insert(eventPackingListItems).values(
    bookingRows.map((row, index) => ({
      packingListId: packingListRow.id,
      eventEquipmentId: row.id,
      equipmentId: row.equipmentId,
      equipmentCode: row.equipmentCode,
      equipmentName: row.equipmentName,
      equipmentCategoryName: row.equipmentCategoryName ?? null,
      equipmentLocationLabel:
        row.equipmentLocationCode || row.equipmentLocationName
          ? [row.equipmentLocationCode, row.equipmentLocationName].filter(Boolean).join(" - ")
          : null,
      equipmentBrand: row.equipmentBrand ?? "",
      equipmentModel: row.equipmentModel ?? "",
      equipmentSerialNumber: row.equipmentSerialNumber ?? null,
      note: row.note || "",
      sortOrder: index + 1,
      status: "pending",
      metadata: {
        source: "events.packing.generate",
        bookingStatus: row.bookingStatus,
      },
      updatedAt: now,
    })),
  );

  await db
    .update(eventEquipment)
    .set({
      packingStatus: "generated",
      updatedAt: now,
    })
    .where(and(eq(eventEquipment.eventId, parsed.data.eventId), eq(eventEquipment.bookingStatus, "reserved")));

  await writeAuditLog({
    userId: session.user.id,
    action: "events.packing.generate",
    entityType: "event_packing_list",
    entityId: packingListRow.id,
    summary: `Generate packing list event ${eventRow.eventNumber}`,
    metadata: {
      eventId: parsed.data.eventId,
      itemCount: bookingRows.length,
      note,
    },
  });

  redirect(safeReturnPath(parsed.data.redirectTo ?? `/events/${parsed.data.eventId}?tab=packing`));
}
