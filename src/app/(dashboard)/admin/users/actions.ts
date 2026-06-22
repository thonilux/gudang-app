"use server";

import { eq, and, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getDb } from "@/db";
import { users, userRoles } from "@/db/schema";
import { getCurrentAuthSession, hashPassword, writeAuditLog } from "@/lib/auth";
import { isAdmin } from "@/lib/rbac";

export type UserActionState = {
  error?: string;
  success?: boolean;
};

const userCreateSchema = z.object({
  name: z.string().trim().min(1, "Nama lengkap wajib diisi."),
  email: z.string().trim().email("Format email tidak valid."),
  password: z.string().min(6, "Kata sandi minimal 6 karakter."),
  isActive: z.boolean().default(true),
  roleIds: z.array(z.string().uuid()).min(1, "Pilih minimal satu peran/role."),
  redirectTo: z.string().trim().optional(),
});

const userUpdateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1, "Nama lengkap wajib diisi."),
  email: z.string().trim().email("Format email tidak valid."),
  isActive: z.boolean(),
  roleIds: z.array(z.string().uuid()).min(1, "Pilih minimal satu peran/role."),
  redirectTo: z.string().trim().optional(),
});

const passwordResetSchema = z.object({
  id: z.string().uuid(),
  password: z.string().min(6, "Kata sandi minimal 6 karakter."),
  redirectTo: z.string().trim().optional(),
});

async function requireAdminAccess() {
  const session = await getCurrentAuthSession();
  if (!session) {
    redirect("/login");
  }
  if (!isAdmin(session)) {
    redirect("/akses-ditolak");
  }
  return session;
}

export async function createUserAction(
  _state: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  const session = await requireAdminAccess();
  const rawRoleIds = formData.getAll("roleIds").map((val) => String(val));
  
  const parsed = userCreateSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    isActive: formData.get("isActive") === "true",
    roleIds: rawRoleIds,
    redirectTo: formData.get("redirectTo"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data pengguna tidak valid." };
  }

  const db = getDb();
  const emailLower = parsed.data.email.toLowerCase();

  // Check unique email
  const existing = await db.query.users.findFirst({
    where: eq(users.email, emailLower),
  });
  if (existing) {
    return { error: "Email sudah terdaftar." };
  }

  const hashedPassword = await hashPassword(parsed.data.password);

  try {
    const createdUser = await db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(users)
        .values({
          name: parsed.data.name,
          email: emailLower,
          passwordHash: hashedPassword,
          isActive: parsed.data.isActive,
          updatedAt: new Date(),
        })
        .returning({ id: users.id, name: users.name });

      // Insert roles
      for (const roleId of parsed.data.roleIds) {
        await tx.insert(userRoles).values({
          userId: inserted.id,
          roleId,
        });
      }

      return inserted;
    });

    await writeAuditLog({
      userId: session.user.id,
      action: "user.create",
      entityType: "user",
      entityId: createdUser.id,
      summary: `Membuat pengguna baru: ${createdUser.name} (${emailLower})`,
      metadata: {
        roleIds: parsed.data.roleIds,
      },
    });

    revalidatePath("/admin/users");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal menyimpan pengguna.";
    return { error: message };
  }
  redirect("/admin/users");
}

export async function updateUserAction(
  _state: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  const session = await requireAdminAccess();
  const rawRoleIds = formData.getAll("roleIds").map((val) => String(val));
  const userId = String(formData.get("id"));

  const parsed = userUpdateSchema.safeParse({
    id: userId,
    name: formData.get("name"),
    email: formData.get("email"),
    isActive: formData.get("isActive") === "true",
    roleIds: rawRoleIds,
    redirectTo: formData.get("redirectTo"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data pengguna tidak valid." };
  }

  // Prevent lockout: Admin cannot disable themselves
  if (parsed.data.id === session.user.id && !parsed.data.isActive) {
    return { error: "Anda tidak dapat menonaktifkan akun Anda sendiri." };
  }

  const db = getDb();
  const emailLower = parsed.data.email.toLowerCase();

  // Check unique email
  const existing = await db.query.users.findFirst({
    where: and(eq(users.email, emailLower), ne(users.id, parsed.data.id)),
  });
  if (existing) {
    return { error: "Email sudah terdaftar di akun lain." };
  }

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({
          name: parsed.data.name,
          email: emailLower,
          isActive: parsed.data.isActive,
          updatedAt: new Date(),
        })
        .where(eq(users.id, parsed.data.id));

      // Re-sync roles: delete old and insert new
      await tx.delete(userRoles).where(eq(userRoles.userId, parsed.data.id));
      for (const roleId of parsed.data.roleIds) {
        await tx.insert(userRoles).values({
          userId: parsed.data.id,
          roleId,
        });
      }
    });

    await writeAuditLog({
      userId: session.user.id,
      action: "user.update",
      entityType: "user",
      entityId: parsed.data.id,
      summary: `Memperbarui detail pengguna: ${parsed.data.name} (${emailLower})`,
      metadata: {
        roleIds: parsed.data.roleIds,
        isActive: parsed.data.isActive,
      },
    });

    revalidatePath("/admin/users");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal memperbarui pengguna.";
    return { error: message };
  }
  redirect("/admin/users");
}

export async function resetUserPasswordAction(
  _state: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  const session = await requireAdminAccess();
  
  const parsed = passwordResetSchema.safeParse({
    id: formData.get("id"),
    password: formData.get("password"),
    redirectTo: formData.get("redirectTo"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Format kata sandi tidak valid." };
  }

  const db = getDb();
  const targetUser = await db.query.users.findFirst({
    where: eq(users.id, parsed.data.id),
  });

  if (!targetUser) {
    return { error: "Pengguna tidak ditemukan." };
  }

  const hashedPassword = await hashPassword(parsed.data.password);

  try {
    await db
      .update(users)
      .set({
        passwordHash: hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(users.id, parsed.data.id));

    await writeAuditLog({
      userId: session.user.id,
      action: "user.password_reset",
      entityType: "user",
      entityId: parsed.data.id,
      summary: `Mengatur ulang kata sandi pengguna: ${targetUser.name}`,
    });

    revalidatePath("/admin/users");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal mengatur ulang kata sandi.";
    return { error: message };
  }
  redirect("/admin/users");
}
