"use client";

import { useActionState } from "react";
import { Loader2, Trash2 } from "lucide-react";

import {
  deleteEquipmentCategoryAction,
  type EquipmentCategoryActionState,
} from "./actions";

export function EquipmentCategoryDeleteButton({
  categoryId,
  canDelete,
}: {
  categoryId: string;
  canDelete: boolean;
}) {
  const [state, formAction, pending] = useActionState<EquipmentCategoryActionState, FormData>(
    deleteEquipmentCategoryAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="id" value={categoryId} />
      <input type="hidden" name="redirectTo" value="/admin/equipment-categories" />
      <button
        type="submit"
        disabled={!canDelete || pending}
        className="inline-flex items-center gap-2 rounded-xl border border-border bg-panel px-3 py-2 text-sm font-medium text-text transition hover:bg-panelAlt disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        Hapus
      </button>
      {state.error ? <p className="text-xs text-rose-600">{state.error}</p> : null}
    </form>
  );
}

