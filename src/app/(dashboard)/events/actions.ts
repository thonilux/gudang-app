"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db";
import { events } from "@/db/schema";
import { getCurrentAuthSession, writeAuditLog } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";

export type EventActionState = {
  error?: string;
};

const optionalText = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.string().trim().optional());

const eventSchema = z.object({
  id: optionalText,
  name: z.string().trim().min(1, "Nama event wajib diisi."),
  clientName: optionalText,
  venueName: optionalText,
  status: z.enum(["draft", "booked", "loading", "returned", "cancelled"]).default("draft"),
  startDate: optionalText,
  startTime: optionalText,
  endDate: optionalText,
  endTime: optionalText,
  notes: optionalText,
  redirectTo: z.string().trim().optional(),
});

function combineDateTime(date?: string | null, time?: string | null) {
  if (!date || !time) {
    return null;
  }

  const normalized = `${date}T${time}`;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
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

function makeEventNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const tail = String(now.getTime()).slice(-5);
  return `EV-${year}${month}-${tail}`;
}

export async function createEventAction(
  _state: EventActionState,
  formData: FormData,
): Promise<EventActionState> {
  const session = await requireEventWriteAccess();
  const parsed = eventSchema.safeParse({
    name: formData.get("name"),
    clientName: formData.get("clientName"),
    venueName: formData.get("venueName"),
    status: formData.get("status"),
    startDate: formData.get("startDate"),
    startTime: formData.get("startTime"),
    endDate: formData.get("endDate"),
    endTime: formData.get("endTime"),
    notes: formData.get("notes"),
    redirectTo: formData.get("redirectTo"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data event tidak valid." };
  }

  const db = getDb();
  const [row] = await db
    .insert(events)
    .values({
      eventNumber: makeEventNumber(),
      name: parsed.data.name,
      clientName: parsed.data.clientName ?? "",
      venueName: parsed.data.venueName ?? "",
      status: parsed.data.status,
      startAt: combineDateTime(parsed.data.startDate, parsed.data.startTime),
      endAt: combineDateTime(parsed.data.endDate, parsed.data.endTime),
      notes: parsed.data.notes ?? "",
      createdByUserId: session.user.id,
      updatedAt: new Date(),
    })
    .returning({ id: events.id, eventNumber: events.eventNumber });

  await writeAuditLog({
    userId: session.user.id,
    action: "events.create",
    entityType: "event",
    entityId: row.id,
    summary: `Membuat event ${row.eventNumber}`,
    metadata: {
      name: parsed.data.name,
      clientName: parsed.data.clientName ?? "",
      status: parsed.data.status,
    },
  });

  redirect(safeReturnPath(parsed.data.redirectTo ?? "/events"));
}

export async function updateEventAction(
  _state: EventActionState,
  formData: FormData,
): Promise<EventActionState> {
  const session = await requireEventWriteAccess();
  const parsed = eventSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    clientName: formData.get("clientName"),
    venueName: formData.get("venueName"),
    status: formData.get("status"),
    startDate: formData.get("startDate"),
    startTime: formData.get("startTime"),
    endDate: formData.get("endDate"),
    endTime: formData.get("endTime"),
    notes: formData.get("notes"),
    redirectTo: formData.get("redirectTo"),
  });

  if (!parsed.success || !parsed.data.id) {
    return { error: parsed.error?.issues[0]?.message ?? "Data event tidak valid." };
  }

  const db = getDb();
  const existing = await db.query.events.findFirst({
    where: eq(events.id, parsed.data.id),
  });

  if (!existing) {
    return { error: "Event tidak ditemukan." };
  }

  await db
    .update(events)
    .set({
      name: parsed.data.name,
      clientName: parsed.data.clientName ?? "",
      venueName: parsed.data.venueName ?? "",
      status: parsed.data.status,
      startAt: combineDateTime(parsed.data.startDate, parsed.data.startTime),
      endAt: combineDateTime(parsed.data.endDate, parsed.data.endTime),
      notes: parsed.data.notes ?? "",
      updatedAt: new Date(),
    })
    .where(eq(events.id, parsed.data.id));

  await writeAuditLog({
    userId: session.user.id,
    action: "events.update",
    entityType: "event",
    entityId: parsed.data.id,
    summary: `Memperbarui event ${existing.eventNumber}`,
    metadata: {
      name: parsed.data.name,
      clientName: parsed.data.clientName ?? "",
      status: parsed.data.status,
    },
  });

  redirect(safeReturnPath(parsed.data.redirectTo ?? "/events"));
}
