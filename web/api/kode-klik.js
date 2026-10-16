// Dipanggil HANYA oleh proyek link penghitung (brw-link) dari server ke server, dengan Bearer LINK_SECRET.
// Penyimpanan (Upstash) tetap hanya dipegang dashboard; proyek link tidak punya kuncinya.
// Masuk: ?kode=XXXXXXXX&v=<id perangkat acak 16 hex>&bot=0|1  →  { ada, tujuan, dihitung, aktif }
// Aturan: kode tak dikenal → ada:false (link menjawab 404). Kode aktif → 1 klik/perangkat/10 menit ke lm:klikKode + lm:klik.
// Kode lama → tujuan = link Shopee TERBARU, klik dicatat di lm:klikKodeLama.
import crypto from "node:crypto";
import { redis } from "./_redis.js";

const KODE_RE = /^[A-Za-z0-9]{8}$/;
const SHOPEE_RE = /^https:\/\/(s\.)?shopee\.co\.id\/|^https:\/\/shope\.ee\//;
export function kunciKlik(nowMs) { return new Date(nowMs + 7 * 3600000).toISOString().slice(0, 15) + "0"; }
function tokenOk(req) {
  const s = process.env.LINK_SECRET, h = String(req.headers.authorization || "");
  if (!s || !h.startsWith("Bearer ")) return false;
  const a = crypto.createHash("sha256").update(h.slice(7)).digest(), b = crypto.createHash("sha256").update(s).digest();
  return crypto.timingSafeEqual(a, b);
}
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!tokenOk(req)) return res.status(401).json({ error: "token" });
  const q = req.query || Object.fromEntries(new URL(req.url, "http://x").searchParams);
  const kode = String(q.kode || ""), v = String(q.v || ""), bot = q.bot === "1";
  if (!KODE_RE.test(kode) || !/^[a-f0-9]{16}$/.test(v)) return res.json({ ada: false });
  const h = await redis([["HEXISTS", "lm:kode", kode], ["HGET", "lm:set", "kodeAktif"], ["HGET", "lm:set", "shopeeUrl"], ["SET", "lm:dd:" + kode + ":" + v, "1", "NX", "EX", 600]]);
  if (!Number(h[0])) return res.json({ ada: false });
  const aktif = h[1] === kode, tujuan = SHOPEE_RE.test(h[2] || "") ? h[2] : null;
  let dihitung = false;
  if (!bot && h[3] === "OK") {
    await redis(aktif ? [["HINCRBY", "lm:klikKode", kode, 1], ["HINCRBY", "lm:klik", kunciKlik(Date.now()), 1]] : [["HINCRBY", "lm:klikKodeLama", kode, 1]]);
    dihitung = true;
  }
  res.json({ ada: true, tujuan, dihitung, aktif });
}
