import "server-only";

import { asc, desc, eq, inArray, sql } from "drizzle-orm";
import { aliasedTable as alias } from "drizzle-orm/alias";

import { getDb } from "@/db";
import {
  equipment,
  equipmentCategories,
  maintenanceActions,
  maintenanceAttachments,
  maintenancePartCatalog,
  maintenancePartUsages,
  maintenanceTickets,
  maintenanceVendors,
  users,
} from "@/db/schema";

export type MaintenanceVendorOption = {
  id: string;
  label: string;
  code: string;
  name: string;
  contactName: string;
  phone: string;
  email: string;
  notes: string;
};

export type MaintenancePartOption = {
  id: string;
  label: string;
  code: string;
  name: string;
  unit: string;
  notes: string;
};

export type MaintenanceTicketListItem = {
  id: string;
  ticketNumber: string;
  subject: string;
  complaint: string;
  diagnosis: string;
  actionPlan: string;
  status: string;
  priority: string;
  equipmentId: string;
  equipmentCode: string;
  equipmentName: string;
  equipmentCategoryName: string | null;
  vendorName: string | null;
  openedAt: Date;
  dueAt: Date | null;
  closedAt: Date | null;
  estimatedCost: number;
  actualCost: number;
  actionCount: number;
  attachmentCount: number;
  partUsageCount: number;
  openedByName: string | null;
  assignedToName: string | null;
};

export type MaintenanceActionListItem = {
  id: string;
  actionType: string;
  description: string;
  cost: number;
  performedAt: Date;
  performedByName: string | null;
};

export type MaintenanceAttachmentListItem = {
  id: string;
  kind: string;
  stage: string;
  title: string;
  fileName: string;
  storageUrl: string | null;
  note: string | null;
  createdAt: Date;
  createdByName: string | null;
};

export type MaintenancePartUsageListItem = {
  id: string;
  partNameSnapshot: string;
  quantity: number;
  unitCost: number;
  note: string | null;
  createdAt: Date;
  createdByName: string | null;
};

export type MaintenanceTicketDetail = {
  ticket: MaintenanceTicketListItem | null;
  actions: MaintenanceActionListItem[];
  attachments: MaintenanceAttachmentListItem[];
  partUsages: MaintenancePartUsageListItem[];
};

export type MaintenanceOverview = {
  stats: {
    openCount: number;
    progressCount: number;
    closedCount: number;
    vendorCount: number;
    partCount: number;
  };
  tickets: MaintenanceTicketListItem[];
  vendors: MaintenanceVendorOption[];
  parts: MaintenancePartOption[];
  selectedTicketId: string | null;
  selectedTicket: MaintenanceTicketDetail;
};

function normalizeCount(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  return 0;
}

