import "server-only";

import { and, asc, desc, eq, inArray } from "drizzle-orm";

import { getDb } from "@/db";
import {
  equipmentCategories,
  equipmentInspectionResults,
  equipmentInspectionTemplates,
  equipmentInspections,
  users,
} from "@/db/schema";

export const INSPECTION_RESULT_OPTIONS = [
  { value: "pass", label: "Lulus" },
  { value: "fail", label: "Gagal" },
  { value: "na", label: "Tidak diuji" },
] as const;

export type InspectionResultValue = (typeof INSPECTION_RESULT_OPTIONS)[number]["value"];

export const INSPECTION_STATUS_OPTIONS = [
  { value: "pass", label: "Lulus" },
  { value: "warning", label: "Perlu perhatian" },
  { value: "fail", label: "Gagal" },
] as const;

export type InspectionStatusValue = (typeof INSPECTION_STATUS_OPTIONS)[number]["value"];

export type InspectionTemplateChecklistItem = {
  label: string;
  required: boolean;
};

export type InspectionTemplateListItem = {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  description: string | null;
  checklist: InspectionTemplateChecklistItem[];
  isActive: boolean;
  sortOrder: number;
  updatedAt: Date;
};

export function findInspectionTemplateForEquipment(
  templates: InspectionTemplateListItem[],
  equipmentText: string,
) {
  const haystack = equipmentText.trim().toLowerCase();
  if (!haystack) {
    return templates[0] ?? null;
  }

  const scored = templates
    .map((template) => {
      const signature = [template.name, template.description ?? ""]
        .join(" ")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();

      const tokens = signature.split(/\s+/).filter((token) => token.length >= 2);
      const score = tokens.filter((token) => haystack.includes(token)).length;

      return { template, score };
    })
    .sort((a, b) => b.score - a.score);

  return scored[0]?.score ? scored[0].template : templates[0] ?? null;
}

export type EquipmentInspectionResultListItem = {
  id: string;
  checklistIndex: number;
  label: string;
  required: boolean;
  result: InspectionResultValue | string;
  note: string | null;
};

export type EquipmentInspectionListItem = {
  id: string;
  templateNameSnapshot: string;
  resultStatus: string;
  note: string | null;
  inspectedAt: Date;
  inspectedByName: string | null;
  summary: {
    total: number;
    passed: number;
    failed: number;
    na: number;
  };
  results: EquipmentInspectionResultListItem[];
};

function normalizeChecklist(value: unknown): InspectionTemplateChecklistItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const label = "label" in item ? String((item as { label?: unknown }).label ?? "").trim() : "";
      if (!label) {
        return null;
      }

      return {
        label,
        required: Boolean((item as { required?: unknown }).required),
      } satisfies InspectionTemplateChecklistItem;
    })
    .filter((item): item is InspectionTemplateChecklistItem => Boolean(item));
}

function buildInspectionSummary(results: Array<{ result: string }>) {
  return results.reduce(
    (acc, row) => {
      acc.total += 1;
      if (row.result === "pass") {
        acc.passed += 1;
      } else if (row.result === "fail") {
        acc.failed += 1;
      } else {
        acc.na += 1;
      }
      return acc;
    },
    { total: 0, passed: 0, failed: 0, na: 0 },
  );
}

export function getInspectionStatusLabel(status: string) {
  return INSPECTION_STATUS_OPTIONS.find((item) => item.value === status)?.label ?? status;
}

