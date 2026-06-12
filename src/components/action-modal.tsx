"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { PencilLine, X } from "lucide-react";

export function ActionModal({
  title,
  description,
  triggerLabel,
  triggerIcon,
  children,
}: {
  title: string;
  description: string;
  triggerLabel: string;
  triggerIcon?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={triggerLabel}
        title={triggerLabel}
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-panel text-text transition hover:bg-panelAlt"
      >
        {triggerIcon ?? <PencilLine className="h-4 w-4" />}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setOpen(false);
            }
          }}
        >
          <div className="w-full max-w-2xl overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Formulir</p>
                <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
                aria-label="Tutup modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[calc(100vh-10rem)] overflow-auto px-6 py-6">{children}</div>
          </div>
        </div>
      ) : null}
    </>
  );
}
