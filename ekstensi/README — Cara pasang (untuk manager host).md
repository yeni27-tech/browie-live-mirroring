# browie Live Mirroring — panduan untuk manager host

Ekstensi Chrome untuk laporan **live mirroring** browie (live yang tayang di Instagram dan Shopee sekaligus).
Tugas ekstensi: **mengambil data dari Seller Centre Shopee** di Chrome yang login akun toko browie.
Laporannya dilihat semua orang lewat **link dashboard online** (tanpa password).

Di dalam ekstensi ada tab **📖 Petunjuk** yang berisi langkah yang sama dengan panduan ini.

## A. Pasang ekstensi (sekali, ±2 menit)
1. Ekstrak file `browie-live-mirroring-ekstensi-v0.9.0.zip` → muncul folder **browie-live-mirroring**. Simpan folder ini di tempat yang tidak akan dihapus (misalnya Dokumen).
2. Buka **Chrome yang login Seller Centre Shopee browie**, ketik `chrome://extensions` di kolom alamat, tekan Enter.
3. Nyalakan **Developer mode** (tombol di pojok kanan atas).
4. Klik **Load unpacked** → pilih folder **browie-live-mirroring**.
5. Klik ikon puzzle 🧩 di toolbar Chrome → pin **browie Live Mirroring**. Klik ikonnya untuk membuka ekstensi.

## B. Sambungkan ke dashboard (sekali)
1. Di ekstensi, buka tab **⚙️ Pengaturan**.
2. Isi **Alamat dashboard** dan **Kode kirim** dari Yeni → **Simpan & cek** → harus muncul **"Tersambung"**.

## C. Mode intip (sekali, ±5 menit)
1. Tab **🔎 Mode intip** → ikuti 6 langkahnya (membuka halaman Live Streaming, Tinjauan Data, dan dashboard live di Seller Centre).
2. Tekan **⬇︎ Unduh hasil intip** → kirim file `.json`-nya ke Yeni.

Yang dicatat **hanya nama kolom dan tipe datanya** — tidak ada angka penjualan, nama pembeli, ID, atau password.
Mode intip tidak menekan tombol apa pun dan tidak mengirim apa pun; hasilnya hanya keluar saat tombol Unduh ditekan.
Mati sendiri 8 November 2026.

## D. Setiap selesai live (±3 menit)
1. **Shopee:** Seller Centre → Live Streaming → klik sesi yang baru selesai → **Tinjauan Data** → screenshot seluruh kotak angkanya.
2. **Instagram:** profil → live yang baru selesai → **Insights** → screenshot.
3. Buka **dashboard online** → **Masuk admin** (password admin dari Yeni) → tab **🛠 Admin** → **📸 Impor screenshot** → pilih kedua screenshot.
4. Cek angka. Kolom **kuning** = belum terbaca atau perlu dicek → isi/betulkan. **Jam mulai** Shopee wajib (lihat "Waktu Mulai" di atas Tinjauan Data).
5. Tekan **Simpan**. Selesai.

Kalau sempat: isi **asal penonton** (dashboard live Shopee → Sumber Menonton) dan **produk terjual** (Tinjauan Data → Penjualan → Lihat Rincian) lewat tombol **✏️ Ubah Shopee**, lalu tempel **komentar live** di bagian "Komentar live · dipilah JEV".

## Pertanyaan yang sering muncul
- **Apakah ekstensi mengubah sesuatu di Shopee?** Tidak. Hanya membaca.
- **Laptop harus menyala terus?** Tidak. Dashboard tetap bisa dibuka dengan data terakhir.
- **Muncul "Kode kirim salah"?** Minta kode terbaru ke Yeni, isi ulang di Pengaturan.
- **Ada versi baru?** Ganti isi folder browie-live-mirroring dengan yang baru, lalu di `chrome://extensions` tekan ↻ (muat ulang) pada kartu ekstensi.

