// Penyimpanan data sesi di Upstash. Disimpan PER SESI supaya isian beberapa orang tidak saling menimpa.
//   lm:sh  hash  id → { id, base:{…dari ekstensi}, edit:{…koreksi admin}, hidden?, by, updatedAt }
//          sesi efektif = { id, ...base, ...edit }  → koreksi admin selalu menang atas tarikan otomatis
//   lm:ig  hash  id → { id, date, title, dur, viewers, puncak, komen, share, engaged, pairId?, pairBy?, … }
//   lm:klik hash "YYYY-MM-DDTHH:M0" → jumlah klik link penghitung
//   lm:jev hash  id sesi → { total, kategori:{k:n}, contoh:{k:[teks…]}, at } — komentar live yang dipilah JEV
//   lm:aksi hash id sesi → { at, hasil:[{k,p}], fakta:[…] } — rekomendasi aksi dari JEV
//   lm:set hash  pengaturan dari halaman admin: jevKey (RAHASIA, tidak pernah dikirim ke browser), shopeeUrl
//   lm:off hash "TANGGAL|kampanye" → { date, campaign, channel, visits, visitors, atcUsers, atcUnits, atcValue, orders, sales, buyers, newBuyers, units, at } — laporan kode pelacakan (UTM) Shopee per hari, dari ekstensi
//   lm:log list  riwayat perubahan admin (maks 300, terbaru di depan)
import { redis, hashObj } from "./_redis.js";

function parseHash(arr) {
  const out = [];
  if (Array.isArray(arr)) for (let i = 1; i < arr.length; i += 2) { try { out.push(JSON.parse(arr[i])); } catch {} }
  return out;
}
export function efektif(r) {
  if (!r || r.hidden) return null;
  return { ...(r.base || {}), ...(r.edit || {}), id: r.id, by: r.edit && Object.keys(r.edit).length ? (r.base ? "auto+koreksi" : "manual") : "auto" };
}
export async function bacaSemua(denganLog) {
  const cmds = [["HGETALL", "lm:sh"], ["HGETALL", "lm:ig"], ["HGETALL", "lm:klik"], ["HGETALL", "lm:jev"], ["HGETALL", "lm:aksi"], ["HGETALL", "lm:off"]];
  if (denganLog) cmds.push(["LRANGE", "lm:log", 0, 99]);
  const [sh, ig, klik, jevRaw, aksiRaw, offRaw, log] = await redis(cmds);
  const peta = (raw) => { const o = {}; if (Array.isArray(raw)) for (let i = 0; i < raw.length; i += 2) { try { o[raw[i]] = JSON.parse(raw[i + 1]); } catch {} } return o; };
  const jev = peta(jevRaw), aksi = peta(aksiRaw);
  return {
    sh: parseHash(sh).map(efektif).filter(Boolean),
    ig: parseHash(ig),
    klik: hashObj(klik),
    off: Object.values(peta(offRaw)).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : String(a.campaign).localeCompare(String(b.campaign)))),
    jev,
    aksi,
    log: denganLog ? (log || []).map((x) => { try { return JSON.parse(x); } catch { return null; } }).filter(Boolean) : undefined,
  };
}
export async function bacaSh(ids) {
  if (!ids.length) return {};
  const vals = await redis([["HMGET", "lm:sh", ...ids]]);
  const out = {}; (vals[0] || []).forEach((v, i) => { if (v) { try { out[ids[i]] = JSON.parse(v); } catch {} } });
  return out;
}
export function catatLog(teks) {
  return [["LPUSH", "lm:log", JSON.stringify({ at: Date.now(), teks: String(teks).slice(0, 300) })], ["LTRIM", "lm:log", 0, 299]];
}

// Pengaturan: nilai dari halaman admin menang atas env Vercel (env = cadangan dari skrip pemasangan).
export async function bacaPengaturan() {
  let r = [null, null];
  try { r = await redis([["HMGET", "lm:set", "jevKey", "shopeeUrl"]]); r = r[0] || [null, null]; } catch {}
  return { jevKey: r[0] || process.env.JEV_KEY || "", shopeeUrl: r[1] || process.env.SHOPEE_URL || "", jevDariWeb: !!r[0], shopeeDariWeb: !!r[1] };
}
