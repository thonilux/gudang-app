import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { equipment } from "./equipment";
import { users } from "./auth";

export const maintenanceVendors = pgTable(
  "maintenance_vendors",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    contactName: text("contact_name"),
    phone: text("phone"),
    email: text("email"),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    codeUnique: uniqueIndex("maintenance_vendors_code_unique").on(table.code),
    nameIndex: index("maintenance_vendors_name_idx").on(table.name),
  }),
);

export const maintenanceTickets = pgTable(
  "maintenance_tickets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ticketNumber: text("ticket_number").notNull(),
    equipmentId: uuid("equipment_id")
      .notNull()
      .references(() => equipment.id, { onDelete: "cascade" }),
    vendorId: uuid("vendor_id").references(() => maintenanceVendors.id, {
      onDelete: "set null",
    }),
    subject: text("subject").notNull(),
    complaint: text("complaint").notNull(),
    diagnosis: text("diagnosis").notNull().default(""),
    actionPlan: text("action_plan").notNull().default(""),
    status: text("status").notNull().default("open"),
    priority: text("priority").notNull().default("normal"),
    openedByUserId: uuid("opened_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    assignedToUserId: uuid("assigned_to_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    openedAt: timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(),
    dueAt: timestamp("due_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    estimatedCost: integer("estimated_cost").notNull().default(0),
    actualCost: integer("actual_cost").notNull().default(0),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    numberUnique: uniqueIndex("maintenance_tickets_ticket_number_unique").on(table.ticketNumber),
    equipmentIndex: index("maintenance_tickets_equipment_id_idx").on(table.equipmentId),
    statusIndex: index("maintenance_tickets_status_idx").on(table.status),
    openedAtIndex: index("maintenance_tickets_opened_at_idx").on(table.openedAt),
  }),
);

export const maintenanceActions = pgTable(
  "maintenance_actions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => maintenanceTickets.id, { onDelete: "cascade" }),
    actionType: text("action_type").notNull().default("note"),
    description: text("description").notNull(),
    cost: integer("cost").notNull().default(0),
    performedByUserId: uuid("performed_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    performedAt: timestamp("performed_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    ticketIndex: index("maintenance_actions_ticket_id_idx").on(table.ticketId),
    performedAtIndex: index("maintenance_actions_performed_at_idx").on(table.performedAt),
  }),
);

export const maintenanceAttachments = pgTable(
  "maintenance_attachments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => maintenanceTickets.id, { onDelete: "cascade" }),
    kind: text("kind").notNull().default("photo"),
    stage: text("stage").notNull().default("before"),
    title: text("title").notNull(),
    fileName: text("file_name").notNull(),
    storageUrl: text("storage_url"),
    note: text("note"),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    ticketIndex: index("maintenance_attachments_ticket_id_idx").on(table.ticketId),
    createdAtIndex: index("maintenance_attachments_created_at_idx").on(table.createdAt),
  }),
);

export const maintenancePartCatalog = pgTable(
  "maintenance_part_catalog",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    unit: text("unit").notNull().default("pcs"),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    codeUnique: uniqueIndex("maintenance_part_catalog_code_unique").on(table.code),
    nameIndex: index("maintenance_part_catalog_name_idx").on(table.name),
  }),
);

export const maintenancePartUsages = pgTable(
  "maintenance_part_usages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => maintenanceTickets.id, { onDelete: "cascade" }),
    partId: uuid("part_id").references(() => maintenancePartCatalog.id, {
      onDelete: "set null",
    }),
    partNameSnapshot: text("part_name_snapshot").notNull(),
    quantity: integer("quantity").notNull().default(1),
    unitCost: integer("unit_cost").notNull().default(0),
    note: text("note"),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    ticketIndex: index("maintenance_part_usages_ticket_id_idx").on(table.ticketId),
    createdAtIndex: index("maintenance_part_usages_created_at_idx").on(table.createdAt),
  }),
);
