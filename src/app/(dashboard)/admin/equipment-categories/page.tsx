import Link from "next/link";
import { redirect } from "next/navigation";
import { asc, sql } from "drizzle-orm";
import { ArrowRightLeft, Plus, Tags } from "lucide-react";

import { getDb } from "@/db";
import { equipment, equipmentCategories } from "@/db/schema";
import { getCurrentAuthSession } from "@/lib/auth";
import { isAdmin } from "@/lib/rbac";

import { EquipmentCategoryDeleteButton } from "./equipment-category-delete-button";
import { EquipmentCategoryForm } from "./equipment-category-form";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function EquipmentCategoriesAdminPage({ searchParams }: PageProps) {
  const session = await getCurrentAuthSession();
  if (!session) {
    redirect("/login");
  }

  if (!isAdmin(session)) {
    redirect("/akses-ditolak");
  }

  const db = getDb();
  const [categories, usageRows] = await Promise.all([
    db
      .select({
        id: equipmentCategories.id,
        key: equipmentCategories.key,
        name: equipmentCategories.name,
        description: equipmentCategories.description,
        sortOrder: equipmentCategories.sortOrder,
        createdAt: equipmentCategories.createdAt,
        updatedAt: equipmentCategories.updatedAt,
      })
      .from(equipmentCategories)
      .orderBy(asc(equipmentCategories.sortOrder), asc(equipmentCategories.name)),
    db
      .select({
        categoryId: equipment.categoryId,
        count: sql<number>`count(*)::int`,
      })
      .from(equipment)
      .groupBy(equipment.categoryId),
  ]);

  const usageByCategoryId = Object.fromEntries(
    usageRows.map((row) => [row.categoryId, row.count]),
  ) as Record<string, number>;

  const resolvedSearchParams = (await searchParams) ?? {};
  const editParam = resolvedSearchParams.edit;
  const editId = Array.isArray(editParam) ? editParam[0] ?? "" : editParam ?? "";
  const editingCategory = categories.find((category) => category.id === editId) ?? null;

  const totalUsed = categories.filter((category) => (usageByCategoryId[category.id] ?? 0) > 0).length;
  const totalUnused = categories.length - totalUsed;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-panel p-6 shadow-soft">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-600">Admin / Equipment</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text">Kategori peralatan</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Panel ini mengelola kategori spesifik yang dipakai oleh form peralatan. Kamu bisa tambah,
          ubah, dan hapus kategori tanpa menyentuh struktur form inventaris.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <article className="rounded-2xl border border-border bg-panel p-5 shadow-soft">
          <p className="text-sm text-muted">Total kategori</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-text">{categories.length}</p>
        </article>
        <article className="rounded-2xl border border-border bg-panel p-5 shadow-soft">
          <p className="text-sm text-muted">Dipakai peralatan</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-text">{totalUsed}</p>
        </article>
        <article className="rounded-2xl border border-border bg-panel p-5 shadow-soft">
          <p className="text-sm text-muted">Siap dihapus</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-text">{totalUnused}</p>
        </article>
        <article className="rounded-2xl border border-border bg-panel p-5 shadow-soft">
          <p className="text-sm text-muted">Mode panel</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-text">
            {editingCategory ? "Edit" : "Tambah"}
          </p>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-2xl border border-border bg-panel p-6 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-text">Daftar kategori</h2>
              <p className="mt-1 text-sm text-muted">
                Urutan ditentukan oleh nilai sort order, lalu nama kategori.
              </p>
            </div>
            <Tags className="h-5 w-5 text-accent" />
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-border">
            <table className="min-w-full divide-y divide-border text-left text-sm">
              <thead className="bg-panelAlt text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Kategori</th>
                  <th className="px-4 py-3 font-medium">Key</th>
                  <th className="px-4 py-3 font-medium">Dipakai</th>
                  <th className="px-4 py-3 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-panel">
                {categories.length === 0 ? (
                  <tr>
                    <td className="px-4 py-5 text-muted" colSpan={4}>
                      Belum ada kategori equipment.
                    </td>
                  </tr>
                ) : (
                  categories.map((category) => {
                    const usageCount = usageByCategoryId[category.id] ?? 0;
                    const canDelete = usageCount === 0;
                    return (
                      <tr key={category.id}>
                        <td className="px-4 py-3">
                          <p className="font-medium text-text">{category.name}</p>
                          <p className="mt-1 text-xs text-muted">{category.description || "Tanpa deskripsi"}</p>
                        </td>
                        <td className="px-4 py-3 text-muted">
                          <code className="rounded-lg border border-border bg-panelAlt px-2 py-1 text-xs">
                            {category.key}
                          </code>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-panelAlt px-3 py-1 text-xs font-medium text-muted">
                            <ArrowRightLeft className="h-3.5 w-3.5" />
                            {usageCount} item
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={`/admin/equipment-categories?edit=${category.id}`}
                              className="inline-flex items-center justify-center rounded-xl border border-border bg-panel px-3 py-2 text-sm font-medium text-text transition hover:bg-panelAlt"
                            >
                              Ubah
                            </Link>
                            <EquipmentCategoryDeleteButton
                              categoryId={category.id}
                              canDelete={canDelete}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </article>

        <aside className="rounded-2xl border border-border bg-panel p-6 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-text">
                {editingCategory ? "Ubah kategori" : "Tambah kategori"}
              </h2>
              <p className="mt-1 text-sm text-muted">
                Form ini siap dipakai untuk create dan update kategori equipment.
              </p>
            </div>
            <div className="rounded-2xl bg-panelAlt p-3 text-accent">
              <Plus className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-5">
            <EquipmentCategoryForm
              mode={editingCategory ? "edit" : "create"}
              initialValues={
                editingCategory
                  ? {
                      id: editingCategory.id,
                      key: editingCategory.key,
                      name: editingCategory.name,
                      description: editingCategory.description ?? "",
                      sortOrder: String(editingCategory.sortOrder),
                    }
                  : undefined
              }
            />
          </div>
        </aside>
      </section>
    </div>
  );
}
