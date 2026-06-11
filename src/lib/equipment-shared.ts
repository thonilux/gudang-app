export const EQUIPMENT_STATUS_OPTIONS = [
  { value: "ready", label: "Siap pakai" },
  { value: "in_use", label: "Sedang dipakai" },
  { value: "inspection_due", label: "Perlu inspeksi" },
  { value: "maintenance", label: "Perbaikan" },
  { value: "retired", label: "Pensiun" },
] as const;

export type EquipmentStatusValue = (typeof EQUIPMENT_STATUS_OPTIONS)[number]["value"];

export type EquipmentCategoryOption = {
  id: string;
  label: string;
};

export type EquipmentLocationOption = {
  id: string;
  label: string;
};

export function getEquipmentStatusLabel(status: string) {
  return EQUIPMENT_STATUS_OPTIONS.find((item) => item.value === status)?.label ?? status;
}

export function getEquipmentStatusTone(status: string) {
  switch (status) {
    case "ready":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "in_use":
      return "border-sky-200 bg-sky-50 text-sky-800";
    case "inspection_due":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "maintenance":
      return "border-rose-200 bg-rose-50 text-rose-800";
    case "retired":
      return "border-slate-200 bg-slate-100 text-slate-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

export function buildEquipmentSummaryLine(item: {
  brand: string;
  model: string;
  serialNumber: string | null;
  categoryName: string | null;
}) {
  const parts = [item.categoryName ?? "Tanpa kategori"];
  if (item.brand) {
    parts.push(item.brand);
  }
  if (item.model) {
    parts.push(item.model);
  }
  if (item.serialNumber) {
    parts.push(`SN ${item.serialNumber}`);
  }
  return parts.join(" - ");
}
