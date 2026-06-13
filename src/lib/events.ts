import "server-only";

import { asc, desc, eq, inArray, sql } from "drizzle-orm";

import { getDb } from "@/db";
import {
  equipment,
  equipmentCategories,
  equipmentLocations,
  eventChecklists,
  eventChecklistItems,
  eventEquipment,
  eventPackingListItems,
  eventPackingLists,
  events,
} from "@/db/schema";

export type EventListItem = {
  id: string;
  eventNumber: string;
  name: string;
  clientName: string;
  venueName: string;
  status: string;
  startAt: Date | null;
  endAt: Date | null;
  notes: string;
  equipmentCount: number;
  bookingCount: number;
  loadingCount: number;
  returnCount: number;
};

export type EventOverview = {
  stats: {
    draftCount: number;
    bookedCount: number;
    loadingCount: number;
    returnedCount: number;
    totalCount: number;
  };
  events: EventListItem[];
};

export type EventEquipmentItem = {
  id: string;
  equipmentId: string;
  equipmentCode: string;
  equipmentName: string;
  equipmentCategoryName: string | null;
  equipmentLocationLabel: string | null;
  equipmentBrand: string;
  equipmentModel: string;
  equipmentSerialNumber: string | null;
  equipmentStatus: string | null;
  bookingStatus: string;
  packingStatus: string;
  loadingStatus: string;
  returnStatus: string;
  note: string;
  checkedOutAt: Date | null;
  returnedAt: Date | null;
};

export type EventChecklistItem = {
  id: string;
  checklistId: string;
  label: string;
  itemType: string;
  sortOrder: number;
  isRequired: number;
  status: string;
  note: string;
};

export type EventChecklistGroup = {
  id: string;
  stage: string;
  status: string;
  checkedAt: Date | null;
  note: string;
  items: EventChecklistItem[];
};

export type EventPackingListItem = {
  id: string;
  packingListId: string;
  eventEquipmentId: string | null;
  equipmentId: string;
  equipmentCode: string;
  equipmentName: string;
  equipmentCategoryName: string | null;
  equipmentLocationLabel: string | null;
  equipmentBrand: string;
  equipmentModel: string;
  equipmentSerialNumber: string | null;
  note: string;
  sortOrder: number;
  status: string;
  checkedAt: Date | null;
};

export type EventPackingList = {
  id: string;
  eventId: string;
  status: string;
  generatedByUserId: string | null;
  generatedAt: Date | null;
  note: string;
  items: EventPackingListItem[];
};

export type EventDetail = {
  item: EventListItem & {
    approvedByUserId: string | null;
    createdByUserId: string | null;
    metadata: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
  };
  equipmentItems: EventEquipmentItem[];
  checklistGroups: EventChecklistGroup[];
  packingList: EventPackingList | null;
};

function normalizeCount(value: unknown) {
  return typeof value === "number" ? value : 0;
}

