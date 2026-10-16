// Link penghitung unik browie Live Mirroring — proyek Vercel TERPISAH dari dashboard (alamat https://<proyek>.vercel.app/<kode>).
// Proyek ini tidak memegang kunci penyimpanan: ia bertanya ke dashboard (DASH_URL/api/kode-klik, Bearer LINK_SECRET) dari server.
// Kode tak dikenal → 404 (yang menebak-nebak tidak diteruskan ke mana pun).
// ATURAN UTAMA: penonton tidak boleh tertahan — dashboard lambat/mati → tetap diteruskan ke toko (LINK_CADANGAN).
import crypto from "node:crypto";

const KODE_RE = /^[A-Za-z0-9]{8}$/;
const SHOPEE_RE = /^https:\/\/(s\.)?shopee\.co\.id\/|^https:\/\/shope\.ee\//;

function halaman(res, status, teks) {
  res.statusCode = status; res.setHeader("Content-Type", "text/html; charset=utf-8"); res.setHeader("Cache-Control", "no-store");
  res.end(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Link tidak ditemukan</title><body style="font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:90vh;margin:0;color:#555"><p>${teks}</p></body>`);
}

export default async function handler(req, res) {
  const kode = String((req.query && req.query.kode) || new URL(req.url || "/", "http://x").searchParams.get("kode") || "");
  if (!KODE_RE.test(kode)) return halaman(res, 404, "Link tidak ditemukan.");
  const bot = /bot|crawler|spider|facebookexternalhit|preview|slurp/i.test(req.headers["user-agent"] || "");
  const ck = (req.headers.cookie || "").split(/;\s*/).find((c) => c.startsWith("v="));
  let v = ck && /^[a-f0-9]{16}$/.test(ck.slice(2)) ? ck.slice(2) : null;
  if (!v) { v = crypto.randomBytes(8).toString("hex"); res.setHeader("Set-Cookie", `v=${v}; Max-Age=31536000; Path=/; Secure; HttpOnly; SameSite=Lax`); }
  let tujuan = process.env.LINK_CADANGAN || "https://shopee.co.id/browieofficial";
  const dash = (process.env.DASH_URL || "").replace(/\/+$/, "");
  if (dash && process.env.LINK_SECRET) {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 1500);
    try {
      const r = await fetch(`${dash}/api/kode-klik?kode=${kode}&v=${v}&bot=${bot && req.method === "GET" ? 1 : bot ? 1 : req.method === "GET" ? 0 : 1}`,
        { headers: { Authorization: "Bearer " + process.env.LINK_SECRET }, signal: ctl.signal });
      if (r.ok) { const j = await r.json(); if (!j.ada) return halaman(res, 404, "Link tidak ditemukan."); if (SHOPEE_RE.test(j.tujuan || "")) tujuan = j.tujuan; }
    } catch (e) { /* tetap diteruskan */ } finally { clearTimeout(t); }
  }
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.statusCode = 302; res.setHeader("Location", tujuan); res.end();
}