export function getInspectionStatusTone(status: string) {
  switch (status) {
    case "pass":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "warning":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "fail":
      return "border-rose-200 bg-rose-50 text-rose-800";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

export function getInspectionResultLabel(result: string) {
  return INSPECTION_RESULT_OPTIONS.find((item) => item.value === result)?.label ?? result;
}

export function getInspectionResultTone(result: string) {
  switch (result) {
    case "pass":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "fail":
      return "border-rose-200 bg-rose-50 text-rose-800";
    case "na":
      return "border-slate-200 bg-slate-100 text-slate-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

export async function getInspectionTemplates() {
  const db = getDb();
  const rows = await db
    .select({
      id: equipmentInspectionTemplates.id,
      categoryId: equipmentInspectionTemplates.categoryId,
      categoryName: equipmentCategories.name,
      name: equipmentInspectionTemplates.name,
      description: equipmentInspectionTemplates.description,
      checklist: equipmentInspectionTemplates.checklist,
      isActive: equipmentInspectionTemplates.isActive,
      sortOrder: equipmentInspectionTemplates.sortOrder,
      updatedAt: equipmentInspectionTemplates.updatedAt,
    })
    .from(equipmentInspectionTemplates)
    .leftJoin(equipmentCategories, eq(equipmentInspectionTemplates.categoryId, equipmentCategories.id))
    .orderBy(asc(equipmentInspectionTemplates.sortOrder), asc(equipmentInspectionTemplates.name));

  return rows.map((row) => ({
    id: row.id,
    categoryId: row.categoryId,
    categoryName: row.categoryName ?? "Tanpa kategori",
    name: row.name,
    description: row.description,
    checklist: normalizeChecklist(row.checklist),
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    updatedAt: row.updatedAt,
  })) satisfies InspectionTemplateListItem[];
}

export async function getInspectionTemplatesForCategory(categoryId: string) {
  const db = getDb();
  const rows = await db
    .select({
      id: equipmentInspectionTemplates.id,
      categoryId: equipmentInspectionTemplates.categoryId,
      categoryName: equipmentCategories.name,
      name: equipmentInspectionTemplates.name,
      description: equipmentInspectionTemplates.description,
      checklist: equipmentInspectionTemplates.checklist,
      isActive: equipmentInspectionTemplates.isActive,
      sortOrder: equipmentInspectionTemplates.sortOrder,
      updatedAt: equipmentInspectionTemplates.updatedAt,
    })
    .from(equipmentInspectionTemplates)
    .leftJoin(equipmentCategories, eq(equipmentInspectionTemplates.categoryId, equipmentCategories.id))
    .where(and(eq(equipmentInspectionTemplates.categoryId, categoryId), eq(equipmentInspectionTemplates.isActive, true)))
    .orderBy(asc(equipmentInspectionTemplates.sortOrder), asc(equipmentInspectionTemplates.name));

  return rows.map((row) => ({
    id: row.id,
    categoryId: row.categoryId,
    categoryName: row.categoryName ?? "Tanpa kategori",
    name: row.name,
    description: row.description,
    checklist: normalizeChecklist(row.checklist),
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    updatedAt: row.updatedAt,
  })) satisfies InspectionTemplateListItem[];
}

export async function getEquipmentInspectionHistory(equipmentId: string) {
  const db = getDb();
  const inspections = await db
    .select({
      id: equipmentInspections.id,
      templateNameSnapshot: equipmentInspections.templateNameSnapshot,
      resultStatus: equipmentInspections.resultStatus,
      note: equipmentInspections.note,
      inspectedAt: equipmentInspections.inspectedAt,
      inspectedByName: users.name,
      summary: equipmentInspections.summary,
    })
    .from(equipmentInspections)
    .leftJoin(users, eq(equipmentInspections.inspectedByUserId, users.id))
    .where(eq(equipmentInspections.equipmentId, equipmentId))
    .orderBy(desc(equipmentInspections.inspectedAt))
    .limit(10);

  const inspectionIds = inspections.map((row) => row.id);
  const resultRows = inspectionIds.length
    ? await db
        .select({
          id: equipmentInspectionResults.id,
          inspectionId: equipmentInspectionResults.inspectionId,
          checklistIndex: equipmentInspectionResults.checklistIndex,
          label: equipmentInspectionResults.label,
          required: equipmentInspectionResults.required,
          result: equipmentInspectionResults.result,
          note: equipmentInspectionResults.note,
        })
        .from(equipmentInspectionResults)
        .where(inArray(equipmentInspectionResults.inspectionId, inspectionIds))
        .orderBy(asc(equipmentInspectionResults.checklistIndex))
    : [];

  const resultsByInspectionId = resultRows.reduce<Record<string, EquipmentInspectionResultListItem[]>>((acc, row) => {
    const bucket = acc[row.inspectionId] ?? [];
    bucket.push({
      id: row.id,
      checklistIndex: row.checklistIndex,
      label: row.label,
      required: row.required,
      result: row.result,
      note: row.note,
    });
    acc[row.inspectionId] = bucket;
    return acc;
  }, {});

  return inspections.map((row) => {
    const results = resultsByInspectionId[row.id] ?? [];
    const summary =
      typeof row.summary === "object" && row.summary && !Array.isArray(row.summary)
        ? {
            total: Number((row.summary as { total?: number }).total ?? results.length),
            passed: Number((row.summary as { passed?: number }).passed ?? 0),
            failed: Number((row.summary as { failed?: number }).failed ?? 0),
            na: Number((row.summary as { na?: number }).na ?? 0),
          }
        : buildInspectionSummary(results);

    return {
      id: row.id,
      templateNameSnapshot: row.templateNameSnapshot,
      resultStatus: row.resultStatus,
      note: row.note,
      inspectedAt: row.inspectedAt,
      inspectedByName: row.inspectedByName ?? null,
      summary,
      results,
    } satisfies EquipmentInspectionListItem;
  });
}
