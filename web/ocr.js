// Baca screenshot secara LOKAL di perangkat (Tesseract, tanpa AI). Dua jenis yang dikenali otomatis:
//   • Insights live Instagram           → parseIgText()
//   • Tinjauan Data sesi live Shopee    → parseShopeeText()
// Fungsi parse murni & dites di test/ocr.test.js; bacaGambar() memakai Tesseract yang dibundel di vendor/.

const IG_BULAN = { january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  januari: 1, februari: 2, maret: 3, mei: 5, juni: 6, juli: 7, agustus: 8, oktober: 10, desember: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, agu: 8, sep: 9, oct: 10, okt: 10, nov: 11, dec: 12, des: 12 };

// Label per kolom, Inggris + Indonesia. Angka diambil dari ujung baris yang memuat label itu.
const IG_LABEL = {
  puncak: /(peak\s+concurrent\s+viewers|penonton\s+(bersamaan|serentak)\s+(tertinggi|puncak)|puncak\s+penonton)/i,
  viewers: /^(viewers|penonton|pemirsa)\b/i,
  komen: /^(comments|komentar)\b/i,
  share: /^(shares|bagikan|dibagikan|dibagikan ulang)\b/i,
  engaged: /(accounts\s+engaged|akun\s+(yang\s+)?berinteraksi|akun\s+terlibat)/i,
};

function igAngka(s) { const m = String(s).match(/(\d[\d.,]*)\s*$/); if (!m) return null; const n = Number(m[1].replace(/[.,](?=\d{3}\b)/g, "").replace(",", ".")); return isNaN(n) ? null : n; }
function igDur(s) { if (!s) return null; const p = s.split(":").map(Number); if (p.some(isNaN)) return null; return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1]; }

