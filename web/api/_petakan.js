// Pemetaan data mentah Seller Centre Shopee → baris dashboard. Ada di SERVER (bukan di ekstensi) supaya kalau Shopee
// mengganti nama kolom, cukup deploy web — laptop manager host tidak perlu update (permintaan Yeni 17 Okt 2026).
// Dipindah dari ekstensi/tarik-sesi.js. Satuan waktu/durasi dideteksi dari besarnya angka.
const num = (v) => (typeof v === "number" && isFinite(v) ? v : typeof v === "string" && v.trim() !== "" && isFinite(Number(v)) ? Number(v) : null);

// Timestamp bisa detik, milidetik, mikrodetik, atau nanodetik → milidetik.
function keMs(v) {
  const n = num(v); if (n == null || n <= 0) return null;
  if (n > 1e17) return n / 1e6;
  if (n > 1e14) return n / 1e3;
  if (n > 1e11) return n;
  return n * 1000;
}
// Durasi: sesi live tidak mungkin > 2 hari, jadi angka > 172.800 pasti milidetik.
function durDetik(v) { const n = num(v); if (n == null) return null; return Math.round(n > 172800 ? n / 1000 : n); }
// Rata-rata tonton: > 7.200 (2 jam) pasti milidetik.
function avgDetik(v) { const n = num(v); if (n == null) return null; return Math.round(n > 7200 ? n / 1000 : n); }
function wib(ms) { const iso = new Date(ms + 7 * 3600000).toISOString(); return { date: iso.slice(0, 10), start: iso.slice(11, 16) }; }

// Satu baris Shopee → sesi dashboard (id sama dengan pola input manual: s-TANGGAL-JJMM, supaya menyatu dengan data yang sudah ada).
function petakan(r) {
  if (!r || typeof r !== "object") return null;
  const ms = keMs(r.startTime); if (ms == null) return null;
  const w = wib(ms);
  const s = { id: "s-" + w.date + "-" + w.start.replace(":", ""), date: w.date, start: w.start };
  if (typeof r.title === "string" && r.title.trim()) s.title = r.title.trim().slice(0, 160);
  const put = (k, v) => { if (v != null) s[k] = v; };
  put("dur", durDetik(r.duration));
  put("penonton", num(r.viewers));
  put("ditonton", num(r.views));
  put("puncak", num(r.peakViewers));
  put("avg", avgDetik(r.avgViewsDuration));
  put("klik", num(r.productClicks));
  put("atc", num(r.atc));
  put("pesanan", num(r.placedOrders));
  put("jual", num(r.placedSales));
  put("follow", num(r.followersGrowth));
  put("suka", num(r.likes));
  put("komen", num(r.comments));
  if (s.klik != null && s.ditonton) s.ctr = Math.round((s.klik / s.ditonton) * 1000) / 10;
  s.shopeeId = String(r.sessionId == null ? "" : r.sessionId).slice(0, 40);
  return s;
}
function petakanRespons(j) {
  if (!j || typeof j !== "object") throw new Error("Respons Shopee bukan JSON.");
  if (j.code != null && j.code !== 0) throw new Error("Shopee menolak (code " + j.code + (j.msg ? ": " + String(j.msg).slice(0, 80) : "") + "). Login Seller Centre mungkin kedaluwarsa.");
  const list = j.data && Array.isArray(j.data.list) ? j.data.list : null;
  if (!list) throw new Error("Bentuk respons tidak dikenali (tidak ada data.list).");
  const sh = list.map(petakan).filter(Boolean);
  return { sh, total: num(j.data.total), dibaca: list.length };
}

const rp = (n) => (n == null ? "—" : "Rp" + Math.round(n).toLocaleString("id-ID"));
const jamDur = (d) => (d == null ? "—" : Math.floor(d / 3600) + ":" + String(Math.floor((d % 3600) / 60)).padStart(2, "0") + ":" + String(d % 60).padStart(2, "0"));
// Baris pratinjau yang dibaca manusia, untuk dicocokkan dengan Seller Centre.
function ringkas(s) {
  return { judul: s.date + " · " + s.start + " WIB" + (s.title ? " · " + s.title : ""),
    isi: "durasi " + jamDur(s.dur) + " · penonton " + (s.penonton == null ? "—" : s.penonton) + " · ditonton " + (s.ditonton == null ? "—" : s.ditonton) + " · puncak " + (s.puncak == null ? "—" : s.puncak) + " · rata-rata tonton " + (s.avg == null ? "—" : s.avg + " dtk") + " · pesanan " + (s.pesanan == null ? "—" : s.pesanan) + " · penjualan " + rp(s.jual) };
}

// Tarik halaman pertama (20 sesi terbaru). Dicoba tanpa parameter urutan dulu; kalau ditolak, dengan urutan terbaru.
function petakanOff(j) {
  if (!j || typeof j !== "object") throw new Error("Respons Shopee bukan JSON.");
  if (j.code != null && j.code !== 0) throw new Error("Shopee menolak (code " + j.code + (j.msg ? ": " + String(j.msg).slice(0, 80) : "") + ").");
  const r = j.result || {};
  const src = Array.isArray(r.channel_performance_by_day) && r.channel_performance_by_day.length ? r.channel_performance_by_day : null;
  if (!src) { if (Array.isArray(r.channel_performance_by_day)) return { off: [], dibaca: 0 }; throw new Error("Bentuk respons tidak dikenali (tidak ada channel_performance_by_day)."); }
  const off = [];
  for (const x of src) {
    if (!x || !x.campaign_description) continue;
    const ms = keMs(x.date); if (ms == null) continue;
    const tgl = wib(ms).date, n = (k) => { const v = num(x[k]); return v == null ? 0 : v; };
    off.push({ date: tgl, campaign: String(x.campaign_description).slice(0, 120), channel: String(x.channel || "").slice(0, 30),
      visits: n("visits"), visitors: n("visitors"), atcUsers: n("add_to_cart_users"), atcUnits: n("add_to_cart_units"), atcValue: n("add_to_cart_value"),
      orders: n("orders"), sales: n("sales"), buyers: n("buyers"), newBuyers: n("new_buyers"), units: n("units") });
  }
  return { off, dibaca: src.length };
}
function ringkasOff(o) {
  return { judul: o.date + " · " + o.campaign + (o.channel ? " · " + o.channel : ""), isi: "kunjungan " + o.visits + " · pengunjung " + o.visitors + " · masuk keranjang " + o.atcUsers + " orang (" + rp(o.atcValue) + ") · pesanan " + o.orders + " · penjualan " + rp(o.sales) };
}

export { keMs, durDetik, avgDetik, petakan, petakanRespons, ringkas, petakanOff, ringkasOff };
