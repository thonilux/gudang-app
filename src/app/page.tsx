import { redirect } from "next/navigation";

import { getCurrentAuthSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function RootPage() {
  const session = await getCurrentAuthSession();
  redirect(session ? "/dashboard" : "/login");
}

