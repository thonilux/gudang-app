export const WAREHOUSE_MOVEMENT_TYPES = [
  { value: "in", label: "Masuk" },
  { value: "out", label: "Keluar" },
  { value: "transfer", label: "Pindah lokasi" },
] as const;

export type WarehouseMovementType = (typeof WAREHOUSE_MOVEMENT_TYPES)[number]["value"];

export function getWarehouseMovementLabel(type: string) {
  switch (type) {
    case "in":
      return "Masuk";
    case "out":
      return "Keluar";
    case "transfer":
      return "Pindah lokasi";
    case "opname":
      return "Penyesuaian opname";
    case "delete":
      return "Hapus stok";
    default:
      return WAREHOUSE_MOVEMENT_TYPES.find((item) => item.value === type)?.label ?? type;
  }
}

export function getWarehouseQuantityTone(quantity: number, minimumQuantity: number) {
  if (quantity <= 0) {
    return "border-rose-200 bg-rose-50 text-rose-800";
  }

  if (quantity <= minimumQuantity) {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-800";
}
