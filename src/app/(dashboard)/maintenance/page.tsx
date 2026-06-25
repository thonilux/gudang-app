import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CheckCircle2,
  FolderPlus,
  Package,
  Plus,
  PencilLine,
  Search,
  Trash2,
  Ticket,
  Wrench,
} from "lucide-react";

import { ActionModal } from "@/components/action-modal";
import { getCurrentAuthSession } from "@/lib/auth";
import { getEquipmentList } from "@/lib/equipment";
import { getMaintenanceOverview, getMaintenanceTicketDetail } from "@/lib/maintenance";
import { hasPermission } from "@/lib/rbac";

import {
  MaintenanceActionForm,
  MaintenanceAttachmentForm,
  MaintenancePartForm,
  MaintenancePartDeleteForm,
  MaintenancePartUsageForm,
  MaintenanceTicketCloseForm,
  MaintenanceTicketForm,
  MaintenanceVendorDeleteForm,
  MaintenanceVendorForm,
} from "./maintenance-forms";

export const dynamic = "force-dynamic";

type TicketStatusValue = "open" | "in_progress" | "waiting_parts" | "closed" | "cancelled";
type PriorityValue = "low" | "normal" | "high" | "urgent";

function normalizeSearchParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function formatDateInput(value: Date | null) {
  if (!value) {
    return "";
  }

  return value.toISOString().slice(0, 10);
}

