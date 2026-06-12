# Roadmap Eksekusi Codex

Dokumen ini dipakai sebagai peta kerja utama supaya prompt ke Codex tetap terarah, struktural, dan tidak melebar.

Prinsipnya:

- kerjakan satu lapisan nilai pada satu waktu
- jangan lompat ke fitur lanjutan sebelum pondasi stabil
- setiap langkah harus bisa diuji, di-review, dan dideploy ke Vercel
- semua interface pengguna tetap Bahasa Indonesia

## Urutan Eksekusi

### Fase 0: Fondasi Repo

Tujuan:

- repo siap untuk GitHub
- build siap untuk Vercel
- struktur proyek Next.js terbentuk

Output:

- `package.json`
- `tsconfig.json`
- `next.config.ts`
- `eslint.config.mjs`
- `.env.example`
- workflow CI GitHub Actions
- shell UI awal

Definition of done:

- `npm run lint` lolos
- `npm run typecheck` lolos
- `npm run build` lolos
- preview deployment Vercel bisa dibuat

### Fase 1: Identitas, Akses, dan Audit

Tujuan:

- pengguna bisa login
- akses berbasis peran aktif
- perubahan penting tercatat

Fitur:

- autentikasi
- role-based access control
- user, role, permission
- audit log

Prioritas prompt:

1. schema database
2. service server-side
3. middleware otorisasi
4. halaman login dan proteksi route

### Fase 2: Equipment Sebagai Inti

Tujuan:

- setiap item peralatan bisa dilacak
- status siap/tidak siap jelas
- riwayat dasar tersedia

Fitur:

- kategori peralatan
- CRUD peralatan
- detail peralatan
- status log
- lokasi saat ini
- foto dan dokumen

Prioritas prompt:

1. model data equipment
2. daftar peralatan
3. detail peralatan dengan tab
4. form tambah/edit

### Fase 3: Warehouse Sebagai Inventory dan Log

Tujuan:

- lokasi gudang terstruktur
- peralatan ber-ID bisa dilihat per lokasi
- log mutasi peralatan tercatat

Fitur:

- hierarki lokasi
- display peralatan per warehouse
- movement log peralatan
- lokasi sebagai konteks, bukan pusat CRUD stok

### Fase 3b: BHP

Tujuan:

- stok quantity-based punya rumah sendiri
- mutasi stok dan opname tidak bercampur dengan peralatan

Fitur:

- stock items
- movement log stok
- stock opname
- peringatan restock

Catatan:

- jangan jadikan warehouse sebagai pusat sistem
- tetap prioritaskan kesehatan peralatan serial

### Fase 4: Inspection

Tujuan:

- readiness harus berbasis inspeksi nyata di lapangan
- checklist berbeda per kategori
- hasil inspeksi ringan dan cepat, tanpa measurement berat

Fitur:

- template inspeksi per kategori
- eksekusi inspeksi
- hasil inspeksi
- status kelulusan

Catatan:

- inspeksi dipakai untuk pemeriksaan operasional saat equipment keluar atau kembali
- measurement Smaart tetap dipisah sebagai deep inspection di gudang/workshop
- jangan gabungkan upload file measurement ke checklist inspeksi

Prioritas prompt:

1. template data
2. form inspeksi
3. penyimpanan hasil
4. dampak ke status equipment

### Fase 5: Maintenance dan Service

Tujuan:

- complaint, diagnosis, tindakan, dan biaya tercatat
- spare part usage terhubung ke ticket

Fitur:

- maintenance ticket
- maintenance action
- spare part
- vendor
- photo before/after

Prioritas prompt:

1. ticket lifecycle
2. hubungan ke equipment
3. pemakaian spare part
4. status repair sampai closed

### Fase 6: Events dan QR Workflow

Tujuan:

- booking peralatan aman sebelum keluar
- loading dan return bisa diaudit

Fitur:

- event / job
- booking equipment
- availability check
- packing list
- loading checklist
- return checklist
- auto-create inspection/maintenance jika rusak

Prioritas prompt:

1. event model
2. relasi equipment booking
3. checklist QR
4. integrasi status balik dari event

### Fase 7: Measurement / Smaart ASCII

Tujuan:

- upload file ASCII untuk deep inspection di gudang/workshop
- parse data
- bandingkan dengan baseline
- hasil measurement dipakai untuk analisis teknis, bukan checklist lapangan

Fitur:

- upload raw file
- parser ASCII
- penyimpanan JSON parsed
- magnitude chart
- coherence chart
- baseline comparison
- summary pass/warning/fail

Catatan:

- measurement tidak menggantikan inspeksi lapangan
- measurement bisa dipicu setelah inspeksi menemukan gejala masalah
- satu equipment bisa punya banyak inspeksi dan banyak measurement

Prioritas prompt:

1. parser yang toleran
2. penyimpanan file
3. visualisasi grafik
4. scoring sederhana

### Fase 8: Reporting dan Operasi Harian

Tujuan:

- dashboard benar-benar membantu kerja harian
- data bisa dipakai untuk keputusan

Fitur:

- dashboard KPI
- equipment bermasalah
- maintenance cost
- inspection due
- export dasar

## Template Prompt Codex

Pakai format ini untuk tiap pekerjaan supaya hasilnya konsisten:

```text
Konteks:
Saya sedang mengerjakan Gudang, sistem internal operasional rental alat.

Tujuan:
[jelaskan satu tujuan utama]

Scope:
[sebutkan file/fitur yang boleh disentuh]

Yang tidak boleh:
[sebutkan hal yang harus ditahan]

Input yang sudah ada:
[tautan file, skema, atau keputusan arsitektur]

Output yang diharapkan:
[apa yang harus selesai di akhir tugas]

Kriteria selesai:
[daftar verifikasi yang jelas]
```

## Template Prompt Per Fitur

Saat minta Codex membangun satu fitur, gunakan susunan berikut:

1. konteks domain
2. fitur yang diminta
3. batasan teknis
4. file target
5. acceptance criteria
6. apakah perlu update docs atau schema

Contoh singkat:

```text
Buat modul Equipment list dan detail tab.
Gunakan Bahasa Indonesia untuk semua label UI.
Jangan sentuh modul maintenance dulu.
Update schema jika memang dibutuhkan.
Pastikan build lolos dan semua teks tampil rapi di mobile dan desktop.
```

## Aturan Urutan Kerja

- jangan kerjakan event sebelum equipment dasar selesai
- jangan kerjakan measurement sebelum storage file dan equipment detail siap
- jangan kerjakan dashboard advanced sebelum data operasional tersedia
- jangan tambahkan abstraksi baru kalau belum ada masalah nyata
- setiap perubahan besar harus lewat lint, typecheck, dan build

## Definition Of Ready Untuk Prompt Berikutnya

Sebuah prompt baru siap dieksekusi jika:

- scope-nya satu fitur atau satu lapisan data
- dependency-nya jelas
- file yang terdampak disebutkan
- hasil akhirnya bisa diverifikasi
- tidak mencampur banyak domain yang berbeda
