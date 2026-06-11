import Link from "next/link";

export default function AccessDeniedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-soft">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-teal-700">
          Akses ditolak
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">
          Anda tidak punya izin untuk membuka halaman ini.
        </h1>
        <p className="mt-4 text-sm leading-6 text-slate-600">
          Silakan kembali ke dashboard atau hubungi admin jika akses ini seharusnya tersedia
          untuk akun Anda.
        </p>
        <div className="mt-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700"
          >
            Kembali ke dasbor
          </Link>
        </div>
      </section>
    </main>
  );
}

