# Dokumentasi Perjalanan Pengembangan Sistem Gudang Operasional (Equipment-Health-First)

Dokumen ini mencatat kronologi lengkap perjalanan pengembangan sistem manajemen gudang rental berbasis **kesehatan peralatan (maintenance-centric)**, yang dirancang khusus untuk memantau kelayakan sistem suara, video broadcast, lighting, dan perlengkapan event.

---

## 🛠️ Tech Stack Utama
- **Framework**: Next.js 15.5.19 (App Router)
- **Database**: PostgreSQL (Drizzle ORM)
- **Styling**: Tailwind CSS (Desain HSL Harmonis & Mode Gelap/Terang)
- **Icons**: Lucide React
- **Kustom Visualisasi**: SVG Render Dinamis (Tanpa library grafik berat pihak ketiga)

---

## 🚀 Perjalanan Fase Pengembangan

### 📁 Fase Awal (Fase 1 - 6): Fondasi & Manajemen Aset Utama
- **Database & Schema**: Inisialisasi PostgreSQL dengan Drizzle ORM, merancang entitas utama (`users`, `equipment`, `equipment_categories`, `inspections`, `maintenance_tickets`, `bhp`, dsb).
- **Warehouse Location Tracking**: Manajemen lokasi penyimpanan hirarkis (Rak/Bin/Area) untuk pelacakan peralatan presisi.
- **Maintenance & Service History**: Pintu masuk tiket kerusakan, diagnosa teknisi, penggunaan suku cadang (BHP), dan kalkulasi total biaya perawatan per alat.
- **Inspection System**: Pembuatan template checklist inspeksi berdasarkan kategori alat (seperti speaker, mixer, mic wireless) untuk deklarasi alat siap pakai (*ready*).

### 📊 Fase 7: Integrasi Pengukuran Smaart ASCII
Fase ini berfokus pada validasi performa speaker secara objektif menggunakan data ekspor penganalisis frekuensi *Smaart*:
- **ASCII Data Parser**: Mengembangkan modul parser di `src/features/measurements/parser.ts` untuk memproses data teks mentah Smaart (kolom Frekuensi, Magnitudo, Fasa, Koherensi).
- **Database Storage**: Data diproses menjadi JSON terstruktur dan disimpan dalam tabel `equipment_measurements` lengkap dengan skor kesehatan otomatis (*health score*).
- **Tab Pengukuran (Equipment Detail)**: Membuat visualisasi grafis **Magnitude Response** dan **Coherence** menggunakan **SVG Kustom** berbasis pemetaan sumbu X skala logaritmik (20Hz - 20kHz).
- **Input Paste**: Menambahkan fitur input langsung via *paste text* ASCII (selain opsi *upload file*) untuk mempercepat operasional teknisi di workshop.

### 📈 Fase 8: Dashboard Lanjutan & Ekspor Laporan
Mengubah dasbor standar menjadi panel kontrol keputusan manajerial yang kaya data:
- **Metrik KPI Utama**: Kartu informasi status peralatan siap pakai, peralatan kritis, biaya pemeliharaan berjalan, dan peringatan stok BHP minimum.
- **Grafik SVG Interaktif**:
  - Grafik Donut SVG untuk proporsi distribusi status peralatan.
  - Grafik Area/Line SVG untuk tren biaya pemeliharaan 6 bulan terakhir.
- **Watchlist Operasional**: Tabel daftar peralatan bermasalah (skor kesehatan terendah) dan jadwal inspeksi terdekat.
- **API Ekspor CSV**: Endpoint `/api/export` untuk mengunduh laporan CSV data peralatan, riwayat pemeliharaan, serta stok BHP. Dilengkapi pencatatan log audit otomatis.
- **User Management**: Modul administrasi akun pengguna di Panel Admin (`/admin/users`) untuk mengelola peran (*role*) teknisi dan akses log audit.

### ⚡ Penyempurnaan Grafik Smaart (Dark Theme & Comparison)
Mengadaptasi desain perangkat lunak penganalisis akustik profesional asli ke dalam sistem:
- **Tampilan Dark Mode Smaart**: Visualisasi berlatar belakang hitam murni dengan grid presisi tinggi.
- **Phase Graph Plotting**: Penambahan grafik respon Fasa (-180° hingga 180°) di atas grafik Magnitudo, lengkap dengan algoritma pemutus garis discontuinity (wrap correction).
- **Cursor Hover Real-time**: Menggerakkan mouse di atas grafik memunculkan garis cursor vertikal sinkron dan menampilkan pembacaan data frekuensi, magnitude, fasa, serta koherensi yang sangat presisi di bar atas.
- **Master Pengukuran & Perbandingan (Trace Comparison)**:
  - Menyusun halaman navigasi khusus **"Pengukuran"** (`/measurements`) yang menampilkan daftar semua pengukuran aset.
  - Fitur perbandingan (*overlay traces*): Pengguna dapat memilih grafik pengukuran aset lain sebagai pembanding. Grafik pembanding (garis kuning/emas/oranye) akan ditumpuk di atas grafik aktif sehingga teknisi dapat membandingkan penurunan respon frekuensi secara instan.
  - Hover ganda (Dual Readout): Menampilkan data pembacaan numerik untuk kedua grafik (aktif dan pembanding) secara bersamaan saat kursor diarahkan ke grafik.

---

## 📈 Status Verifikasi Akhir
- **Type Checking (`npm run typecheck`)**: Lolos 100% tanpa error.
- **Linting Check (`npm run lint`)**: Bersih dari peringatan *unused imports* dan kesalahan *hooks*.
- **Production Build (`npm run build`)**: Sukses penuh menghasilkan bundle Next.js teroptimasi.

---

*Dokumentasi ini dibuat pada: 22 Juni 2026*
