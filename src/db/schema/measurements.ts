import {
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { equipment } from "./equipment";
import { users } from "./auth";

export const equipmentMeasurements = pgTable(
  "equipment_measurements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    equipmentId: uuid("equipment_id")
      .notNull()
      .references(() => equipment.id, { onDelete: "cascade" }),
    measurementDate: timestamp("measurement_date", { withTimezone: true }).notNull().defaultNow(),
    method: text("method").notNull().default("Smaart ASCII"),
    distanceMeter: numeric("distance_meter").notNull().default("1.0"),
    axis: text("axis").notNull().default("on-axis"),
    rawText: text("raw_text").notNull(),
    parsedJson: jsonb("parsed_json").notNull(), // contains { frequency: [], magnitude: [], phase: [], coherence: [] }
    avgCoherence: numeric("avg_coherence").notNull(),
    validFrequencyMin: numeric("valid_frequency_min"),
    validFrequencyMax: numeric("valid_frequency_max"),
    peakResponseDb: numeric("peak_response_db"),
    deepestDipDb: numeric("deepest_dip_db"),
    hfTrendDb: numeric("hf_trend_db"),
    healthScore: integer("health_score").notNull().default(100),
    resultStatus: text("result_status").notNull().default("pass"), // pass, warning, fail
    engineerNote: text("engineer_note").notNull().default(""),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    equipmentIdIdx: index("equipment_measurements_equipment_id_idx").on(table.equipmentId),
    createdAtIdx: index("equipment_measurements_created_at_idx").on(table.createdAt),
    resultStatusIdx: index("equipment_measurements_result_status_idx").on(table.resultStatus),
  })
);
