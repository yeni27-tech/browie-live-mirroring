# browie Live Mirroring — checklist setup (per 9 Okt 2026)

Centang satu per satu, urut dari atas. Total ±40 menit (Yeni ±15, host ±20).

## Status sekarang
| Bagian | Status |
|---|---|
| Dashboard online `https://browie-live.vercel.app` | ✅ Hidup |
| Upstash (penyimpanan) | ✅ Tersambung |
| Password admin + kode kirim | ✅ Dibuat, ada di `~/browie-live-rahasia.txt` |
| Paket untuk host (zip + panduan + pesan) | ✅ Siap di folder `paket/` |
| Data awal 6–7 Okt | ❌ Belum dimuat |
| Link tujuan Shopee | ❌ Belum diisi |
| Kunci JEV | ❌ Belum dipasang |
| Ekstensi di laptop host | ❌ Belum |
| File hasil intip dari host | ❌ Belum |
| Link `/go` di live IG | ❌ Belum |

---

## BAGIAN A — YENI, di laptopmu (±15 menit)

### A1. Amankan rahasia (2 menit)
- [ ] Di Terminal: `open -e ~/browie-live-rahasia.txt`
- [ ] Salin **ADMIN_PASSWORD** dan **KODE_KIRIM_EKSTENSI** ke catatan pribadi (Notes / password manager).
- [ ] Hapus file itu setelah disalin: `rm ~/browie-live-rahasia.txt`

### A2. Masuk admin dan muat data awal (3 menit)
- [ ] Buka **https://browie-live.vercel.app**. Dashboard tampil kosong, itu tampilan tamu.
- [ ] Klik **Masuk admin** (kanan atas) → ketik password admin. Muncul tab **🛠 Admin** (paling kanan).
- [ ] Buka tab **🛠 Admin** → klik **Muat data awal 6–7 Okt**. Sekali saja. Dashboard terisi 2 sesi Shopee + 2 live IG.

### A3. Isi pengaturan (5 menit)
Buka tab **🛠 Admin** → klik **⚙️ Pengaturan**.
- [ ] **Link tujuan Shopee:** tempel link toko/produk Shopee yang dipakai di live IG → **Simpan**.
- [ ] **Kunci JEV:** tempel kunci yang jalan di ekstensi Pulse → **Uji & simpan**.
  - Berhasil: muncul "Kunci JEV terpasang · …(4 huruf)".
  - Ditolak: kunci tidak disimpan. Langkah lain tetap jalan; yang belum aktif hanya pilah komentar dan rekomendasi JEV.

### A4. Tes link penghitung (1 menit)
- [ ] Buka **https://browie-live.vercel.app/go** di tab baru. Harus langsung pindah ke **toko Shopee-mu**, bukan beranda shopee.co.id.

### A5. Tes impor (4 menit, opsional tapi disarankan)
- [ ] Buka tab **🛠 Admin** → klik **📸 Impor screenshot** → pilih screenshot Tinjauan Data Shopee + Insights IG yang kamu punya.
- [ ] Pastikan angka terbaca. Kolom kuning = diisi/dikoreksi manual. Untuk uji coba, klik **Buang** (jangan Simpan).

### A6. Kirim ke host (2 menit)
Lewat **chat pribadi**, bukan grup. Dari folder `Live Mirroring/paket/`:
- [ ] File `browie-live-mirroring-ekstensi-v0.8.1.zip`
- [ ] File `PANDUAN-HOST.md`
- [ ] Pesan dari `PESAN-UNTUK-HOST.txt`, setelah dua tanda `[ … ]` diganti password admin dan kode kirim.

---

## BAGIAN B — MANAGER HOST, di laptopnya (±20 menit)
Pakai **Chrome yang login Seller Centre Shopee browie**. Panduan lengkapnya ada di `PANDUAN-HOST.md`.

### B1. Pasang ekstensi (5 menit)
- [ ] Ekstrak zip → pindahkan folder **browie-live-mirroring** ke Dokumen (**jangan dihapus atau dipindah lagi**).
- [ ] Chrome → ketik `chrome://extensions` → Enter.
- [ ] Nyalakan **Developer mode** (pojok kanan atas).
- [ ] **Load unpacked** → pilih folder **browie-live-mirroring**.
- [ ] Klik ikon puzzle 🧩 → pin **browie Live Mirroring**.

### B2. Sambungkan ke dashboard (2 menit)
- [ ] Klik ikon ekstensi → tab **⚙️ Pengaturan**.
- [ ] Isi **Alamat dashboard**: `https://browie-live.vercel.app` dan **Kode kirim**.
- [ ] **Simpan & cek** → harus muncul **"Tersambung"**.

### B3. Mode intip (8 menit, sekali saja)
- [ ] Tab **🔎 Mode intip** di ekstensi → ikuti 6 langkahnya (buka Live Streaming, Tinjauan Data, dashboard live di Seller Centre).
- [ ] Angka **"Endpoint tercatat"** harus lebih dari 0.
- [ ] **⬇︎ Unduh hasil intip** → kirim file `.json` ke **Yeni**.

### B4. Coba masuk admin (3 menit)
- [ ] Buka dashboard → **Masuk admin** → password admin → buka tab **🛠 Admin** → muncul tombol 📸 🗂 ⚙️.
- [ ] Klik **📖 Petunjuk admin** dan baca sekilas.

---

## BAGIAN C — SETELAH SEMUA DI ATAS

### C1. Yeni → Claude
- [ ] Kirim **file hasil intip** dari host ke Claude. Dari situ Claude membangun penarik data Shopee otomatis (Tahap B), sehingga host tidak perlu screenshot Tinjauan Data lagi.

### C2. Pasang link penghitung di live IG (hanya setelah A3 selesai)
- [ ] Ganti link beli Shopee di live IG dengan **https://browie-live.vercel.app/go**.

### C3. Live pertama sungguhan (±3 menit setelah live selesai)
- [ ] Screenshot **Tinjauan Data** Shopee dan **Insights** IG.
- [ ] Dashboard → Masuk admin → **📸 Impor screenshot** → cek kolom kuning → isi **jam mulai** Shopee → pilih sesi Shopee pasangan IG → **Simpan**.
- [ ] Bagikan link dashboard (tanpa password) ke tim.

---

## Kalau macet
| Masalah | Solusi |
|---|---|
| Lupa password admin | Minta Claude memasang password baru. Kode kirim ikut berganti, jadi host isi ulang di ekstensi |
| Host: "Kode kirim salah" | Isi ulang kode terbaru dari catatan Yeni |
| Link `/go` masih ke beranda shopee.co.id | Link tujuan Shopee belum diisi (A3) |
| Ekstensi hilang dari Chrome host | Folder ekstensi dihapus/dipindah → kembalikan, lalu `chrome://extensions` → ↻ |
| Banyak kolom kuning saat impor | Pakai screenshot lebih tajam (zoom Chrome 100%, hanya kotak Tinjauan Data) |
