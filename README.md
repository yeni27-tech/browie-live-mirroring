# Live Mirroring browie — project

> **Mau memasang? Baca `MULAI DI SINI.md`.** Paket ekstensi untuk host: `paket/browie-live-mirroring-ekstensi-v0.9.0.zip`.

**Permintaan:** laporan per sesi live mirroring Instagram + Shopee (divisi live, bukan konten). Tujuan mirroring:
penonton IG pindah ke toko Shopee browie → co atau follow.

## Struktur
| Folder | Isi |
|---|---|
| `shared/` | **Sumber asli** modul bersama: `session-core.js` (logika), `session-render.js` (tampilan), `style.css`, `theme.js`. Ubah di sini, lalu `sh salin-shared.sh` |
| `ekstensi/` | Ekstensi Chrome v0.3.0 (±110 KB) — dijalankan **manager host**: mode intip + (Tahap B) tarik sesi Shopee. Panduan: `ekstensi/README — Cara pasang (untuk manager host).md` |
| `web/` | Dashboard online (Vercel + Upstash): tim lihat-saja, **admin** (Yeni + host, 1 password bersama) impor screenshot IG/isi Shopee/pasangkan/hapus + riwayat, link penghitung `/go`. Panduan: `web/README — Cara deploy (Yeni).md` |

## Keputusan terkunci (grill 8 Okt 2026)
1. Asal traffic 3 lapis: asal penonton Shopee · klik link penghitung IG · pesanan & follow sesi mirror vs tanpa mirror.
2. Angka utama = total penonton dipecah 3 asal: Instagram · Shopee dari luar ("Lainnya") · Shopee dari dalam.
3. Per sesi. IG dipasangkan otomatis ke sesi Shopee tanggal sama, durasi paling mirip; 2 kandidat < 10 mnt → wajib pilih; selisih > 15 mnt → "perlu dicek".
4. Dashboard online terpisah dari Pulse. ~~Input hanya lewat ekstensi~~ → **direvisi 8 Okt:** admin = Yeni + manager host lewat **mode admin di dashboard online** (1 password admin bersama, ada riwayat perubahan tanpa nama). Ekstensi hanya pengumpul Shopee. Data disimpan PER SESI di server; koreksi admin menang atas tarikan ekstensi, hanya kolom yang beda yang dikunci; sesi ekstensi yang dihapus admin disembunyikan, tidak muncul lagi.
5. Link beli Shopee di live IG diganti link penghitung `/go` (Upstash, per 10 menit, tanpa identitas).
6. Susunan: pemilih sesi → total 3 asal → IG vs Shopee berdampingan → corong → asal penonton → tren → tabel 10/halaman.
7. JEV memilah komentar live Shopee (kalau Seller Centre menyediakan komentar).
8. Urutan: link penghitung dulu.

Keputusan sebelumnya: terpisah dari Pulse · tanpa scraper sinwaz OS · OCR lokal Tesseract (bukan AI) · gaya Pulse + light/dark.

## Asumsi yang dipatahkan
- Shopee hanya memberi asal **penonton**, bukan asal pesanan; IG tidak punya label sendiri (masuk "Lainnya").
- Total penonton menipu: sesi 7 Okt 16:01 (1.192) 62% dari Beranda Shopee.
- Screenshot IG tanpa jam mulai → pasangan dari durasi (aman karena mirroring tayang bersamaan).

