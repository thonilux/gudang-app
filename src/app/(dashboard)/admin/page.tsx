import Link from "next/link";
import { redirect } from "next/navigation";
import { Layers3, Settings2, Tags, Users2 } from "lucide-react";

import { getCurrentAuthSession } from "@/lib/auth";
import { getEquipmentReferenceData } from "@/lib/equipment";
import { isAdmin } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getCurrentAuthSession();
  if (!session) {
    redirect("/login");
  }

  if (!isAdmin(session)) {
    redirect("/akses-ditolak");
  }

  const referenceData = await getEquipmentReferenceData();

  const cards = [
    {
      label: "Kategori peralatan",
      value: referenceData.categories.length.toString(),
      note: "Kategori yang terdaftar untuk klasifikasi inventaris.",
      icon: Tags,
    },
    {
      label: "Template inspeksi",
      value: "Aktif",
      note: "Checklist evaluasi kelayakan aset per kategori.",
      icon: Layers3,
    },
    {
      label: "Manajemen user",
      value: "Aktif",
      note: "Pengaturan akun, perizinan, dan hak akses staf.",
      icon: Settings2,
    },
    {
      label: "Peran Anda",
      value: String(session.roles[0] ?? "-"),
      note: "Hak akses administratif yang Anda miliki saat ini.",
      icon: Users2,
    },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-panel p-6 shadow-soft">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-600">Admin</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Panel admin</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Panel administrasi untuk mengelola kategori peralatan, template checklist inspeksi, dan perizinan akses akun operasional.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.label} className="rounded-2xl border border-border bg-panel p-5 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-muted">{card.label}</p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight text-text">{card.value}</p>
                </div>
                <div className="rounded-2xl bg-panelAlt p-3 text-accent">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-muted">{card.note}</p>
            </article>
          );
        })}
      </section>

      <section className="grid gap-6">
        <article className="rounded-2xl border border-border bg-panel p-6 shadow-soft">
          <h2 className="text-lg font-semibold text-text">Shortcut admin</h2>
          <p className="mt-1 text-sm text-muted">
            Gunakan panel ini sebagai titik masuk ke modul-modul administratif sistem.
          </p>

          <div className="mt-5 space-y-3">
            <Link prefetch={false}
              href="/admin/equipment-categories"
              className="flex items-center justify-between rounded-2xl border border-border bg-panelAlt px-4 py-3 transition hover:bg-panel"
            >
              <div>
                <p className="text-sm font-medium text-text">Kategori peralatan</p>
                <p className="mt-1 text-xs text-muted">
                  Kelola kategori spesifik yang dipakai di form equipment.
                </p>
              </div>
              <Tags className="h-5 w-5 text-accent" />
            </Link>
            <Link prefetch={false}
              href="/admin/inspection-templates"
              className="flex items-center justify-between rounded-2xl border border-border bg-panelAlt px-4 py-3 transition hover:bg-panel"
            >
              <div>
                <p className="text-sm font-medium text-text">Template inspeksi</p>
                <p className="mt-1 text-xs text-muted">
                  Atur checklist inspeksi per kategori equipment.
                </p>
              </div>
              <Layers3 className="h-5 w-5 text-accent" />
            </Link>
            <Link prefetch={false}
              href="/admin/users"
              className="flex items-center justify-between rounded-2xl border border-border bg-panelAlt px-4 py-3 transition hover:bg-panel"
            >
              <div>
                <p className="text-sm font-medium text-text">Manajemen pengguna</p>
                <p className="mt-1 text-xs text-muted">
                  Kelola akun, kata sandi, peran, dan hak akses pengguna.
                </p>
              </div>
              <Users2 className="h-5 w-5 text-accent" />
            </Link>
          </div>
        </article>
      </section>
    </div>
  );
}
