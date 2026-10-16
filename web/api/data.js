// Data dashboard: { peran, sh:[sesi efektif], ig:[], jev:{}, klik:{}, linkUrl, log? (admin) }.
// TAMU membuka tanpa password (permintaan Yeni 8 Okt: report untuk dibagikan lewat link). Admin = cookie admin.
// Ekstensi host = Bearer PUSH_TOKEN. Tamu memakai salinan 30 dtk di memori; admin selalu baca langsung.
import { peranCookie, tokenEkstensi, cors } from "./_auth.js";
import { bacaSemua, bacaPengaturan } from "./_store.js";
import { redis } from "./_redis.js";
import { LINK_BASE } from "./_kode.js";

const SIMPAN_MS = 30 * 1000;
let salinan = null;

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  const peran = peranCookie(req) === "admin" ? "admin" : tokenEkstensi(req) ? "ekstensi" : "tamu";
  let d;
  try {
    if (peran === "admin") d = await bacaSemua(true);
    else {
      if (!salinan || Date.now() - salinan.at > SIMPAN_MS) salinan = { d: await bacaSemua(false), at: Date.now() };
      d = salinan.d;
    }
  } catch (e) { return res.status(503).json({ error: "penyimpanan tidak bisa dibaca: " + e.message }); }
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const set = await bacaPengaturan();
  // Kunci JEV TIDAK PERNAH dikirim ke browser — admin hanya melihat 4 karakter terakhir.
  const pengaturan = peran === "admin" ? { jevTerpasang: !!set.jevKey, jevAkhir: set.jevKey ? set.jevKey.slice(-4) : "", jevDariWeb: set.jevDariWeb, shopeeUrl: set.shopeeUrl } : undefined;
  // Link penghitung (kode unik per sesi) + riwayatnya HANYA untuk admin: tamu tidak boleh melihat alamatnya.
  let link;
  if (peran === "admin") {
    try {
      const [aktif, kodeRaw, klikRaw, lamaRaw] = await redis([["HGET", "lm:set", "kodeAktif"], ["HGETALL", "lm:kode"], ["HGETALL", "lm:klikKode"], ["HGETALL", "lm:klikKodeLama"]]);
      const peta = (r) => { const o = {}; for (let i = 0; Array.isArray(r) && i < r.length; i += 2) o[r[i]] = r[i + 1]; return o; };
      const kk = peta(klikRaw), kl = peta(lamaRaw);
      const riwayat = Object.values(peta(kodeRaw)).map((x) => { try { const o = JSON.parse(x); return { ...o, klik: Number(kk[o.kode]) || 0, klikLama: Number(kl[o.kode]) || 0, aktif: o.kode === aktif }; } catch { return null; } }).filter(Boolean).sort((a, b) => b.mulai - a.mulai);
      link = { base: LINK_BASE(), aktif: aktif || null, url: aktif ? LINK_BASE() + "/" + aktif : null, riwayat };
    } catch { link = { base: LINK_BASE(), aktif: null, url: null, riwayat: [], galat: true }; }
  }
  res.setHeader("Cache-Control", "no-store");
  res.json({ peran, sh: d.sh, ig: d.ig, jev: d.jev, aksi: d.aksi, klik: d.klik, off: d.off, log: d.log, linkUrl: link ? link.url : undefined, link, jevSiap: !!set.jevKey, pengaturan });
}
