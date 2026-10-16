// browie Live Mirroring — penarik daftar sesi live dari Seller Centre (berdasar hasil mode intip 8 Okt 2026).
// Endpoint: GET /api/supply/lm/sellercenter/realtime/sessionList?page=&pageSize= (host seller.shopee.co.id, cuma BACA).
// Dijalankan dari content script di halaman seller.shopee.co.id supaya request sama-asal (cookie login host ikut sendiri).
// Satuan angka (detik/milidetik, mikrodetik) tidak tercatat di mode intip → dideteksi dari besarnya angka, lalu DITAMPILKAN
// ke host sebagai pratinjau sebelum dikirim, supaya dicocokkan dengan Seller Centre sekali.
(function (root) {
  const ENDPOINT = "/api/supply/lm/sellercenter/realtime/sessionList";
  // Pemetaan kolom ada di server (web/api/_petakan.js). Ekstensi hanya mengambil data MENTAH lalu mengirimnya.
  // Alamat & parameter juga datang dari server (resep, GET /api/resep); di bawah ini cadangan kalau resep belum terambil.
  const RESEP_BAWAAN = { versi: 0, sesi: { path: ENDPOINT, varian: ["?page=1&pageSize=20", "?page=1&pageSize=20&name=&orderBy=startTime&sort=desc"] }, off: { path: "/api/mydata/v2/marketing/off-platform/traffic-reporting/channel-metric/" } };
  const pakaiResep = (r) => ({ sesi: { ...RESEP_BAWAAN.sesi, ...((r && r.sesi) || {}) }, off: { ...RESEP_BAWAAN.off, ...((r && r.off) || {}) }, versi: (r && r.versi) || 0 });
  const amanPath = (p) => (typeof p === "string" && /^\/api\/[A-Za-z0-9/_.-]+$/.test(p) ? p : null);
  const amanQuery = (q) => (typeof q === "string" && /^\?[A-Za-z0-9=&_.-]*$/.test(q) ? q : null);
  function cekRespons(j, butuh) {
    if (!j || typeof j !== "object") throw new Error("Respons Shopee bukan JSON.");
    if (j.code != null && j.code !== 0) throw new Error("Shopee menolak (code " + j.code + (j.msg ? ": " + String(j.msg).slice(0, 80) : "") + "). Login Seller Centre mungkin kedaluwarsa.");
    if (butuh && !butuh(j)) throw new Error("Bentuk respons tidak dikenali.");
    return j;
  }

  // Tarik halaman pertama daftar sesi (data MENTAH). Dicoba varian query dari resep berurutan.
  async function tarik(fetchFn, origin, resep) {
    const R = pakaiResep(resep), path = amanPath(R.sesi.path) || ENDPOINT;
    const varian = (R.sesi.varian || []).map(amanQuery).filter(Boolean);
    let galat = null;
    for (const q of varian.length ? varian : RESEP_BAWAAN.sesi.varian) {
      try {
        const res = await fetchFn((origin || "") + path + q, { credentials: "include", headers: { accept: "application/json" } });
        if (res.status === 401 || res.status === 403) throw new Error("Login Seller Centre habis (HTTP " + res.status + "). Login ulang lalu coba lagi.");
        if (!res.ok) throw new Error("HTTP " + res.status);
        const j = cekRespons(await res.json(), (x) => x.data && Array.isArray(x.data.list));
        return { mentah: j, dibaca: j.data.list.length };
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
  function pelajariOff(url, offPath) {
    try {
      const u = new URL(url, "https://seller.shopee.co.id"); if (u.pathname !== (offPath || OFF_PATH)) return null;
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
  function bangunUrlOff(tpl, cds, dariIso, sampaiIso, origin, offPath) {
    if (!tpl) throw new Error("Ekstensi belum mempelajari parameternya. Buka halaman Laporan Pengunjung dari Platform Eksternal di tab ini sekali (muat ulang), lalu klik aku lagi.");
    if (!cds) throw new Error("Kode sesi Seller Centre (SPC_CDS) belum terbaca di halaman ini. Muat ulang halaman Seller Centre lalu coba lagi.");
    const p = new URLSearchParams();
    p.set("SPC_CDS", cds); p.set("SPC_CDS_VER", tpl.ver || "2");
    p.set("start_time", stempel(dariIso, false, tpl.fmt)); p.set("end_time", stempel(sampaiIso, true, tpl.fmt));
    if (tpl.period != null) p.set("period", tpl.period);
    if (tpl.terminal != null) p.set("terminal", tpl.terminal);
    if (tpl.channel != null) p.set("channel", tpl.channel);
    return (origin || "") + (amanPath(offPath) || OFF_PATH) + "?" + p.toString();
  }
  async function tarikOff(fetchFn, tpl, cds, dariIso, sampaiIso, origin, resep) {
    const url = bangunUrlOff(tpl, cds, dariIso, sampaiIso, origin, pakaiResep(resep).off.path);
    const res = await fetchFn(url, { credentials: "include", headers: { accept: "application/json" } });
    if (res.status === 401 || res.status === 403) throw new Error("Login Seller Centre habis (HTTP " + res.status + "). Login ulang lalu coba lagi.");
    if (!res.ok) throw new Error("HTTP " + res.status);
    const j = cekRespons(await res.json(), (x) => x.result && Array.isArray(x.result.channel_performance_by_day));
    return { mentah: j, dibaca: j.result.channel_performance_by_day.length };
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

  // Sidik jari data mentah: kirim otomatis hanya kalau isinya berubah.
  function sidikMentah(x) { const s = JSON.stringify(x || null); let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(16); }
  const api = { OFF_PATH, RESEP_BAWAAN, pakaiResep, pelajariOff, cariCds, bangunUrlOff, tarikOff, POLA, acak, jedaMenit, bolehTarik, sesudah, sidik, sidikMentah, ENDPOINT, tarik };
  root.lmTarik = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
