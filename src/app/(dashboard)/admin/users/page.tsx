import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { User, Key } from "lucide-react";

import { getDb } from "@/db";
import { users, roles, userRoles } from "@/db/schema";
import { getCurrentAuthSession } from "@/lib/auth";
import { isAdmin } from "@/lib/rbac";

import { UserForm } from "./user-form";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function UsersAdminPage({ searchParams }: PageProps) {
  const session = await getCurrentAuthSession();
  if (!session) {
    redirect("/login");
  }

  if (!isAdmin(session)) {
    redirect("/akses-ditolak");
  }

  const db = getDb();

  // Fetch roles options
  const availableRoles = await db
    .select({
      id: roles.id,
      name: roles.name,
      key: roles.key,
      description: roles.description,
    })
    .from(roles);

  // Fetch all users
  const userRows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      isActive: users.isActive,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(users.name);

  // Fetch user role mappings
  const userRolesList = await db
    .select({
      userId: userRoles.userId,
      roleId: userRoles.roleId,
      roleName: roles.name,
    })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id));

  // Map roles to users
  const usersWithRoles = userRows.map((user) => {
    const rolesForUser = userRolesList.filter((ur) => ur.userId === user.id);
    return {
      ...user,
      roles: rolesForUser.map((ur) => ({ id: ur.roleId, name: ur.roleName })),
    };
  });

  // Resolve search parameters for edit/reset password mode
  const resolvedSearchParams = (await searchParams) ?? {};
  const actionParam = resolvedSearchParams.action;
  const targetIdParam = resolvedSearchParams.targetId;

  const targetId = Array.isArray(targetIdParam) ? targetIdParam[0] : targetIdParam;
  const action = Array.isArray(actionParam) ? actionParam[0] : actionParam;

  let formMode: "create" | "edit" | "reset-password" = "create";
  let targetUser = null;

  if (targetId && (action === "edit" || action === "reset-password")) {
    targetUser = usersWithRoles.find((u) => u.id === targetId) ?? null;
    if (targetUser) {
      formMode = action as "edit" | "reset-password";
    }
  }

  const totalUsers = usersWithRoles.length;
  const activeCount = usersWithRoles.filter((u) => u.isActive).length;
  const inactiveCount = totalUsers - activeCount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="rounded-2xl border border-border bg-panel p-6 shadow-soft">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-600">Admin / Pengguna</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text">Manajemen pengguna</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Kelola akun operasional, atur peran dan hak akses sistem (RBAC), aktifkan/nonaktifkan akun, atau atur ulang kata sandi pengguna di sini.
        </p>
      </section>

      {/* Stats */}
      <section className="grid gap-4 md:grid-cols-4">
        <article className="rounded-2xl border border-border bg-panel p-5 shadow-soft">
          <p className="text-sm text-muted">Total Pengguna</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-text">{totalUsers}</p>
        </article>
        <article className="rounded-2xl border border-border bg-panel p-5 shadow-soft">
          <p className="text-sm text-muted font-medium text-emerald-600">Aktif</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-text">{activeCount}</p>
        </article>
        <article className="rounded-2xl border border-border bg-panel p-5 shadow-soft">
          <p className="text-sm text-muted font-medium text-amber-600">Nonaktif</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-text">{inactiveCount}</p>
        </article>
        <article className="rounded-2xl border border-border bg-panel p-5 shadow-soft">
          <p className="text-sm text-muted font-medium">Mode Pengeditan</p>
          <p className="mt-2 text-lg font-semibold tracking-tight text-accent mt-3">
            {formMode === "edit"
              ? "Ubah Data"
              : formMode === "reset-password"
              ? "Reset Kata Sandi"
              : "Tambah Pengguna Baru"}
          </p>
        </article>
      </section>

      {/* Main Grid Layout */}
      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        {/* User List Table */}
        <article className="rounded-2xl border border-border bg-panel p-6 shadow-soft space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text">Daftar Pengguna</h2>
            <Link prefetch={false}
              href="/admin/users"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-panelAlt px-3 py-1.5 text-xs font-semibold text-text transition hover:bg-panel"
            >
              Tambah Baru
            </Link>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border">
            <table className="min-w-full divide-y divide-border text-left text-sm">
              <thead className="bg-panelAlt text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Nama & Email</th>
                  <th className="px-4 py-3 font-medium">Peran</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Login Terakhir</th>
                  <th className="px-4 py-3 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-panel text-text">
                {usersWithRoles.map((user) => {
                  const isSelf = user.id === session.user.id;
                  return (
                    <tr key={user.id} className={isSelf ? "bg-accent/5" : ""}>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-semibold">{user.name} {isSelf && <span className="text-[10px] bg-accent/20 text-accent px-1.5 py-0.5 rounded-md ml-1 font-normal">Anda</span>}</p>
                          <p className="text-xs text-muted">{user.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {user.roles.map((r) => (
                            <span
                              key={r.id}
                              className="rounded-lg bg-panelAlt border border-border px-2 py-0.5 text-xs font-medium text-text"
                            >
                              {r.name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${
                            user.isActive
                              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                              : "border-slate-200 bg-slate-100 text-slate-700"
                          }`}
                        >
                          {user.isActive ? "Aktif" : "Nonaktif"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted">
                        {user.lastLoginAt ? user.lastLoginAt.toLocaleString("id-ID") : "Belum pernah"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link prefetch={false}
                            href={`/admin/users?action=edit&targetId=${user.id}`}
                            className="inline-flex h-8 px-2.5 items-center justify-center rounded-xl border border-border bg-panel text-xs font-semibold transition hover:bg-panelAlt"
                            title="Ubah"
                          >
                            Edit
                          </Link>
                          <Link prefetch={false}
                            href={`/admin/users?action=reset-password&targetId=${user.id}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-panel text-muted hover:text-text transition hover:bg-panelAlt"
                            title="Reset Kata Sandi"
                          >
                            <Key className="h-4 w-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </article>

        {/* Form Panel */}
        <aside className="rounded-2xl border border-border bg-panel p-6 shadow-soft space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-text">
                {formMode === "edit"
                  ? "Ubah data"
                  : formMode === "reset-password"
                  ? "Reset kata sandi"
                  : "Tambah pengguna"}
              </h2>
              <p className="text-xs text-muted">
                {formMode === "edit"
                  ? "Ubah profil atau peran pengguna terpilih."
                  : formMode === "reset-password"
                  ? "Tentukan kata sandi baru untuk pengguna."
                  : "Buat akun baru dengan hak akses yang ditentukan."}
              </p>
            </div>
            <div className="rounded-2xl bg-panelAlt p-3 text-accent">
              {formMode === "reset-password" ? <Key className="h-5 w-5" /> : <User className="h-5 w-5" />}
            </div>
          </div>

          <div className="pt-2">
            <UserForm
              key={`${formMode}-${targetUser?.id ?? "new"}`}
              mode={formMode}
              availableRoles={availableRoles}
              currentUserId={session.user.id}
              initialValues={
                targetUser
                  ? {
                      id: targetUser.id,
                      name: targetUser.name,
                      email: targetUser.email,
                      isActive: targetUser.isActive,
                      roleIds: targetUser.roles.map((r) => r.id),
                    }
                  : undefined
              }
              cancelHref={formMode !== "create" ? "/admin/users" : undefined}
            />
          </div>
        </aside>
      </section>
    </div>
  );
}
