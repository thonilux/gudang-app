"use server";

import { and, eq, ne } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getDb } from "@/db";
import { equipment, eventEquipment, events } from "@/db/schema";
import { getCurrentAuthSession, writeAuditLog } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";

export type EventBookingActionState = {
  error?: string;
};

const optionalText = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.string().trim().optional());

const bookingSchema = z.object({
  eventId: z.string().uuid("Event tidak valid."),
  equipmentId: z.string().uuid("Equipment tidak valid."),
  note: optionalText,
  redirectTo: z.string().trim().optional(),
});

function safeReturnPath(path?: string) {
  if (path && path.startsWith("/")) {
    return path;
  }

  return "/events";
}

function overlaps(
  leftStart: Date | null,
  leftEnd: Date | null,
  rightStart: Date | null,
  rightEnd: Date | null,
) {
  if (!leftStart || !leftEnd || !rightStart || !rightEnd) {
    return true;
  }

  return leftStart <= rightEnd && leftEnd >= rightStart;
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

export async function bookEventEquipmentAction(
  _state: EventBookingActionState,
  formData: FormData,
): Promise<EventBookingActionState> {
  const session = await requireEventWriteAccess();
  const parsed = bookingSchema.safeParse({
    eventId: formData.get("eventId"),
    equipmentId: formData.get("equipmentId"),
    note: formData.get("note"),
    redirectTo: formData.get("redirectTo"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data booking tidak valid." };
  }

  const db = getDb();
  const eventRow = await db.query.events.findFirst({
    where: eq(events.id, parsed.data.eventId),
  });

  if (!eventRow) {
    return { error: "Event tidak ditemukan." };
  }

  if (!eventRow.startAt || !eventRow.endAt) {
    return { error: "Jadwal event harus diisi sebelum booking equipment." };
  }

  const equipmentRow = await db.query.equipment.findFirst({
    where: eq(equipment.id, parsed.data.equipmentId),
  });

  if (!equipmentRow) {
    return { error: "Equipment tidak ditemukan." };
  }

  if (equipmentRow.status !== "ready") {
    return { error: "Equipment harus berstatus siap pakai untuk dibooking." };
  }

  const existingForEvent = await db.query.eventEquipment.findFirst({
    where: and(eq(eventEquipment.eventId, parsed.data.eventId), eq(eventEquipment.equipmentId, parsed.data.equipmentId)),
  });

  if (existingForEvent && existingForEvent.bookingStatus !== "cancelled") {
    return { error: "Equipment ini sudah ada di booking event tersebut." };
  }

  const conflictRows = await db
    .select({
      eventId: eventEquipment.eventId,
      bookingStatus: eventEquipment.bookingStatus,
      eventStatus: events.status,
      startAt: events.startAt,
      endAt: events.endAt,
      eventNumber: events.eventNumber,
    })
    .from(eventEquipment)
    .innerJoin(events, eq(eventEquipment.eventId, events.id))
    .where(and(eq(eventEquipment.equipmentId, parsed.data.equipmentId), ne(eventEquipment.eventId, parsed.data.eventId)));

  const conflict = conflictRows.find(
    (row) =>
      row.bookingStatus !== "cancelled" &&
      row.eventStatus !== "cancelled" &&
      overlaps(row.startAt, row.endAt, eventRow.startAt, eventRow.endAt),
  );

  if (conflict) {
    return {
      error: `Equipment sedang dipakai di event lain (${conflict.eventNumber}).`,
    };
  }

  const bookingPayload = {
    bookingStatus: "reserved",
    packingStatus: "pending",
    loadingStatus: "pending",
    returnStatus: "pending",
    note: parsed.data.note ?? "",
    metadata: {
      bookedByUserId: session.user.id,
    },
    updatedAt: new Date(),
  };

  const [row] = existingForEvent
    ? await db
        .update(eventEquipment)
        .set(bookingPayload)
        .where(eq(eventEquipment.id, existingForEvent.id))
        .returning({ id: eventEquipment.id })
    : await db
        .insert(eventEquipment)
        .values({
          eventId: parsed.data.eventId,
          equipmentId: parsed.data.equipmentId,
          ...bookingPayload,
        })
        .returning({ id: eventEquipment.id });

  await writeAuditLog({
    userId: session.user.id,
    action: "events.booking.create",
    entityType: "event_equipment",
    entityId: row.id,
    summary: `Membooking ${equipmentRow.code} ke event ${eventRow.eventNumber}`,
    metadata: {
      eventId: parsed.data.eventId,
      equipmentId: parsed.data.equipmentId,
      note: parsed.data.note ?? "",
    },
  });

  redirect(safeReturnPath(parsed.data.redirectTo ?? `/events/${parsed.data.eventId}?tab=booking`));
}

export async function cancelEventEquipmentBookingAction(formData: FormData): Promise<void> {
  const session = await requireEventWriteAccess();
  const parsed = z
    .object({
      eventEquipmentId: z.string().uuid("Booking tidak valid."),
      eventId: z.string().uuid("Event tidak valid."),
      redirectTo: z.string().trim().optional(),
    })
    .safeParse({
      eventEquipmentId: formData.get("eventEquipmentId"),
      eventId: formData.get("eventId"),
      redirectTo: formData.get("redirectTo"),
    });

  if (!parsed.success) {
    redirect("/events");
  }

  const db = getDb();
  const bookingRow = await db.query.eventEquipment.findFirst({
    where: eq(eventEquipment.id, parsed.data.eventEquipmentId),
  });

  if (!bookingRow || bookingRow.eventId !== parsed.data.eventId) {
    redirect(safeReturnPath(`/events/${parsed.data.eventId}?tab=booking`));
  }

  await db
    .update(eventEquipment)
    .set({
      bookingStatus: "cancelled",
      packingStatus: "cancelled",
      loadingStatus: "cancelled",
      returnStatus: "cancelled",
      updatedAt: new Date(),
    })
    .where(eq(eventEquipment.id, parsed.data.eventEquipmentId));

  await writeAuditLog({
    userId: session.user.id,
    action: "events.booking.cancel",
    entityType: "event_equipment",
    entityId: parsed.data.eventEquipmentId,
    summary: `Membatalkan booking equipment pada event ${parsed.data.eventId}`,
    metadata: {
      eventId: parsed.data.eventId,
      equipmentId: bookingRow.equipmentId,
    },
  });

  redirect(safeReturnPath(parsed.data.redirectTo ?? `/events/${parsed.data.eventId}?tab=booking`));
}
