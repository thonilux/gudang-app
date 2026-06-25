import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, ClipboardList, Clock3, PencilLine, Plus, ShieldCheck } from "lucide-react";

import { ActionModal } from "@/components/action-modal";
import { getCurrentAuthSession } from "@/lib/auth";
import { getEventOverview } from "@/lib/events";

import { EventCreateForm, EventUpsertForm } from "./events-form";

export const dynamic = "force-dynamic";

function formatDate(value: Date | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function getStatusTone(status: string) {
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

function normalizeSearchParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getCurrentAuthSession();
  if (!session) {
    redirect("/login");
  }

  const resolvedSearchParams = (await searchParams) ?? {};
  const selectedEventId = normalizeSearchParam(resolvedSearchParams.event).trim();
  if (selectedEventId) {
    redirect(`/events/${selectedEventId}?tab=detail`);
  }

  const overview = await getEventOverview();

  const summaryCards = [
    {
      label: "Total event",
      value: overview.stats.totalCount.toString(),
      note: "Semua booking yang tercatat.",
      icon: CalendarDays,
    },
    {
      label: "Draft",
      value: overview.stats.draftCount.toString(),
      note: "Event yang masih disusun.",
      icon: ClipboardList,
    },
    {
      label: "Booked",
      value: overview.stats.bookedCount.toString(),
      note: "Event yang sudah dikunci.",
      icon: ShieldCheck,
    },
    {
      label: "Loading / return",
      value: `${overview.stats.loadingCount} / ${overview.stats.returnedCount}`,
      note: "Tahap operasional di lapangan.",
      icon: Clock3,
    },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-600">Events</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Booking event</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Halaman ini dipakai untuk membuat event, lalu membuka detail operasionalnya di halaman tersendiri
          untuk booking equipment, packing list, checklist, dan rundown planning.
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

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Daftar event</h2>
            <p className="mt-1 text-sm text-slate-500">Klik nama event untuk masuk ke detail tabbed.</p>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-sm text-slate-500">{overview.events.length} item</p>
            <ActionModal
              title="Buat event"
              description="Mulai booking dengan mengisi nama event, klien, lokasi, dan waktu."
              triggerLabel="Buat event"
              triggerIcon={<Plus className="h-4 w-4" />}
            >
              <EventCreateForm />
            </ActionModal>
          </div>
        </div>

        {overview.events.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6">
            <p className="text-base font-medium text-slate-900">Belum ada event yang dibooking.</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Klik <span className="font-medium text-slate-900">Buat event</span> untuk mulai isi data
              booking. Setelah itu detail event bisa dibuka dari daftar ini.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <ActionModal
                title="Buat event"
                description="Mulai booking dengan mengisi nama event, klien, lokasi, dan waktu."
                triggerLabel="Buat event"
                triggerIcon={<Plus className="h-4 w-4" />}
              >
                <EventCreateForm />
              </ActionModal>
            </div>
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Event</th>
                  <th className="px-4 py-3 font-medium">Lokasi</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Equipment</th>
                  <th className="px-4 py-3 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {overview.events.map((event) => (
                  <tr key={event.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link prefetch={false}
                        href={`/events/${event.id}?tab=detail`}
                        className="font-medium text-slate-900 transition hover:text-blue-700"
                      >
                        {event.eventNumber}
                      </Link>
                      <Link prefetch={false}
                        href={`/events/${event.id}?tab=detail`}
                        className="mt-1 block text-xs text-slate-500 transition hover:text-blue-700"
                      >
                        {event.name}
                      </Link>
                      <p className="mt-1 text-xs text-slate-500">{event.clientName || "Tanpa klien"}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <p className="font-medium text-slate-900">{event.venueName || "-"}</p>
                      <p className="mt-1 text-xs text-slate-500">Mulai: {formatDate(event.startAt)}</p>
                      <p className="mt-1 text-xs text-slate-500">Selesai: {formatDate(event.endAt)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getStatusTone(event.status)}`}
                      >
                        {statusLabel(event.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <p className="font-medium text-slate-900">{event.equipmentCount} item</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Booking: {event.bookingCount} | Loading: {event.loadingCount} | Return: {event.returnCount}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Link prefetch={false}
                          href={`/events/${event.id}?tab=detail`}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                          Buka detail
                        </Link>
                        <ActionModal
                          title="Ubah event"
                          description="Perbarui nama, lokasi, waktu, dan status event."
                          triggerLabel="Ubah event"
                          triggerIcon={<PencilLine className="h-4 w-4" />}
                        >
                          <EventUpsertForm
                            mode="edit"
                            initialValues={{
                              id: event.id,
                              name: event.name,
                              clientName: event.clientName,
                              venueName: event.venueName,
                              status: event.status as "draft" | "booked" | "loading" | "returned" | "cancelled",
                              startDate: event.startAt ? event.startAt.toISOString().slice(0, 10) : "",
                              startTime: event.startAt ? event.startAt.toISOString().slice(11, 16) : "",
                              endDate: event.endAt ? event.endAt.toISOString().slice(0, 10) : "",
                              endTime: event.endAt ? event.endAt.toISOString().slice(11, 16) : "",
                              notes: event.notes,
                            }}
                            redirectTo={`/events/${event.id}?tab=detail`}
                          />
                        </ActionModal>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
