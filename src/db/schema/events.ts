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

export const events = pgTable(
  "events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventNumber: text("event_number").notNull(),
    name: text("name").notNull(),
    clientName: text("client_name").notNull().default(""),
    venueName: text("venue_name").notNull().default(""),
    status: text("status").notNull().default("draft"),
    startAt: timestamp("start_at", { withTimezone: true }),
    endAt: timestamp("end_at", { withTimezone: true }),
    notes: text("notes").notNull().default(""),
    approvedByUserId: uuid("approved_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    numberUnique: uniqueIndex("events_event_number_unique").on(table.eventNumber),
    statusIndex: index("events_status_idx").on(table.status),
    startAtIndex: index("events_start_at_idx").on(table.startAt),
    createdAtIndex: index("events_created_at_idx").on(table.createdAt),
  }),
);

export const eventEquipment = pgTable(
  "event_equipment",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    equipmentId: uuid("equipment_id")
      .notNull()
      .references(() => equipment.id, { onDelete: "cascade" }),
    bookingStatus: text("booking_status").notNull().default("requested"),
    packingStatus: text("packing_status").notNull().default("pending"),
    loadingStatus: text("loading_status").notNull().default("pending"),
    returnStatus: text("return_status").notNull().default("pending"),
    note: text("note").notNull().default(""),
    checkedOutAt: timestamp("checked_out_at", { withTimezone: true }),
    returnedAt: timestamp("returned_at", { withTimezone: true }),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    eventIndex: index("event_equipment_event_id_idx").on(table.eventId),
    equipmentIndex: index("event_equipment_equipment_id_idx").on(table.equipmentId),
    eventEquipmentUnique: uniqueIndex("event_equipment_event_equipment_unique").on(table.eventId, table.equipmentId),
    bookingStatusIndex: index("event_equipment_booking_status_idx").on(table.bookingStatus),
  }),
);

export const eventChecklists = pgTable(
  "event_checklists",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    stage: text("stage").notNull().default("loading"),
    status: text("status").notNull().default("draft"),
    checkedByUserId: uuid("checked_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    checkedAt: timestamp("checked_at", { withTimezone: true }),
    note: text("note").notNull().default(""),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    eventIndex: index("event_checklists_event_id_idx").on(table.eventId),
    stageIndex: index("event_checklists_stage_idx").on(table.stage),
    statusIndex: index("event_checklists_status_idx").on(table.status),
  }),
);

export const eventPackingLists = pgTable(
  "event_packing_lists",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("generated"),
    generatedByUserId: uuid("generated_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    generatedAt: timestamp("generated_at", { withTimezone: true }),
    note: text("note").notNull().default(""),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    eventIndex: uniqueIndex("event_packing_lists_event_id_unique").on(table.eventId),
    statusIndex: index("event_packing_lists_status_idx").on(table.status),
  }),
);

export const eventPackingListItems = pgTable(
  "event_packing_list_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    packingListId: uuid("packing_list_id")
      .notNull()
      .references(() => eventPackingLists.id, { onDelete: "cascade" }),
    eventEquipmentId: uuid("event_equipment_id").references(() => eventEquipment.id, {
      onDelete: "set null",
    }),
    equipmentId: uuid("equipment_id")
      .notNull()
      .references(() => equipment.id, { onDelete: "cascade" }),
    equipmentCode: text("equipment_code").notNull(),
    equipmentName: text("equipment_name").notNull(),
    equipmentCategoryName: text("equipment_category_name"),
    equipmentLocationLabel: text("equipment_location_label"),
    equipmentBrand: text("equipment_brand").notNull().default(""),
    equipmentModel: text("equipment_model").notNull().default(""),
    equipmentSerialNumber: text("equipment_serial_number"),
    note: text("note").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
    status: text("status").notNull().default("pending"),
    checkedAt: timestamp("checked_at", { withTimezone: true }),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    packingListIndex: index("event_packing_list_items_packing_list_id_idx").on(table.packingListId),
    eventEquipmentIndex: index("event_packing_list_items_event_equipment_id_idx").on(table.eventEquipmentId),
    sortOrderIndex: index("event_packing_list_items_sort_order_idx").on(table.sortOrder),
    uniquePerList: uniqueIndex("event_packing_list_items_unique_per_list").on(table.packingListId, table.equipmentId),
  }),
);

export const eventChecklistItems = pgTable(
  "event_checklist_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    checklistId: uuid("checklist_id")
      .notNull()
      .references(() => eventChecklists.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    itemType: text("item_type").notNull().default("check"),
    sortOrder: integer("sort_order").notNull().default(0),
    isRequired: integer("is_required").notNull().default(1),
    status: text("status").notNull().default("pending"),
    note: text("note").notNull().default(""),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    checklistIndex: index("event_checklist_items_checklist_id_idx").on(table.checklistId),
    sortOrderIndex: index("event_checklist_items_sort_order_idx").on(table.sortOrder),
    statusIndex: index("event_checklist_items_status_idx").on(table.status),
  }),
);
