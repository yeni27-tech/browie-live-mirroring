#!/bin/sh
# Salin modul bersama ke ekstensi/ dan web/. Jalankan setiap kali mengubah file di shared/.
cd "$(dirname "$0")" || exit 1
mkdir -p web
for f in session-core.js session-render.js style.css theme.js; do
  cp "shared/$f" "ekstensi/$f" && cp "shared/$f" "web/$f"
done
for f in session-core.js session-render.js style.css theme.js; do
  diff -q "shared/$f" "ekstensi/$f" && diff -q "shared/$f" "web/$f" || { echo "BEDA: $f"; exit 1; }
done
echo "shared → ekstensi & web: identik"
