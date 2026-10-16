// Link penghitung unik per sesi (permintaan Yeni 17 Okt 2026): alamatnya TIDAK sama dengan dashboard dan kodenya
// berganti tiap kali link tujuan Shopee diganti. Disimpan di Upstash yang sama dengan dashboard:
//   lm:kode         hash kode → { kode, url, kampanye, mulai, selesai|null }
//   lm:set kodeAktif         kode yang sedang dipakai
//   lm:klikKode     hash kode → klik saat kode itu AKTIF (dihitung juga ke lm:klik per 10 menit untuk atribusi sesi)
//   lm:klikKodeLama hash kode → klik yang datang setelah kode itu diganti (diteruskan ke link terbaru, tidak masuk lm:klik)
import crypto from "node:crypto";
export const KODE_RE = /^[A-Za-z0-9]{8}$/;
const HURUF = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"; // tanpa 0/O/1/l/I supaya tidak salah baca
export function buatKode() { const b = crypto.randomBytes(8); let s = ""; for (const x of b) s += HURUF[x % HURUF.length]; return s; }
export function kampanyeDari(url) { try { return new URL(url).searchParams.get("utm_campaign") || ""; } catch { return ""; } }
export const LINK_BASE = () => (process.env.LINK_BASE || "https://brw-link.vercel.app").replace(/\/+$/, "");
// Perintah Upstash untuk menutup kode lama (kalau ada) dan mengaktifkan kode baru untuk url.
export function cmdsKodeBaru(url, lama, now) {
  const kode = buatKode(), cmds = [];
  if (lama) cmds.push(["HSET", "lm:kode", lama.kode, JSON.stringify({ ...lama, selesai: now })]);
  cmds.push(["HSET", "lm:kode", kode, JSON.stringify({ kode, url, kampanye: kampanyeDari(url), mulai: now, selesai: null })], ["HSET", "lm:set", "kodeAktif", kode]);
  return { kode, cmds };
}
