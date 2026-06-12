import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "./auth";
import { equipment, equipmentCategories } from "./equipment";

export const equipmentInspectionTemplates = pgTable(
  "equipment_inspection_templates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => equipmentCategories.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    checklist: jsonb("checklist").notNull().default([]),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    categoryIndex: index("equipment_inspection_templates_category_id_idx").on(table.categoryId),
    activeIndex: index("equipment_inspection_templates_is_active_idx").on(table.isActive),
    sortOrderIndex: index("equipment_inspection_templates_sort_order_idx").on(table.sortOrder),
  }),
);

export const equipmentInspections = pgTable(
  "equipment_inspections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    equipmentId: uuid("equipment_id")
      .notNull()
      .references(() => equipment.id, { onDelete: "cascade" }),
    templateId: uuid("template_id").references(() => equipmentInspectionTemplates.id, {
      onDelete: "set null",
    }),
    templateNameSnapshot: text("template_name_snapshot").notNull().default(""),
    resultStatus: text("result_status").notNull().default("pass"),
    note: text("note"),
    checklistSnapshot: jsonb("checklist_snapshot").notNull().default([]),
    summary: jsonb("summary").notNull().default({}),
    inspectedByUserId: uuid("inspected_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    inspectedAt: timestamp("inspected_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    equipmentIndex: index("equipment_inspections_equipment_id_idx").on(table.equipmentId),
    templateIndex: index("equipment_inspections_template_id_idx").on(table.templateId),
    statusIndex: index("equipment_inspections_result_status_idx").on(table.resultStatus),
    createdAtIndex: index("equipment_inspections_created_at_idx").on(table.createdAt),
  }),
);

export const equipmentInspectionResults = pgTable(
  "equipment_inspection_results",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    inspectionId: uuid("inspection_id")
      .notNull()
      .references(() => equipmentInspections.id, { onDelete: "cascade" }),
    checklistIndex: integer("checklist_index").notNull(),
    label: text("label").notNull(),
    required: boolean("required").notNull().default(false),
    result: text("result").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    inspectionIndex: index("equipment_inspection_results_inspection_id_idx").on(table.inspectionId),
    checklistIndex: index("equipment_inspection_results_checklist_index_idx").on(table.checklistIndex),
  }),
);
