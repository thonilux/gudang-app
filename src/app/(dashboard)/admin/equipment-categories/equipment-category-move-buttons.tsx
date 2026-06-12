import { ChevronDown, ChevronUp } from "lucide-react";

import { moveEquipmentCategoryAction } from "./actions";

function MoveForm({
  categoryId,
  direction,
  disabled,
}: {
  categoryId: string;
  direction: "up" | "down";
  disabled: boolean;
}) {
  const label = direction === "up" ? "Naikkan" : "Turunkan";
  const Icon = direction === "up" ? ChevronUp : ChevronDown;

  return (
    <form action={moveEquipmentCategoryAction}>
      <input type="hidden" name="id" value={categoryId} />
      <input type="hidden" name="direction" value={direction} />
      <input type="hidden" name="redirectTo" value="/admin/equipment-categories" />
      <button
        type="submit"
        disabled={disabled}
        aria-label={label}
        title={label}
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-panel text-text transition hover:bg-panelAlt disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Icon className="h-4 w-4" />
      </button>
    </form>
  );
}

export function EquipmentCategoryMoveButtons({
  categoryId,
  canMoveUp,
  canMoveDown,
}: {
  categoryId: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <MoveForm categoryId={categoryId} direction="up" disabled={!canMoveUp} />
      <MoveForm categoryId={categoryId} direction="down" disabled={!canMoveDown} />
    </div>
  );
}
