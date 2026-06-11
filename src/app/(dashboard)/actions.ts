"use server";

import { signOutCurrentUser } from "@/lib/auth";

export async function logoutAction() {
  await signOutCurrentUser();
}