async function getTicketList() {
  const db = getDb();
  const assignedUsers = alias(users, "assigned_users");
  const rows = await db
    .select({
      id: maintenanceTickets.id,
      ticketNumber: maintenanceTickets.ticketNumber,
      subject: maintenanceTickets.subject,
      complaint: maintenanceTickets.complaint,
      diagnosis: maintenanceTickets.diagnosis,
      actionPlan: maintenanceTickets.actionPlan,
      status: maintenanceTickets.status,
      priority: maintenanceTickets.priority,
      equipmentId: maintenanceTickets.equipmentId,
      equipmentCode: equipment.code,
      equipmentName: equipment.name,
      equipmentCategoryName: equipmentCategories.name,
      vendorName: maintenanceVendors.name,
      openedAt: maintenanceTickets.openedAt,
      dueAt: maintenanceTickets.dueAt,
      closedAt: maintenanceTickets.closedAt,
      estimatedCost: maintenanceTickets.estimatedCost,
      actualCost: maintenanceTickets.actualCost,
      openedByName: users.name,
      assignedToName: assignedUsers.name,
    })
    .from(maintenanceTickets)
    .leftJoin(equipment, eq(maintenanceTickets.equipmentId, equipment.id))
    .leftJoin(equipmentCategories, eq(equipment.categoryId, equipmentCategories.id))
    .leftJoin(maintenanceVendors, eq(maintenanceTickets.vendorId, maintenanceVendors.id))
    .leftJoin(users, eq(maintenanceTickets.openedByUserId, users.id))
    .leftJoin(assignedUsers, eq(maintenanceTickets.assignedToUserId, assignedUsers.id))
    .orderBy(desc(maintenanceTickets.openedAt));

  const ticketIds = rows.map((row) => row.id);
  const [actionRows, attachmentRows, partRows] = ticketIds.length
    ? await Promise.all([
        db
          .select({
            id: maintenanceActions.id,
            ticketId: maintenanceActions.ticketId,
            actionType: maintenanceActions.actionType,
            description: maintenanceActions.description,
            cost: maintenanceActions.cost,
            performedAt: maintenanceActions.performedAt,
            performedByName: users.name,
          })
          .from(maintenanceActions)
          .leftJoin(users, eq(maintenanceActions.performedByUserId, users.id))
          .where(inArray(maintenanceActions.ticketId, ticketIds))
          .orderBy(desc(maintenanceActions.performedAt)),
        db
          .select({
            id: maintenanceAttachments.id,
            ticketId: maintenanceAttachments.ticketId,
            kind: maintenanceAttachments.kind,
            stage: maintenanceAttachments.stage,
            title: maintenanceAttachments.title,
            fileName: maintenanceAttachments.fileName,
            storageUrl: maintenanceAttachments.storageUrl,
            note: maintenanceAttachments.note,
            createdAt: maintenanceAttachments.createdAt,
            createdByName: users.name,
          })
          .from(maintenanceAttachments)
          .leftJoin(users, eq(maintenanceAttachments.createdByUserId, users.id))
          .where(inArray(maintenanceAttachments.ticketId, ticketIds))
          .orderBy(desc(maintenanceAttachments.createdAt)),
        db
          .select({
            id: maintenancePartUsages.id,
            ticketId: maintenancePartUsages.ticketId,
            partNameSnapshot: maintenancePartUsages.partNameSnapshot,
            quantity: maintenancePartUsages.quantity,
            unitCost: maintenancePartUsages.unitCost,
            note: maintenancePartUsages.note,
            createdAt: maintenancePartUsages.createdAt,
            createdByName: users.name,
          })
          .from(maintenancePartUsages)
          .leftJoin(users, eq(maintenancePartUsages.createdByUserId, users.id))
          .where(inArray(maintenancePartUsages.ticketId, ticketIds))
          .orderBy(desc(maintenancePartUsages.createdAt)),
      ])
    : [[], [], []];

  const actionsByTicketId = actionRows.reduce<Record<string, MaintenanceActionListItem[]>>((acc, row) => {
    const bucket = acc[row.ticketId] ?? [];
    bucket.push({
      id: row.id,
      actionType: row.actionType,
      description: row.description,
      cost: normalizeCount(row.cost),
      performedAt: row.performedAt,
      performedByName: row.performedByName ?? null,
    });
    acc[row.ticketId] = bucket;
    return acc;
  }, {});

  const attachmentsByTicketId = attachmentRows.reduce<Record<string, MaintenanceAttachmentListItem[]>>(
    (acc, row) => {
      const bucket = acc[row.ticketId] ?? [];
      bucket.push({
        id: row.id,
        kind: row.kind,
        stage: row.stage,
        title: row.title,
        fileName: row.fileName,
        storageUrl: row.storageUrl ?? null,
        note: row.note ?? null,
        createdAt: row.createdAt,
        createdByName: row.createdByName ?? null,
      });
      acc[row.ticketId] = bucket;
      return acc;
    },
    {},
  );

  const partsByTicketId = partRows.reduce<Record<string, MaintenancePartUsageListItem[]>>((acc, row) => {
    const bucket = acc[row.ticketId] ?? [];
    bucket.push({
      id: row.id,
      partNameSnapshot: row.partNameSnapshot,
      quantity: normalizeCount(row.quantity),
      unitCost: normalizeCount(row.unitCost),
      note: row.note ?? null,
      createdAt: row.createdAt,
      createdByName: row.createdByName ?? null,
    });
    acc[row.ticketId] = bucket;
    return acc;
  }, {});

  return {
    tickets: rows.map((row) => ({
      id: row.id,
      ticketNumber: row.ticketNumber,
      subject: row.subject,
      complaint: row.complaint,
      diagnosis: row.diagnosis,
      actionPlan: row.actionPlan,
      status: row.status,
      priority: row.priority,
      equipmentId: row.equipmentId,
      equipmentCode: row.equipmentCode ?? "-",
      equipmentName: row.equipmentName ?? "-",
      equipmentCategoryName: row.equipmentCategoryName ?? null,
      vendorName: row.vendorName ?? null,
      openedAt: row.openedAt,
      dueAt: row.dueAt,
      closedAt: row.closedAt,
      estimatedCost: normalizeCount(row.estimatedCost),
      actualCost: normalizeCount(row.actualCost),
      actionCount: actionsByTicketId[row.id]?.length ?? 0,
      attachmentCount: attachmentsByTicketId[row.id]?.length ?? 0,
      partUsageCount: partsByTicketId[row.id]?.length ?? 0,
      openedByName: row.openedByName ?? null,
      assignedToName: row.assignedToName ?? null,
    })) satisfies MaintenanceTicketListItem[],
    actionsByTicketId,
    attachmentsByTicketId,
    partsByTicketId,
  };
}