## Status (9 Okt 2026) — DASHBOARD ONLINE SUDAH HIDUP
- **https://browie-live.vercel.app** (proyek Vercel `browie-live`, akun yeni27-tech, scope `yeni27-techs-projects`, region sin1) + Upstash Redis `upstash-kv-apricot-branch` (Free, Singapore). Dideploy & diuji 9 Okt: tamu 200, `/go` 302→shopee.co.id, push tanpa kode 401, aksi admin tanpa login 403, login admin OK.
- Rahasia (ADMIN_PASSWORD, kode kirim) dibuat acak & disimpan di `~/browie-live-rahasia.txt` (chmod 600, di LUAR vault) — Yeni salin ke catatan pribadi lalu hapus file. `SHOPEE_URL` & `JEV_KEY` sengaja belum diisi: diisi lewat web (Masuk admin → ⚙️ Pengaturan). **Sebelum itu `/go` meneruskan ke shopee.co.id (beranda), jangan dipasang di live IG dulu.**
- Sisa: Yeni muat data awal, isi link Shopee + kunci JEV, kirim paket ke host; host pasang ekstensi + mode intip. Upstash juga tersambung ke proyek `browie-live-mirroring` (bukan buatan Claude) — cek apakah proyek itu masih dipakai.
- Catatan lama (8 Okt):
- **Tahap A + mode admin + rangkuman/produk/kelola data selesai di kode, belum dideploy.** 47 tes lolos (session-core 18 · ocr-ig 6 · intip 2 · api 21).
- **Tambahan 8 Okt sore:** (1) **Rangkuman sesi** otomatis berbasis aturan (bukan AI) — penonton, IG, konversi, penjualan + produk terlaris, follow; dibanding median sesi lain (▲ ≥25% di atas, ▼ ≥20% di bawah, butuh ≥3 sesi pembanding), penilaian "Di atas/Seperti/Di bawah biasanya" juga di kolom tabel. (2) **Produk terjual** per sesi (`sh.items` = nama, etalase, qty, jual — diisi admin dari Tinjauan Data → Penjualan → Lihat Rincian, dengan saran nama dari isian sebelumnya) + **produk terlaris & penjualan per etalase** semua sesi. (3) **Kelola data**: tabel centang + cari, hapus banyak sekaligus (`hapus-banyak`), konfirmasi 2 langkah, tercatat di riwayat. Diuji di browser pane: dashboard terang & gelap, HP 375 px nol meluber, OCR screenshot asli di web (Tesseract dimuat saat pertama dipakai), form Shopee, pilih pasangan wajib, hapus 2 langkah, riwayat.
- Menunggu Yeni: deploy `web/` (README di sana) + link Shopee yang dipakai di live IG.
- Menunggu manager host: pasang ekstensi + mode intip → kirim `hasil-intip-shopee-*.json`.
- Artifact lama https://claude.ai/artifact/UhviqBYSjpJFJc9AyvLPdc (folder `../Live Mirroring Dashboard/`) masih hidup — matikan setelah tahap B jalan (konfirmasi Yeni dulu).