function parseIgText(text, now) {
  now = now || new Date();
  const lines = String(text || "").replace(/\r/g, "").split("\n").map((l) => l.trim()).filter(Boolean);
  const hasil = { date: "", title: "", dur: null, viewers: null, puncak: null, komen: null, share: null, engaged: null };
  // Baris tanggal: "October 7 - Duration 1:31:15" / "7 Oktober · Durasi 1:31:15"
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const m = l.match(/([A-Za-z]+)\s+(\d{1,2})\s*.{0,3}?\s*(?:duration|durasi)\s*(\d{1,2}:\d{2}(?::\d{2})?)/i) ||
              l.match(/(\d{1,2})\s+([A-Za-z]+)\s*.{0,3}?\s*(?:duration|durasi)\s*(\d{1,2}:\d{2}(?::\d{2})?)/i);
    if (!m) continue;
    let bln, tgl;
    if (/^\d/.test(m[1])) { tgl = +m[1]; bln = IG_BULAN[m[2].toLowerCase()]; } else { bln = IG_BULAN[m[1].toLowerCase()]; tgl = +m[2]; }
    hasil.dur = igDur(m[3]);
    if (bln && tgl >= 1 && tgl <= 31) {
      let y = now.getFullYear();
      if (Date.UTC(y, bln - 1, tgl) > now.getTime() + 2 * 864e5) y--;
      hasil.date = y + "-" + String(bln).padStart(2, "0") + "-" + String(tgl).padStart(2, "0");
    }
    // Judul = baris sebelumnya kalau isinya kebanyakan huruf
    const prev = lines[i - 1] || "";
    if (/[A-Za-z]{3,}/.test(prev) && (prev.match(/[A-Za-z0-9 !?,.&'-]/g) || []).length / prev.length > 0.85) hasil.title = prev;
    break;
  }
  for (const l of lines) {
    for (const k of ["puncak", "engaged", "viewers", "komen", "share"]) {
      if (hasil[k] != null) continue;
      if (IG_LABEL[k].test(l)) { const n = igAngka(l); if (n != null) { hasil[k] = n; break; } }
    }
  }
  hasil.kurang = ["date", "dur", "viewers", "puncak", "komen", "share", "engaged"].filter((k) => hasil[k] == null || hasil[k] === "");
  return hasil;
}

/* ---------- Shopee: Tinjauan Data ----------
   Label di screenshot sering kacau (huruf kecil), tapi ANGKA keluar berurutan baris demi baris dan urutannya
   selalu sama. Jadi angka dipetakan menurut urutan, dengan "Durasi Rata-Rata Menonton" (satu-satunya angka jam:menit:detik)
   sebagai jangkar supaya satu angka yang hilang tidak menggeser semuanya. */
const SH_SEBELUM = ["jual", "pesanan", "produk", "nilaiPesanan", "jualPerPembeli", "penonton", "aktif", "ditonton", "puncak"];
const SH_SESUDAH = ["ctr", "pembeli", "klik", "rasioDiklik", "pesananPerKlik", "atc", "jualPerMil", "suka", "bagi", "komen", "persenKomen", "follow"];
const SH_SIMPAN = ["jual", "pesanan", "produk", "penonton", "aktif", "ditonton", "puncak", "avg", "ctr", "pembeli", "klik", "atc", "suka", "bagi", "komen", "follow"];
function shToken(t) {
  t = t.replace(/[()©|]/g, "");
  if (/^\d{1,2}:\d{2}:\d{2}$/.test(t)) return { jenis: "jam", v: igDur(t) };
  let m = t.match(/^Rp\.?([\d.,]+)$/i); if (m) return { jenis: "rp", v: Number(m[1].replace(/[.,]/g, "")) };
  m = t.match(/^(\d[\d.,]*)%$/); if (m) return { jenis: "pct", v: Number(m[1].replace(/\.(?=\d{3}\b)/g, "").replace(",", ".")) };
  m = t.match(/^\d[\d.]*$/); if (m) return { jenis: "n", v: Number(t.replace(/\./g, "")) };
  return null;
}
// Label Tinjauan Data → kolom. Dicocokkan dari yang PALING PANJANG dulu supaya "Nilai Penjualan per Pesanan"
// tidak terbaca sebagai "Penjualan" + "Pesanan". Kolom promosi ikut dicocokkan supaya urutan kolom di barisnya tidak geser.
const SH_LABEL = [
  ["nilaiPesanan", /nilai\s+penj\w*\s+per\s+pes\w*/i], ["jualPerPembeli", /penj\w*\s+per\s+pemb\w*/i], ["jualPerMil", /penj\w*\s+per\s+mil\w*/i],
  ["pesananPerKlik", /pes\w*\s+per\s+kli\w*/i], ["avg", /durasi\s+rata/i], ["atc", /tambah\s+ke\s+ker\w*/i], ["rasioDiklik", /rasio\s+produk\s*\w*/i],
  ["ctr", /persentase\s+kli\w*/i], ["persenKomen", /persentase\s+kom\w*/i], ["puncak", /penonton\s+terb\w*/i], ["aktif", /penonton\s+akt\w*/i],
  ["produk", /produk\s+terj\w*/i], ["klik", /klik\s+produk/i], ["follow", /pengikut\s+baru/i],
  ["_p1", /berapa\s+kali\s+koin\s*\w*/i], ["_p2", /berapa\s+kali\s+voucher\s*\w*/i], ["_p3", /harga\s+spesial(\s+live)?(\s+dimulai)?/i],
  ["_p4", /koin\s+diklaim/i], ["_p5", /ronde\s+koin/i], ["_p6", /ronde\s+lelang/i],
  ["jual", /\bpenj\w*/i], ["pesanan", /\bpesan\w*/i], ["penonton", /\bpenonton\b/i], ["ditonton", /\bditonton\b/i], ["pembeli", /\bpembeli\b/i],
  ["suka", /\bsuka\b/i], ["bagi", /\bdibagikan\b/i], ["komen", /\bkomentar\b/i],
];
function shLabelBaris(l) {
  let sisa = l.replace(/\(?\d\)|\(\d?/g, " "); const temu = [];
  for (const [k, re] of SH_LABEL) {
    const g = new RegExp(re.source, "gi"); let m;
    while ((m = g.exec(sisa))) { temu.push({ k, i: m.index }); sisa = sisa.slice(0, m.index) + " ".repeat(m[0].length) + sisa.slice(m.index + m[0].length); g.lastIndex = 0; }
  }
  return temu.sort((a, b) => a.i - b.i).map((x) => x.k);
}
// Baris angka: token angka + "pengganti" (huruf tunggal = angka yang salah baca, mis. 4→E, 5→D).
function shBarisAngka(l) {
  const ws = l.split(/\s+/).filter(Boolean), tok = [];
  let angka = 0;
  for (const w of ws) { const t = shToken(w); if (t) { tok.push(t); angka++; } else if (/^[A-Za-z]$/.test(w)) tok.push(null); }
  return angka && tok.length / ws.length >= 0.5 ? tok : null;
}
// Cara 1 (dipakai kalau label terbaca): pasangkan tiap baris label dengan baris angka tepat di bawahnya.
function shLewatLabel(lines) {
  const out = {}, ragu = [];
  let tunggu = [];
  for (const l of lines) {
    const angka = shBarisAngka(l);
    if (angka) {
      if (tunggu.length) {
        if (angka.length === tunggu.length) tunggu.forEach((k, i) => { if (angka[i]) out[k] = angka[i].v; else ragu.push(k); });
        else tunggu.forEach((k, i) => { if (angka[i]) { out[k] = angka[i].v; ragu.push(k); } });
      }
      tunggu = [];
    } else { const lab = shLabelBaris(l); if (lab.length) tunggu = lab; }
  }
  return { out, ragu };
}
function parseShopeeText(text, now) {
  now = now || new Date();
  const lines = String(text || "").replace(/\r/g, "").split("\n").map((l) => l.trim()).filter(Boolean);
  const hasil = { date: "", start: "", dur: null };
  const iTj = lines.findIndex((l) => /tinjauan/i.test(l));
  const kepala = (iTj >= 0 ? lines.slice(0, iTj) : lines.slice(0, 4)).join(" ");
  // "Waktu Mulai: 07-10-2026 10:23" — OCR sering menghilangkan tanda baca: "07102026 1023"
  let m = kepala.match(/(\d{2})[-./ ]?(\d{2})[-./ ]?(20\d{2})\D{0,3}(\d{1,2})[:.]?(\d{2})/);
  if (m && +m[2] >= 1 && +m[2] <= 12 && +m[1] >= 1 && +m[1] <= 31 && +m[4] < 24 && +m[5] < 60) {
    hasil.date = m[3] + "-" + m[2] + "-" + m[1]; hasil.start = String(+m[4]).padStart(2, "0") + ":" + m[5];
  }
  m = kepala.match(/(\d{1,2}):(\d{2}):(\d{2})/); if (m) hasil.dur = igDur(m[0]);
  const badan = lines.slice(iTj >= 0 ? iTj + 1 : 0);
  // Cara 1: label terbaca (screenshot tajam / sudah diperbesar).
  const lab = shLewatLabel(badan);
  const inti = ["penonton", "ditonton", "klik", "pesanan", "jual", "follow", "avg", "ctr"].filter((k) => k in lab.out).length;
  if (inti >= 5) {
    const ragu = lab.ragu.slice();
    if (lab.out.ctr != null && lab.out.klik != null && lab.out.ditonton) { if (Math.abs((lab.out.klik / lab.out.ditonton) * 100 - lab.out.ctr) > 1.5) ragu.push("ctr", "klik"); }
    if (lab.out.aktif != null && lab.out.penonton != null && lab.out.aktif > lab.out.penonton) ragu.push("penonton", "aktif");
    const out = { date: hasil.date, start: hasil.start, dur: hasil.dur };
    for (const k of SH_SIMPAN) if (typeof lab.out[k] === "number" && isFinite(lab.out[k])) out[k] = lab.out[k];
    out.ragu = [...new Set(ragu)].filter((k) => SH_SIMPAN.includes(k));
    out.kurang = ["date", "start", "dur", ...SH_SIMPAN].filter((k) => out[k] == null || out[k] === "");
    out.cara = "label";
    return out;
  }
  // Cara 2 (cadangan, label tidak terbaca): petakan angka menurut urutan.
  // Kumpulkan angka sesudah baris "Tinjauan Data" (baris itu sendiri dilewati: isinya filter status pesanan).
  const tok = [];
  for (const l of lines.slice(iTj >= 0 ? iTj + 1 : 0)) for (const w of l.split(/\s+/)) { const t = shToken(w); if (t) tok.push(t); }
  const jangkar = tok.findIndex((t) => t.jenis === "jam");
  const ragu = [];
  if (jangkar >= 0) {
    hasil.avg = tok[jangkar].v;
    const seb = tok.slice(0, jangkar);
    // Petakan dari yang paling dekat jangkar ke belakang: angka yang hilang di depan tidak menggeser angka penonton.
    for (let i = 0; i < SH_SEBELUM.length && i < seb.length; i++) hasil[SH_SEBELUM[SH_SEBELUM.length - 1 - i]] = seb[seb.length - 1 - i].v;
    if (seb.length !== SH_SEBELUM.length) ragu.push(...SH_SEBELUM.filter((k) => ["jual", "pesanan", "produk"].includes(k)));
    const ses = tok.slice(jangkar + 1);
    for (let i = 0; i < SH_SESUDAH.length && i < ses.length; i++) hasil[SH_SESUDAH[i]] = ses[i].v;
    // Cek jenis: persentase klik harus %, penjualan harus Rp. Kalau tidak cocok, tandai.
    if (ses[0] && ses[0].jenis !== "pct") ragu.push("ctr", "klik", "atc", "suka", "bagi", "komen", "follow");
    if (seb.length === SH_SEBELUM.length && seb[0].jenis !== "rp") ragu.push("jual");
    // Cek silang: persentase klik ≈ klik produk ÷ ditonton.
    if (hasil.ctr != null && hasil.klik != null && hasil.ditonton) { if (Math.abs((hasil.klik / hasil.ditonton) * 100 - hasil.ctr) > 1.5) ragu.push("ctr", "klik"); }
    if (hasil.aktif != null && hasil.penonton != null && hasil.aktif > hasil.penonton) ragu.push("penonton", "aktif");
  }
  const out = { date: hasil.date, start: hasil.start, dur: hasil.dur };
  for (const k of SH_SIMPAN) if (typeof hasil[k] === "number" && isFinite(hasil[k])) out[k] = hasil[k];
  out.ragu = [...new Set(ragu)].filter((k) => k in out);
  out.kurang = ["date", "start", "dur", ...SH_SIMPAN].filter((k) => out[k] == null || out[k] === "");
  out.cara = "urutan";
  return out;
}

// Kenali jenis screenshot dari teksnya.
function jenisScreenshot(text) {
  const t = String(text || "");
  if (/peak\s+concurrent|accounts\s+engaged|insights/i.test(t)) return "ig";
  if (/tinjauan|kunjungan|konversi|promosi|ronde/i.test(t)) return "shopee";
  return null;
}

let _worker = null;
function lmUrl(p) { return typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getURL ? chrome.runtime.getURL(p) : new URL(p, location.href).href; }
async function ocrWorker() {
  if (_worker) return _worker;
  /* global Tesseract */
  _worker = await Tesseract.createWorker("eng", 1, {
    workerPath: lmUrl("vendor/worker.min.js"), corePath: lmUrl("vendor/core/"), langPath: lmUrl("vendor/lang").replace(/\/$/, ""),
    gzip: false, cacheMethod: "none", workerBlobURL: false,
  });
  return _worker;
}
// Screenshot kecil diperbesar 2× dulu: huruf kecil di Seller Centre jauh lebih terbaca.
async function perbesar(file) {
  try {
    const bmp = await createImageBitmap(file);
    if (bmp.width >= 1800) return file;
    const k = Math.min(2, 2400 / bmp.width), c = document.createElement("canvas");
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    const g = c.getContext("2d"); g.imageSmoothingQuality = "high"; g.drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise((ok) => c.toBlob((b) => ok(b || file), "image/png"));
  } catch (e) { return file; }
}
// → { jenis: "ig"|"shopee"|null, data }
async function bacaGambar(file) {
  const w = await ocrWorker();
  const { data } = await w.recognize(await perbesar(file));
  const jenis = jenisScreenshot(data.text);
  if (jenis === "shopee") return { jenis, data: parseShopeeText(data.text, new Date()) };
  if (jenis === "ig") return { jenis, data: parseIgText(data.text, new Date()) };
  return { jenis: null, data: null };
}

if (typeof module !== "undefined") module.exports = { parseIgText, parseShopeeText, jenisScreenshot };
