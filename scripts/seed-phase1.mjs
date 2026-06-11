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

    const categories = [
      { key: "audio", name: "Audio", description: "Peralatan suara dan mixing.", sortOrder: 10 },
      { key: "video", name: "Video", description: "Peralatan kamera dan playback.", sortOrder: 20 },
      { key: "lighting", name: "Lighting", description: "Peralatan pencahayaan.", sortOrder: 30 },
    ];

    for (const category of categories) {
      await client.query(
        `
        insert into equipment_categories (key, name, description, sort_order)
        values ($1, $2, $3, $4)
        on conflict (key) do update set
          name = excluded.name,
          description = excluded.description,
          sort_order = excluded.sort_order,
          updated_at = now()
      `,
        [category.key, category.name, category.description, category.sortOrder],
      );
    }

    await client.query(
      `
      insert into equipment_locations (code, name, description, parent_location_id)
      values
        ('WH-UTAMA', 'Gudang Utama', 'Area penyimpanan utama', null),
        ('SR-01', 'Studio 01', 'Ruang kerja dan tes', null)
      on conflict (code) do update set
        name = excluded.name,
        description = excluded.description,
        parent_location_id = excluded.parent_location_id,
        updated_at = now()
    `,
    );

    const warehouseRow = await client.query(
      "select id from equipment_locations where code = 'WH-UTAMA' limit 1",
    );
    const warehouseLocationId = warehouseRow.rows[0]?.id;
    if (warehouseLocationId) {
      await client.query(
        `
        insert into equipment_locations (code, name, description, parent_location_id)
        values ($1, $2, $3, $4)
        on conflict (code) do update set
          name = excluded.name,
          description = excluded.description,
          parent_location_id = excluded.parent_location_id,
          updated_at = now()
      `,
        ["WH-UTAMA-A", "Rak A", "Rak alat audio", warehouseLocationId],
      );
    }

    const categoryRows = await client.query(
      "select id, key from equipment_categories where key in ('audio', 'video', 'lighting')",
    );
    const categoryIdByKey = Object.fromEntries(
      categoryRows.rows.map((row) => [row.key, row.id]),
    );

    const locationRows = await client.query(
      "select id, code from equipment_locations where code in ('WH-UTAMA', 'WH-UTAMA-A', 'SR-01')",
    );
    const locationIdByCode = Object.fromEntries(locationRows.rows.map((row) => [row.code, row.id]));

    const equipmentSeed = [
      {
        code: "EQ-AUD-001",
        name: "Mixer Digital 12 Channel",
        categoryKey: "audio",
        locationCode: "WH-UTAMA-A",
        brand: "Soundcraft",
        model: "Ui12",
        serialNumber: "AUD-001-2026",
        status: "ready",
        conditionNote: "Siap dipakai.",
        specificationNote: "12 channel, wifi remote.",
        notes: "Unit utama untuk setup FOH.",
      },
      {
        code: "EQ-VID-001",
        name: "Kamera 4K",
        categoryKey: "video",
        locationCode: "SR-01",
        brand: "Sony",
        model: "A7S III",
        serialNumber: "VID-001-2026",
        status: "inspection_due",
        conditionNote: "Perlu cek baterai dan sensor.",
        specificationNote: "Mirrorless 4K, low light.",
        notes: "Dipakai untuk dokumentasi event.",
      },
      {
        code: "EQ-LGT-001",
        name: "Lampu LED Panel",
        categoryKey: "lighting",
        locationCode: "WH-UTAMA",
        brand: "Godox",
        model: "SL60W",
        serialNumber: "LGT-001-2026",
        status: "maintenance",
        conditionNote: "Kabel power perlu dicek.",
        specificationNote: "Daylight LED, output stabil.",
        notes: "Satu unit sedang masuk perawatan.",
      },
    ];

    for (const item of equipmentSeed) {
      const categoryId = categoryIdByKey[item.categoryKey];
      const locationId = locationIdByCode[item.locationCode];

      await client.query(
        `
        insert into equipment (
          code,
          name,
          category_id,
          location_id,
          brand,
          model,
          serial_number,
          status,
          condition_note,
          specification_note,
          notes,
          last_status_change_at,
          metadata,
          updated_at
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now(), '{}'::jsonb, now())
        on conflict (code) do update set
          name = excluded.name,
          category_id = excluded.category_id,
          location_id = excluded.location_id,
          brand = excluded.brand,
          model = excluded.model,
          serial_number = excluded.serial_number,
          status = excluded.status,
          condition_note = excluded.condition_note,
          specification_note = excluded.specification_note,
          notes = excluded.notes,
          last_status_change_at = excluded.last_status_change_at,
          updated_at = now()
      `,
        [
          item.code,
          item.name,
          categoryId,
          locationId,
          item.brand,
          item.model,
          item.serialNumber,
          item.status,
          item.conditionNote,
          item.specificationNote,
          item.notes,
        ],
      );
    }

    const equipmentRows = await client.query(
      "select id, code, location_id from equipment where code in ('EQ-AUD-001', 'EQ-VID-001', 'EQ-LGT-001')",
    );
    const equipmentIdByCode = Object.fromEntries(
      equipmentRows.rows.map((row) => [row.code, row.id]),
    );

    for (const equipmentId of Object.values(equipmentIdByCode)) {
      await client.query("delete from equipment_status_logs where equipment_id = $1", [equipmentId]);
      await client.query("delete from equipment_location_logs where equipment_id = $1", [equipmentId]);
      await client.query("delete from equipment_documents where equipment_id = $1", [equipmentId]);
    }

    await client.query(
      `
      insert into equipment_status_logs (equipment_id, status, note, changed_by_user_id)
      values
        ($1, $2, $3, $4),
        ($5, $6, $7, $8),
        ($9, $10, $11, $12)
    `,
      [
        equipmentIdByCode["EQ-AUD-001"],
        "ready",
        "Peralatan siap dipakai.",
        userId,
        equipmentIdByCode["EQ-VID-001"],
        "inspection_due",
        "Perlu inspeksi sebelum dipakai.",
        userId,
        equipmentIdByCode["EQ-LGT-001"],
        "maintenance",
        "Sedang diperbaiki.",
        userId,
      ],
    );

    await client.query(
      `
      insert into equipment_location_logs (equipment_id, from_location_id, to_location_id, note, changed_by_user_id)
      values
        ($1, null, $2, $3, $4),
        ($5, null, $6, $7, $8),
        ($9, null, $10, $11, $12)
    `,
      [
        equipmentIdByCode["EQ-AUD-001"],
        locationIdByCode["WH-UTAMA-A"],
        "Lokasi awal peralatan.",
        userId,
        equipmentIdByCode["EQ-VID-001"],
        locationIdByCode["SR-01"],
        "Lokasi awal peralatan.",
        userId,
        equipmentIdByCode["EQ-LGT-001"],
        locationIdByCode["WH-UTAMA"],
        "Lokasi awal peralatan.",
        userId,
      ],
    );

    await client.query(
      `
      insert into equipment_documents (equipment_id, kind, title, file_name, storage_key, storage_url, note, created_by_user_id)
      values
        ($1, 'manual', 'Manual singkat mixer', 'mixer-manual.pdf', 'seed/manual/mixer-manual.pdf', 'local://seed/mixer-manual.pdf', 'Dokumen referensi', $2),
        ($3, 'photo', 'Foto kamera', 'kamera-utama.jpg', 'seed/photo/kamera-utama.jpg', 'local://seed/kamera-utama.jpg', 'Foto kondisi saat seed', $4)
    `,
      [
        equipmentIdByCode["EQ-AUD-001"],
        userId,
        equipmentIdByCode["EQ-VID-001"],
        userId,
      ],
    );

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
