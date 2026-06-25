"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import {
  createUserAction,
  updateUserAction,
  resetUserPasswordAction,
  type UserActionState,
} from "./actions";

type RoleOption = {
  id: string;
  name: string;
  key: string;
  description: string | null;
};

type UserFormValues = {
  id?: string;
  name: string;
  email: string;
  isActive: boolean;
  roleIds: string[];
};

const emptyValues: UserFormValues = {
  name: "",
  email: "",
  isActive: true,
  roleIds: [],
};

interface UserFormProps {
  mode: "create" | "edit" | "reset-password";
  initialValues?: Partial<UserFormValues>;
  availableRoles: RoleOption[];
  onSuccess?: () => void;
  cancelHref?: string;
  currentUserId?: string; // used to prevent admin from disabling themselves
}

export function UserForm({
  mode,
  initialValues,
  availableRoles,
  onSuccess,
  cancelHref,
  currentUserId,
}: UserFormProps) {
  const [state, formAction, pending] = useActionState<UserActionState, FormData>(
    mode === "create"
      ? createUserAction
      : mode === "edit"
      ? updateUserAction
      : resetUserPasswordAction,
    {},
  );

  const [values, setValues] = useState<UserFormValues>({
    ...emptyValues,
    ...initialValues,
  });

  useEffect(() => {
    setValues({
      ...emptyValues,
      ...initialValues,
    });
  }, [initialValues]);

  // Handle successful form submission
  useEffect(() => {
    if (state.success && onSuccess) {
      onSuccess();
    }
  }, [state.success, onSuccess]);

  const toggleRole = (roleId: string) => {
    setValues((prev) => {
      const exists = prev.roleIds.includes(roleId);
      const nextRoleIds = exists
        ? prev.roleIds.filter((id) => id !== roleId)
        : [...prev.roleIds, roleId];
      return { ...prev, roleIds: nextRoleIds };
    });
  };

  return (
    <form action={formAction} className="space-y-5">
      {mode !== "create" && <input type="hidden" name="id" value={values.id ?? ""} />}
      <input type="hidden" name="redirectTo" value="/admin/users" />

      {mode === "reset-password" ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-panelAlt p-4 text-sm text-muted">
            Mengatur ulang kata sandi untuk pengguna <span className="font-semibold text-text">{values.name}</span> ({values.email}).
          </div>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-text">Kata sandi baru</span>
            <input
              type="password"
              name="password"
              className="w-full rounded-xl border border-border bg-panel px-4 py-3 text-sm outline-none transition focus:border-accent text-text"
              placeholder="Minimal 6 karakter"
              required
              minLength={6}
            />
          </label>
        </div>
      ) : (
        <div className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-text">Nama lengkap</span>
            <input
              type="text"
              name="name"
              value={values.name}
              onChange={(e) => setValues((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full rounded-xl border border-border bg-panel px-4 py-3 text-sm outline-none transition focus:border-accent text-text"
              placeholder="Contoh: John Doe"
              required
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-text">Alamat email</span>
            <input
              type="email"
              name="email"
              value={values.email}
              onChange={(e) => setValues((prev) => ({ ...prev, email: e.target.value }))}
              className="w-full rounded-xl border border-border bg-panel px-4 py-3 text-sm outline-none transition focus:border-accent text-text"
              placeholder="Contoh: user@gudang.local"
              required
            />
          </label>

          {mode === "create" && (
            <label className="block space-y-2">
              <span className="text-sm font-medium text-text">Kata sandi</span>
              <input
                type="password"
                name="password"
                className="w-full rounded-xl border border-border bg-panel px-4 py-3 text-sm outline-none transition focus:border-accent text-text"
                placeholder="Minimal 6 karakter"
                required
                minLength={6}
              />
            </label>
          )}

          <div className="space-y-2">
            <span className="text-sm font-medium text-text block">Peran (Roles)</span>
            <p className="text-xs text-muted mb-2">Pilih peran/akses yang diizinkan untuk pengguna ini:</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {availableRoles.map((role) => {
                const isSelected = values.roleIds.includes(role.id);
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => toggleRole(role.id)}
                    className={`flex flex-col items-start text-left p-3 rounded-xl border transition ${
                      isSelected
                        ? "border-accent bg-accent/5 text-text"
                        : "border-border bg-panel hover:bg-panelAlt text-text"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        readOnly
                        name="roleIds"
                        value={role.id}
                        className="rounded border-border text-accent focus:ring-accent h-4 w-4"
                      />
                      <span className="text-sm font-medium">{role.name}</span>
                    </div>
                    {role.description && (
                      <p className="mt-1 text-xs text-muted leading-tight">{role.description}</p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-panel">
            <div>
              <span className="text-sm font-medium text-text block">Status akun</span>
              <p className="text-xs text-muted">Akun nonaktif tidak akan bisa masuk ke sistem.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="isActive"
                value="true"
                checked={values.isActive}
                disabled={mode === "edit" && values.id === currentUserId}
                onChange={(e) => setValues((prev) => ({ ...prev, isActive: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent disabled:opacity-50"></div>
            </label>
          </div>
          {mode === "edit" && values.id === currentUserId && (
            <p className="text-xs text-rose-500">Anda tidak dapat menonaktifkan akun Anda sendiri untuk mencegah lockout.</p>
          )}
        </div>
      )}

      {state.error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.error}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row pt-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {mode === "create"
            ? "Buat pengguna"
            : mode === "edit"
            ? "Simpan perubahan"
            : "Reset kata sandi"}
        </button>

        {cancelHref && (
          <Link prefetch={false}
            href={cancelHref}
            className="inline-flex items-center justify-center rounded-xl border border-border bg-panel px-4 py-3 text-sm font-semibold text-text transition hover:bg-panelAlt"
          >
            Batal
          </Link>
        )}
      </div>
    </form>
  );
}
