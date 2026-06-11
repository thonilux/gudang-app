import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentAuthSession } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { logoutAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getCurrentAuthSession();
  if (!session) {
    redirect("/login");
  }

  if (!hasPermission(session, "dashboard.view")) {
    redirect("/akses-ditolak");
  }

  const menu = [
    { href: "/dashboard", label: "Dasbor" },
    { href: "/dashboard/equipment", label: "Peralatan" },
    { href: "/dashboard/audit", label: "Audit" },
  ];

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-teal-700">Gudang</p>
            <p className="mt-1 text-sm text-slate-500">Sistem operasional rental berbasis kesehatan peralatan</p>
          </div>

          <nav className="flex flex-wrap items-center gap-2">
            {menu.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-slate-900">{session.user.name}</p>
              <p className="text-xs text-slate-500">
                {session.roles.map((role) => role.name).join(", ")}
              </p>
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Keluar
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
