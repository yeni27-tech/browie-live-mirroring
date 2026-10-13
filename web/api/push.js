// Ekstensi host mengirim sesi Shopee hasil tarikan Seller Centre. Auth: Bearer PUSH_TOKEN.
// Isi: { sh:[{ id, date, start, … }] }. Tiap sesi di-upsert ke bagian "base"; koreksi admin ("edit") dan status
// "hidden" (dihapus admin) TIDAK pernah ditimpa — tarikan otomatis tidak boleh membatalkan kerja admin.
import { readBody, tokenEkstensi, cors } from "./_auth.js";
import { redis } from "./_redis.js";
import { bacaSh, catatLog } from "./_store.js";

const ID_OK = /^[A-Za-z0-9_.:-]{1,80}$/;

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "method" });
  if (!tokenEkstensi(req)) return res.status(401).json({ error: "token salah" });
  let j;
  try { j = JSON.parse((await readBody(req, 0.9)).toString()); } catch (e) { return res.status(400).json({ error: "bukan JSON atau terlalu besar" }); }
  if (!j || (!Array.isArray(j.sh) && !Array.isArray(j.off))) return res.status(400).json({ error: "bentuk data salah: butuh sh[] atau off[]" });
  const shIn = Array.isArray(j.sh) ? j.sh : [];
  const masuk = shIn.filter((s) => s && ID_OK.test(String(s.id || "")) && /^\d{4}-\d{2}-\d{2}$/.test(String(s.date || "")));
  try {
    const lama = masuk.length ? await bacaSh(masuk.map((s) => s.id)) : {};
    const cmds = [];
    let baru = 0;
    for (const s of masuk) {
      const l = lama[s.id] || { id: s.id };
      if (!lama[s.id]) baru++;
      const { id, ...base } = s;
      cmds.push(["HSET", "lm:sh", s.id, JSON.stringify({ ...l, id: s.id, base, updatedAt: Date.now() })]);
    }
    if (baru) cmds.push(...catatLog(`Ekstensi host menambah ${baru} sesi Shopee`));
    // Laporan kode pelacakan (UTM) Shopee per hari per kampanye: ditimpa tiap kiriman (Shopee yang menghitung, kita hanya menyalin).
    const angka = (v) => (typeof v === "number" && isFinite(v) && v >= 0 ? v : 0);
    const offMasuk = (Array.isArray(j.off) ? j.off : []).filter((o) => o && /^\d{4}-\d{2}-\d{2}$/.test(String(o.date || "")) && typeof o.campaign === "string" && o.campaign.trim()).slice(0, 400);
    for (const o of offMasuk) {
      const camp = o.campaign.trim().slice(0, 120), kunci = (o.date + "|" + camp).slice(0, 160);
      cmds.push(["HSET", "lm:off", kunci, JSON.stringify({ date: o.date, campaign: camp, channel: String(o.channel || "").slice(0, 30), visits: angka(o.visits), visitors: angka(o.visitors), atcUsers: angka(o.atcUsers), atcUnits: angka(o.atcUnits), atcValue: angka(o.atcValue), orders: angka(o.orders), sales: angka(o.sales), buyers: angka(o.buyers), newBuyers: angka(o.newBuyers), units: angka(o.units), at: Date.now() })]);
    }
    if (offMasuk.length) cmds.push(...catatLog(`Ekstensi host memperbarui ${offMasuk.length} baris kode pelacakan Shopee`));
    if (cmds.length) await redis(cmds);
    res.json({ ok: true, diterima: masuk.length, baru, off: offMasuk.length, ditolak: shIn.length - masuk.length, at: new Date().toISOString() });
  } catch (e) { return res.status(503).json({ error: "penyimpanan gagal: " + e.message }); }
}