export async function getMaintenanceOverview(): Promise<MaintenanceOverview> {
  const db = getDb();

  const [ticketList, vendorRows, partRows, openCount, progressCount, closedCount] = await Promise.all([
    getTicketList(),
    db
      .select({
        id: maintenanceVendors.id,
        code: maintenanceVendors.code,
        name: maintenanceVendors.name,
        contactName: maintenanceVendors.contactName,
        phone: maintenanceVendors.phone,
        email: maintenanceVendors.email,
        notes: maintenanceVendors.notes,
      })
      .from(maintenanceVendors)
      .orderBy(asc(maintenanceVendors.name)),
    db
      .select({
        id: maintenancePartCatalog.id,
        code: maintenancePartCatalog.code,
        name: maintenancePartCatalog.name,
        unit: maintenancePartCatalog.unit,
        notes: maintenancePartCatalog.notes,
      })
      .from(maintenancePartCatalog)
      .orderBy(asc(maintenancePartCatalog.code), asc(maintenancePartCatalog.name)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(maintenanceTickets)
      .where(eq(maintenanceTickets.status, "open")),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(maintenanceTickets)
      .where(eq(maintenanceTickets.status, "in_progress")),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(maintenanceTickets)
      .where(eq(maintenanceTickets.status, "closed")),
  ]);

  const selectedTicketId = ticketList.tickets[0]?.id ?? null;
  const selectedTicket = selectedTicketId
    ? await getMaintenanceTicketDetail(selectedTicketId)
    : { ticket: null, actions: [], attachments: [], partUsages: [] };

  return {
    stats: {
      openCount: normalizeCount(openCount[0]?.count),
      progressCount: normalizeCount(progressCount[0]?.count),
      closedCount: normalizeCount(closedCount[0]?.count),
      vendorCount: vendorRows.length,
      partCount: partRows.length,
    },
    tickets: ticketList.tickets,
    vendors: vendorRows.map((row) => ({
      id: row.id,
      label: row.name,
      code: row.code,
      name: row.name,
      contactName: row.contactName ?? "",
      phone: row.phone ?? "",
      email: row.email ?? "",
      notes: row.notes ?? "",
    })),
    parts: partRows.map((row) => ({
      id: row.id,
      label: `${row.code} - ${row.name}`,
      code: row.code,
      name: row.name,
      unit: row.unit,
      notes: row.notes ?? "",
    })),
    selectedTicketId,
    selectedTicket,
  };
}

export async function getMaintenanceTicketDetail(
  ticketId: string,
): Promise<MaintenanceTicketDetail> {
  const db = getDb();
  const assignedUsers = alias(users, "assigned_users");
  const [ticketRows, actionRows, attachmentRows, partRows] = await Promise.all([
    db
      .select({
        id: maintenanceTickets.id,
        ticketNumber: maintenanceTickets.ticketNumber,
        subject: maintenanceTickets.subject,
        complaint: maintenanceTickets.complaint,
        diagnosis: maintenanceTickets.diagnosis,
        actionPlan: maintenanceTickets.actionPlan,
        status: maintenanceTickets.status,
        priority: maintenanceTickets.priority,
        equipmentId: maintenanceTickets.equipmentId,
        equipmentCode: equipment.code,
        equipmentName: equipment.name,
        equipmentCategoryName: equipmentCategories.name,
        vendorName: maintenanceVendors.name,
        openedAt: maintenanceTickets.openedAt,
        dueAt: maintenanceTickets.dueAt,
        closedAt: maintenanceTickets.closedAt,
        estimatedCost: maintenanceTickets.estimatedCost,
        actualCost: maintenanceTickets.actualCost,
        openedByName: users.name,
        assignedToName: assignedUsers.name,
      })
      .from(maintenanceTickets)
      .leftJoin(equipment, eq(maintenanceTickets.equipmentId, equipment.id))
      .leftJoin(equipmentCategories, eq(equipment.categoryId, equipmentCategories.id))
      .leftJoin(maintenanceVendors, eq(maintenanceTickets.vendorId, maintenanceVendors.id))
      .leftJoin(users, eq(maintenanceTickets.openedByUserId, users.id))
      .leftJoin(assignedUsers, eq(maintenanceTickets.assignedToUserId, assignedUsers.id))
      .where(eq(maintenanceTickets.id, ticketId))
      .limit(1),
    db
      .select({
        id: maintenanceActions.id,
        actionType: maintenanceActions.actionType,
        description: maintenanceActions.description,
        cost: maintenanceActions.cost,
        performedAt: maintenanceActions.performedAt,
        performedByName: users.name,
      })
      .from(maintenanceActions)
      .leftJoin(users, eq(maintenanceActions.performedByUserId, users.id))
      .where(eq(maintenanceActions.ticketId, ticketId))
      .orderBy(desc(maintenanceActions.performedAt)),
    db
      .select({
        id: maintenanceAttachments.id,
        kind: maintenanceAttachments.kind,
        stage: maintenanceAttachments.stage,
        title: maintenanceAttachments.title,
        fileName: maintenanceAttachments.fileName,
        storageUrl: maintenanceAttachments.storageUrl,
        note: maintenanceAttachments.note,
        createdAt: maintenanceAttachments.createdAt,
        createdByName: users.name,
      })
      .from(maintenanceAttachments)
      .leftJoin(users, eq(maintenanceAttachments.createdByUserId, users.id))
      .where(eq(maintenanceAttachments.ticketId, ticketId))
      .orderBy(desc(maintenanceAttachments.createdAt)),
    db
      .select({
        id: maintenancePartUsages.id,
        partNameSnapshot: maintenancePartUsages.partNameSnapshot,
        quantity: maintenancePartUsages.quantity,
        unitCost: maintenancePartUsages.unitCost,
        note: maintenancePartUsages.note,
        createdAt: maintenancePartUsages.createdAt,
        createdByName: users.name,
      })
      .from(maintenancePartUsages)
      .leftJoin(users, eq(maintenancePartUsages.createdByUserId, users.id))
      .where(eq(maintenancePartUsages.ticketId, ticketId))
      .orderBy(desc(maintenancePartUsages.createdAt)),
  ]);

  const ticketRow = ticketRows[0] ?? null;
  const ticket = ticketRow
    ? {
        id: ticketRow.id,
        ticketNumber: ticketRow.ticketNumber,
        subject: ticketRow.subject,
        complaint: ticketRow.complaint,
        diagnosis: ticketRow.diagnosis,
        actionPlan: ticketRow.actionPlan,
        status: ticketRow.status,
        priority: ticketRow.priority,
        equipmentId: ticketRow.equipmentId,
        equipmentCode: ticketRow.equipmentCode ?? "-",
        equipmentName: ticketRow.equipmentName ?? "-",
        equipmentCategoryName: ticketRow.equipmentCategoryName ?? null,
        vendorName: ticketRow.vendorName ?? null,
        openedAt: ticketRow.openedAt,
        dueAt: ticketRow.dueAt,
        closedAt: ticketRow.closedAt,
        estimatedCost: normalizeCount(ticketRow.estimatedCost),
        actualCost: normalizeCount(ticketRow.actualCost),
        actionCount: actionRows.length,
        attachmentCount: attachmentRows.length,
        partUsageCount: partRows.length,
        openedByName: ticketRow.openedByName ?? null,
        assignedToName: ticketRow.assignedToName ?? null,
      } satisfies MaintenanceTicketListItem
    : null;

  return {
    ticket,
    actions: actionRows.map((row) => ({
      id: row.id,
      actionType: row.actionType,
      description: row.description,
      cost: normalizeCount(row.cost),
      performedAt: row.performedAt,
      performedByName: row.performedByName ?? null,
    })),
    attachments: attachmentRows.map((row) => ({
      id: row.id,
      kind: row.kind,
      stage: row.stage,
      title: row.title,
      fileName: row.fileName,
      storageUrl: row.storageUrl ?? null,
      note: row.note ?? null,
      createdAt: row.createdAt,
      createdByName: row.createdByName ?? null,
    })),
    partUsages: partRows.map((row) => ({
      id: row.id,
      partNameSnapshot: row.partNameSnapshot,
      quantity: normalizeCount(row.quantity),
      unitCost: normalizeCount(row.unitCost),
      note: row.note ?? null,
      createdAt: row.createdAt,
      createdByName: row.createdByName ?? null,
    })),
  };
}
