import { redirect } from "next/navigation";
import { Plus, Tags, ArrowRightLeft, Sparkles } from "lucide-react";

import { getCurrentAuthSession } from "@/lib/auth";
import { getEquipmentReferenceData } from "@/lib/equipment";
import { isAdmin } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function EquipmentCategoriesAdminPage() {
  const session = await getCurrentAuthSession();
  if (!session) {
    redirect("/login");
  }

  if (!isAdmin(session)) {
    redirect("/akses-ditolak");
  }

  const referenceData = await getEquipmentReferenceData();
  const categories = referenceData.categories;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-panel p-6 shadow-soft">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-600">Admin / Kategori</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text">Kategori peralatan</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Scaffolding untuk kategori spesifik peralatan. Di fase berikutnya kita tinggal sambungkan
          form create, update, reorder, dan nonaktifkan kategori tanpa mengubah struktur halaman ini.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-border bg-panel p-5 shadow-soft">
          <p className="text-sm text-muted">Total kategori</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-text">{categories.length}</p>
          <p className="mt-4 text-sm leading-6 text-muted">Data kategori yang saat ini dipakai oleh form equipment.</p>
        </article>
        <article className="rounded-2xl border border-border bg-panel p-5 shadow-soft">
          <p className="text-sm text-muted">Status panel</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-text">Scaffold</p>
          <p className="mt-4 text-sm leading-6 text-muted">Form dan action CRUD belum dipasang, struktur layout sudah siap.</p>
        </article>
        <article className="rounded-2xl border border-border bg-panel p-5 shadow-soft">
          <p className="text-sm text-muted">Target berikutnya</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-text">CRUD</p>
          <p className="mt-4 text-sm leading-6 text-muted">Tambah, ubah, urutkan, dan nonaktifkan kategori peralatan.</p>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-2xl border border-border bg-panel p-6 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-text">Daftar kategori</h2>
              <p className="mt-1 text-sm text-muted">
                Sumber data langsung dari tabel kategori equipment.
              </p>
            </div>
            <Tags className="h-5 w-5 text-accent" />
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-border">
            <table className="min-w-full divide-y divide-border text-left text-sm">
              <thead className="bg-panelAlt text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Nama kategori</th>
                  <th className="px-4 py-3 font-medium">Catatan</th>
                  <th className="px-4 py-3 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-panel">
                {categories.length === 0 ? (
                  <tr>
                    <td className="px-4 py-5 text-muted" colSpan={3}>
                      Belum ada kategori equipment.
                    </td>
                  </tr>
                ) : (
                  categories.map((category) => (
                    <tr key={category.id}>
                      <td className="px-4 py-3 font-medium text-text">{category.label}</td>
                      <td className="px-4 py-3 text-muted">Kategori aktif untuk pilihan form peralatan.</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-panelAlt px-3 py-1 text-xs font-medium text-muted">
                          <ArrowRightLeft className="h-3.5 w-3.5" />
                          Siap
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>

        <aside className="rounded-2xl border border-border bg-panel p-6 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-panelAlt p-3 text-accent">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text">Form tambah kategori</h2>
              <p className="mt-1 text-sm text-muted">Scaffold panel kanan untuk CRUD kategori.</p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border border-border bg-panelAlt p-4">
              <p className="text-sm font-medium text-text">Field yang disiapkan</p>
              <ul className="mt-2 space-y-1 text-sm text-muted">
                <li>Nama kategori</li>
                <li>Kode singkat</li>
                <li>Urutan tampil</li>
                <li>Deskripsi</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-dashed border-border bg-panelAlt p-4 text-sm text-muted">
              Action create/update/delete akan ditambahkan setelah skema admin panel selesai.
            </div>
            <button
              type="button"
              disabled
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground opacity-70"
            >
              <Sparkles className="h-4 w-4" />
              Simpan kategori
            </button>
          </div>
        </aside>
      </section>
    </div>
  );
}