function getStatusTone(status: string) {
  switch (status) {
    case "open":
      return "border-slate-200 bg-slate-100 text-slate-700";
    case "in_progress":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "waiting_parts":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "closed":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "cancelled":
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function getPriorityTone(priority: string) {
  switch (priority) {
    case "urgent":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "high":
      return "border-orange-200 bg-orange-50 text-orange-700";
    case "normal":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "low":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function getStatusBadgeStyle(status: string) {
  switch (status) {
    case "open":
      return {
        backgroundColor: "hsl(220 14% 92%)",
        borderColor: "hsl(220 13% 82%)",
        color: "hsl(222 47% 20%)",
      };
    case "in_progress":
      return {
        backgroundColor: "hsl(214 95% 94%)",
        borderColor: "hsl(213 92% 82%)",
        color: "hsl(221 83% 40%)",
      };
    case "waiting_parts":
      return {
        backgroundColor: "hsl(48 96% 90%)",
        borderColor: "hsl(42 87% 76%)",
        color: "hsl(25 95% 32%)",
      };
    case "closed":
      return {
        backgroundColor: "hsl(149 80% 92%)",
        borderColor: "hsl(142 71% 78%)",
        color: "hsl(158 64% 28%)",
      };
    case "cancelled":
      return {
        backgroundColor: "hsl(351 100% 95%)",
        borderColor: "hsl(351 95% 86%)",
        color: "hsl(350 84% 38%)",
      };
    default:
      return {
        backgroundColor: "hsl(220 14% 92%)",
        borderColor: "hsl(220 13% 82%)",
        color: "hsl(222 47% 20%)",
      };
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "open":
      return "Baru";
    case "in_progress":
      return "Berjalan";
    case "waiting_parts":
      return "Menunggu part";
    case "closed":
      return "Tutup";
    case "cancelled":
      return "Batal";
    default:
      return status;
  }
}

function priorityLabel(priority: string) {
  switch (priority) {
    case "urgent":
      return "Mendesak";
    case "high":
      return "Tinggi";
    case "normal":
      return "Normal";
    case "low":
      return "Rendah";
    default:
      return priority;
  }
}

function actionLabel(actionType: string) {
  switch (actionType) {
    case "diagnosis":
      return "Diagnosis";
    case "repair":
      return "Perbaikan";
    case "replacement":
      return "Penggantian";
    case "note":
      return "Catatan";
    case "test":
      return "Uji";
    default:
      return actionType;
  }
}

function attachmentLabel(kind: string, stage: string) {
  const kindLabel = kind === "photo" ? "Foto" : "Dokumen";
  const stageLabel = stage === "before" ? "Sebelum" : stage === "after" ? "Sesudah" : "Lainnya";
  return `${kindLabel} - ${stageLabel}`;
}

export default async function MaintenancePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getCurrentAuthSession();
  if (!session) {
    redirect("/login");
  }

  if (!hasPermission(session, "maintenance.read")) {
    redirect("/akses-ditolak");
  }

  const [overview, equipmentItems] = await Promise.all([getMaintenanceOverview(), getEquipmentList()]);
  const resolvedSearchParams = (await searchParams) ?? {};
  const searchQuery = normalizeSearchParam(resolvedSearchParams.q).trim().toLowerCase();
  const selectedTicketId = normalizeSearchParam(resolvedSearchParams.ticket).trim();

  const filteredTickets = searchQuery
    ? overview.tickets.filter((ticket) => {
        const haystack = [
          ticket.ticketNumber,
          ticket.subject,
          ticket.complaint,
          ticket.diagnosis,
          ticket.actionPlan,
          ticket.status,
          ticket.priority,
          ticket.equipmentCode,
          ticket.equipmentName,
          ticket.equipmentCategoryName ?? "",
          ticket.vendorName ?? "",
          ticket.openedByName ?? "",
          ticket.assignedToName ?? "",
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(searchQuery);
      })
    : overview.tickets;

  const activeTicket =
    selectedTicketId && overview.tickets.some((ticket) => ticket.id === selectedTicketId)
      ? await getMaintenanceTicketDetail(selectedTicketId)
      : filteredTickets[0]
        ? await getMaintenanceTicketDetail(filteredTickets[0].id)
        : overview.selectedTicket;

  const summaryCards = [
    {
      label: "Ticket terbuka",
      value: overview.stats.openCount.toString(),
      note: "Ticket baru yang belum ditutup.",
      icon: Ticket,
    },
    {
      label: "Sedang berjalan",
      value: overview.stats.progressCount.toString(),
      note: "Ticket yang sudah masuk proses.",
      icon: Wrench,
    },
    {
      label: "Selesai",
      value: overview.stats.closedCount.toString(),
      note: "Ticket yang sudah ditutup.",
      icon: CheckCircle2,
    },
    {
      label: "Vendor / part",
      value: `${overview.stats.vendorCount} / ${overview.stats.partCount}`,
      note: "Master data untuk tiket servis.",
      icon: Package,
    },
  ];

  const equipmentOptions = equipmentItems.map((item) => ({
    id: item.id,
    label: `${item.code} - ${item.name}`,
  }));

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-600">Maintenance</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Ticket servis dan perbaikan</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Semua complaint, diagnosis, tindakan, spare part, vendor, dan penutupan ticket dicatat
          di sini. Fase ini berdiri di atas peralatan, bukan menggantikannya.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-500">{card.label}</p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight">{card.value}</p>
                </div>
                <div className="rounded-2xl bg-blue-50 p-3 text-blue-700">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-600">{card.note}</p>
            </article>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Daftar ticket</h2>
              <p className="mt-1 text-sm text-slate-500">Ticket aktif dan riwayat servis peralatan.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-slate-500">{filteredTickets.length} item</p>
              <ActionModal
                title="Buat ticket maintenance"
                description="Buka ticket servis untuk complaint, diagnosis, atau perbaikan."
                triggerLabel="Buka form ticket"
                triggerIcon={<Plus className="h-4 w-4" />}
              >
                <MaintenanceTicketForm
                  mode="create"
                  equipmentOptions={equipmentOptions}
                  vendorOptions={overview.vendors}
                />
              </ActionModal>
            </div>
          </div>

          <form method="get" className="mt-5 flex flex-col sm:flex-row gap-3">
            <label className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                name="q"
                defaultValue={searchQuery}
                placeholder="Cari ticket, peralatan, vendor, status, atau prioritas"
                className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-600"
              />
            </label>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cari
            </button>
            {searchQuery ? (
              <Link prefetch={false}
                href="/maintenance"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Reset
              </Link>
            ) : null}
          </form>

          <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Ticket</th>
                  <th className="px-4 py-3 font-medium">Peralatan</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Prioritas</th>
                  <th className="px-4 py-3 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredTickets.length === 0 ? (
                  <tr>
                    <td className="px-4 py-5 text-slate-500" colSpan={5}>
                      {searchQuery ? "Tidak ada ticket yang cocok." : "Belum ada ticket maintenance."}
                    </td>
                  </tr>
                ) : (
                  filteredTickets.map((ticket) => {
                    const isActive = ticket.id === activeTicket.ticket?.id;
                    return (
                      <tr key={ticket.id} className={isActive ? "bg-blue-50/50" : ""}>
                        <td className="px-4 py-3">
                          <Link prefetch={false}
                            href={`/maintenance?ticket=${ticket.id}`}
                            className="font-medium text-slate-900 transition hover:text-blue-700"
                          >
                            {ticket.ticketNumber}
                          </Link>
                          <p className="mt-1 text-xs text-slate-500">{ticket.subject}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          <Link prefetch={false}
                            href={`/maintenance?ticket=${ticket.id}`}
                            className="font-medium text-slate-900 transition hover:text-blue-700"
                          >
                            {ticket.equipmentName}
                          </Link>
                          <p className="mt-1 text-xs text-slate-500">
                            {ticket.equipmentCode} - {ticket.vendorName ?? "Tanpa vendor"}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getStatusTone(ticket.status)}`}
                            style={getStatusBadgeStyle(ticket.status)}
                          >
                            {statusLabel(ticket.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getPriorityTone(ticket.priority)}`}
                          >
                            {priorityLabel(ticket.priority)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <ActionModal
                            title="Ubah ticket"
                            description="Perbarui status, diagnosis, dan biaya ticket ini."
                            triggerLabel="Ubah ticket"
                            triggerIcon={<Ticket className="h-4 w-4" />}
                          >
                            <MaintenanceTicketForm
                              mode="edit"
                              equipmentOptions={equipmentOptions}
                              vendorOptions={overview.vendors}
                              initialValues={{
                                id: ticket.id,
                                equipmentId: ticket.equipmentId,
                                vendorId:
                                  overview.vendors.find((vendor) => vendor.label === ticket.vendorName)?.id ?? "",
                                subject: ticket.subject,
                                complaint: ticket.complaint,
                                diagnosis: ticket.diagnosis,
                                actionPlan: ticket.actionPlan,
                                status: ticket.status as TicketStatusValue,
                                priority: ticket.priority as PriorityValue,
                                dueAt: formatDateInput(ticket.dueAt),
                                estimatedCost: ticket.estimatedCost,
                                actualCost: ticket.actualCost,
                              }}
                              redirectTo={`/maintenance?ticket=${ticket.id}`}
                            />
                          </ActionModal>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </article>

        <aside className="space-y-6">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Ticket aktif</h2>
                <p className="mt-1 text-sm text-slate-500">Detail ticket yang sedang dibuka.</p>
              </div>
              <Wrench className="h-5 w-5 text-slate-400" />
            </div>

            {activeTicket.ticket ? (
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Ticket</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{activeTicket.ticket.ticketNumber}</p>
                  <p className="mt-1 text-sm text-slate-600">{activeTicket.ticket.subject}</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Status</p>
                    <p className="mt-2 font-medium text-slate-900">{statusLabel(activeTicket.ticket.status)}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Prioritas</p>
                    <p className="mt-2 font-medium text-slate-900">{priorityLabel(activeTicket.ticket.priority)}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Estimasi</p>
                    <p className="mt-2 font-medium text-slate-900">
                      Rp {activeTicket.ticket.estimatedCost.toLocaleString("id-ID")}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Aktual</p>
                    <p className="mt-2 font-medium text-slate-900">
                      Rp {activeTicket.ticket.actualCost.toLocaleString("id-ID")}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Keluhan</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{activeTicket.ticket.complaint}</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Diagnosis</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {activeTicket.ticket.diagnosis || "Belum diisi."}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Rencana tindakan</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {activeTicket.ticket.actionPlan || "Belum diisi."}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <ActionModal
                    title="Tambah tindakan"
                    description="Catat diagnosis lanjutan, repair, atau test yang dilakukan."
                    triggerLabel="Tambah tindakan"
                    triggerIcon={<Wrench className="h-4 w-4" />}
                  >
                    <MaintenanceActionForm
                      ticketId={activeTicket.ticket.id}
                      redirectTo={`/maintenance?ticket=${activeTicket.ticket.id}`}
                    />
                  </ActionModal>
                  <ActionModal
                    title="Tambah lampiran"
                    description="Simpan foto before/after atau dokumen servis."
                    triggerLabel="Tambah lampiran"
                    triggerIcon={<FolderPlus className="h-4 w-4" />}
                  >
                    <MaintenanceAttachmentForm
                      ticketId={activeTicket.ticket.id}
                      redirectTo={`/maintenance?ticket=${activeTicket.ticket.id}`}
                    />
                  </ActionModal>
                  <ActionModal
                    title="Tambah pemakaian part"
                    description="Catat spare part yang dipakai pada ticket ini."
                    triggerLabel="Tambah part"
                    triggerIcon={<Package className="h-4 w-4" />}
                  >
                    <MaintenancePartUsageForm
                      ticketId={activeTicket.ticket.id}
                      partOptions={overview.parts}
                      redirectTo={`/maintenance?ticket=${activeTicket.ticket.id}`}
                    />
                  </ActionModal>
                  <ActionModal
                    title="Tutup ticket"
                    description="Set ticket menjadi closed ketika pekerjaan selesai."
                    triggerLabel="Tutup ticket"
                    triggerIcon={<CheckCircle2 className="h-4 w-4" />}
                  >
                    <MaintenanceTicketCloseForm
                      ticketId={activeTicket.ticket.id}
                      actualCost={activeTicket.ticket.actualCost}
                      redirectTo={`/maintenance?ticket=${activeTicket.ticket.id}`}
                    />
                  </ActionModal>
                </div>
              </div>
            ) : (
              <p className="mt-5 text-sm text-slate-500">Belum ada ticket maintenance.</p>
            )}
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Master maintenance</h2>
                <p className="mt-1 text-sm text-slate-500">Vendor dan part yang dipakai ticket servis.</p>
              </div>
              <Package className="h-5 w-5 text-slate-400" />
            </div>

            <div className="mt-5 grid gap-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-slate-900">Vendor aktif</p>
                  <ActionModal
                    title="Tambah vendor"
                    description="Daftarkan vendor servis atau penyedia jasa pendukung."
                    triggerLabel="Tambah vendor"
                    triggerIcon={<Plus className="h-4 w-4" />}
                  >
                    <MaintenanceVendorForm />
                  </ActionModal>
                </div>
                <div className="mt-3 space-y-2">
                  {overview.vendors.length === 0 ? (
                    <p className="text-sm text-slate-500">Belum ada vendor.</p>
                  ) : (
                    overview.vendors.slice(0, 4).map((vendor) => (
                      <div key={vendor.id} className="flex items-center justify-between gap-2 text-sm">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-700">{vendor.label}</p>
                          <p className="text-xs text-slate-500">{vendor.code}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <ActionModal
                            title="Ubah vendor"
                            description="Perbarui data vendor servis."
                            triggerLabel={`Ubah vendor ${vendor.label}`}
                            triggerIcon={<PencilLine className="h-4 w-4" />}
                          >
                            <MaintenanceVendorForm
                              mode="edit"
                              initialValues={{
                                id: vendor.id,
                                code: vendor.code,
                                name: vendor.name,
                                contactName: vendor.contactName,
                                phone: vendor.phone,
                                email: vendor.email,
                                notes: vendor.notes,
                              }}
                            />
                          </ActionModal>
                          <ActionModal
                            title="Hapus vendor"
                            description="Konfirmasi penghapusan vendor."
                            triggerLabel={`Hapus vendor ${vendor.label}`}
                            triggerIcon={<Trash2 className="h-4 w-4" />}
                          >
                            <MaintenanceVendorDeleteForm id={vendor.id} label={vendor.label} />
                          </ActionModal>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-slate-900">Part aktif</p>
                  <ActionModal
                    title="Tambah part"
                    description="Daftarkan spare part yang akan dipakai berulang."
                    triggerLabel="Tambah part"
                    triggerIcon={<Plus className="h-4 w-4" />}
                  >
                    <MaintenancePartForm />
                  </ActionModal>
                </div>
                <div className="mt-3 space-y-2">
                  {overview.parts.length === 0 ? (
                    <p className="text-sm text-slate-500">Belum ada part.</p>
                  ) : (
                    overview.parts.slice(0, 4).map((part) => (
                      <div key={part.id} className="flex items-center justify-between gap-2 text-sm">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-700">{part.label}</p>
                          <p className="text-xs text-slate-500">{part.code}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <ActionModal
                            title="Ubah part"
                            description="Perbarui data spare part maintenance."
                            triggerLabel={`Ubah part ${part.label}`}
                            triggerIcon={<PencilLine className="h-4 w-4" />}
                          >
                            <MaintenancePartForm
                              mode="edit"
                              initialValues={{
                                id: part.id,
                                code: part.code,
                                name: part.name,
                                unit: part.unit,
                                notes: part.notes,
                              }}
                            />
                          </ActionModal>
                          <ActionModal
                            title="Hapus part"
                            description="Konfirmasi penghapusan spare part."
                            triggerLabel={`Hapus part ${part.label}`}
                            triggerIcon={<Trash2 className="h-4 w-4" />}
                          >
                            <MaintenancePartDeleteForm id={part.id} label={part.label} />
                          </ActionModal>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </article>
        </aside>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Riwayat tindakan</h2>
              <p className="mt-1 text-sm text-slate-500">Langkah-langkah yang sudah dilakukan.</p>
            </div>
            <Wrench className="h-5 w-5 text-slate-400" />
          </div>
          <div className="mt-4 space-y-4">
            {activeTicket.actions.length === 0 ? (
              <p className="text-sm text-slate-500">Belum ada tindakan tercatat.</p>
            ) : (
              activeTicket.actions.map((action) => (
                <div key={action.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{actionLabel(action.actionType)}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {action.performedAt.toLocaleString("id-ID")} oleh {action.performedByName ?? "Sistem"}
                      </p>
                    </div>
                    <p className="text-sm font-medium text-slate-900">Rp {action.cost.toLocaleString("id-ID")}</p>
                  </div>
                  <p className="mt-2 text-sm text-slate-700">{action.description}</p>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Lampiran dan part</h2>
              <p className="mt-1 text-sm text-slate-500">Foto before/after, dokumen, dan spare part usage.</p>
            </div>
            <FolderPlus className="h-5 w-5 text-slate-400" />
          </div>

          <div className="mt-4 space-y-5">
            <div>
              <p className="text-sm font-medium text-slate-900">Lampiran</p>
              <div className="mt-3 space-y-3">
                {activeTicket.attachments.length === 0 ? (
                  <p className="text-sm text-slate-500">Belum ada lampiran.</p>
                ) : (
                  activeTicket.attachments.map((attachment) => (
                    <div key={attachment.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{attachment.title}</p>
                          <p className="mt-1 text-xs text-slate-500">{attachmentLabel(attachment.kind, attachment.stage)}</p>
                        </div>
                        <p className="text-xs text-slate-500">{attachment.createdAt.toLocaleString("id-ID")}</p>
                      </div>
                      <p className="mt-2 text-sm text-slate-700">{attachment.fileName}</p>
                      <p className="mt-1 text-xs text-slate-500">{attachment.note ?? "Tanpa catatan."}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-slate-900">Pemakaian part</p>
              <div className="mt-3 space-y-3">
                {activeTicket.partUsages.length === 0 ? (
                  <p className="text-sm text-slate-500">Belum ada spare part yang dipakai.</p>
                ) : (
                  activeTicket.partUsages.map((usage) => (
                    <div key={usage.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{usage.partNameSnapshot}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {usage.createdAt.toLocaleString("id-ID")} oleh {usage.createdByName ?? "Sistem"}
                          </p>
                        </div>
                        <p className="text-sm font-medium text-slate-900">
                          {usage.quantity} x Rp {usage.unitCost.toLocaleString("id-ID")}
                        </p>
                      </div>
                      <p className="mt-2 text-sm text-slate-700">{usage.note ?? "Tanpa catatan."}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
