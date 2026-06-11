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

export const warehouseLocations = pgTable(
  "warehouse_locations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    parentLocationId: uuid("parent_location_id").references(
      (): AnyPgColumn => warehouseLocations.id,
      { onDelete: "set null" },
    ),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    codeUnique: uniqueIndex("warehouse_locations_code_unique").on(table.code),
    parentLocationIndex: index("warehouse_locations_parent_location_id_idx").on(table.parentLocationId),
    sortOrderIndex: index("warehouse_locations_sort_order_idx").on(table.sortOrder),
  }),
);

export const warehouseStockItems = pgTable(
  "warehouse_stock_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sku: text("sku").notNull(),
    name: text("name").notNull(),
    unit: text("unit").notNull().default("pcs"),
    category: text("category").notNull().default(""),
    locationId: uuid("location_id").references(() => warehouseLocations.id, {
      onDelete: "set null",
    }),
    currentQuantity: integer("current_quantity").notNull().default(0),
    minimumQuantity: integer("minimum_quantity").notNull().default(0),
    status: text("status").notNull().default("available"),
    notes: text("notes").notNull().default(""),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    skuUnique: uniqueIndex("warehouse_stock_items_sku_unique").on(table.sku),
    locationIndex: index("warehouse_stock_items_location_id_idx").on(table.locationId),
    statusIndex: index("warehouse_stock_items_status_idx").on(table.status),
    createdAtIndex: index("warehouse_stock_items_created_at_idx").on(table.createdAt),
  }),
);

export const warehouseStockMovements = pgTable(
  "warehouse_stock_movements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    stockItemId: uuid("stock_item_id")
      .notNull()
      .references(() => warehouseStockItems.id, { onDelete: "cascade" }),
    movementType: text("movement_type").notNull(),
    quantity: integer("quantity").notNull(),
    fromLocationId: uuid("from_location_id").references(() => warehouseLocations.id, {
      onDelete: "set null",
    }),
    toLocationId: uuid("to_location_id").references(() => warehouseLocations.id, {
      onDelete: "set null",
    }),
    note: text("note"),
    referenceType: text("reference_type"),
    referenceId: text("reference_id"),
    changedByUserId: uuid("changed_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    stockItemIndex: index("warehouse_stock_movements_stock_item_id_idx").on(table.stockItemId),
    movementTypeIndex: index("warehouse_stock_movements_movement_type_idx").on(table.movementType),
    createdAtIndex: index("warehouse_stock_movements_created_at_idx").on(table.createdAt),
  }),
);

export const warehouseStockCounts = pgTable(
  "warehouse_stock_counts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    locationId: uuid("location_id").references(() => warehouseLocations.id, {
      onDelete: "set null",
    }),
    countedByUserId: uuid("counted_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    status: text("status").notNull().default("completed"),
    note: text("note"),
    countedAt: timestamp("counted_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    locationIndex: index("warehouse_stock_counts_location_id_idx").on(table.locationId),
    createdAtIndex: index("warehouse_stock_counts_created_at_idx").on(table.createdAt),
  }),
);

export const warehouseStockCountLines = pgTable(
  "warehouse_stock_count_lines",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    countId: uuid("count_id")
      .notNull()
      .references(() => warehouseStockCounts.id, { onDelete: "cascade" }),
    stockItemId: uuid("stock_item_id")
      .notNull()
      .references(() => warehouseStockItems.id, { onDelete: "cascade" }),
    systemQuantity: integer("system_quantity").notNull(),
    countedQuantity: integer("counted_quantity").notNull(),
    difference: integer("difference").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    countIndex: index("warehouse_stock_count_lines_count_id_idx").on(table.countId),
    stockItemIndex: index("warehouse_stock_count_lines_stock_item_id_idx").on(table.stockItemId),
  }),
);

export const warehouseSerialItems = pgTable(
  "warehouse_serial_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    serialNumber: text("serial_number").notNull(),
    name: text("name").notNull(),
    category: text("category").notNull().default(""),
    locationId: uuid("location_id").references(() => warehouseLocations.id, {
      onDelete: "set null",
    }),
    status: text("status").notNull().default("ready"),
    notes: text("notes").notNull().default(""),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    serialNumberUnique: uniqueIndex("warehouse_serial_items_serial_number_unique").on(table.serialNumber),
    locationIndex: index("warehouse_serial_items_location_id_idx").on(table.locationId),
    statusIndex: index("warehouse_serial_items_status_idx").on(table.status),
    createdAtIndex: index("warehouse_serial_items_created_at_idx").on(table.createdAt),
  }),
);

export const warehouseSerialItemMovements = pgTable(
  "warehouse_serial_item_movements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    serialItemId: uuid("serial_item_id")
      .notNull()
      .references(() => warehouseSerialItems.id, { onDelete: "cascade" }),
    fromLocationId: uuid("from_location_id").references(() => warehouseLocations.id, {
      onDelete: "set null",
    }),
    toLocationId: uuid("to_location_id").references(() => warehouseLocations.id, {
      onDelete: "set null",
    }),
    note: text("note"),
    changedByUserId: uuid("changed_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    serialItemIndex: index("warehouse_serial_item_movements_serial_item_id_idx").on(table.serialItemId),
    createdAtIndex: index("warehouse_serial_item_movements_created_at_idx").on(table.createdAt),
  }),
);
