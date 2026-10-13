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
    const cmds = [["HGET", "lm:set", "shopeeUrl"]];
    if (req.method === "GET" && !bot) cmds.push(["HINCRBY", "lm:klik", kunciKlik(Date.now()), 1]);
    // Batas waktu sendiri (tidak bergantung pada fetch yang patuh AbortSignal): maks 1,2 dtk, lalu redirect apa pun hasilnya.
    const batas = new Promise((r) => setTimeout(() => r(null), 1200));
    try { const h = await Promise.race([redis(cmds, 1200), batas]); if (h && /^https:\/\/(s\.)?shopee\.co\.id\/|^https:\/\/shope\.ee\//.test(h[0] || "")) tujuan = h[0]; } catch (e) { /* tetap redirect */ }
  }
  res.setHeader("Cache-Control", "no-store");
  res.statusCode = 302;
  res.setHeader("Location", tujuan);
  res.end();
}
