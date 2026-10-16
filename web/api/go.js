// LINK PENGHITUNG IG → Shopee. Dipasang sebagai link beli di live Instagram (alamat: /go).
// Catat 1 klik di blok 10 menit (jam WIB), lalu langsung teruskan ke toko Shopee (env SHOPEE_URL).
// Tidak menyimpan IP, perangkat, atau identitas apa pun — hanya jumlah per 10 menit.
// ATURAN UTAMA: penonton tidak boleh tertahan. Upstash lambat/mati → tetap redirect (klik itu saja yang tidak terhitung).
import { redis, redisSiap } from "./_redis.js";

export function kunciKlik(nowMs) { return new Date(nowMs + 7 * 3600000).toISOString().slice(0, 15) + "0"; }

export default async function handler(req, res) {
  // Tujuan: link dari halaman Pengaturan admin (lm:set shopeeUrl), cadangan env SHOPEE_URL, cadangan terakhir shopee.co.id.
  let tujuan = process.env.SHOPEE_URL || "https://shopee.co.id/";
  const bot = /bot|crawler|spider|facebookexternalhit|preview|slurp/i.test(req.headers["user-agent"] || "");
  if (redisSiap()) {
    // Sejak 17 Okt 2026 link penghitung = kode unik di proyek terpisah. Begitu kode pertama dibuat (lm:set kodeAktif),
    // /go dimatikan supaya alamat dashboard tidak bisa dipakai menembak klik. Klik /go hanya dihitung selama belum ada kode.
    const cmds = [["HGET", "lm:set", "shopeeUrl"], ["HMGET", "lm:set", "kodeAktif", "goMati"]];
    if (req.method === "GET" && !bot) cmds.push(["EVAL", "if redis.call('HEXISTS','lm:set','kodeAktif')==0 and redis.call('HEXISTS','lm:set','goMati')==0 then return redis.call('HINCRBY','lm:klik',ARGV[1],1) end return 0", 0, kunciKlik(Date.now())]);
    // Batas waktu sendiri (tidak bergantung pada fetch yang patuh AbortSignal): maks 1,2 dtk, lalu redirect apa pun hasilnya.
    const batas = new Promise((r) => setTimeout(() => r(null), 1200));
    try { const h = await Promise.race([redis(cmds, 1200), batas]);
      if (h && Array.isArray(h[1]) && (h[1][0] || h[1][1])) { res.statusCode = 410; res.setHeader("Content-Type", "text/html; charset=utf-8"); res.setHeader("Cache-Control", "no-store");
        return res.end('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Link sudah diganti</title><body style="font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:90vh;margin:0;color:#555"><p>Link ini sudah tidak dipakai.</p></body>'); }
      if (h && /^https:\/\/(s\.)?shopee\.co\.id\/|^https:\/\/shope\.ee\//.test(h[0] || "")) tujuan = h[0]; } catch (e) { /* tetap redirect */ }
  }
  res.setHeader("Cache-Control", "no-store");
  res.statusCode = 302;
  res.setHeader("Location", tujuan);
  res.end();
}
