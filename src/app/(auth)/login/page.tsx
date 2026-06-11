import { ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";

import { getCurrentAuthSession } from "@/lib/auth";

import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getCurrentAuthSession();
  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-soft">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-teal-50 p-3 text-teal-700">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-teal-700">Gudang</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Masuk ke sistem</h1>
          </div>
        </div>

        <p className="mt-4 text-sm leading-6 text-slate-600">
          Gunakan akun operasional untuk masuk ke dashboard dan memantau kesiapan peralatan.
        </p>

        <div className="mt-6">
          <LoginForm />
        </div>
      </section>
    </main>
  );
}