## Untuk yang merawat
- Tes: `node test/intip-hook.test.js` · `node test/tarik-sesi.test.js`.
- Sejak 17 Okt 2026 ekstensi tidak memuat tampilan laporan: tab 📡 Status hanya mengecek sambungan, semua laporan ada di dashboard online. Perubahan tampilan cukup deploy web, laptop host tidak perlu update. Ekstensi juga hanya mengirim data MENTAH Seller Centre: pemetaan kolom ada di `web/api/_petakan.js` dan alamat endpoint di `web/api/resep.js` (diambil ekstensi tiap ±6 jam), jadi kalau Shopee mengganti nama kolom atau alamat, cukup ubah web lalu deploy. `style.css` & `theme.js` = salinan dari `../shared/` (`sh ../salin-shared.sh`).
- Pembaca screenshot (Tesseract) & JEV ada di dashboard online (`../web/`), bukan di ekstensi.

## Si Henna — pet pemantau (v0.9.0)
Di halaman Seller Centre muncul tube henna alis kecil di pojok kanan bawah. Klik = lihat kartu pemantau (endpoint terekam, halaman, aktivitas, status penarikan). Seret = pindah. Klik ikon ekstensi di toolbar (saat di Seller Centre) = tampil/sembunyi. Pet hanya membaca data ekstensi, tidak mengirim apa pun ke Shopee.

## Tarik sesi live otomatis (v0.9.0)
Di halaman **seller.shopee.co.id** (Seller Centre → Live Streaming), klik Si Henna → **⬇︎ Tarik sesi live**. Ekstensi membaca daftar sesi (hanya baca): durasi, penonton, puncak, rata-rata tonton, klik produk, keranjang, pesanan, penjualan, follow, suka, komentar. Muncul pratinjau 3 sesi terbaru → **cocokkan dengan Seller Centre** → kalau sama, **Kirim ke dashboard**. Koreksi admin tidak pernah tertimpa.
Belum ikut: asal penonton dan produk terjual per sesi (masih screenshot/isian manual). Kalau angka pratinjau beda dari Seller Centre, jangan kirim, kabari Yeni.

### Tarik otomatis berpola (v0.9.0)
Setelah tarikan manual pertama dikirim, penarikan jalan sendiri dengan pola yang sengaja tidak seragam: hanya saat tab Seller Centre **terlihat dan sedang kamu pakai** (mouse/ketik/gulir dalam 20 menit terakhir), jeda acak ±15–58 menit (selalu di bawah sejam, campuran cepat/sedang/lambat), kadang sengaja dilewati, jatah acak 14–22x per hari (beda tiap hari), libur 00–07 WIB, satu request per tarikan, berhenti 6–12 jam kalau login habis atau Shopee menolak, kirim hanya kalau isinya berubah. Ini mengurangi kemungkinan terlihat seperti bot, **tapi tidak menjamin**. Jangan buka banyak tab Seller Centre sekaligus.

## Data Instagram menurut Shopee (v0.9.0)
Syarat: link di live IG memakai **kode pelacakan** (Seller Centre → Laporan Pengunjung dari Platform Eksternal → Kode Lacak), satu kampanye per sesi dengan nama mengikuti judul sesi.
1. Sekali saja: buka halaman **Laporan Pengunjung dari Platform Eksternal** di tab Seller Centre, lalu muat ulang. Ekstensi mempelajari parameter halaman itu sendiri (tanpa menebak, tanpa menyimpan kode sesi).
2. Klik Si Henna → **⬇︎ Tarik data Instagram**. Cocokkan 3 baris pratinjau dengan halaman Shopee, lalu **Kirim**.
3. Setelah tarikan sesi live pertama dikirim, penarikan ini ikut jalan otomatis (maks sekali per ±90 menit, di jadwal berpola yang sama).
Di dashboard muncul kartu **Dari Instagram menurut Shopee** di tab Per Sesi.
