import { redirect } from "next/navigation";

import { getCurrentAuthSession } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";

import { logoutAction } from "./actions";
import { DashboardChrome } from "./dashboard-chrome";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getCurrentAuthSession();
  if (!session) {
    redirect("/login");
  }

  if (!hasPermission(session, "dashboard.view")) {
    redirect("/akses-ditolak");
  }

  return (
    <DashboardChrome
      user={{
        name: session.user.name,
        email: session.user.email,
      }}
      roles={session.roles.map((role) => role.name)}
      isAdmin={session.roles.some((role) => role.key === "admin")}
      logoutAction={logoutAction}
    >
      {children}
    </DashboardChrome>
  );
}
