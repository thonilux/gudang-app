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
    key: "qc",
    name: "QC",
    description: "Quality control untuk inspeksi, return, dan tindak lanjut.",
    permissions: [
      "dashboard.view",
      "audit.read",
      "equipment.read",
      "events.read",
      "events.write",
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
      "inspections.write",
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
const qcEmail = process.env.AUTH_QC_EMAIL ?? "qc@gudang.local";
const qcPassword = process.env.AUTH_QC_PASSWORD ?? "QCTest!2026";

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

    const adminPasswordHash = await bcrypt.hash(password, 10);
    const adminName = email.split("@")[0] || "Administrator";
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
      [adminName, email.toLowerCase(), adminPasswordHash],
    );

    const userRow = await client.query("select id from users where email = $1 limit 1", [email.toLowerCase()]);
    const adminUserId = userRow.rows[0]?.id;
    const userId = adminUserId;
    const adminRoleRow = await client.query("select id from roles where key = 'admin' limit 1");
    const adminRoleId = adminRoleRow.rows[0]?.id;
    if (adminUserId && adminRoleId) {
      await client.query(
        `
        insert into user_roles (user_id, role_id)
        values ($1, $2)
        on conflict do nothing
      `,
        [adminUserId, adminRoleId],
      );
    }

    const qcPasswordHash = await bcrypt.hash(qcPassword, 10);
    const qcName = "QC";
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
      [qcName, qcEmail.toLowerCase(), qcPasswordHash],
    );

    const qcUserRow = await client.query("select id from users where email = $1 limit 1", [qcEmail.toLowerCase()]);
    const qcUserId = qcUserRow.rows[0]?.id;
    const qcRoleRow = await client.query("select id from roles where key = 'qc' limit 1");
    const qcRoleId = qcRoleRow.rows[0]?.id;
    if (qcUserId && qcRoleId) {
      await client.query(
        `
        insert into user_roles (user_id, role_id)
        values ($1, $2)
        on conflict do nothing
      `,
        [qcUserId, qcRoleId],
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

    const equipmentCategoriesSeed = [
      { key: "audio-speaker", name: "Speaker", description: "Speaker pasif dan aktif.", sortOrder: 10 },
      { key: "audio-processing", name: "Audio Processing", description: "DSP, DLMS, dan distributor audio.", sortOrder: 20 },
      { key: "audio-cable", name: "Kabel & Konektor", description: "Snake cable dan konektor.", sortOrder: 30 },
      { key: "audio-mixer", name: "Mixer", description: "Console dan mixer digital.", sortOrder: 40 },
      { key: "audio-wireless", name: "Wireless", description: "Sistem wireless microphone.", sortOrder: 50 },
      { key: "power", name: "Power", description: "UPS dan cadangan daya.", sortOrder: 60 },
      { key: "audio", name: "Audio", description: "Peralatan suara dan mixing.", sortOrder: 70 },
      { key: "video", name: "Video", description: "Peralatan kamera dan playback.", sortOrder: 80 },
      { key: "lighting", name: "Lighting", description: "Peralatan pencahayaan.", sortOrder: 90 },
    ];

    for (const category of equipmentCategoriesSeed) {
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

    const categoryRows = await client.query(
      "select id, key from equipment_categories where key in ('audio-speaker', 'audio-processing', 'audio-cable', 'audio-mixer', 'audio-wireless', 'power', 'audio', 'video', 'lighting')",
    );
    const categoryIdByKey = Object.fromEntries(
      categoryRows.rows.map((row) => [row.key, row.id]),
    );

    const locationRows = await client.query(
      "select id, code from equipment_locations where code in ('WH-UTAMA', 'WH-UTAMA-A', 'SR-01')",
    );
    const locationIdByCode = Object.fromEntries(locationRows.rows.map((row) => [row.code, row.id]));

    const equipmentSeed = [
      ...Array.from({ length: 12 }, (_, index) => {
        const number = String(index + 1).padStart(3, "0");
        return {
          code: `MSCOP${number}`,
          name: 'Speaker Miniscoop 18"',
          categoryKey: "audio-speaker",
          locationCode: "WH-UTAMA-A",
          brand: "Miniscoop",
          model: '18"',
          serialNumber: `MSCOP${number}`,
          status: "ready",
          conditionNote: "Siap dipakai.",
          specificationNote: 'Speaker miniscoop 18".',
          notes: "Aset unik speaker miniscoop.",
        };
      }),
      ...Array.from({ length: 6 }, (_, index) => {
        const number = String(index + 3).padStart(3, "0");
        return {
          code: `CLA${number}`,
          name: 'Speaker CLA 18"',
          categoryKey: "audio-speaker",
          locationCode: "WH-UTAMA-A",
          brand: "CLA",
          model: '18"',
          serialNumber: `CLA${number}`,
          status: "ready",
          conditionNote: "Siap dipakai.",
          specificationNote: 'Speaker CLA 18".',
          notes: "Aset unik speaker CLA.",
        };
      }),
      ...Array.from({ length: 12 }, (_, index) => {
        const number = String(index + 1).padStart(3, "0");
        return {
          code: `RX112-${number}`,
          name: "Line Array Wisdom RX112",
          categoryKey: "audio-speaker",
          locationCode: "WH-UTAMA-A",
          brand: "Wisdom",
          model: "RX112",
          serialNumber: `RX112-${number}`,
          status: "ready",
          conditionNote: "Siap dipakai.",
          specificationNote: "Line array Wisdom RX112.",
          notes: "Aset unik line array.",
        };
      }),
      ...Array.from({ length: 4 }, (_, index) => {
        const number = String(index + 1).padStart(3, "0");
        return {
          code: `CAF${number}`,
          name: 'Speaker 2x15"',
          categoryKey: "audio-speaker",
          locationCode: "WH-UTAMA-A",
          brand: "CAF",
          model: '2x15"',
          serialNumber: `CAF${number}`,
          status: "ready",
          conditionNote: "Siap dipakai.",
          specificationNote: 'Speaker 2x15".',
          notes: "Aset unik speaker 2x15.",
        };
      }),
      ...Array.from({ length: 2 }, (_, index) => {
        const number = String(index + 1).padStart(3, "0");
        return {
          code: `ALTO${number}`,
          name: "Speaker Aktif Alto",
          categoryKey: "audio-speaker",
          locationCode: "WH-UTAMA-A",
          brand: "Alto",
          model: "Active Speaker",
          serialNumber: `ALTO${number}`,
          status: "ready",
          conditionNote: "Siap dipakai.",
          specificationNote: "Speaker aktif merk Alto.",
          notes: "Aset unik speaker aktif Alto.",
        };
      }),
      ...Array.from({ length: 6 }, (_, index) => {
        const number = String(index + 1).padStart(3, "0");
        return {
          code: `B3${number}`,
          name: "Speaker Aktif Beta3",
          categoryKey: "audio-speaker",
          locationCode: "WH-UTAMA-A",
          brand: "Beta3",
          model: "Active Speaker",
          serialNumber: `B3${number}`,
          status: "ready",
          conditionNote: "Siap dipakai.",
          specificationNote: "Speaker aktif merk Beta3.",
          notes: "Aset unik speaker aktif Beta3.",
        };
      }),
      ...Array.from({ length: 8 }, (_, index) => {
        const number = String(index + 1).padStart(3, "0");
        return {
          code: `TRB${number}`,
          name: 'Speaker Turbo 15"',
          categoryKey: "audio-speaker",
          locationCode: "WH-UTAMA-A",
          brand: "Turbo",
          model: '15"',
          serialNumber: `TRB${number}`,
          status: "ready",
          conditionNote: "Siap dipakai.",
          specificationNote: 'Speaker turbo 15".',
          notes: "Aset unik speaker turbo.",
        };
      }),
      {
        code: "SNK001",
        name: "Snake Cable",
        categoryKey: "audio-cable",
        locationCode: "WH-UTAMA-A",
        brand: "Generic",
        model: "Snake Cable",
        serialNumber: "SNK001",
        status: "ready",
        conditionNote: "Siap dipakai.",
        specificationNote: "Snake cable audio.",
        notes: "Aset unik snake cable.",
      },
      {
        code: "DX38001",
        name: "DLMS Electrovoice DX38",
        categoryKey: "audio-processing",
        locationCode: "WH-UTAMA-A",
        brand: "Electrovoice",
        model: "DX38",
        serialNumber: "DX38001",
        status: "ready",
        conditionNote: "Siap dipakai.",
        specificationNote: "Digital loudspeaker management system.",
        notes: "Aset unik DLMS DX38.",
      },
      {
        code: "DX38002",
        name: "DLMS Electrovoice DX38",
        categoryKey: "audio-processing",
        locationCode: "WH-UTAMA-A",
        brand: "Electrovoice",
        model: "DX38",
        serialNumber: "DX38002",
        status: "ready",
        conditionNote: "Siap dipakai.",
        specificationNote: "Digital loudspeaker management system.",
        notes: "Aset unik DLMS DX38.",
      },
      {
        code: "SYMP001",
        name: "DLMS Phaselab Symphonie",
        categoryKey: "audio-processing",
        locationCode: "WH-UTAMA-A",
        brand: "Phaselab",
        model: "Symphonie",
        serialNumber: "SYMP001",
        status: "ready",
        conditionNote: "Siap dipakai.",
        specificationNote: "Digital loudspeaker management system.",
        notes: "Aset unik DLMS Symphonie.",
      },
      {
        code: "ULTRLNK01",
        name: "Distributor Audio Behringer Ultralink",
        categoryKey: "audio-processing",
        locationCode: "WH-UTAMA-A",
        brand: "Behringer",
        model: "Ultralink",
        serialNumber: "ULTRLNK01",
        status: "ready",
        conditionNote: "Siap dipakai.",
        specificationNote: "Audio distributor / splitter.",
        notes: "Aset unik distributor audio.",
      },
      {
        code: "APC001",
        name: "UPS",
        categoryKey: "power",
        locationCode: "WH-UTAMA-A",
        brand: "APC",
        model: "UPS",
        serialNumber: "APC001",
        status: "ready",
        conditionNote: "Siap dipakai.",
        specificationNote: "Uninterruptible power supply.",
        notes: "Aset unik UPS.",
      },
      {
        code: "APC002",
        name: "UPS",
        categoryKey: "power",
        locationCode: "WH-UTAMA-A",
        brand: "APC",
        model: "UPS",
        serialNumber: "APC002",
        status: "ready",
        conditionNote: "Siap dipakai.",
        specificationNote: "Uninterruptible power supply.",
        notes: "Aset unik UPS.",
      },
      {
        code: "M32L001",
        name: "Mixer Midas M32 Live",
        categoryKey: "audio-mixer",
        locationCode: "WH-UTAMA-A",
        brand: "Midas",
        model: "M32 Live",
        serialNumber: "M32L001",
        status: "ready",
        conditionNote: "Siap dipakai.",
        specificationNote: "Mixer digital Midas M32 Live.",
        notes: "Aset unik mixer utama.",
      },
      {
        code: "WRLS001",
        name: "Mix Wireless Wisdom Q11",
        categoryKey: "audio-wireless",
        locationCode: "WH-UTAMA-A",
        brand: "Wisdom",
        model: "Q11",
        serialNumber: "WRLS001",
        status: "ready",
        conditionNote: "Siap dipakai.",
        specificationNote: "Wireless microphone set.",
        notes: "Aset unik wireless.",
      },
      {
        code: "WRLS002",
        name: "Mix Wireless Wisdom Q11",
        categoryKey: "audio-wireless",
        locationCode: "WH-UTAMA-A",
        brand: "Wisdom",
        model: "Q11",
        serialNumber: "WRLS002",
        status: "ready",
        conditionNote: "Siap dipakai.",
        specificationNote: "Wireless microphone set.",
        notes: "Aset unik wireless.",
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

    const warehouseLocations = [
      { code: "WH-01", name: "Gudang Utama", description: "Lokasi utama persediaan", parent: null, sortOrder: 10 },
      { code: "WH-01-A", name: "Rak A", description: "Rak barang audio", parent: "WH-01", sortOrder: 20 },
      { code: "WH-01-B", name: "Rak B", description: "Rak barang umum", parent: "WH-01", sortOrder: 30 },
    ];

    for (const location of warehouseLocations) {
      const parentRow =
        location.parent === null
          ? null
          : await client.query("select id from warehouse_locations where code = $1 limit 1", [location.parent]);
      const parentId = parentRow?.rows?.[0]?.id ?? null;

      await client.query(
        `
        insert into warehouse_locations (code, name, description, parent_location_id, sort_order)
        values ($1, $2, $3, $4, $5)
        on conflict (code) do update set
          name = excluded.name,
          description = excluded.description,
          parent_location_id = excluded.parent_location_id,
          sort_order = excluded.sort_order,
          updated_at = now()
      `,
        [location.code, location.name, location.description, parentId, location.sortOrder],
      );
    }

    const warehouseLocationRows = await client.query(
      "select id, code from warehouse_locations where code in ('WH-01', 'WH-01-A', 'WH-01-B')",
    );
    const warehouseLocationIdByCode = Object.fromEntries(
      warehouseLocationRows.rows.map((row) => [row.code, row.id]),
    );

    const stockItems = [
      {
        sku: "STK-CBL-001",
        name: "Kabel XLR 5m",
        unit: "pcs",
        category: "Audio",
        locationCode: "WH-01-A",
        currentQuantity: 18,
        minimumQuantity: 10,
        notes: "Cadangan kabel audio",
      },
      {
        sku: "STK-BAT-001",
        name: "Baterai Alkalin",
        unit: "pcs",
        category: "Power",
        locationCode: "WH-01-B",
        currentQuantity: 6,
        minimumQuantity: 8,
        notes: "Contoh bahan habis pakai.",
      },
      {
        sku: "STK-TAPE-001",
        name: "Gaffer Tape",
        unit: "roll",
        category: "Aksesoris",
        locationCode: "WH-01-B",
        currentQuantity: 12,
        minimumQuantity: 6,
        notes: "Stok aman",
      },
    ];

    for (const item of stockItems) {
      const locationId = warehouseLocationIdByCode[item.locationCode];
      await client.query(
        `
        insert into warehouse_stock_items (
          sku,
          name,
          unit,
          category,
          location_id,
          current_quantity,
          minimum_quantity,
          status,
          notes,
          metadata,
          updated_at
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, '{}'::jsonb, now())
        on conflict (sku) do update set
          name = excluded.name,
          unit = excluded.unit,
          category = excluded.category,
          location_id = excluded.location_id,
          current_quantity = excluded.current_quantity,
          minimum_quantity = excluded.minimum_quantity,
          status = excluded.status,
          notes = excluded.notes,
          updated_at = now()
      `,
        [
          item.sku,
          item.name,
          item.unit,
          item.category,
          locationId,
          item.currentQuantity,
          item.minimumQuantity,
          item.currentQuantity <= 0
            ? "habis"
            : item.currentQuantity <= item.minimumQuantity
              ? "menipis"
              : "available",
          item.notes,
        ],
      );
    }

    const stockRows = await client.query(
      "select id, sku, location_id, current_quantity, minimum_quantity from warehouse_stock_items where sku in ('STK-CBL-001', 'STK-BAT-001', 'STK-TAPE-001')",
    );
    const stockIdBySku = Object.fromEntries(stockRows.rows.map((row) => [row.sku, row.id]));

    for (const stockId of Object.values(stockIdBySku)) {
      await client.query("delete from warehouse_stock_movements where stock_item_id = $1", [stockId]);
    }
    await client.query("delete from warehouse_stock_count_lines where count_id in (select id from warehouse_stock_counts)");
    await client.query("delete from warehouse_stock_counts");

    await client.query(
      `
      insert into warehouse_stock_movements (
        stock_item_id,
        movement_type,
        quantity,
        from_location_id,
        to_location_id,
        note,
        changed_by_user_id
      )
      values
        ($1, 'in', 10, null, $2, 'Stok awal seed', $3),
        ($4, 'out', 2, $5, null, 'Keluar untuk persiapan event', $6),
        ($7, 'transfer', 0, $8, $9, 'Dipindahkan ke rak cadangan', $10)
    `,
      [
        stockIdBySku["STK-CBL-001"],
        warehouseLocationIdByCode["WH-01-A"],
        userId,
        stockIdBySku["STK-BAT-001"],
        warehouseLocationIdByCode["WH-01-B"],
        userId,
        stockIdBySku["STK-TAPE-001"],
        warehouseLocationIdByCode["WH-01-B"],
        warehouseLocationIdByCode["WH-01-A"],
        userId,
      ],
    );

    const countRow = await client.query(
      `
      insert into warehouse_stock_counts (location_id, counted_by_user_id, status, note, counted_at)
      values ($1, $2, 'completed', 'Opname seed gudang', now())
      returning id
    `,
      [warehouseLocationIdByCode["WH-01"], userId],
    );
    const countId = countRow.rows[0]?.id;
    if (countId) {
      const batteryRow = stockRows.rows.find((row) => row.sku === "STK-BAT-001");
      if (batteryRow) {
        await client.query(
          `
          insert into warehouse_stock_count_lines (
            count_id,
            stock_item_id,
            system_quantity,
            counted_quantity,
            difference,
            note
          )
          values ($1, $2, $3, $4, $5, $6)
        `,
          [countId, batteryRow.id, batteryRow.current_quantity, 5, 5 - batteryRow.current_quantity, "Hasil hitung fisik seed"],
        );
      }
    }

    const serialItems = [
      {
        serialNumber: "CBL-001-2026",
        name: "Kabel XLR 5m",
        category: "Audio",
        locationCode: "WH-01-A",
        status: "ready",
        notes: "Unit kabel input utama",
      },
      {
        serialNumber: "CON-001-2026",
        name: "Konektor SpeakON",
        category: "Connector",
        locationCode: "WH-01-B",
        status: "in_use",
        notes: "Dipakai untuk rig speaker",
      },
      {
        serialNumber: "BAT-RCH-001-2026",
        name: "Baterai Rechargeable",
        category: "Power",
        locationCode: "WH-01-B",
        status: "ready",
        notes: "Contoh aset unik untuk battery pack isi ulang.",
      },
    ];

    for (const item of serialItems) {
      const locationId = warehouseLocationIdByCode[item.locationCode];
      await client.query(
        `
        insert into warehouse_serial_items (
          serial_number,
          name,
          category,
          location_id,
          status,
          notes,
          metadata,
          updated_at
        )
        values ($1, $2, $3, $4, $5, $6, '{}'::jsonb, now())
        on conflict (serial_number) do update set
          name = excluded.name,
          category = excluded.category,
          location_id = excluded.location_id,
          status = excluded.status,
          notes = excluded.notes,
          updated_at = now()
      `,
        [
          item.serialNumber,
          item.name,
          item.category,
          locationId,
          item.status,
          item.notes,
        ],
      );
    }

    const serialRows = await client.query(
      "select id, serial_number, location_id from warehouse_serial_items where serial_number in ('CBL-001-2026', 'CON-001-2026', 'BAT-RCH-001-2026')",
    );
    const serialIdByNumber = Object.fromEntries(
      serialRows.rows.map((row) => [row.serial_number, row.id]),
    );

    for (const serialId of Object.values(serialIdByNumber)) {
      await client.query("delete from warehouse_serial_item_movements where serial_item_id = $1", [serialId]);
    }

    await client.query(
      `
      insert into warehouse_serial_item_movements (
        serial_item_id,
        from_location_id,
        to_location_id,
        note,
        changed_by_user_id
      )
      values
        ($1, null, $2, $3, $4),
        ($5, null, $6, $7, $8),
        ($9, null, $10, $11, $12)
    `,
      [
        serialIdByNumber["CBL-001-2026"],
        warehouseLocationIdByCode["WH-01-A"],
        "Unit awal seed",
        userId,
        serialIdByNumber["CON-001-2026"],
        warehouseLocationIdByCode["WH-01-B"],
        "Unit awal seed",
        userId,
        serialIdByNumber["BAT-RCH-001-2026"],
        warehouseLocationIdByCode["WH-01-B"],
        "Unit awal seed",
        userId,
      ],
    );

    const qcEventNumber = "EV-QC-ALL";
    const qcEventName = "QC Case - Semua Peralatan";
    const qcEventClient = "QC Internal";
    const qcEventVenue = "Gudang Utama";
    const qcEventStart = new Date();
    qcEventStart.setDate(qcEventStart.getDate() + 1);
    qcEventStart.setHours(9, 0, 0, 0);
    const qcEventEnd = new Date(qcEventStart);
    qcEventEnd.setDate(qcEventEnd.getDate() + 1);
    qcEventEnd.setHours(18, 0, 0, 0);

    const qcEventRow = await client.query(
      `
      insert into events (
        event_number,
        name,
        client_name,
        venue_name,
        status,
        start_at,
        end_at,
        notes,
        created_by_user_id,
        metadata,
        updated_at
      )
      values ($1, $2, $3, $4, 'booked', $5, $6, $7, $8, $9::jsonb, now())
      on conflict (event_number) do update set
        name = excluded.name,
        client_name = excluded.client_name,
        venue_name = excluded.venue_name,
        status = excluded.status,
        start_at = excluded.start_at,
        end_at = excluded.end_at,
        notes = excluded.notes,
        created_by_user_id = excluded.created_by_user_id,
        metadata = excluded.metadata,
        updated_at = now()
      returning id
    `,
      [
        qcEventNumber,
        qcEventName,
        qcEventClient,
        qcEventVenue,
        qcEventStart,
        qcEventEnd,
        "Case uji operasional yang membooking semua equipment aktif sebagai baseline QC.",
        adminUserId,
        JSON.stringify({
          purpose: "qc_all_equipment_case",
          seededBy: "seed-phase1",
        }),
      ],
    );

    const qcEventId = qcEventRow.rows[0]?.id;
    if (qcEventId) {
      await client.query("delete from event_checklist_items where checklist_id in (select id from event_checklists where event_id = $1)", [qcEventId]);
      await client.query("delete from event_checklists where event_id = $1", [qcEventId]);
      await client.query("delete from event_equipment where event_id = $1", [qcEventId]);

      const allEquipmentRows = await client.query("select id, code from equipment order by code");
      for (const equipmentRow of allEquipmentRows.rows) {
        await client.query(
          `
          insert into event_equipment (
            event_id,
            equipment_id,
            booking_status,
            packing_status,
            loading_status,
            return_status,
            note,
            metadata,
            updated_at
          )
          values ($1, $2, 'reserved', 'pending', 'pending', 'pending', $3, '{}'::jsonb, now())
          on conflict (event_id, equipment_id) do update set
            booking_status = excluded.booking_status,
            packing_status = excluded.packing_status,
            loading_status = excluded.loading_status,
            return_status = excluded.return_status,
            note = excluded.note,
            metadata = excluded.metadata,
            updated_at = now()
        `,
          [qcEventId, equipmentRow.id, `Seed case semua equipment - ${equipmentRow.code}`],
        );
      }
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
