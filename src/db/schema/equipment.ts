import {
  type AnyPgColumn,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "./auth";

export const equipmentCategories = pgTable(
  "equipment_categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    key: text("key").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    keyUnique: uniqueIndex("equipment_categories_key_unique").on(table.key),
    sortOrderIndex: index("equipment_categories_sort_order_idx").on(table.sortOrder),
  }),
);

export const equipmentLocations = pgTable(
  "equipment_locations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    parentLocationId: uuid("parent_location_id").references(
      (): AnyPgColumn => equipmentLocations.id,
      {
        onDelete: "set null",
      },
    ),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    codeUnique: uniqueIndex("equipment_locations_code_unique").on(table.code),
    parentLocationIndex: index("equipment_locations_parent_location_id_idx").on(table.parentLocationId),
  }),
);

export const equipment = pgTable(
  "equipment",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => equipmentCategories.id),
    locationId: uuid("location_id").references(() => equipmentLocations.id, {
      onDelete: "set null",
    }),
    brand: text("brand").notNull().default(""),
    model: text("model").notNull().default(""),
    serialNumber: text("serial_number"),
    status: text("status").notNull().default("ready"),
    conditionNote: text("condition_note").notNull().default(""),
    specificationNote: text("specification_note").notNull().default(""),
    notes: text("notes").notNull().default(""),
    lastInspectionAt: timestamp("last_inspection_at", { withTimezone: true }),
    nextInspectionAt: timestamp("next_inspection_at", { withTimezone: true }),
    lastStatusChangeAt: timestamp("last_status_change_at", { withTimezone: true }),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    codeUnique: uniqueIndex("equipment_code_unique").on(table.code),
    serialNumberUnique: uniqueIndex("equipment_serial_number_unique").on(table.serialNumber),
    categoryIndex: index("equipment_category_id_idx").on(table.categoryId),
    locationIndex: index("equipment_location_id_idx").on(table.locationId),
    statusIndex: index("equipment_status_idx").on(table.status),
    createdAtIndex: index("equipment_created_at_idx").on(table.createdAt),
  }),
);

export const equipmentStatusLogs = pgTable(
  "equipment_status_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    equipmentId: uuid("equipment_id")
      .notNull()
      .references(() => equipment.id, { onDelete: "cascade" }),
    status: text("status").notNull(),
    note: text("note"),
    changedByUserId: uuid("changed_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    equipmentIndex: index("equipment_status_logs_equipment_id_idx").on(table.equipmentId),
    createdAtIndex: index("equipment_status_logs_created_at_idx").on(table.createdAt),
  }),
);

export const equipmentLocationLogs = pgTable(
  "equipment_location_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    equipmentId: uuid("equipment_id")
      .notNull()
      .references(() => equipment.id, { onDelete: "cascade" }),
    fromLocationId: uuid("from_location_id").references(() => equipmentLocations.id, {
      onDelete: "set null",
    }),
    toLocationId: uuid("to_location_id").references(() => equipmentLocations.id, {
      onDelete: "set null",
    }),
    note: text("note"),
    changedByUserId: uuid("changed_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    equipmentIndex: index("equipment_location_logs_equipment_id_idx").on(table.equipmentId),
    createdAtIndex: index("equipment_location_logs_created_at_idx").on(table.createdAt),
  }),
);

export const equipmentDocuments = pgTable(
  "equipment_documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    equipmentId: uuid("equipment_id")
      .notNull()
      .references(() => equipment.id, { onDelete: "cascade" }),
    kind: text("kind").notNull().default("document"),
    title: text("title").notNull(),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type"),
    storageKey: text("storage_key").notNull(),
    storageUrl: text("storage_url"),
    note: text("note"),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    equipmentIndex: index("equipment_documents_equipment_id_idx").on(table.equipmentId),
    createdAtIndex: index("equipment_documents_created_at_idx").on(table.createdAt),
  }),
);
