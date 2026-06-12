import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, FileText, MapPin, PencilLine, ShieldAlert, ShieldCheck, ClipboardCheck } from "lucide-react";

import { getCurrentAuthSession } from "@/lib/auth";
import {
  buildEquipmentSummaryLine,
  getEquipmentDetail,
  getEquipmentStatusLabel,
  getEquipmentStatusTone,
} from "@/lib/equipment";
import { type EquipmentStatusValue } from "@/lib/equipment-shared";
import {
  getInspectionTemplatesForCategory,
  getEquipmentInspectionHistory,
  getInspectionResultLabel,
  getInspectionResultTone,
  getInspectionStatusLabel,
  getInspectionStatusTone,
} from "@/lib/inspection";
import { hasPermission } from "@/lib/rbac";

import {
  archiveEquipmentAction,
} from "../actions";
import { EquipmentInspectionForm } from "../inspection-form";
import {
  EquipmentDocumentForm,
  EquipmentLocationForm,
  EquipmentStatusForm,
  EquipmentUpsertForm,
} from "../equipment-forms";

export const dynamic = "force-dynamic";

export default async function EquipmentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ equipmentId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getCurrentAuthSession();
  if (!session) {
    redirect("/login");
  }

  if (!hasPermission(session, "equipment.read")) {
    redirect("/akses-ditolak");
  }

  const resolvedParams = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const detail = await getEquipmentDetail(resolvedParams.equipmentId);

  if (!detail) {
    notFound();
  }

  const tabRaw = resolvedSearchParams.tab;
  const activeTab = typeof tabRaw === "string" ? tabRaw : "ikhtisar";
  const tab = ["ikhtisar", "ubah", "status", "lokasi", "dokumen", "inspeksi"].includes(activeTab)
    ? activeTab
    : "ikhtisar";

  const tabItems = [
    { key: "ikhtisar", label: "Ikhtisar" },
    { key: "ubah", label: "Ubah data" },
    { key: "status", label: "Status" },
    { key: "lokasi", label: "Lokasi" },
    { key: "dokumen", label: "Dokumen" },
    { key: "inspeksi", label: "Inspeksi" },
  ];

  const inspectionTemplates =
    tab === "inspeksi" ? await getInspectionTemplatesForCategory(detail.item.categoryId) : [];
  const inspectionHistory = tab === "inspeksi" ? await getEquipmentInspectionHistory(detail.item.id) : [];

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href="/equipment"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Kembali ke daftar
            </Link>
            <p className="mt-3 text-sm font-medium uppercase tracking-[0.2em] text-teal-700">
              Detail peralatan
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">{detail.item.name}</h1>
            <p className="mt-2 text-sm text-slate-600">
              {buildEquipmentSummaryLine({
                brand: detail.item.brand,
                model: detail.item.model,
                serialNumber: detail.item.serialNumber,
                categoryName: detail.item.categoryName,
              })}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getEquipmentStatusTone(detail.item.status)}`}
            >
              {getEquipmentStatusLabel(detail.item.status)}
            </span>
            <form action={archiveEquipmentAction}>
              <input type="hidden" name="equipmentId" value={detail.item.id} />
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Arsipkan
              </button>
            </form>
          </div>
        </div>
      </section>

      <nav className="flex flex-wrap gap-2">
        {tabItems.map((item) => (
          <Link
            key={item.key}
            href={`/equipment/${detail.item.id}?tab=${item.key}`}
            className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
              tab === item.key
                ? "border-teal-600 bg-teal-600 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {tab === "ikhtisar" ? (
        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
            <h2 className="text-lg font-semibold">Ringkasan</h2>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Kode</p>
                <p className="mt-2 font-medium text-slate-900">{detail.item.code}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Kategori</p>
                <p className="mt-2 font-medium text-slate-900">{detail.item.categoryName}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Lokasi saat ini</p>
                <p className="mt-2 font-medium text-slate-900">
                  {detail.item.locationLabel ?? "Belum ditentukan"}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Nomor seri</p>
                <p className="mt-2 font-medium text-slate-900">
                  {detail.item.serialNumber ?? "Belum diisi"}
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-sm text-slate-500">Catatan kondisi</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {detail.item.conditionNote || "Belum ada catatan kondisi."}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-sm text-slate-500">Spesifikasi singkat</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {detail.item.specificationNote || "Belum ada ringkasan spesifikasi."}
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Catatan tambahan</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                {detail.item.notes || "Tidak ada catatan tambahan."}
              </p>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
            <h2 className="text-lg font-semibold">Sinyal operasional</h2>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <ShieldCheck className="h-5 w-5 text-emerald-700" />
                <p className="mt-3 text-sm text-slate-500">Inspeksi terakhir</p>
                <p className="mt-2 font-medium text-slate-900">
                  {detail.item.lastInspectionAt
                    ? detail.item.lastInspectionAt.toLocaleDateString("id-ID")
                    : "Belum tercatat"}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <ShieldAlert className="h-5 w-5 text-amber-700" />
                <p className="mt-3 text-sm text-slate-500">Jadwal berikutnya</p>
                <p className="mt-2 font-medium text-slate-900">
                  {detail.item.nextInspectionAt
                    ? detail.item.nextInspectionAt.toLocaleDateString("id-ID")
                    : "Belum dijadwalkan"}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
                <MapPin className="h-5 w-5 text-sky-700" />
                <p className="mt-3 text-sm text-slate-500">Lokasi lengkap</p>
                <p className="mt-2 font-medium text-slate-900">
                  {detail.item.locationLabel ?? "Belum ditentukan"}
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-teal-100 bg-teal-50 p-4">
              <p className="text-sm font-medium text-teal-900">Aksi cepat</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href={`/equipment/${detail.item.id}?tab=ubah`}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-medium text-teal-800 transition hover:bg-teal-100"
                >
                  <PencilLine className="h-4 w-4" />
                  Ubah data
                </Link>
                <Link
                  href={`/equipment/${detail.item.id}?tab=status`}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-medium text-teal-800 transition hover:bg-teal-100"
                >
                  Ubah status
                </Link>
                <Link
                  href={`/equipment/${detail.item.id}?tab=inspeksi`}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-medium text-teal-800 transition hover:bg-teal-100"
                >
                  <ClipboardCheck className="h-4 w-4" />
                  Inspeksi
                </Link>
              </div>
            </div>
          </article>
        </section>
      ) : null}

      {tab === "ubah" ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
          <h2 className="text-lg font-semibold">Ubah data peralatan</h2>
          <p className="mt-1 text-sm text-slate-500">
            Perubahan di sini akan tercermin ke daftar dan detail.
          </p>

          <div className="mt-6">
            <EquipmentUpsertForm
              mode="edit"
              categories={detail.categories}
              locations={detail.locations}
              initialValues={{
                id: detail.item.id,
                code: detail.item.code,
                name: detail.item.name,
                categoryId: detail.item.categoryId,
                locationId: detail.item.locationId ?? "",
                brand: detail.item.brand,
                model: detail.item.model,
                serialNumber: detail.item.serialNumber ?? "",
                status: detail.item.status as EquipmentStatusValue,
                conditionNote: detail.item.conditionNote,
                specificationNote: detail.item.specificationNote,
                notes: detail.item.notes,
                lastInspectionAt: detail.item.lastInspectionAt
                  ? detail.item.lastInspectionAt.toISOString().slice(0, 10)
                  : "",
                nextInspectionAt: detail.item.nextInspectionAt
                  ? detail.item.nextInspectionAt.toISOString().slice(0, 10)
                  : "",
              }}
            />
          </div>
        </section>
      ) : null}

      {tab === "status" ? (
        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
            <h2 className="text-lg font-semibold">Ubah status</h2>
            <p className="mt-1 text-sm text-slate-500">
              Catat perubahan status terbaru untuk peralatan ini.
            </p>

            <div className="mt-5">
              <EquipmentStatusForm
                equipmentId={detail.item.id}
                currentStatus={detail.item.status}
                redirectTo={`/equipment/${detail.item.id}?tab=status`}
              />
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
            <h2 className="text-lg font-semibold">Riwayat status</h2>
            <div className="mt-4 space-y-4">
              {detail.statusLogs.length === 0 ? (
                <p className="text-sm text-slate-500">Belum ada riwayat status.</p>
              ) : (
                detail.statusLogs.map((log) => (
                  <div key={log.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium text-slate-900">{getEquipmentStatusLabel(log.status)}</p>
                      <p className="text-xs text-slate-500">
                        {log.createdAt.toLocaleString("id-ID")}
                      </p>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{log.note ?? "Tanpa catatan."}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      Oleh {log.changedByName ?? "Sistem"}
                    </p>
                  </div>
                ))
              )}
            </div>
          </article>
        </section>
      ) : null}

      {tab === "lokasi" ? (
        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
            <h2 className="text-lg font-semibold">Ubah lokasi</h2>
            <p className="mt-1 text-sm text-slate-500">
              Lokasi sekarang akan menjadi acuan pergerakan berikutnya.
            </p>

            <div className="mt-5">
              <EquipmentLocationForm
                equipmentId={detail.item.id}
                currentLocationId={detail.item.locationId}
                locations={detail.locations}
                redirectTo={`/equipment/${detail.item.id}?tab=lokasi`}
              />
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
            <h2 className="text-lg font-semibold">Riwayat lokasi</h2>
            <div className="mt-4 space-y-4">
              {detail.locationLogs.length === 0 ? (
                <p className="text-sm text-slate-500">Belum ada perpindahan lokasi.</p>
              ) : (
                detail.locationLogs.map((log) => (
                  <div key={log.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-medium text-slate-900">
                      {log.fromLocationLabel ?? "Tanpa lokasi"}{" "}
                      <span className="text-slate-400">→</span> {log.toLocationLabel ?? "Tanpa lokasi"}
                    </p>
                    <p className="mt-2 text-sm text-slate-600">{log.note ?? "Tanpa catatan."}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      {log.createdAt.toLocaleString("id-ID")} oleh {log.changedByName ?? "Sistem"}
                    </p>
                  </div>
                ))
              )}
            </div>
          </article>
        </section>
      ) : null}

      {tab === "dokumen" ? (
        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
            <h2 className="text-lg font-semibold">Tambah dokumen</h2>
            <p className="mt-1 text-sm text-slate-500">
              Simpan foto, manual, atau file pendukung lain sebagai referensi.
            </p>

            <div className="mt-5">
              <EquipmentDocumentForm
                equipmentId={detail.item.id}
                redirectTo={`/equipment/${detail.item.id}?tab=dokumen`}
              />
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
            <h2 className="text-lg font-semibold">Dokumen tersimpan</h2>
            <div className="mt-4 space-y-4">
              {detail.documents.length === 0 ? (
                <p className="text-sm text-slate-500">Belum ada dokumen atau foto yang diunggah.</p>
              ) : (
                detail.documents.map((doc) => (
                  <div key={doc.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900">{doc.title}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                          {doc.kind}
                        </p>
                      </div>
                      <FileText className="h-5 w-5 text-slate-400" />
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{doc.fileName}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {doc.note ?? "Tanpa catatan."}
                    </p>
                  </div>
                ))
              )}
            </div>
          </article>
        </section>
      ) : null}

      {tab === "inspeksi" ? (
        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Inspeksi peralatan</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Jalankan inspeksi umum sekarang. Template bisa dipakai nanti setelah rekap kategori siap.
                </p>
              </div>
              <ShieldCheck className="h-5 w-5 text-slate-400" />
            </div>

            <div className="mt-5">
              <EquipmentInspectionForm
                equipmentId={detail.item.id}
                templates={inspectionTemplates}
                redirectTo={`/equipment/${detail.item.id}?tab=inspeksi`}
              />
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Riwayat inspeksi</h2>
              <ClipboardCheck className="h-5 w-5 text-slate-400" />
            </div>
            <div className="mt-4 space-y-4">
              {inspectionHistory.length === 0 ? (
                <p className="text-sm text-slate-500">Belum ada inspeksi tercatat.</p>
              ) : (
                inspectionHistory.map((inspection) => (
                  <div key={inspection.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900">{inspection.templateNameSnapshot}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {inspection.inspectedAt.toLocaleString("id-ID")} oleh{" "}
                          {inspection.inspectedByName ?? "Sistem"}
                        </p>
                      </div>
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getInspectionStatusTone(
                          inspection.resultStatus,
                        )}`}
                      >
                        {getInspectionStatusLabel(inspection.resultStatus)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{inspection.note ?? "Tanpa catatan."}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-600">
                        Total {inspection.summary.total}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-600">
                        Lulus {inspection.summary.passed}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-600">
                        Gagal {inspection.summary.failed}
                      </span>
                    </div>
                    <div className="mt-4 space-y-2">
                      {inspection.results.map((result) => (
                        <div
                          key={result.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2"
                        >
                          <div>
                            <p className="text-sm font-medium text-slate-900">{result.label}</p>
                            <p className="text-xs text-slate-500">
                              {result.required ? "Wajib" : "Opsional"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getInspectionResultTone(
                                result.result,
                              )}`}
                            >
                              {getInspectionResultLabel(result.result)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>
        </section>
      ) : null}
    </div>
  );
}
