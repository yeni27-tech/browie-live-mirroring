// Resep penarikan untuk ekstensi host: ALAMAT & parameter endpoint Seller Centre. Ada di server supaya kalau Shopee
// memindah endpoint, cukup ubah file ini lalu deploy web — ekstensi mengambil resep baru sendiri (disimpan ±6 jam).
// Hanya alamat, bukan kode: ekstensi menolak path/query di luar pola /api/... dan ?a=b&... (lihat tarik-sesi.js).
import { tokenEkstensi, cors } from "./_auth.js";
export const RESEP = {
  versi: 1,
  sesi: { path: "/api/supply/lm/sellercenter/realtime/sessionList", varian: ["?page=1&pageSize=20", "?page=1&pageSize=20&name=&orderBy=startTime&sort=desc"] },
  off: { path: "/api/mydata/v2/marketing/off-platform/traffic-reporting/channel-metric/" },
};
export default function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (!tokenEkstensi(req)) return res.status(401).json({ error: "token salah" });
  res.setHeader("Cache-Control", "no-store");
  res.json(RESEP);
}