## Paket implementasi (8 Okt malam)
- **Dashboard tamu tanpa password** (permintaan Yeni); hanya admin yang login (ADMIN_PASSWORD). noindex + robots.txt.
- **Impor screenshot Shopee (Tinjauan Data)** di samping IG — jenis dikenali otomatis, gambar diperbesar 2× dulu. Dua cara baca: pasangkan label→angka (screenshot tajam) dan cadangan urutan dengan jangkar "Durasi Rata-Rata Menonton". Angka salah baca dikosongkan + kuning, tidak ditebak. Asal penonton & produk tetap manual (persen kecil terbaca tanpa koma).
- **JEV**: admin tempel komentar live → server (`api/_jev.js`, env JEV_KEY) memilah ke 7 kategori (mau beli, tanya harga, tanya produk, keluhan, pujian, sapaan, lainnya); nama/jam di depan komentar dibuang sebelum dikirim; maks 200, 4 panggilan paralel, maxDuration 60 dtk.
- **Petunjuk** pola Pulse: "📖 Cara membaca dashboard" + "ℹ️ Ini apa?" di 10 bagian (tamu), "📖 Petunjuk admin" (cara mengisi), tab "📖 Petunjuk" di ekstensi v0.9.0.
- **Pemasangan**: `web/siapkan-dashboard.sh` (link proyek, Upstash, rahasia, deploy, cek) · `paket/…v0.9.0.zip` (README jadi PANDUAN-PASANG.md, nama ASCII) · `MULAI DI SINI.md`.
- **⚙️ Pengaturan admin di web** (9 Okt): kunci JEV (diuji ke TypeSafe dulu, disimpan di Upstash `lm:set`, browser hanya lihat 4 huruf terakhir) + link tujuan Shopee untuk `/go` (ganti tanpa deploy). Nilai web menang atas env.
- **🎯 Aksi untuk live berikutnya** (9 Okt): sistem menghitung fakta sesi vs median (`lmFakta`, kata-kata "much lower than…", tanpa teks komentar) → JEV menilai 9 kemungkinan masalah ya/tidak + yakin (`nilaiMasalah`, satu panggilan) → panel menampilkan maks 4 masalah ≥50% + aksi konkret. Tanpa JEV: petunjuk dari aturan angka (butuh ≥3 sesi pembanding). Daftar masalah di `LM_MASALAH` (session-core) dan `MASALAH_JEV` (api/_jev.js) dijaga sama oleh tes.
- **⚠️ Pengingat data belum lengkap** (9 Okt): kotak di atas dashboard, **khusus admin**, daftar sesi 7 hari terakhir yang belum ada data IG / follow / asal penonton / produk / jam mulai; ketuk tanggal → buka sesinya (`lmBelumLengkap`). Yeni menolak kirim ke Pumble — tidak ada yang dikirim ke luar.
- **📋 Report periode + 🕐 Jam & hari tayang terbaik** (9 Okt): pilihan Mingguan (Senin–Minggu) / 14 hari / Bulanan (kalender) / 30 hari, ◀ ▶ geser, dibanding periode tepat sebelumnya (▲▼, ⏳ kalau periode belum selesai), sesi terbaik + produk terlaris; peta hari × blok jam (Pagi/Siang/Sore/Malam/Larut) dengan pilihan penonton/pesanan/follow/penjualan, sel terbaik butuh ≥2 sesi. `lmPeriode`, `lmRekap`, `lmJamTerbaik` di session-core. Pilihan periode diingat di browser (`lm-per`).
- **📅 Filter tanggal gaya Shopee + diagram harian** (9 Okt, permintaan Yeni dengan screenshot Shopee): tombol tanggal di bagian "📊 Rekap semua sesi" (sticky) → menu Kemarin / 7 / 15 / 30 hari terakhir (termasuk hari ini) + **Per Hari** (kalender, klik 1 tanggal = 1 hari, klik kedua = rentang, titik = ada live) + **Per Minggu** (12 minggu Senin–Minggu) + **Per Bulan**. Rentang berlaku untuk Report, diagram harian, Tren, Jam terbaik, Produk terlaris, Tabel. Pembanding otomatis: bulan penuh→bulan sebelumnya, Senin–Minggu→minggu sebelumnya, lainnya→rentang sama panjang sebelumnya. Preset diingat (`lm-rentang`). Diagram harian (≤62 hari): penonton per hari (tumpuk per asal), penjualan, pesanan + follow, klik link IG; garis bantu, angka sumbu bulat (`lmTicks`), tanggal+nama hari, legenda, ketuk batang → angka. Fungsi: `lmPreset`, `lmBandingRange`, `lmHarian`, `lmTicks`, `lmLabelRentang` (session-core).
- **🧭 Navigasi bertab** (9 Okt, Yeni "keder sama navigasinya"): halaman satu-gulungan diganti tab, tiap tab menjawab satu pertanyaan (catatan 1 baris di bawah tab): 📊 Ringkasan (filter tanggal + Report + diagram + link penghitung + pengingat admin) · 🎥 Per Sesi (pemilih sesi, hero, rangkuman, aksi JEV, IG vs Shopee, corong, asal, produk, komentar) · 💡 Analisis (tren per sesi, jam terbaik, produk terlaris) · 📋 Daftar Sesi (tabel) · 📖 Panduan · 🛠 Admin (khusus admin: impor, form, kelola, pengaturan, riwayat). Mengetuk sesi di mana pun → tab Per Sesi. Tombol ✏️ di Per Sesi → tab Admin + tombol "← Kembali"; setelah simpan balik ke Per Sesi + toast. Tab terakhir diingat (`lm-tab-dash`). Nav sticky, bisa digeser di HP.
- Tes: **68** (session-core 28 · ocr 11 · intip 2 · api 28 · …).

## Berikutnya
- **Tahap B** (setelah file intip): penarik sesi live Shopee otomatis di `ekstensi/background.js`, kirim online hanya kalau isi berubah. Cek juga apakah rincian produk (Lihat Rincian) bisa ikut ditarik → isi `items` otomatis.
- **Tahap C**: JEV komentar live (kalau ada di hasil intip).
- **Tahap D**: cabut mode intip, matikan artifact lama.