export async function getEventOverview(): Promise<EventOverview> {
  const db = getDb();

  const [eventRows, draftCount, bookedCount, loadingCount, returnedCount, totalCount] = await Promise.all([
    db
      .select({
        id: events.id,
        eventNumber: events.eventNumber,
        name: events.name,
        clientName: events.clientName,
        venueName: events.venueName,
        status: events.status,
        startAt: events.startAt,
        endAt: events.endAt,
        notes: events.notes,
      })
      .from(events)
      .orderBy(desc(events.startAt), desc(events.createdAt))
      .limit(10),
    db.select({ count: sql<number>`count(*)::int` }).from(events).where(eq(events.status, "draft")),
    db.select({ count: sql<number>`count(*)::int` }).from(events).where(eq(events.status, "booked")),
    db.select({ count: sql<number>`count(*)::int` }).from(events).where(eq(events.status, "loading")),
    db.select({ count: sql<number>`count(*)::int` }).from(events).where(eq(events.status, "returned")),
    db.select({ count: sql<number>`count(*)::int` }).from(events),
  ]);

  const equipmentCounts = eventRows.length
    ? await db
        .select({
          eventId: eventEquipment.eventId,
          bookingStatus: eventEquipment.bookingStatus,
          loadingStatus: eventEquipment.loadingStatus,
          returnStatus: eventEquipment.returnStatus,
          count: sql<number>`count(*)::int`,
        })
        .from(eventEquipment)
        .where(inArray(eventEquipment.eventId, eventRows.map((row) => row.id)))
        .groupBy(eventEquipment.eventId, eventEquipment.bookingStatus, eventEquipment.loadingStatus, eventEquipment.returnStatus)
    : [];

  const bookingCountByEventId = new Map<string, number>();
  const loadingCountByEventId = new Map<string, number>();
  const returnCountByEventId = new Map<string, number>();
  const equipmentCountByEventId = new Map<string, number>();

  for (const row of equipmentCounts) {
    const currentEquipmentCount = equipmentCountByEventId.get(row.eventId) ?? 0;
    equipmentCountByEventId.set(row.eventId, currentEquipmentCount + normalizeCount(row.count));

    if (row.bookingStatus !== "cancelled") {
      bookingCountByEventId.set(row.eventId, (bookingCountByEventId.get(row.eventId) ?? 0) + normalizeCount(row.count));
    }

    if (row.loadingStatus !== "pending" && row.loadingStatus !== "cancelled") {
      loadingCountByEventId.set(row.eventId, (loadingCountByEventId.get(row.eventId) ?? 0) + normalizeCount(row.count));
    }

    if (row.returnStatus !== "pending" && row.returnStatus !== "cancelled") {
      returnCountByEventId.set(row.eventId, (returnCountByEventId.get(row.eventId) ?? 0) + normalizeCount(row.count));
    }
  }

  return {
    stats: {
      draftCount: normalizeCount(draftCount[0]?.count),
      bookedCount: normalizeCount(bookedCount[0]?.count),
      loadingCount: normalizeCount(loadingCount[0]?.count),
      returnedCount: normalizeCount(returnedCount[0]?.count),
      totalCount: normalizeCount(totalCount[0]?.count),
    },
    events: eventRows.map((row) => ({
      id: row.id,
      eventNumber: row.eventNumber,
      name: row.name,
      clientName: row.clientName,
      venueName: row.venueName,
      status: row.status,
      startAt: row.startAt,
      endAt: row.endAt,
      notes: row.notes,
      equipmentCount: equipmentCountByEventId.get(row.id) ?? 0,
      bookingCount: bookingCountByEventId.get(row.id) ?? 0,
      loadingCount: loadingCountByEventId.get(row.id) ?? 0,
      returnCount: returnCountByEventId.get(row.id) ?? 0,
    })),
  };
}

