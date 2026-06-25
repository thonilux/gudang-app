import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  FileCheck2,
  Layers3,
  ListChecks,
  PencilLine,
  Plus,
  PackageSearch,
  ScrollText,
  ShieldCheck,
} from "lucide-react";

import { ActionModal } from "@/components/action-modal";
import { getCurrentAuthSession } from "@/lib/auth";
import { buildEquipmentSummaryLine, getEquipmentList } from "@/lib/equipment";
import { getEventDetail } from "@/lib/events";

import { EventUpsertForm } from "../events-form";
import { EventEquipmentBookingForm } from "./booking-form";
import { cancelEventEquipmentBookingAction } from "./booking-actions";
import { EventPackingGenerateForm } from "./packing-form";
import { ChecklistItemToggleForm, EventChecklistGenerateForm, EventWorkflowScanForm } from "./workflow-forms";

export const dynamic = "force-dynamic";

function normalizeSearchParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function formatDate(value: Date | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function splitDateTime(value: Date | null) {
  if (!value) {
    return { date: "", time: "" };
  }

  return {
    date: value.toISOString().slice(0, 10),
    time: value.toISOString().slice(11, 16),
  };
}

function getTabTone(active: boolean) {
  return active
    ? "border-blue-600 bg-blue-600 text-white"
    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50";
}

function getEventStatusTone(status: string) {
  switch (status) {
    case "draft":
      return "border-slate-200 bg-slate-100 text-slate-700";
    case "booked":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "loading":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "returned":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "cancelled":
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "draft":
      return "Draft";
    case "booked":
      return "Booked";
    case "loading":
      return "Loading";
    case "returned":
      return "Returned";
    case "cancelled":
      return "Batal";
    default:
      return status;
  }
}

function statusBadge(status: string) {
  switch (status) {
    case "done":
    case "approved":
    case "ready":
    case "completed":
    case "packed":
    case "generated":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "reserved":
    case "confirmed":
    case "booked":
    case "in_progress":
    case "loaded":
    case "returned":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "pending":
    case "draft":
      return "border-slate-200 bg-slate-100 text-slate-700";
    case "warning":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "blocked":
    case "cancelled":
    case "damaged":
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function workflowStatusLabel(status: string) {
  switch (status) {
    case "reserved":
      return "Dipesan";
    case "confirmed":
      return "Dikonfirmasi";
    case "completed":
      return "Selesai";
    case "packed":
      return "Packed";
    case "generated":
      return "Tersusun";
    case "requested":
      return "Diminta";
    case "pending":
      return "Menunggu";
    case "cancelled":
      return "Dibatalkan";
    case "done":
      return "Selesai";
    case "ready":
      return "Siap";
    case "loaded":
      return "Keluar";
    case "returned":
      return "Kembali";
    case "damaged":
      return "Rusak";
    case "draft":
      return "Draft";
    case "in_progress":
      return "Berjalan";
    default:
      return status;
  }
}

function checklistItemTone(status: string) {
  switch (status) {
    case "completed":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "pending":
      return "border-slate-200 bg-white text-slate-700";
    case "blocked":
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return statusBadge(status);
  }
}

function tabLabel(tab: string) {
  switch (tab) {
    case "detail":
      return "Detail";
    case "booking":
      return "Booking peralatan";
    case "packing":
      return "Packing list";
    case "checklist":
      return "Checklist";
    case "rundown":
      return "Rundown planning";
    default:
      return tab;
  }
}

export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getCurrentAuthSession();
  if (!session) {
    redirect("/login");
  }

  const resolvedParams = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const detail = await getEventDetail(resolvedParams.eventId);

  if (!detail) {
    notFound();
  }

  const activeTabRaw = normalizeSearchParam(resolvedSearchParams.tab);
  const activeTab = ["detail", "booking", "packing", "checklist", "rundown", "operasional"].includes(activeTabRaw)
    ? activeTabRaw
    : "detail";

  const equipmentList = activeTab === "booking" ? await getEquipmentList() : [];
  const bookedEquipmentIds = new Set(
    detail.equipmentItems.filter((item) => item.bookingStatus !== "cancelled").map((item) => item.equipmentId),
  );
  const availableEquipment = equipmentList.filter(
    (item) => item.status === "ready" && !bookedEquipmentIds.has(item.id),
  );

  const tabs = [
    { key: "detail", label: "Detail", icon: CalendarDays },
    { key: "booking", label: "Booking peralatan", icon: PackageSearch },
    { key: "packing", label: "Packing list", icon: ClipboardList },
    { key: "checklist", label: "Checklist", icon: ListChecks },
    { key: "rundown", label: "Rundown planning", icon: ScrollText },
    { key: "operasional", label: "Operasional", icon: FileCheck2 },
  ];

  const summaryCards = [
    {
      label: "Equipment",
      value: `${detail.item.equipmentCount} item`,
      note: "Item yang sudah masuk event ini.",
      icon: Layers3,
    },
    {
      label: "Booking",
      value: `${detail.item.bookingCount} item`,
      note: "Status booking yang diproses.",
      icon: PackageSearch,
    },
    {
      label: "Loading",
      value: `${detail.item.loadingCount} item`,
      note: "Item yang sedang keluar atau kembali.",
      icon: FileCheck2,
    },
    {
      label: "Checklist",
      value: `${detail.checklistGroups.length} set`,
      note: "Checklist per stage operasional.",
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <Link prefetch={false}
              href="/events"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Kembali ke daftar event
            </Link>
            <p className="mt-3 text-sm font-medium uppercase tracking-[0.2em] text-blue-600">Event detail</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">{detail.item.eventNumber}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{detail.item.name}</p>
            <p className="mt-1 text-sm text-slate-500">
              {detail.item.clientName || "Tanpa klien"} {detail.item.venueName ? `· ${detail.item.venueName}` : ""}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getEventStatusTone(detail.item.status)}`}
            >
              {statusLabel(detail.item.status)}
            </span>
            <ActionModal
              title="Ubah event"
              description="Perbarui nama, klien, lokasi, waktu, dan status event."
              triggerLabel="Ubah event"
              triggerIcon={<PencilLine className="h-4 w-4" />}
            >
              <EventUpsertForm
                mode="edit"
                initialValues={{
                  id: detail.item.id,
                  name: detail.item.name,
                  clientName: detail.item.clientName,
                  venueName: detail.item.venueName,
                  status: detail.item.status as "draft" | "booked" | "loading" | "returned" | "cancelled",
                  startDate: splitDateTime(detail.item.startAt).date,
                  startTime: splitDateTime(detail.item.startAt).time,
                  endDate: splitDateTime(detail.item.endAt).date,
                  endTime: splitDateTime(detail.item.endAt).time,
                  notes: detail.item.notes,
                }}
                redirectTo={`/events/${detail.item.id}?tab=${activeTab}`}
              />
            </ActionModal>
          </div>
        </div>
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

      <nav className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Link prefetch={false}
              key={tab.key}
              href={`/events/${detail.item.id}?tab=${tab.key}`}
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition ${getTabTone(
                activeTab === tab.key,
              )}`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {activeTab === "detail" ? (
        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
            <h2 className="text-lg font-semibold">Ikhtisar event</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Waktu mulai</p>
                <p className="mt-2 font-medium text-slate-900">{formatDate(detail.item.startAt)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Waktu selesai</p>
                <p className="mt-2 font-medium text-slate-900">{formatDate(detail.item.endAt)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Lokasi</p>
                <p className="mt-2 font-medium text-slate-900">{detail.item.venueName || "-"}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Catatan</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{detail.item.notes || "Tanpa catatan."}</p>
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
            <h2 className="text-lg font-semibold">Jalur kerja</h2>
            <div className="mt-5 space-y-3">
              <Link prefetch={false}
                href={`/events/${detail.item.id}?tab=booking`}
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 transition hover:bg-slate-100"
              >
                Booking equipment
                <Plus className="h-4 w-4" />
              </Link>
              <Link prefetch={false}
                href={`/events/${detail.item.id}?tab=packing`}
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 transition hover:bg-slate-100"
              >
                Generate packing list
                <ClipboardList className="h-4 w-4" />
              </Link>
              <Link prefetch={false}
                href={`/events/${detail.item.id}?tab=checklist`}
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 transition hover:bg-slate-100"
              >
                Generate checklist
                <ListChecks className="h-4 w-4" />
              </Link>
              <Link prefetch={false}
                href={`/events/${detail.item.id}?tab=rundown`}
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 transition hover:bg-slate-100"
              >
                Rundown planning
                <ScrollText className="h-4 w-4" />
              </Link>
            </div>
          </article>
        </section>
      ) : null}

      {activeTab === "booking" ? (
        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Booking peralatan</h2>
                <p className="mt-1 text-sm text-slate-500">Daftar item yang terkunci untuk event ini.</p>
              </div>
              <div className="flex items-center gap-2">
                <Link prefetch={false}
                  href="/equipment"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Buka equipment
                </Link>
                <ActionModal
                  title="Tambah booking"
                  description="Pilih equipment siap pakai yang masih tersedia untuk event ini."
                  triggerLabel="Tambah booking"
                  triggerIcon={<Plus className="h-4 w-4" />}
                >
                  {availableEquipment.length > 0 ? (
                    <EventEquipmentBookingForm
                      eventId={detail.item.id}
                      redirectTo={`/events/${detail.item.id}?tab=booking`}
                      equipmentOptions={availableEquipment}
                    />
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                      Tidak ada equipment siap pakai yang tersedia.
                    </div>
                  )}
                </ActionModal>
              </div>
            </div>

            <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Equipment</th>
                    <th className="px-4 py-3 font-medium">Lokasi</th>
                    <th className="px-4 py-3 font-medium">Booking</th>
                    <th className="px-4 py-3 font-medium">Packing</th>
                    <th className="px-4 py-3 font-medium">Loading</th>
                    <th className="px-4 py-3 font-medium">Return</th>
                    <th className="px-4 py-3 font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {detail.equipmentItems.length === 0 ? (
                    <tr>
                      <td className="px-4 py-8 text-sm text-slate-500" colSpan={7}>
                        Belum ada equipment yang dibooking ke event ini.
                      </td>
                    </tr>
                  ) : (
                    detail.equipmentItems.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3">
                          <Link prefetch={false}
                            href={`/equipment/${item.equipmentId}?tab=ikhtisar`}
                            className="font-medium text-slate-900 transition hover:text-blue-700"
                          >
                            {item.equipmentName}
                          </Link>
                          <p className="mt-1 text-xs text-slate-500">{item.equipmentCode}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {item.equipmentCategoryName || "-"}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          <p className="font-medium text-slate-900">{item.equipmentLocationLabel || "-"}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {buildEquipmentSummaryLine({
                              brand: item.equipmentBrand,
                              model: item.equipmentModel,
                              serialNumber: item.equipmentSerialNumber,
                              categoryName: item.equipmentCategoryName,
                            })}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusBadge(item.bookingStatus)}`}
                          >
                            {workflowStatusLabel(item.bookingStatus)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusBadge(item.packingStatus)}`}
                          >
                            {workflowStatusLabel(item.packingStatus)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusBadge(item.loadingStatus)}`}
                          >
                            {workflowStatusLabel(item.loadingStatus)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusBadge(item.returnStatus)}`}
                          >
                            {workflowStatusLabel(item.returnStatus)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {item.bookingStatus === "cancelled" ? (
                            <span className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-500">
                              Sudah dibatalkan
                            </span>
                          ) : (
                            <form action={cancelEventEquipmentBookingAction}>
                              <input type="hidden" name="eventEquipmentId" value={item.id} />
                              <input type="hidden" name="eventId" value={detail.item.id} />
                              <input type="hidden" name="redirectTo" value={`/events/${detail.item.id}?tab=booking`} />
                              <button
                                type="submit"
                                className="inline-flex items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
                              >
                                Batalkan
                              </button>
                            </form>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Equipment siap dibooking</h2>
                <p className="mt-1 text-sm text-slate-500">Hanya peralatan siap pakai yang tampil di sini.</p>
              </div>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                {availableEquipment.length} tersedia
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {availableEquipment.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                  Tidak ada equipment siap pakai yang belum dibooking.
                </div>
              ) : (
                availableEquipment.slice(0, 8).map((item) => (
                  <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="font-medium text-slate-900">{item.code} - {item.name}</p>
                      <p className="mt-1 text-sm text-slate-600">
                      {buildEquipmentSummaryLine({
                        brand: item.brand,
                        model: item.model,
                        serialNumber: item.serialNumber,
                        categoryName: item.categoryName,
                      })}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{item.locationLabel || "Tanpa lokasi"}</p>
                  </div>
                ))
              )}
            </div>
          </article>
        </section>
      ) : null}

              {activeTab === "packing" ? (
        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Packing list</h2>
                <p className="mt-2 text-sm text-slate-500">Daftar ini jadi pegangan loading team sebelum berangkat.</p>
              </div>
              {detail.packingList ? (
                <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusBadge(detail.packingList.status)}`}>
                  {workflowStatusLabel(detail.packingList.status)}
                </span>
              ) : null}
            </div>

            <div className="mt-5 space-y-3">
              {detail.packingList ? (
                detail.packingList.items.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                    Packing list sudah dibuat, tapi belum ada item.
                  </div>
                ) : (
                  detail.packingList.items.map((item, index) => (
                    <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Item {index + 1}</p>
                          <p className="mt-2 font-medium text-slate-900">{item.equipmentName}</p>
                          <p className="mt-1 text-sm text-slate-600">{item.equipmentCode}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {item.equipmentCategoryName || "-"}
                            {item.equipmentLocationLabel ? ` · ${item.equipmentLocationLabel}` : ""}
                            {item.equipmentSerialNumber ? ` · SN ${item.equipmentSerialNumber}` : ""}
                          </p>
                        </div>
                        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusBadge(item.status)}`}>
                          {workflowStatusLabel(item.status)}
                        </span>
                      </div>
                    </div>
                  ))
                )
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                  Belum ada packing list yang digenerate.
                </div>
              )}
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
            <h2 className="text-lg font-semibold">Generate packing list</h2>
            <p className="mt-2 text-sm text-slate-500">
              Generate daftar muat dari booking aktif event ini.
            </p>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Status dokumen</p>
                <p className="mt-2 font-medium text-slate-900">
                  {detail.packingList ? workflowStatusLabel(detail.packingList.status) : "Belum digenerate"}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Total item</p>
                <p className="mt-2 font-medium text-slate-900">
                  {detail.packingList?.items.length ?? detail.equipmentItems.length} item
                </p>
              </div>
            </div>
            <div className="mt-5">
              <ActionModal
                title="Generate packing list"
                description="Buat snapshot packing list dari booking aktif event ini."
                triggerLabel="Generate packing list"
                triggerIcon={<Plus className="h-4 w-4" />}
              >
                <EventPackingGenerateForm
                  eventId={detail.item.id}
                  redirectTo={`/events/${detail.item.id}?tab=packing`}
                />
              </ActionModal>
            </div>
            <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
              Packing list ini mengambil semua booking aktif saat generator dijalankan. Kalau booking berubah, generate ulang untuk memperbarui snapshot.
            </div>
          </article>
        </section>
      ) : null}

      {activeTab === "checklist" ? (
        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
            <h2 className="text-lg font-semibold">Checklist generator</h2>
            <p className="mt-2 text-sm text-slate-500">Setiap stage bisa punya checklist sendiri.</p>
            <div className="mt-5 space-y-3">
              {detail.checklistGroups.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                  Belum ada checklist yang dibuat untuk event ini.
                </div>
              ) : (
                detail.checklistGroups.map((group) => (
                  <div key={group.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900">{tabLabel(group.stage)}</p>
                        <p className="mt-1 text-sm text-slate-500">{group.note || "Tanpa catatan."}</p>
                      </div>
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusBadge(group.status)}`}>
                        {group.status}
                      </span>
                    </div>
                    <div className="mt-4 space-y-2">
                      {group.items.length === 0 ? (
                        <p className="text-sm text-slate-500">Belum ada item checklist.</p>
                      ) : (
                        group.items.map((item) => (
                          <div
                            key={item.id}
                            className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm ${checklistItemTone(
                              item.status,
                            )}`}
                          >
                            <div className="min-w-0">
                              <p className="font-medium">{item.label}</p>
                              {item.note ? <p className="mt-1 text-xs opacity-70">{item.note}</p> : null}
                            </div>
                            <ChecklistItemToggleForm
                              eventId={detail.item.id}
                              checklistId={group.id}
                              checklistItemId={item.id}
                              redirectTo={`/events/${detail.item.id}?tab=checklist`}
                              completed={item.status === "completed"}
                              label={item.status === "completed" ? "Buka lagi" : "Tandai selesai"}
                            />
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
            <h2 className="text-lg font-semibold">Rencana checklist</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Loading checklist</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  Pemeriksaan muat, kelengkapan, dan kondisi sebelum berangkat.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Return checklist</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  Pengecekan balik, kondisi rusak, dan tindak lanjut ke inspection.
                </p>
              </div>
            </div>
          </article>
        </section>
      ) : null}

      {activeTab === "rundown" ? (
        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
            <h2 className="text-lg font-semibold">Rundown planning</h2>
            <p className="mt-2 text-sm text-slate-500">Struktur waktu untuk briefing, loading, eksekusi, dan return.</p>

            <div className="mt-5 space-y-3">
              {[
                { title: "Briefing", note: "Konfirmasi briefing, PIC, dan kebutuhan akhir." },
                { title: "Loading", note: "Scan QR, verifikasi item, dan tanda tangan." },
                { title: "On site", note: "Timeline acara, blocking, dan monitoring alat." },
                { title: "Return", note: "Cek kondisi, identifikasi rusak, dan tutup event." },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-medium text-slate-900">{item.title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{item.note}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
            <h2 className="text-lg font-semibold">Waktu event</h2>
            <div className="mt-5 space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Mulai</p>
                <p className="mt-2 font-medium text-slate-900">{formatDate(detail.item.startAt)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Selesai</p>
                <p className="mt-2 font-medium text-slate-900">{formatDate(detail.item.endAt)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Catatan planning</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {detail.item.notes || "Belum ada catatan rundown."}
                </p>
              </div>
            </div>
          </article>
        </section>
      ) : null}

      {activeTab === "operasional" ? (
        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Scan loading / return</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Scan QR saat barang keluar dan saat kembali ke gudang.
                </p>
              </div>
              <FileCheck2 className="h-5 w-5 text-slate-400" />
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <ActionModal
                title="Scan loading"
                description="Catat equipment yang keluar dari gudang."
                triggerLabel="Scan loading"
                triggerIcon={<PackageSearch className="h-4 w-4" />}
              >
                <EventWorkflowScanForm
                  eventId={detail.item.id}
                  redirectTo={`/events/${detail.item.id}?tab=operasional`}
                  mode="loading"
                />
              </ActionModal>
              <ActionModal
                title="Scan return"
                description="Catat equipment yang kembali ke gudang."
                triggerLabel="Scan return"
                triggerIcon={<ArrowLeft className="h-4 w-4" />}
              >
                <EventWorkflowScanForm
                  eventId={detail.item.id}
                  redirectTo={`/events/${detail.item.id}?tab=operasional`}
                  mode="return"
                />
              </ActionModal>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Aturan scan</p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                <li>Loading mengubah booking menjadi confirmed dan equipment jadi in use.</li>
                <li>Return normal mengembalikan equipment ke ready.</li>
                <li>Return rusak otomatis membuat maintenance ticket prioritas tinggi.</li>
              </ul>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Checklist stage</h2>
                <p className="mt-1 text-sm text-slate-500">Loading diturunkan dari packing list, return tetap jadi verifikasi balik.</p>
              </div>
              <ListChecks className="h-5 w-5 text-slate-400" />
            </div>

            <div className="mt-5">
              <ActionModal
                title="Generate checklist"
                description="Buat checklist loading dari packing list aktif dan checklist return standar."
                triggerLabel="Generate checklist"
                triggerIcon={<Plus className="h-4 w-4" />}
              >
                <EventChecklistGenerateForm
                  eventId={detail.item.id}
                  redirectTo={`/events/${detail.item.id}?tab=checklist`}
                />
              </ActionModal>
            </div>

            <div className="mt-5 space-y-3">
              {detail.checklistGroups.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                  Belum ada checklist yang digenerate.
                </div>
              ) : (
                detail.checklistGroups.map((group) => (
                  <div key={group.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900">{tabLabel(group.stage)}</p>
                        <p className="mt-1 text-sm text-slate-500">{group.note || "Tanpa catatan."}</p>
                      </div>
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusBadge(group.status)}`}>
                        {workflowStatusLabel(group.status)}
                      </span>
                    </div>
                    <div className="mt-4 space-y-2">
                      {group.items.map((item) => (
                        <div
                          key={item.id}
                          className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm ${checklistItemTone(
                            item.status,
                          )}`}
                        >
                          <div className="min-w-0">
                            <p className="font-medium">{item.label}</p>
                            {item.note ? <p className="mt-1 text-xs opacity-70">{item.note}</p> : null}
                          </div>
                          <ChecklistItemToggleForm
                            eventId={detail.item.id}
                            checklistId={group.id}
                            checklistItemId={item.id}
                            redirectTo={`/events/${detail.item.id}?tab=operasional`}
                            completed={item.status === "completed"}
                            label={item.status === "completed" ? "Buka lagi" : "Tandai selesai"}
                          />
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


