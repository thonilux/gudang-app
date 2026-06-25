import { redirect } from "next/navigation";

import { getCurrentAuthSession } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";

import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getCurrentAuthSession();
  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-soft dark:border-slate-800">
        <div className="flex flex-col items-center mb-6 text-center">
          <img src="/emji+tulisan.png" alt="EMJI Logo" className="h-16 w-auto object-contain mb-4" />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Masuk ke sistem</h1>
        </div>

        <p className="mt-4 text-center text-sm leading-6 text-slate-600 dark:text-slate-400">
          Gunakan akun operasional untuk masuk ke dashboard dan memantau kesiapan peralatan.
        </p>

        <div className="mt-6">
          <LoginForm />
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center text-[11px] text-slate-400 dark:text-slate-500">
          <p>© {new Date().getFullYear()} by emjijaya. All rights reserved.</p>
          <p className="mt-1">Developed by <span className="font-semibold text-slate-600 dark:text-slate-300">Thonilux</span></p>
        </div>
      </section>
    </main>
  );
}
