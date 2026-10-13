# Panduan Manager Host — pasang & pakai browie Live Mirroring

Untuk: **manager host** (yang login Seller Centre Shopee browie).
Lama pasang: ±15 menit, **sekali saja**. Sesudah itu tiap selesai live cukup ±3 menit.

Yang dibutuhkan, **dikirim Yeni lewat chat pribadi**:
1. File `browie-live-mirroring-ekstensi-v0.8.0.zip`
2. **Alamat dashboard** (contoh: `https://browie-live.vercel.app`)
3. **Password admin**
4. **Kode kirim** (deretan huruf-angka panjang)

---

## BAGIAN 1 — Pasang ekstensi di Chrome (±5 menit)

Pakai **Chrome di laptop yang login Seller Centre Shopee browie**.

1. **Ekstrak zip.** Klik dua kali file `browie-live-mirroring-ekstensi-v0.8.0.zip`. Muncul folder **browie-live-mirroring**.
2. **Pindahkan folder itu ke tempat aman** (misalnya Dokumen). **Jangan dihapus atau dipindah lagi**, karena ekstensi membacanya dari sana.
3. Di Chrome, ketik `chrome://extensions` di kolom alamat, tekan Enter.
4. Nyalakan **Developer mode** (tombol di pojok kanan atas).
5. Klik **Load unpacked** → pilih folder **browie-live-mirroring** → **Select**.
6. Kartu **browie Live Mirroring** muncul. Klik ikon puzzle 🧩 di toolbar Chrome → klik pin 📌 di samping **browie Live Mirroring**.
7. Klik ikon ekstensi → terbuka halaman **📖 Petunjuk**.

✅ Berhasil kalau halaman Petunjuk terbuka.

## BAGIAN 2 — Sambungkan ke dashboard (±2 menit)

1. Di ekstensi, klik tab **⚙️ Pengaturan**.
2. Isi **Alamat dashboard** dan **Kode kirim**.
3. Klik **Simpan & cek**.

✅ Berhasil kalau muncul **"Tersambung ke dashboard online"**.
❌ Kalau muncul "Kode kirim salah": minta kode terbaru ke Yeni.

## BAGIAN 3 — Mode intip (sekali saja, ±5 menit)

Supaya ekstensi tahu di mana Shopee menyimpan angka live. **Yang dicatat hanya nama kolom, bukan angka penjualan atau data pembeli.**

1. Buka tab **🔎 Mode intip** di ekstensi.
2. Di tab Chrome lain, buka **Seller Centre Shopee** (pastikan sudah login).
3. Buka menu **Live Streaming** sampai terlihat **daftar sesi live**. Ganti tanggal atau halaman satu kali.
4. Klik **satu sesi yang sudah selesai** → buka **Tinjauan Data**. Ganti filter **Status Pesanan** satu kali.
5. Buka juga **dashboard live** (kotak oranye) sesi itu. Gulir sampai **Sumber Menonton Livestream** dan **Profil Penonton**.
6. Kalau ada halaman **komentar** atau **rekaman** sesi live, buka juga.
7. Kembali ke ekstensi → tab **🔎 Mode intip**. Angka **"Endpoint tercatat"** harus lebih dari 0.
8. Klik **⬇︎ Unduh hasil intip** → kirim file `hasil-intip-shopee-….json` ke **Yeni**.

✅ Berhasil kalau file terunduh dan sudah dikirim.

## BAGIAN 4 — Masuk sebagai admin (±2 menit)

1. Buka **alamat dashboard** di Chrome (boleh Bookmark: tekan **Cmd/Ctrl + D**).
2. Klik **Masuk admin** (kanan atas) → ketik **password admin**.
3. Muncul tab baru **🛠 Admin** (paling kanan). Di dalamnya ada tombol: 📸 Impor screenshot · + Sesi Shopee · 🗂 Kelola data · ⚙️ Pengaturan · 📖 Petunjuk admin.

Tombol **📖 Petunjuk admin** menjelaskan semua fitur admin.

---

## SETIAP SELESAI LIVE (±3 menit)

1. **Screenshot Shopee:** Seller Centre → Live Streaming → klik sesi yang baru selesai → **Tinjauan Data**. Screenshot seluruh kotak angkanya.
2. **Screenshot Instagram:** Instagram → profil → live yang baru selesai → **Insights**. Screenshot halamannya.
3. Buka dashboard → **Masuk admin** → **📸 Impor screenshot** → pilih kedua screenshot sekaligus (atau tempel dengan Cmd/Ctrl + V).
4. **Cek angkanya.** Kolom **kuning** = belum terbaca atau perlu dicek, isi atau betulkan sendiri.
   - **Jam mulai Shopee wajib diisi** (lihat tulisan "Waktu Mulai" di atas Tinjauan Data).
5. Untuk Instagram: pilih **sesi Shopee pasangannya** (yang tayang bersamaan). Biasanya sudah ditebak otomatis.
6. Klik **Simpan**. Selesai. Tim langsung bisa melihat hasilnya di link dashboard.

**Kalau sempat (melengkapi):**
- **Asal penonton:** dashboard live Shopee (kotak oranye) → "Sumber Menonton Livestream" → buka sesinya di dashboard → **✏️ Ubah Shopee** → isi 6 persentasenya.
- **Produk terjual:** Tinjauan Data → Penjualan → **Lihat Rincian** → isi di **✏️ Ubah Shopee**.
- **Komentar live:** salin komentar dari live, tempel di bagian **Komentar live · dipilah JEV**, klik **Pilah dengan JEV**.
- **Saran untuk live berikutnya:** klik **🎯 Minta rekomendasi JEV**, lalu baca dan bahas dengan tim.

**Kotak kuning "⚠️ … sesi datanya belum lengkap" di paling atas** = daftar yang masih perlu dilengkapi. Klik tanggalnya untuk membuka sesi itu.

---

## Kalau ada masalah

| Masalah | Yang dilakukan |
|---|---|
| "Kode kirim salah" di ekstensi | Minta kode terbaru ke Yeni → isi ulang di ⚙️ Pengaturan ekstensi |
| Salah password admin | Cek ketikan; kalau tetap salah, minta ke Yeni |
| Banyak kolom kuning setelah impor | Pakai screenshot yang lebih tajam: zoom Chrome 100%, screenshot hanya kotak Tinjauan Data |
| Angka sudah tersimpan tapi salah | Buka sesinya → **✏️ Ubah** → betulkan → Simpan |
| Salah impor / data dobel | **🗂 Kelola data** → centang → **Hapus terpilih** |
| Ekstensi hilang dari Chrome | Folder browie-live-mirroring dipindah atau dihapus. Kembalikan, lalu `chrome://extensions` → ↻ muat ulang |
| Ada versi baru ekstensi | Ganti isi folder dengan yang baru → `chrome://extensions` → klik ↻ pada kartunya |

## Yang perlu diketahui
- Ekstensi **hanya membaca**, tidak mengubah atau menekan apa pun di Shopee.
- Laptop **tidak harus menyala terus**. Dashboard tetap bisa dibuka dengan data terakhir.
- **Password admin dan kode kirim jangan dibagikan ke grup.** Cukup untuk admin.
- Link dashboard (tanpa password) boleh dibagikan ke **tim saja**, jangan ke luar tim.
