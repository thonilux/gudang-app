import fs from "node:fs";
import { Pool } from "pg";

const envText = fs.readFileSync(".env.local", "utf8");
const env = Object.fromEntries(
  envText
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.match(/^([^#=]+)=(.*)$/))
    .filter(Boolean)
    .map((match) => [match[1].trim(), match[2]]),
);

const pool = new Pool({ connectionString: env.DATABASE_URL });

const templates = [
  {
    categoryKey: "audio",
    name: "Mixer Midas M32",
    description: "Template inspeksi untuk mixer digital kelas Midas M32.",
    checklist: [
      { label: "Power on dan boot normal", required: true },
      { label: "Fader bergerak normal", required: true },
      { label: "Encoder dan tombol merespons", required: true },
      { label: "Input channel terbaca", required: true },
      { label: "Output routing berfungsi", required: true },
      { label: "Headphone dan monitor test", required: false },
      { label: "Scene recall test", required: false },
      { label: "Kipas dan suhu normal", required: false },
    ],
  },
  {
    categoryKey: "audio",
    name: "Mic Dynamic",
    description: "Template inspeksi untuk microphone dynamic.",
    checklist: [
      { label: "Body dan grille aman", required: true },
      { label: "Capsule test", required: true },
      { label: "Connector XLR normal", required: true },
      { label: "Sinyal suara masuk stabil", required: true },
      { label: "Noise dan hum rendah", required: false },
      { label: "Kabel dan strain relief baik", required: false },
    ],
  },
];

try {
  const categoryResult = await pool.query(
    `select id, key from equipment_categories where key = any($1::text[])`,
    [[...new Set(templates.map((item) => item.categoryKey))]],
  );
  const categoryByKey = new Map(categoryResult.rows.map((row) => [row.key, row.id]));

  for (const template of templates) {
    const categoryId = categoryByKey.get(template.categoryKey);
    if (!categoryId) {
      throw new Error(`Kategori ${template.categoryKey} tidak ditemukan.`);
    }

    const existing = await pool.query(
      `select id from equipment_inspection_templates where category_id = $1 and lower(name) = lower($2) limit 1`,
      [categoryId, template.name],
    );

    if (existing.rowCount > 0) {
      continue;
    }

    const sortOrderResult = await pool.query(
      `select coalesce(max(sort_order), -10) + 10 as next_sort_order
       from equipment_inspection_templates
       where category_id = $1`,
      [categoryId],
    );
    const sortOrder = Number(sortOrderResult.rows[0]?.next_sort_order ?? 0);

    await pool.query(
      `insert into equipment_inspection_templates
        (category_id, name, description, checklist, is_active, sort_order, created_at, updated_at)
       values ($1, $2, $3, $4::jsonb, true, $5, now(), now())`,
      [categoryId, template.name, template.description, JSON.stringify(template.checklist), sortOrder],
    );
  }

  console.log("Inspection templates seeded.");
} finally {
  await pool.end();
}
