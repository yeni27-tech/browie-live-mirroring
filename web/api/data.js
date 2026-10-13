// Data dashboard: { peran, sh:[sesi efektif], ig:[], jev:{}, klik:{}, linkUrl, log? (admin) }.
// TAMU membuka tanpa password (permintaan Yeni 8 Okt: report untuk dibagikan lewat link). Admin = cookie admin.
// Ekstensi host = Bearer PUSH_TOKEN. Tamu memakai salinan 30 dtk di memori; admin selalu baca langsung.
import { peranCookie, tokenEkstensi, cors } from "./_auth.js";
import { bacaSemua, bacaPengaturan } from "./_store.js";

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
  res.setHeader("Cache-Control", "no-store");
  res.json({ peran, sh: d.sh, ig: d.ig, jev: d.jev, aksi: d.aksi, klik: d.klik, off: d.off, log: d.log, linkUrl: `https://${host}/go`, jevSiap: !!set.jevKey, pengaturan });
}