export async function getEventDetail(eventId: string): Promise<EventDetail | null> {
  const db = getDb();

  const eventRow = await db.query.events.findFirst({
    where: eq(events.id, eventId),
  });

  if (!eventRow) {
    return null;
  }

  const equipmentItems = await db
    .select({
      id: eventEquipment.id,
      equipmentId: eventEquipment.equipmentId,
      equipmentCode: equipment.code,
      equipmentName: equipment.name,
      equipmentCategoryName: equipmentCategories.name,
      equipmentLocationCode: equipmentLocations.code,
      equipmentLocationName: equipmentLocations.name,
      equipmentBrand: equipment.brand,
      equipmentModel: equipment.model,
      equipmentSerialNumber: equipment.serialNumber,
      equipmentStatus: equipment.status,
      bookingStatus: eventEquipment.bookingStatus,
      packingStatus: eventEquipment.packingStatus,
      loadingStatus: eventEquipment.loadingStatus,
      returnStatus: eventEquipment.returnStatus,
      note: eventEquipment.note,
      checkedOutAt: eventEquipment.checkedOutAt,
      returnedAt: eventEquipment.returnedAt,
    })
    .from(eventEquipment)
    .leftJoin(equipment, eq(eventEquipment.equipmentId, equipment.id))
    .leftJoin(equipmentCategories, eq(equipment.categoryId, equipmentCategories.id))
    .leftJoin(equipmentLocations, eq(equipment.locationId, equipmentLocations.id))
    .where(eq(eventEquipment.eventId, eventId))
    .orderBy(desc(eventEquipment.createdAt));

  const checklistGroups = await db
    .select({
      id: eventChecklists.id,
      stage: eventChecklists.stage,
      status: eventChecklists.status,
      checkedAt: eventChecklists.checkedAt,
      note: eventChecklists.note,
    })
    .from(eventChecklists)
    .where(eq(eventChecklists.eventId, eventId))
    .orderBy(desc(eventChecklists.createdAt));

  const checklistItems = checklistGroups.length
    ? await db
        .select({
          id: eventChecklistItems.id,
          checklistId: eventChecklistItems.checklistId,
          label: eventChecklistItems.label,
          itemType: eventChecklistItems.itemType,
          sortOrder: eventChecklistItems.sortOrder,
          isRequired: eventChecklistItems.isRequired,
          status: eventChecklistItems.status,
          note: eventChecklistItems.note,
        })
        .from(eventChecklistItems)
        .where(inArray(eventChecklistItems.checklistId, checklistGroups.map((row) => row.id)))
        .orderBy(asc(eventChecklistItems.sortOrder), asc(eventChecklistItems.createdAt))
    : [];

  const checklistItemsById = new Map<string, EventChecklistItem[]>();
  for (const item of checklistItems) {
    const bucket = checklistItemsById.get(item.checklistId) ?? [];
    bucket.push(item);
    checklistItemsById.set(item.checklistId, bucket);
  }

  const packingListRow = await db.query.eventPackingLists.findFirst({
    where: eq(eventPackingLists.eventId, eventId),
  });

  const packingListItems = packingListRow
    ? await db
        .select({
          id: eventPackingListItems.id,
          packingListId: eventPackingListItems.packingListId,
          eventEquipmentId: eventPackingListItems.eventEquipmentId,
          equipmentId: eventPackingListItems.equipmentId,
          equipmentCode: eventPackingListItems.equipmentCode,
          equipmentName: eventPackingListItems.equipmentName,
          equipmentCategoryName: eventPackingListItems.equipmentCategoryName,
          equipmentLocationLabel: eventPackingListItems.equipmentLocationLabel,
          equipmentBrand: eventPackingListItems.equipmentBrand,
          equipmentModel: eventPackingListItems.equipmentModel,
          equipmentSerialNumber: eventPackingListItems.equipmentSerialNumber,
          note: eventPackingListItems.note,
          sortOrder: eventPackingListItems.sortOrder,
          status: eventPackingListItems.status,
          checkedAt: eventPackingListItems.checkedAt,
        })
        .from(eventPackingListItems)
        .where(eq(eventPackingListItems.packingListId, packingListRow.id))
        .orderBy(asc(eventPackingListItems.sortOrder), asc(eventPackingListItems.createdAt))
    : [];

  const activeBookingCount = equipmentItems.filter((row) => row.bookingStatus !== "cancelled").length;

  return {
    item: {
      id: eventRow.id,
      eventNumber: eventRow.eventNumber,
      name: eventRow.name,
      clientName: eventRow.clientName,
      venueName: eventRow.venueName,
      status: eventRow.status,
      startAt: eventRow.startAt,
      endAt: eventRow.endAt,
      notes: eventRow.notes,
      equipmentCount: equipmentItems.length,
      bookingCount: activeBookingCount,
      loadingCount: 0,
      returnCount: 0,
      approvedByUserId: eventRow.approvedByUserId,
      createdByUserId: eventRow.createdByUserId,
      metadata: eventRow.metadata as Record<string, unknown>,
      createdAt: eventRow.createdAt,
      updatedAt: eventRow.updatedAt,
    },
    equipmentItems: equipmentItems.map((row) => ({
      id: row.id,
      equipmentId: row.equipmentId,
      equipmentCode: row.equipmentCode ?? "-",
      equipmentName: row.equipmentName ?? "-",
      equipmentCategoryName: row.equipmentCategoryName ?? null,
      equipmentLocationLabel:
        row.equipmentLocationCode || row.equipmentLocationName
          ? [row.equipmentLocationCode, row.equipmentLocationName].filter(Boolean).join(" - ")
          : null,
      equipmentBrand: row.equipmentBrand ?? "",
      equipmentModel: row.equipmentModel ?? "",
      equipmentSerialNumber: row.equipmentSerialNumber ?? null,
      equipmentStatus: row.equipmentStatus ?? null,
      bookingStatus: row.bookingStatus,
      packingStatus: row.packingStatus,
      loadingStatus: row.loadingStatus,
      returnStatus: row.returnStatus,
      note: row.note,
      checkedOutAt: row.checkedOutAt,
      returnedAt: row.returnedAt,
    })),
    checklistGroups: checklistGroups.map((row) => ({
      id: row.id,
      stage: row.stage,
      status: row.status,
      checkedAt: row.checkedAt,
      note: row.note,
      items: checklistItemsById.get(row.id) ?? [],
    })),
    packingList: packingListRow
      ? {
          id: packingListRow.id,
          eventId: packingListRow.eventId,
          status: packingListRow.status,
          generatedByUserId: packingListRow.generatedByUserId,
          generatedAt: packingListRow.generatedAt,
          note: packingListRow.note,
          items: packingListItems.map((row) => ({
            id: row.id,
            packingListId: row.packingListId,
            eventEquipmentId: row.eventEquipmentId,
            equipmentId: row.equipmentId,
            equipmentCode: row.equipmentCode,
            equipmentName: row.equipmentName,
            equipmentCategoryName: row.equipmentCategoryName,
            equipmentLocationLabel: row.equipmentLocationLabel,
            equipmentBrand: row.equipmentBrand,
            equipmentModel: row.equipmentModel,
            equipmentSerialNumber: row.equipmentSerialNumber,
            note: row.note,
            sortOrder: row.sortOrder,
            status: row.status,
            checkedAt: row.checkedAt,
          })),
        }
      : null,
  };
}
