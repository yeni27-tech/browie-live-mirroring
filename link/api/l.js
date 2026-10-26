// Link penghitung unik browie Live Mirroring (tujuan: toko Shopee atau live TikTok) — proyek Vercel TERPISAH dari dashboard (alamat https://<proyek>.vercel.app/<kode>).
// Proyek ini tidak memegang kunci penyimpanan: ia bertanya ke dashboard (DASH_URL/api/kode-klik, Bearer LINK_SECRET) dari server.
// Kode tak dikenal → 404 (yang menebak-nebak tidak diteruskan ke mana pun).
// ATURAN UTAMA: penonton tidak boleh tertahan — dashboard lambat/mati → tetap diteruskan ke toko (LINK_CADANGAN).
import crypto from "node:crypto";

const KODE_RE = /^[A-Za-z0-9]{8}$/;
const TUJUAN_RE = /^https:\/\/(s\.)?shopee\.co\.id\/|^https:\/\/shope\.ee\/|^https:\/\/(www\.|m\.|vt\.|vm\.)?tiktok\.com\//;
const TIKTOK_RE = /^https:\/\/(www\.|m\.|vt\.|vm\.)?tiktok\.com\//;

function halaman(res, status, teks) {
  res.statusCode = status; res.setHeader("Content-Type", "text/html; charset=utf-8"); res.setHeader("Cache-Control", "no-store");
  res.end(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Link tidak ditemukan</title><body style="font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:90vh;margin:0;color:#555"><p>${teks}</p></body>`);
}

// Tujuan live TikTok: langsung coba buka APLIKASI TikTok tanpa tombol perantara.
// Android: intent:// (sistem membuka aplikasi TikTok; kalau tidak terpasang → halaman web TikTok).
// iPhone/lainnya: langsung ke https (iOS kadang tetap menampilkan konfirmasi "Buka di TikTok?" — itu aturan iOS, tidak bisa dilewati).
function keTiktok(res, url) {
  const u = new URL(url), intent = `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=https;S.browser_fallback_url=${encodeURIComponent(url)};end`;
  const j = JSON.stringify(url), ji = JSON.stringify(intent);
  res.statusCode = 200; res.setHeader("Content-Type", "text/html; charset=utf-8"); res.setHeader("Cache-Control", "no-store"); res.setHeader("Referrer-Policy", "no-referrer");
  res.end(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Membuka live TikTok…</title>
<noscript><meta http-equiv="refresh" content="0;url=${url.replace(/"/g, "&quot;")}"></noscript>
<body style="font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:90vh;margin:0;color:#555;text-align:center"><p>Membuka live TikTok…<br><a id="l" href="${url.replace(/"/g, "&quot;")}" style="visibility:hidden;color:#555">Ketuk di sini kalau tidak terbuka</a></p>
<script>var u=${j},i=${ji};if(/Android/i.test(navigator.userAgent)){location.href=i;setTimeout(function(){location.replace(u)},2500)}else{location.replace(u)}setTimeout(function(){document.getElementById("l").style.visibility="visible"},3000)</script></body>`);
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
      if (r.ok) { const j = await r.json(); if (!j.ada) return halaman(res, 404, "Link tidak ditemukan."); if (TUJUAN_RE.test(j.tujuan || "")) tujuan = j.tujuan; }
    } catch (e) { /* tetap diteruskan */ } finally { clearTimeout(t); }
  }
  if (TIKTOK_RE.test(tujuan) && req.method !== "HEAD") return keTiktok(res, tujuan);
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.statusCode = 302; res.setHeader("Location", tujuan); res.end();
}
