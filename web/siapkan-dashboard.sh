#!/bin/bash
# Pasang dashboard online browie Live Mirroring ke Vercel — dijalankan YENI sendiri di Terminal:
#   cd "02 - Projects/browie/Live Mirroring/web" && bash siapkan-dashboard.sh
# Semua rahasia diketik/dibuat DI TERMINAL INI, tidak pernah ditempel ke chat.
set -e
cd "$(dirname "$0")"
PROYEK="${1:-browie-live}"
# Vercel CLI baru butuh --scope eksplisit. Otomatis: ambil dari pesan error, atau dari folder .vercel yang sudah terhubung.
SCOPE="${SCOPE:-}"
hijau() { printf "\033[32m%s\033[0m\n" "$1"; }
kuning() { printf "\033[33m%s\033[0m\n" "$1"; }
langkah() { printf "\n\033[1m== %s ==\033[0m\n" "$1"; }

langkah "1/6 Cek akun Vercel"
if ! vercel whoami >/dev/null 2>&1; then kuning "Belum login. Jalankan: vercel login   lalu ulangi skrip ini."; exit 1; fi
hijau "Login sebagai: $(vercel whoami 2>/dev/null)"

langkah "2/6 Hubungkan folder ini ke proyek Vercel \"$PROYEK\""
if [ -z "$SCOPE" ] && [ -f .vercel/project.json ]; then SCOPE=$(python3 -c "import json;print(json.load(open('.vercel/project.json')).get('orgSlug',''))" 2>/dev/null || true); fi
if [ -z "$SCOPE" ]; then
  SCOPE=$(vercel link --yes --project "$PROYEK" 2>&1 | grep -Eo -- '--scope [a-zA-Z0-9_-]+' | head -1 | cut -d' ' -f2 || true)
fi
[ -n "$SCOPE" ] || SCOPE="$(vercel whoami 2>/dev/null)s-projects"
vercel link --yes --project "$PROYEK" --scope "$SCOPE" >/dev/null 2>&1 || { kuning "Gagal menghubungkan proyek (scope: $SCOPE). Jalankan: vercel link --project $PROYEK"; exit 1; }
rm -f .env.local .gitignore  # file sementara dari vercel link, tidak dibutuhkan
V="vercel --scope $SCOPE"
hijau "Terhubung ke proyek $PROYEK (scope $SCOPE)."

langkah "3/6 Penyimpanan Upstash (gratis)"
if $V env ls production 2>/dev/null | grep -Eq "KV_REST_API_URL|UPSTASH_REDIS_REST_URL"; then
  hijau "Upstash sudah tersambung."
else
  echo "Lakukan di browser (sekali saja, ±1 menit):"
  echo "  1. Buka https://vercel.com/dashboard → proyek $PROYEK → tab Storage"
  echo "  2. Create Database → Upstash for Redis → paket Free → Connect ke proyek $PROYEK (centang Production)"
  read -r -p "Tekan Enter kalau sudah... " _
  if ! $V env ls production 2>/dev/null | grep -Eq "KV_REST_API_URL|UPSTASH_REDIS_REST_URL"; then
    kuning "Upstash belum terlihat di proyek. Cek lagi lalu ulangi skrip ini."; exit 1
  fi
  hijau "Upstash tersambung."
fi

langkah "4/6 Rahasia dashboard"
pasang() { # nama nilai
  $V env rm "$1" production -y >/dev/null 2>&1 || true
  printf '%s' "$2" | $V env add "$1" production >/dev/null
  hijau "  ✓ $1"
}
SESSION_SECRET=$(openssl rand -hex 32)
PUSH_TOKEN=$(openssl rand -hex 24)
read -r -s -p "Password ADMIN (Yeni + host; kosongkan = dibuatkan otomatis): " ADMIN_PASSWORD; echo
[ -z "$ADMIN_PASSWORD" ] && ADMIN_PASSWORD="browie-$(openssl rand -hex 4)"
read -r -p "Link toko/produk Shopee yang dipakai di live IG sekarang (https://shopee.co.id/...): " SHOPEE_URL
case "$SHOPEE_URL" in https://shopee.co.id/*|https://s.shopee.co.id/*) ;; *) kuning "Link harus diawali https://shopee.co.id/ atau https://s.shopee.co.id/"; exit 1;; esac
read -r -s -p "Kunci JEV / TypeSafe (opsional, Enter untuk lewati — bisa diisi nanti di dashboard: ⚙️ Pengaturan): " JEV_KEY; echo
pasang SESSION_SECRET "$SESSION_SECRET"
pasang PUSH_TOKEN "$PUSH_TOKEN"
pasang ADMIN_PASSWORD "$ADMIN_PASSWORD"
pasang SHOPEE_URL "$SHOPEE_URL"
[ -n "$JEV_KEY" ] && pasang JEV_KEY "$JEV_KEY" || kuning "  – JEV_KEY dilewati — isi nanti di dashboard: Masuk admin → ⚙️ Pengaturan"

langkah "5/6 Deploy ke production"
URL=$($V --prod --yes 2>/dev/null | grep -Eo 'https://[a-zA-Z0-9.-]+\.vercel\.app' | tail -1)
ALIAS="https://$PROYEK.vercel.app"
hijau "Terpasang. Alamat: $ALIAS"

langkah "6/6 Cek cepat"
sleep 3
GO=$(curl -s -o /dev/null -w "%{http_code} %{redirect_url}" "$ALIAS/go?cek=1")
DATA=$(curl -s -o /dev/null -w "%{http_code}" "$ALIAS/api/data")
[ "${GO%% *}" = "302" ] && hijau "  ✓ Link penghitung meneruskan ke Shopee" || kuning "  ✗ Link penghitung belum jalan ($GO)"
[ "$DATA" = "200" ] && hijau "  ✓ Dashboard tamu bisa dibuka tanpa password" || kuning "  ✗ Dashboard belum bisa dibaca (HTTP $DATA) — cek Upstash"
kuning "  (klik uji barusan ikut tercatat 1 — tidak masalah)"

cat <<TXT

================ SIMPAN BAIK-BAIK (muncul sekali) ================
Dashboard tim (tanpa password) : $ALIAS
Link penghitung untuk live IG  : $ALIAS/go
Password ADMIN (Yeni + host)   : $ADMIN_PASSWORD
Kode kirim ekstensi (host)     : $PUSH_TOKEN
==================================================================
Langkah berikutnya:
 1. Buka $ALIAS → Masuk admin → "Muat data awal 6–7 Okt".
 2. Kirim ke manager host lewat chat pribadi: alamat dashboard, password admin, kode kirim,
    dan file paket/browie-live-mirroring-ekstensi-v0.8.0.zip.
 3. Ganti link beli di live IG dengan $ALIAS/go
TXT
