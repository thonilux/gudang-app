"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { signInWithCredentials } from "@/lib/auth";

const loginSchema = z.object({
  email: z.string().email("Email tidak valid."),
  password: z.string().min(1, "Kata sandi wajib diisi."),
  next: z.string().optional(),
});

export type LoginActionState = {
  error?: string;
  email?: string;
};

export async function loginAction(
  _state: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Data login tidak valid.",
      email: String(formData.get("email") ?? ""),
    };
  }

  const result = await signInWithCredentials(parsed.data.email, parsed.data.password);
  if (!result.ok) {
    return {
      error: result.message,
      email: parsed.data.email,
    };
  }

  redirect(parsed.data.next && parsed.data.next.startsWith("/") ? parsed.data.next : "/dashboard");
}

