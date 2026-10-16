#!/bin/sh
# Salin modul bersama ke ekstensi/ dan web/. Jalankan setiap kali mengubah file di shared/.
cd "$(dirname "$0")" || exit 1
mkdir -p web
# Sejak 17 Okt 2026 ekstensi TIDAK memuat tampilan laporan (cuma tarik & kirim) → ke ekstensi cukup gaya + tema.
for f in session-core.js session-render.js style.css theme.js; do cp "shared/$f" "web/$f"; done
for f in style.css theme.js; do cp "shared/$f" "ekstensi/$f"; done
for f in session-core.js session-render.js style.css theme.js; do diff -q "shared/$f" "web/$f" || { echo "BEDA: $f"; exit 1; }; done
for f in style.css theme.js; do diff -q "shared/$f" "ekstensi/$f" || { echo "BEDA: $f"; exit 1; }; done
echo "shared → ekstensi & web: identik"
