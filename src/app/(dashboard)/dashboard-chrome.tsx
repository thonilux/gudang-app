"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useMemo, useState } from "react";
import {
  ClipboardCheck,
  CalendarDays,
  type LucideIcon,
  LayoutDashboard,
  LogOut,
  Menu,
  Package2,
  Settings2,
  ShieldCheck,
  Tags,
  Wrench,
  Warehouse,
  X,
  BarChart3,
} from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";

type DashboardMenuItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

type DashboardChromeProps = {
  children: ReactNode;
  user: {
    name: string;
    email: string;
  };
  roles: string[];
  isAdmin: boolean;
  logoutAction: () => Promise<void>;
};

const MENU: DashboardMenuItem[] = [
  { href: "/dashboard", label: "Dasbor", icon: LayoutDashboard },
  { href: "/inspections", label: "Inspeksi", icon: ClipboardCheck },
  { href: "/events", label: "Events", icon: CalendarDays },
  { href: "/warehouse", label: "Warehouse", icon: Warehouse },
  { href: "/equipment", label: "Peralatan", icon: Package2 },
  { href: "/measurements", label: "Pengukuran", icon: BarChart3 },
  { href: "/bhp", label: "BHP", icon: Package2 },
  { href: "/maintenance", label: "Maintenance", icon: Wrench },
  { href: "/audit", label: "Audit", icon: ShieldCheck },
];

const ADMIN_MENU: DashboardMenuItem[] = [
  { href: "/admin", label: "Panel admin", icon: Settings2 },
  { href: "/admin/equipment-categories", label: "Kategori peralatan", icon: Tags },
  { href: "/admin/inspection-templates", label: "Template inspeksi", icon: ShieldCheck },
];

function isActivePath(pathname: string, href: string) {
  const normalized = pathname.startsWith("/dashboard/") ? pathname.replace("/dashboard", "") : pathname;
  return (
    normalized === href ||
    normalized.startsWith(`${href}/`) ||
    pathname === href ||
    pathname.startsWith(`${href}/`)
  );
}

