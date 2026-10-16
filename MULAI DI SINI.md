# browie Live Mirroring — MULAI DI SINI

Semua sudah siap dipasang. Urutannya 4 langkah, total ±20 menit.

## 1. Pasang dashboard online (Yeni, ±10 menit)
Di Terminal:
```
cd "/Users/danangpriambodo/yen'sys/sinwaz Playground/02 - Projects/browie/Live Mirroring/web"
bash siapkan-dashboard.sh
```
Skrip akan:
- menghubungkan ke proyek Vercel `browie-live` (akun Vercel kamu),
- meminta kamu menyambungkan **Upstash** (penyimpanan gratis) lewat browser — sekali klik,
- menanyakan **password admin**, **link Shopee** yang dipakai di live IG, dan **kunci JEV** (opsional),
- membuat kode-kode rahasia lain sendiri, lalu memasang dashboard dan mengeceknya.

Di akhir muncul kotak **"SIMPAN BAIK-BAIK"**: alamat dashboard, link penghitung, password admin, kode kirim ekstensi.
Simpan di catatan pribadi. **Jangan tempel ke chat Claude.**

## 2. Isi data awal (Yeni, 1 menit)
Buka alamat dashboard → **Masuk admin** → **Muat data awal 6–7 Okt**.

## 3. Kirim ke manager host (lewat chat pribadi)
- File `paket/browie-live-mirroring-ekstensi-v0.8.1.zip`
- Alamat dashboard, **password admin**, dan **kode kirim**
- Panduan langkah demi langkah untuk host: `paket/PANDUAN-HOST.md` (kirim juga), dan di dalam zip (`PANDUAN-PASANG.md`) serta tab **📖 Petunjuk** ekstensi

## 4. Ganti link beli di live IG
Pakai **link penghitung** (`https://browie-live.vercel.app/go`) sebagai pengganti link Shopee langsung.
Tujuannya tetap toko Shopee yang sama; bedanya klik dari IG jadi terhitung per sesi.

---

## Siapa melakukan apa
| Siapa | Kapan | Apa |
|---|---|---|
| Tim / tamu | kapan saja | Buka link dashboard — **tanpa password**. Ada "📖 Cara membaca" dan "ℹ️ Ini apa?" di tiap bagian |
| Admin (Yeni + host) | tiap selesai live | Masuk admin → 📸 Impor screenshot Shopee + IG → cek → Simpan |
| Admin | kalau sempat | Asal penonton, produk terjual, tempel komentar → JEV |
| Manager host | sekali | Pasang ekstensi + mode intip → kirim file intip ke Yeni |
| Claude | setelah file intip masuk | Bangun penarik data Shopee otomatis (Tahap B) |

## Yang perlu diketahui
- **Dashboard tanpa password** = siapa pun yang punya link bisa melihat angka penjualan live. Halaman tidak muncul di Google (noindex), tapi link bisa diteruskan. Jangan bagikan ke luar tim.
- **Admin pakai satu password bersama.** Riwayat perubahan mencatat apa & jam berapa, bukan siapa.
- **Kunci JEV & link tujuan Shopee bisa diisi/diganti dari web**: Masuk admin → **⚙️ Pengaturan**. Kunci diuji dulu ke TypeSafe sebelum disimpan, dan tidak pernah ditampilkan lagi (hanya 4 huruf terakhir). Kunci di `~/.zshrc` terakhir ditolak (401); pakai kunci yang jalan di ekstensi Pulse.
- Biaya: **Rp0** (Vercel Hobby + Upstash Free).

Detail teknis & keputusan: `README.md`.
