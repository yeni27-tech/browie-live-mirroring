// MODE INTIP — Seller Centre Shopee. Berjalan di dunia halaman (MAIN).
// Tujuan: mencari endpoint mana yang memuat data LIVE (daftar sesi, Tinjauan Data, dashboard live, sumber penonton).
// Yang dicatat HANYA BENTUK data: alamat endpoint, NAMA parameter, NAMA kolom & tipenya. TIDAK ADA ISI/NILAI
// (tidak ada angka penjualan, nama, ID, token). Tidak mengirim request sendiri, tidak menyentuh tombol apa pun.
// Mati sendiri setelah INTIP_SAMPAI. Dicabut begitu penarik data Shopee selesai dibangun.
(function () {
  if (window.__lmIntip) return;
  window.__lmIntip = true;
  const INTIP_SAMPAI = Date.parse("2026-11-08T00:00:00+07:00");
  if (Date.now() > INTIP_SAMPAI) return;
  const sudah = new Set();

  // Bentuk saja, nilai dibuang. Angka 12–20 digit ditandai "id-panjang" (calon ID sesi/produk), tanpa nilainya.
  function bentuk(x, d) {
    if (x === null) return "null";
    if (Array.isArray(x)) return x.length ? [bentuk(x[0], d + 1), "×" + Math.min(x.length, 999)] : ["kosong"];
    const t = typeof x;
    if (t === "number") return Number.isInteger(x) && String(Math.abs(x)).length >= 12 ? "id-panjang" : "angka";
    if (t === "string") return /^\d{12,20}$/.test(x) ? "id-panjang(teks)" : /^-?\d+(\.\d+)?$/.test(x) ? "angka(teks)" : "teks";
    if (t === "boolean") return "ya/tidak";
    if (t !== "object" || d > 6) return t;
    const o = {};
    for (const k of Object.keys(x).slice(0, 80)) o[k] = bentuk(x[k], d + 1);
    return o;
  }
  function catat(url, method, body, teks) {
    try {
      const u = new URL(url, location.href);
      if (!/(^|\.)shopee\.co\.id$/.test(u.hostname) || u.hostname === "shopee.co.id") return;
      const kunci = method + " " + u.hostname + u.pathname;
      if (sudah.has(kunci) || teks.length > 3e6) return;
      const j = JSON.parse(teks);
      sudah.add(kunci);
      let bkeys = [];
      try { const b = typeof body === "string" ? JSON.parse(body) : null; if (b && typeof b === "object") bkeys = Object.keys(b).slice(0, 40); } catch (e) {}
      window.postMessage({ __lm: "intip", rec: { t: Date.now(), page: location.pathname, host: u.hostname, path: u.pathname, method,
        qkeys: [...u.searchParams.keys()].slice(0, 40), bkeys, shape: bentuk(j, 0) } }, location.origin);
    } catch (e) { /* bukan JSON — abaikan */ }
  }
  const open = XMLHttpRequest.prototype.open, send = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (m, url) { this.__lmI = [m, String(url)]; return open.apply(this, arguments); };
  XMLHttpRequest.prototype.send = function (body) {
    const info = this.__lmI;
    if (info) this.addEventListener("load", () => {
      try { if (this.responseType === "" || this.responseType === "text") catat(info[1], info[0], body, this.responseText); } catch (e) {}
    });
    return send.apply(this, arguments);
  };
  const f = window.fetch;
  window.fetch = function (input, init) {
    const p = f.apply(this, arguments);
    p.then((res) => {
      try {
        if (!/json/.test(res.headers.get("content-type") || "")) return;
        const url = typeof input === "string" ? input : input && input.url;
        res.clone().text().then((t) => catat(url, (init && init.method) || "GET", init && init.body, t)).catch(() => {});
      } catch (e) {}
    }).catch(() => {});
    return p;
  };
})();
