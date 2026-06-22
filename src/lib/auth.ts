import "server-only";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt, inArray, isNull } from "drizzle-orm";
import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";

import { auditLogs, permissions, rolePermissions, roles, sessions, userRoles, users } from "@/db/schema";
import { getDb } from "@/db";
import { AUTH_SESSION_COOKIE } from "@/lib/auth-constants";
import type { AuthContext } from "@/lib/rbac";

const SESSION_DAYS = 30;

type RequestContext = {
  ipAddress: string | null;
  userAgent: string | null;
};

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function generateToken() {
  return randomBytes(32).toString("base64url");
}

async function getHeaderContext(): Promise<RequestContext> {
  const headerList = await headers();
  return {
    ipAddress:
      headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      headerList.get("x-real-ip") ??
      null,
    userAgent: headerList.get("user-agent"),
  };
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export async function writeAuditLog(input: {
  userId?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  summary: string;
  metadata?: Record<string, unknown>;
}) {
  const db = getDb();
  const request = await getHeaderContext();
  await db.insert(auditLogs).values({
    userId: input.userId ?? null,
    action: input.action,
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
    summary: input.summary,
    metadata: input.metadata ?? {},
    ipAddress: request.ipAddress,
    userAgent: request.userAgent,
  });
}

export async function createSession(userId: string) {
  const db = getDb();
  const token = generateToken();
  const tokenHash = hashToken(token);
  const request = await getHeaderContext();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DAYS);

  await db.insert(sessions).values({
    userId,
    tokenHash,
    expiresAt,
    ipAddress: request.ipAddress,
    userAgent: request.userAgent,
  });

  const cookieStore = await cookies();
  cookieStore.set(AUTH_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function revokeSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_SESSION_COOKIE)?.value;
  if (!token) {
    return;
  }

  const db = getDb();
  const tokenHash = hashToken(token);
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(eq(sessions.tokenHash, tokenHash));
  
  try {
    cookieStore.delete(AUTH_SESSION_COOKIE);
  } catch {
    // Cookies cannot be modified during Server Component rendering phase.
    // This is safe to ignore as the session is already revoked in the database.
  }
}

export async function signInWithCredentials(email: string, password: string) {
  const db = getDb();
  const normalizedEmail = email.trim().toLowerCase();
  const user = await db.query.users.findFirst({
    where: eq(users.email, normalizedEmail),
  });

  if (!user || !user.isActive) {
    await writeAuditLog({
      action: "auth.login.failed",
      entityType: "user",
      summary: "Percobaan login gagal",
      metadata: { email: normalizedEmail },
    });
    return { ok: false as const, message: "Email atau kata sandi tidak cocok." };
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    await writeAuditLog({
      userId: user.id,
      action: "auth.login.failed",
      entityType: "user",
      entityId: user.id,
      summary: "Percobaan login gagal",
      metadata: { email: normalizedEmail },
    });
    return { ok: false as const, message: "Email atau kata sandi tidak cocok." };
  }

  await db
    .update(users)
    .set({ lastLoginAt: new Date(), updatedAt: new Date() })
    .where(eq(users.id, user.id));

  await createSession(user.id);
  await writeAuditLog({
    userId: user.id,
    action: "auth.login.success",
    entityType: "user",
    entityId: user.id,
    summary: "Pengguna berhasil masuk",
    metadata: { email: normalizedEmail },
  });

  return { ok: true as const, userId: user.id };
}

export async function signOutCurrentUser() {
  const session = await getCurrentAuthSession();
  if (session) {
    await writeAuditLog({
      userId: session.user.id,
      action: "auth.logout",
      entityType: "user",
      entityId: session.user.id,
      summary: "Pengguna keluar",
    });
  }
  await revokeSession();
}

export async function getCurrentAuthSession(): Promise<AuthContext | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }

  const db = getDb();
  const tokenHash = hashToken(token);
  const session = await db.query.sessions.findFirst({
    where: and(
      eq(sessions.tokenHash, tokenHash),
      gt(sessions.expiresAt, new Date()),
      isNull(sessions.revokedAt),
    ),
  });

  if (!session) {
    return null;
  }

  const user = await db.query.users.findFirst({
    where: and(eq(users.id, session.userId), eq(users.isActive, true)),
  });

  if (!user) {
    return null;
  }

  const userRoleRows = await db
    .select({
      key: roles.key,
      name: roles.name,
      description: roles.description,
    })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, user.id));

  const roleKeys = userRoleRows.length > 0 ? userRoleRows.map((role) => role.key) : [];
  const permissionRows =
    roleKeys.length === 0
      ? []
      : await db
          .selectDistinct({
            key: permissions.key,
          })
          .from(rolePermissions)
          .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
          .innerJoin(roles, eq(rolePermissions.roleId, roles.id))
          .where(inArray(roles.key, roleKeys));

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
    roles: userRoleRows,
    permissions: permissionRows.map((permission) => permission.key),
  };
}

export async function requireAuthSession() {
  const session = await getCurrentAuthSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}