export function DashboardChrome({ children, user, roles, isAdmin, logoutAction }: DashboardChromeProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeLabel = useMemo(() => {
    const allMenu = isAdmin ? [...MENU, ...ADMIN_MENU] : MENU;
    return allMenu.find((item) => isActivePath(pathname, item.href))?.label ?? "Dasbor";
  }, [pathname, isAdmin]);

  return (
    <div className="min-h-screen bg-surface text-text">
      <aside className="hidden xl:fixed xl:inset-y-0 xl:flex xl:w-72 xl:flex-col">
        <div className="flex h-full flex-col border-r border-border bg-panel">
          <div className="border-b border-border px-6 py-5">
            <div className="flex items-center gap-3">
              <img src="/emji+tulisan.png" alt="EMJI Logo" className="h-10 w-auto object-contain dark:brightness-110" />
            </div>
          </div>

          <nav className="flex-1 space-y-1 px-3 py-4">
            {MENU.map((item) => {
              const active = isActivePath(pathname, item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={false}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    active ? "bg-accent/10 text-accent" : "text-muted hover:bg-panelAlt hover:text-text"
                  }`}
              >
                  <Icon className={`h-4 w-4 ${active ? "text-accent" : "text-muted"}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            {isAdmin ? (
              <div className="px-3 pt-4">
                <p className="px-3 text-xs font-semibold uppercase tracking-[0.22em] text-muted">Admin</p>
                <div className="mt-2 space-y-1">
                  {ADMIN_MENU.map((item) => {
                    const active = isActivePath(pathname, item.href);
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        prefetch={false}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                          active ? "bg-accent/10 text-accent" : "text-muted hover:bg-panelAlt hover:text-text"
                        }`}
                      >
                        <Icon className={`h-4 w-4 ${active ? "text-accent" : "text-muted"}`} />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </nav>

          <div className="border-t border-border px-6 py-4">
            <div className="rounded-xl border border-border bg-panelAlt p-4">
              <p className="text-sm font-medium text-text">{user.name}</p>
              <p className="mt-1 text-xs text-muted">{user.email}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {roles.slice(0, 2).map((role) => (
                  <span key={role} className="rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-medium text-muted">
                    {role}
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-4 text-center text-[10px] text-muted">
              <p>© {new Date().getFullYear()} by emjijaya. All rights reserved.</p>
              <p className="mt-0.5">Developer: <a href="https://github.com/thonilux" target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-600 dark:text-blue-400 hover:underline">Thonilux</a></p>
            </div>
          </div>
        </div>
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 bg-slate-950/50 xl:hidden" onClick={() => setMobileOpen(false)}>
          <aside
            className="flex h-full w-[18rem] flex-col border-r border-border bg-panel shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-3">
                <img src="/emji+tulisan.png" alt="EMJI Logo" className="h-8 w-auto object-contain dark:brightness-110" />
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted"
                aria-label="Tutup navigasi"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <nav className="flex-1 space-y-1 px-3 py-4">
              {MENU.map((item) => {
                const active = isActivePath(pathname, item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={false}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                      active ? "bg-accent/10 text-accent" : "text-muted hover:bg-panelAlt hover:text-text"
                    }`}
              >
                    <Icon className={`h-4 w-4 ${active ? "text-accent" : "text-muted"}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}

              {isAdmin ? (
                <div className="px-3 pt-4">
                  <p className="px-3 text-xs font-semibold uppercase tracking-[0.22em] text-muted">Admin</p>
                  <div className="mt-2 space-y-1">
                    {ADMIN_MENU.map((item) => {
                      const active = isActivePath(pathname, item.href);
                      const Icon = item.icon;

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          prefetch={false}
                          onClick={() => setMobileOpen(false)}
                          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                            active ? "bg-accent/10 text-accent" : "text-muted hover:bg-panelAlt hover:text-text"
                          }`}
                        >
                          <Icon className={`h-4 w-4 ${active ? "text-accent" : "text-muted"}`} />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </nav>

            <div className="border-t border-border px-5 py-4">
              <div className="rounded-xl border border-border bg-panelAlt p-4">
                <p className="text-sm font-medium text-text">{user.name}</p>
                <p className="mt-1 text-xs text-muted">{user.email}</p>
                <form action={logoutAction} className="mt-4">
                  <button
                    type="submit"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-panel px-3 py-2.5 text-sm font-medium text-text transition hover:bg-panelAlt"
                  >
                    <LogOut className="h-4 w-4" />
                    Keluar
                  </button>
                </form>
              </div>
              <div className="mt-4 text-center text-[10px] text-muted">
                <p>© {new Date().getFullYear()} by emjijaya. All rights reserved.</p>
                <p className="mt-0.5">Developer: <a href="https://github.com/thonilux" target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-600 dark:text-blue-400 hover:underline">Thonilux</a></p>
              </div>
            </div>
          </aside>
        </div>
      ) : null}

      <div className="xl:pl-72">
        <header className="sticky top-0 z-30 border-b border-border bg-panel/90 backdrop-blur">
          <div className="mx-auto flex w-full max-w-7xl items-center gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-panel text-muted transition hover:bg-panelAlt xl:hidden"
              aria-label="Buka navigasi"
            >
              <Menu className="h-4 w-4" />
            </button>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-600">EMJI JAYA OPERASIONAL</p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
                <span className="font-medium text-text">{activeLabel}</span>
                <span>/</span>
                <span>{user.name}</span>
              </div>
            </div>

            <div className="hidden items-center gap-3 md:flex">
              <ThemeToggle />
              <div className="text-right">
                <p className="text-sm font-medium text-text">{user.name}</p>
                <p className="text-xs text-muted">{roles.join(", ")}</p>
              </div>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-panel px-3 py-2 text-sm font-medium text-text transition hover:bg-panelAlt"
                >
                  <LogOut className="h-4 w-4" />
                  Keluar
                </button>
              </form>
            </div>

            <div className="md:hidden">
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
          <footer className="mt-12 border-t border-border pt-6 pb-8 text-center text-xs text-muted">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p>© {new Date().getFullYear()} by emjijaya. All rights reserved.</p>
              <p>Developed with ❤️ by <a href="https://github.com/thonilux" target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-600 dark:text-blue-400 hover:underline">Thonilux</a></p>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
