// browie Live Mirroring — penarik daftar sesi live dari Seller Centre (berdasar hasil mode intip 8 Okt 2026).
// Endpoint: GET /api/supply/lm/sellercenter/realtime/sessionList?page=&pageSize= (host seller.shopee.co.id, cuma BACA).
// Dijalankan dari content script di halaman seller.shopee.co.id supaya request sama-asal (cookie login host ikut sendiri).
// Satuan angka (detik/milidetik, mikrodetik) tidak tercatat di mode intip → dideteksi dari besarnya angka, lalu DITAMPILKAN
// ke host sebagai pratinjau sebelum dikirim, supaya dicocokkan dengan Seller Centre sekali.
(function (root) {
  const ENDPOINT = "/api/supply/lm/sellercenter/realtime/sessionList";
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
  async function tarik(fetchFn, origin) {
    const varian = ["?page=1&pageSize=20", "?page=1&pageSize=20&name=&orderBy=startTime&sort=desc"];
    let galat = null;
    for (const q of varian) {
      try {
        const res = await fetchFn((origin || "") + ENDPOINT + q, { credentials: "include", headers: { accept: "application/json" } });
        if (res.status === 401 || res.status === 403) throw new Error("Login Seller Centre habis (HTTP " + res.status + "). Login ulang lalu coba lagi.");
        if (!res.ok) throw new Error("HTTP " + res.status);
        return petakanRespons(await res.json());
      } catch (e) { galat = e; if (/Login/.test(e.message)) break; }
    }
    throw galat || new Error("Gagal menarik sesi.");
  }



  /* ---------- Laporan Pengunjung dari Platform Eksternal (kode pelacakan / UTM) ----------
     Endpoint: GET /api/mydata/v2/marketing/off-platform/traffic-reporting/channel-metric/ (hasil intip 9 Okt 2026).
     Nilai parameter (period, terminal, channel, format tanggal) TIDAK ditebak: dipelajari dari request halaman Shopee sendiri
     lewat performance.getEntriesByType("resource") ketika host membuka halaman Laporan Pengunjung dari Platform Eksternal. */
  const OFF_PATH = "/api/mydata/v2/marketing/off-platform/traffic-reporting/channel-metric/";
  // url (string) → templat { period, terminal, channel, ver, fmt } atau null. SPC_CDS sengaja TIDAK disimpan.
  function pelajariOff(url) {
    try {
      const u = new URL(url, "https://seller.shopee.co.id"); if (u.pathname !== OFF_PATH) return null;
      const g = (k) => u.searchParams.get(k);
      const s = g("start_time"); if (!s) return null;
      const fmt = /^\d{10}$/.test(s) ? "s" : /^\d{13}$/.test(s) ? "ms" : /^\d{4}-\d{2}-\d{2}$/.test(s) ? "iso" : null;
      if (!fmt) return null;
      const aman = (v) => (v == null ? null : String(v).slice(0, 40));
      return { period: aman(g("period")), terminal: aman(g("terminal")), channel: aman(g("channel")), ver: aman(g("SPC_CDS_VER")) || "2", fmt, at: Date.now() };
    } catch (e) { return null; }
  }
  function cariCds(urls) { for (const n of urls || []) { const m = /[?&]SPC_CDS=([^&]+)/.exec(n); if (m) return m[1]; } return null; }
  // Batas hari WIB → tanda waktu sesuai format templat.
  function stempel(dateIso, akhir, fmt) {
    if (fmt === "iso") return dateIso;
    const ms = Date.parse(dateIso + "T" + (akhir ? "23:59:59" : "00:00:00") + "+07:00");
    return String(fmt === "ms" ? ms : Math.floor(ms / 1000));
  }
  function bangunUrlOff(tpl, cds, dariIso, sampaiIso, origin) {
    if (!tpl) throw new Error("Ekstensi belum mempelajari parameternya. Buka halaman Laporan Pengunjung dari Platform Eksternal di tab ini sekali (muat ulang), lalu klik aku lagi.");
    if (!cds) throw new Error("Kode sesi Seller Centre (SPC_CDS) belum terbaca di halaman ini. Muat ulang halaman Seller Centre lalu coba lagi.");
    const p = new URLSearchParams();
    p.set("SPC_CDS", cds); p.set("SPC_CDS_VER", tpl.ver || "2");
    p.set("start_time", stempel(dariIso, false, tpl.fmt)); p.set("end_time", stempel(sampaiIso, true, tpl.fmt));
    if (tpl.period != null) p.set("period", tpl.period);
    if (tpl.terminal != null) p.set("terminal", tpl.terminal);
    if (tpl.channel != null) p.set("channel", tpl.channel);
    return (origin || "") + OFF_PATH + "?" + p.toString();
  }
  // Baris laporan per hari per kampanye → baris dashboard. date bisa detik atau milidetik.
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
  async function tarikOff(fetchFn, tpl, cds, dariIso, sampaiIso, origin) {
    const url = bangunUrlOff(tpl, cds, dariIso, sampaiIso, origin);
    const res = await fetchFn(url, { credentials: "include", headers: { accept: "application/json" } });
    if (res.status === 401 || res.status === 403) throw new Error("Login Seller Centre habis (HTTP " + res.status + "). Login ulang lalu coba lagi.");
    if (!res.ok) throw new Error("HTTP " + res.status);
    return petakanOff(await res.json());
  }

  /* ---------- pola jadwal otomatis (supaya tidak terbaca sebagai bot) ----------
     Prinsip: sesedikit mungkin, tidak seragam, dan hanya ketika ada orang sungguhan memakai Seller Centre.
     - hanya saat tab TERLIHAT dan halaman baru disentuh (gerak mouse/ketik/gulir) dalam 20 menit terakhir
     - jeda TIDAK seragam: campuran (±55% di sekitar 28–42 menit, ±25% lebih cepat 15–28, ±20% lebih lambat 42–58) — selalu < 1 jam
     - 1 dari 9 kesempatan sengaja dilewati (seperti orang lupa mengecek)
     - jatah harian ACAK 14–22 (berbeda tiap hari), libur 00.00–07.00 WIB
     - detik pemicu diacak 1–9 dtk, satu request per tarikan, tidak paralel, tanpa mengubah header
     - HTTP 401/403/429 atau respons aneh → berhenti 6 jam (429/403: 12 jam), tidak mencoba ulang beruntun
     - internet putus → tidak dihitung, dicoba lagi ±5 menit kemudian */
  const POLA = { mulaiMinDtk: 20, mulaiMaksDtk: 90, kuotaMin: 14, kuotaMaks: 22, peluangLewat: 1 / 9, aktifMenit: 20, liburDari: 0, liburSampai: 7, berhentiMenit: 360, berhentiKerasMenit: 720, ulangMenit: 5, tundaMinDtk: 1, tundaMaksDtk: 9 };
  const acak = (a, b, rnd) => a + (b - a) * (rnd ? rnd() : Math.random());
  // Jeda berikutnya (menit), campuran tiga rentang, tidak pernah mencapai 60.
  function jedaMenit(rnd) {
    const r = rnd ? rnd() : Math.random();
    if (r < 0.55) return acak(28, 42, rnd);
    if (r < 0.80) return acak(15, 28, rnd);
    return acak(42, 58, rnd);
  }
  const jamWib = (ms) => new Date(ms + 7 * 3600000).getUTCHours();
  const tglWib = (ms) => new Date(ms + 7 * 3600000).toISOString().slice(0, 10);
  // st: { next, hariIni:{tgl,n,kuota}, berhentiSampai }. opsi.terakhirAktif = ms sentuhan terakhir pengguna. Hasil: { boleh, alasan }.
  function bolehTarik(st, now, opsi) {
    st = st || {}; opsi = opsi || {};
    if (!opsi.terverifikasi) return { boleh: false, alasan: "belum diverifikasi" };
    if (opsi.tabTerlihat === false) return { boleh: false, alasan: "tab tidak terlihat" };
    if (opsi.online === false) return { boleh: false, alasan: "offline" };
    if (opsi.terakhirAktif != null && now - opsi.terakhirAktif > POLA.aktifMenit * 60000) return { boleh: false, alasan: "tidak ada aktivitas pengguna" };
    const h = jamWib(now); if (h >= POLA.liburDari && h < POLA.liburSampai) return { boleh: false, alasan: "jam libur" };
    if (st.berhentiSampai && now < st.berhentiSampai) return { boleh: false, alasan: "berhenti sementara" };
    const hi = st.hariIni && st.hariIni.tgl === tglWib(now) ? st.hariIni : null;
    if (hi && hi.n >= (hi.kuota || POLA.kuotaMaks)) return { boleh: false, alasan: "jatah harian habis" };
    if (st.next && now < st.next) return { boleh: false, alasan: "belum waktunya" };
    return { boleh: true, alasan: "" };
  }
  // Update status sesudah satu percobaan. jenis: "ok" | "lewat" | "jaringan" | "login" | "keras"(429/403) | "galat"
  function sesudah(st, now, jenis, rnd) {
    st = { ...(st || {}) };
    const tgl = tglWib(now), r = rnd || Math.random;
    const hi = st.hariIni && st.hariIni.tgl === tgl ? st.hariIni : { tgl, n: 0, kuota: Math.round(acak(POLA.kuotaMin, POLA.kuotaMaks, r)) };
    if (jenis === "jaringan") { st.hariIni = hi; st.next = now + POLA.ulangMenit * 60000; return st; }
    if (jenis === "lewat") { st.hariIni = hi; st.next = now + jedaMenit(r) * 60000; return st; }
    st.hariIni = { ...hi, n: hi.n + 1 };
    if (jenis === "ok") { st.next = now + jedaMenit(r) * 60000; st.berhentiSampai = 0; st.gagalBeruntun = 0; }
    else { st.gagalBeruntun = (st.gagalBeruntun || 0) + 1; const menit = jenis === "keras" ? POLA.berhentiKerasMenit : POLA.berhentiMenit; st.berhentiSampai = now + menit * 60000; st.next = st.berhentiSampai; }
    return st;
  }
  // Sidik jari isi (FNV-1a) tanpa field yang berubah-ubah: kirim hanya kalau ada yang berubah.
  function sidik(sh) {
    const s = JSON.stringify((sh || []).map((x) => { const o = { ...x }; delete o.shopeeId; return o; }).sort((a, b) => (a.id < b.id ? -1 : 1)));
    let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0).toString(16);
  }

  const api = { OFF_PATH, pelajariOff, cariCds, bangunUrlOff, petakanOff, ringkasOff, tarikOff, POLA, acak, jedaMenit, bolehTarik, sesudah, sidik, ENDPOINT, keMs, durDetik, avgDetik, petakan, petakanRespons, ringkas, tarik };
  root.lmTarik = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
