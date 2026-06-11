import bcrypt from "bcryptjs";
import { config as loadEnv } from "dotenv";
import { Pool } from "pg";

loadEnv({ path: ".env.local" });
loadEnv();

const permissions = [
  "dashboard.view",
  "auth.manage",
  "users.manage",
  "audit.read",
  "equipment.read",
  "equipment.write",
  "warehouse.read",
  "warehouse.write",
  "events.read",
  "events.write",
  "inspections.read",
  "inspections.write",
  "maintenance.read",
  "maintenance.write",
  "measurements.read",
  "measurements.write",
  "settings.manage",
];

const roles = [
  {
    key: "admin",
    name: "Admin",
    description: "Akses penuh sistem.",
    permissions: permissions,
  },
  {
    key: "manager",
    name: "Manajer",
    description: "Mengatur event, peralatan, dan persetujuan.",
    permissions: [
      "dashboard.view",
      "audit.read",
      "equipment.read",
      "equipment.write",
      "warehouse.read",
      "warehouse.write",
      "events.read",
      "events.write",
      "inspections.read",
      "inspections.write",
      "maintenance.read",
      "maintenance.write",
      "measurements.read",
    ],
  },
  {
    key: "engineer",
    name: "Engineer",
    description: "Menangani inspeksi, maintenance, dan pengukuran.",
    permissions: [
      "dashboard.view",
      "audit.read",
      "equipment.read",
      "inspections.read",
      "inspections.write",
      "maintenance.read",
      "maintenance.write",
      "measurements.read",
      "measurements.write",
    ],
  },
  {
    key: "warehouse",
    name: "Gudang",
    description: "Mengelola perpindahan dan barang stok.",
    permissions: [
      "dashboard.view",
      "audit.read",
      "equipment.read",
      "warehouse.read",
      "warehouse.write",
      "events.read",
      "inspections.read",
      "maintenance.read",
    ],
  },
  {
    key: "viewer",
    name: "Viewer",
    description: "Akses baca saja.",
    permissions: [
      "dashboard.view",
      "audit.read",
      "equipment.read",
      "warehouse.read",
      "events.read",
      "inspections.read",
      "maintenance.read",
      "measurements.read",
    ],
  },
];

const dbUrl = process.env.DATABASE_URL;
const email = process.env.AUTH_BOOTSTRAP_EMAIL;
const password = process.env.AUTH_BOOTSTRAP_PASSWORD;

if (!dbUrl) {
  throw new Error("DATABASE_URL wajib diisi.");
}

if (!email || !password) {
  throw new Error("AUTH_BOOTSTRAP_EMAIL dan AUTH_BOOTSTRAP_PASSWORD wajib diisi.");
}

const pool = new Pool({ connectionString: dbUrl });

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query('create extension if not exists pgcrypto;');

    for (const permission of permissions) {
      await client.query(
        `
        insert into permissions (key, name)
        values ($1, $2)
        on conflict (key) do update set name = excluded.name
      `,
        [permission, permission],
      );
    }

    for (const role of roles) {
      await client.query(
        `
        insert into roles (key, name, description)
        values ($1, $2, $3)
        on conflict (key) do update set name = excluded.name, description = excluded.description
      `,
        [role.key, role.name, role.description],
      );

      const roleRow = await client.query("select id from roles where key = $1 limit 1", [role.key]);
      const roleId = roleRow.rows[0]?.id;

      for (const permissionKey of role.permissions) {
        const permissionRow = await client.query("select id from permissions where key = $1 limit 1", [permissionKey]);
        const permissionId = permissionRow.rows[0]?.id;
        if (!roleId || !permissionId) {
          continue;
        }
        await client.query(
          `
          insert into role_permissions (role_id, permission_id)
          values ($1, $2)
          on conflict do nothing
        `,
          [roleId, permissionId],
        );
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userName = email.split("@")[0] || "Administrator";
    await client.query(
      `
      insert into users (name, email, password_hash, is_active)
      values ($1, $2, $3, true)
      on conflict (email) do update set
        name = excluded.name,
        password_hash = excluded.password_hash,
        is_active = true,
        updated_at = now()
    `,
      [userName, email.toLowerCase(), passwordHash],
    );

    const userRow = await client.query("select id from users where email = $1 limit 1", [email.toLowerCase()]);
    const userId = userRow.rows[0]?.id;
    const adminRoleRow = await client.query("select id from roles where key = 'admin' limit 1");
    const adminRoleId = adminRoleRow.rows[0]?.id;
    if (userId && adminRoleId) {
      await client.query(
        `
        insert into user_roles (user_id, role_id)
        values ($1, $2)
        on conflict do nothing
      `,
        [userId, adminRoleId],
      );
    }

    await client.query("COMMIT");
    console.log(`Seed fase 1 selesai. Akun admin: ${email.toLowerCase()}`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
