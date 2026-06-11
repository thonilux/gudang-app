import { redirect } from "next/navigation";

import { getDb } from "@/db";
import { getCurrentAuthSession } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const session = await getCurrentAuthSession();
  if (!session) {
    redirect("/login");
  }

  if (!hasPermission(session, "audit.read")) {
    redirect("/akses-ditolak");
  }

  const db = getDb();
  const logs = await db.query.auditLogs.findMany({
    orderBy: (table, { desc }) => [desc(table.createdAt)],
    limit: 20,
  });

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-teal-700">Audit</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Log audit terbaru</h1>
      <p className="mt-2 text-sm text-slate-600">
        Setiap aksi sensitif yang lewat fase 1 tercatat di sini.
      </p>

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">Waktu</th>
              <th className="px-4 py-3 font-medium">Aksi</th>
              <th className="px-4 py-3 font-medium">Ringkasan</th>
              <th className="px-4 py-3 font-medium">Entitas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {logs.length === 0 ? (
              <tr>
                <td className="px-4 py-5 text-slate-500" colSpan={4}>
                  Belum ada log audit.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id}>
                  <td className="px-4 py-3 text-slate-600">
                    {log.createdAt.toLocaleString("id-ID")}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">{log.action}</td>
                  <td className="px-4 py-3 text-slate-600">{log.summary}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {log.entityType ? `${log.entityType}${log.entityId ? ` #${log.entityId}` : ""}` : "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
