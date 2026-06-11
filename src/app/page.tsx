import {
  AlertTriangle,
  Box,
  CalendarCheck2,
  ClipboardList,
  Hammer,
  ShieldCheck,
  Activity,
} from "lucide-react";

const stats = [
  { label: "Ready equipment", value: "184", delta: "+12 this week", icon: ShieldCheck },
  { label: "Need inspection", value: "23", delta: "7 due today", icon: AlertTriangle },
  { label: "Under maintenance", value: "11", delta: "4 waiting part", icon: Hammer },
  { label: "Upcoming jobs", value: "8", delta: "Next 72 hours", icon: CalendarCheck2 },
];

const sections = [
  {
    title: "Equipment readiness",
    description: "Prioritize health, inspection, and service history before any booking leaves the warehouse.",
  },
  {
    title: "Warehouse support",
    description: "Track location hierarchy and movement, but keep serialized equipment at the center.",
  },
  {
    title: "Measurement history",
    description: "Compare raw Smaart ASCII exports against baseline and keep the result explainable.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="rounded-2xl border border-slate-200/80 bg-white/85 p-6 shadow-soft backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-teal-700">
                Gudang
              </p>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Equipment readiness dashboard
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-600">
                Maintenance-centric control for rental gear, with inspection, service history,
                event booking, and measurement tracking built around readiness.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-teal-700">
                <ClipboardList className="h-4 w-4" />
                New inspection
              </button>
              <button className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                <Box className="h-4 w-4" />
                Add equipment
              </button>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <article
                key={stat.label}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-500">{stat.label}</p>
                    <p className="mt-2 text-3xl font-semibold tracking-tight">{stat.value}</p>
                  </div>
                  <div className="rounded-2xl bg-teal-50 p-3 text-teal-700">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-4 text-sm text-slate-600">{stat.delta}</p>
              </article>
            );
          })}
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Operational focus</h2>
                <p className="mt-1 text-sm text-slate-500">
                  The first release should make readiness visible and auditable.
                </p>
              </div>
              <Activity className="h-5 w-5 text-teal-700" />
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {sections.map((section) => (
                <div key={section.title} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <h3 className="text-sm font-semibold">{section.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{section.description}</p>
                </div>
              ))}
            </div>
          </article>

          <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
            <h2 className="text-lg font-semibold">Next actions</h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              <li className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-teal-700" />
                Set up auth and role-based access.
              </li>
              <li className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-teal-700" />
                Add inspection templates per equipment category.
              </li>
              <li className="flex items-center gap-2">
                <Hammer className="h-4 w-4 text-teal-700" />
                Wire maintenance tickets and spare part usage.
              </li>
              <li className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-teal-700" />
                Prepare measurement upload and baseline comparison.
              </li>
            </ul>
          </aside>
        </section>
      </div>
    </main>
  );
}

