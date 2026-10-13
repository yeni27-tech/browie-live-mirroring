# Dashboard online browie Live Mirroring — cara pasang

**Cara cepat (disarankan):** di Terminal
```
cd "02 - Projects/browie/Live Mirroring/web"
bash siapkan-dashboard.sh
```
Skrip memandu semuanya: hubungkan proyek Vercel `browie-live`, sambungkan Upstash (sekali klik di browser), isi rahasia, deploy, dan cek.
Rahasia diketik/dibuat di Terminal, tidak pernah lewat chat.

## Rahasia yang dipasang
| Nama | Isi | Dibuat oleh |
|---|---|---|
| `ADMIN_PASSWORD` | password admin bersama Yeni + host | Yeni ketik (atau dibuatkan) |
| `SHOPEE_URL` | link toko/produk Shopee di live IG | Yeni ketik |
| `JEV_KEY` | kunci TypeSafe untuk pilah komentar (opsional — lebih mudah diisi di web: ⚙️ Pengaturan) | Yeni ketik |
| `SESSION_SECRET`, `PUSH_TOKEN` | kode acak | skrip |
| `KV_REST_API_*` / `UPSTASH_REDIS_REST_*` | penyimpanan | otomatis dari Upstash |

Tidak ada password untuk tamu — dashboard dibuka langsung lewat link (noindex, tidak muncul di Google).

## Cara manual (kalau skrip gagal)
1. `vercel link --yes --project browie-live`
2. Vercel → proyek → Storage → Create Database → Upstash for Redis → Free → Connect (Production)
3. `vercel env add NAMA production` untuk tiap rahasia di tabel
4. `vercel --prod`

## Cek setelah pasang
- Buka alamat dashboard → langsung tampil tanpa password → "📖 Cara membaca" di atas.
- Masuk admin → tab **🛠 Admin** muncul → "Muat data awal 6–7 Okt".
- `https://browie-live.vercel.app/go` → langsung pindah ke toko Shopee.
- Ekstensi host → Pengaturan → Simpan & cek → "Tersambung".

## ⚙️ Pengaturan dari web (admin)
- **Kunci JEV**: tempel → Uji & simpan (ditolak TypeSafe = tidak disimpan). Tersimpan di Upstash `lm:set`, menang atas env `JEV_KEY`. Browser hanya pernah melihat 4 huruf terakhir.
- **Link tujuan Shopee**: ganti link toko/produk tanpa deploy ulang; link penghitung `/go` untuk IG tetap sama. Hanya link `shopee.co.id`, `s.shopee.co.id`, `shope.ee` yang diterima.

## Siapa bisa apa
| | Tamu (tanpa password) | Admin (password admin) | Ekstensi host (kode kirim) |
|---|---|---|---|
| Lihat dashboard + petunjuk | ✅ | ✅ | ✅ tab Ringkasan |
| Impor screenshot IG & Shopee, isi/koreksi, pasangkan | — | ✅ | — |
| Produk terjual, kelola data (hapus banyak), riwayat | — | ✅ | — |
| Tempel komentar → pilah JEV | — | ✅ | — |
| Kirim sesi Shopee tarikan Seller Centre | — | — | ✅ (Tahap B) |

## Batas & biaya
- Rp0: Vercel Hobby + Upstash Free (500 rb perintah/bulan; 1 klik link = 1 perintah).
- JEV: maks 200 komentar sekali pilah; hanya teks komentar yang dikirim ke TypeSafe (nama penonton dibuang).
- Link penghitung tidak menyimpan IP atau identitas, hanya jumlah per 10 menit.

## Tes (dari folder web/)
`node test/api.test.js` (25) · `node test/ocr.test.js` (11)
