// browie Live Mirroring — logika inti BERSAMA (ekstensi & dashboard online). Murni, tanpa DOM, dites di test/session-core.test.js.
// File ini wajib IDENTIK di shared/, ekstensi/, dan web/ — ubah di shared/ lalu jalankan `sh salin-shared.sh`.
//
// Bentuk data:
//   shSessions: [{ id, date:"YYYY-MM-DD", start:"HH:MM", title, dur(dtk), penonton, ditonton, aktif, puncak, avg(dtk), klik, ctr,
//                  atc, pesanan, pembeli, produk, jual, follow, suka, bagi, komen, sumber:{Beranda:62.2, …, Lainnya:18.3}, by:"manual"|"auto" }]
//   igLives:    [{ id, date, title, dur, viewers, puncak, komen, share, engaged, pairId?, pairBy?:"auto"|"pilih"|"tanpa" }]
//   klik:       { "YYYY-MM-DDTHH:M0": n }  — hitungan link penghitung per 10 menit, jam WIB

const LM_SUMBER = ["Beranda", "Rekomendasi", "Video", "Riwayat pesanan", "Tab Live & Video", "Lainnya"];
const LM_SUMBER_LUAR = ["Lainnya"]; // penonton yang datang dari luar Shopee (link IG, WhatsApp, dll) masuk "Lainnya"
const LM_PAIR_MIRIP_DTK = 600;     // 2 kandidat selisih durasinya < 10 mnt → wajib dipilih manual
const LM_PAIR_RAGU_DTK = 900;      // pasangan otomatis dengan selisih durasi > 15 mnt → "perlu dicek"

function lmNum(v) { return typeof v === "number" && isFinite(v) ? v : null; }
function lmMenit(start) { const m = /^(\d{1,2}):(\d{2})$/.exec(start || ""); return m ? +m[1] * 60 + +m[2] : null; }

// Cari pasangan Shopee untuk satu live IG: tanggal sama, durasi paling mirip.
// Hasil: { id, status } — status "auto" (pasti), "ragu" (pasangan ada tapi durasinya jauh), "pilih" (2+ kandidat mirip), "kosong".
function lmPairIg(ig, shSessions) {
  const kand = shSessions.filter((s) => s.date === ig.date);
  if (!kand.length) return { id: null, status: "kosong", kandidat: [] };
  if (ig.dur == null || kand.some((s) => s.dur == null)) {
    return kand.length === 1 ? { id: kand[0].id, status: "ragu", kandidat: kand.map((s) => s.id) } : { id: null, status: "pilih", kandidat: kand.map((s) => s.id) };
  }
  const urut = kand.map((s) => ({ id: s.id, d: Math.abs(s.dur - ig.dur) })).sort((a, b) => a.d - b.d);
  if (urut.length > 1 && urut[1].d - urut[0].d < LM_PAIR_MIRIP_DTK) return { id: null, status: "pilih", kandidat: urut.map((x) => x.id) };
  return { id: urut[0].id, status: urut[0].d > LM_PAIR_RAGU_DTK ? "ragu" : "auto", kandidat: urut.map((x) => x.id) };
}

// Satukan Shopee + IG jadi daftar sesi. Pasangan manual (pairBy "pilih") selalu menang; sisanya dipasangkan otomatis.
// Satu sesi Shopee maksimal satu live IG; IG yang tak berpasangan jadi sesi "IG saja".
function lmGabung(shSessions, igLives) {
  const sh = (shSessions || []).slice();
  const terpakai = new Set();
  const pasang = {}; // shId → { ig, status }
  const igSaja = [];
  const igs = (igLives || []).slice().sort((a, b) => (b.pairBy === "pilih") - (a.pairBy === "pilih"));
  for (const ig of igs) {
    let id = null, status = "kosong";
    if (ig.pairBy === "pilih" && ig.pairId && sh.some((s) => s.id === ig.pairId) && !terpakai.has(ig.pairId)) { id = ig.pairId; status = "pilih"; }
    else if (ig.pairBy !== "tanpa") {
      const r = lmPairIg(ig, sh.filter((s) => !terpakai.has(s.id)));
      id = r.status === "auto" || r.status === "ragu" ? r.id : null; status = r.status;
    }
    if (id) { terpakai.add(id); pasang[id] = { ig, status }; } else igSaja.push({ ig, status });
  }
  const out = sh.map((s) => ({ id: s.id, date: s.date, start: s.start || "", title: s.title || "", sh: s,
    ig: pasang[s.id] ? pasang[s.id].ig : null, pair: pasang[s.id] ? pasang[s.id].status : null }));
  for (const x of igSaja) out.push({ id: "ig:" + x.ig.id, date: x.ig.date, start: "", title: x.ig.title || "", sh: null, ig: x.ig, pair: x.status });
  return out.sort(lmUrut);
}
function lmUrut(a, b) {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  const ma = lmMenit(a.start), mb = lmMenit(b.start);
  if (ma != null && mb != null) return mb - ma;
  return (ma == null) - (mb == null);
}

// Pecah traffic penonton jadi 3 asal. "luar"/"dalam" null kalau asal penonton Shopee belum diisi.
function lmAsal(sesi) {
  const ig = sesi.ig ? lmNum(sesi.ig.viewers) : null;
  const pn = sesi.sh ? lmNum(sesi.sh.penonton) : null;
  let luar = null, dalam = null;
  const src = sesi.sh && sesi.sh.sumber;
  if (pn != null && src && Object.keys(src).length) {
    const pLuar = LM_SUMBER_LUAR.reduce((a, k) => a + (lmNum(src[k]) || 0), 0);
    luar = Math.round((pn * pLuar) / 100);
    dalam = pn - luar;
  }
  const total = (ig || 0) + (pn || 0);
  return { ig, shopee: pn, luar, dalam, total: ig == null && pn == null ? null : total };
}

// Klik link penghitung selama sesi Shopee berjalan (jam mulai s/d mulai + durasi). Butuh jam mulai & durasi.
function lmKlikSesi(sesi, klik) {
  if (!sesi.sh || !klik) return null;
  const m0 = lmMenit(sesi.sh.start || sesi.start), dur = lmNum(sesi.sh.dur);
  if (m0 == null || dur == null) return null;
  const a = Date.parse(sesi.date + "T00:00:00Z") + m0 * 60000, b = a + dur * 1000;
  // Sesi yang selesai sebelum klik pertama pernah tercatat = link belum dipasang → belum terukur (null), bukan 0.
  const kunci = Object.keys(klik).sort();
  if (!kunci.length || b <= Date.parse(kunci[0] + ":00Z")) return null;
  let n = 0;
  for (const k in klik) {
    const t = Date.parse(k + ":00Z"); // kunci "YYYY-MM-DDTHH:M0" diperlakukan sebagai jam WIB polos
    if (isFinite(t) && t + 10 * 60000 > a && t < b) n += klik[k] || 0;
  }
  return n;
}
function lmKlikTotal(klik, sejakDate) { let n = 0; for (const k in klik || {}) if (!sejakDate || k.slice(0, 10) >= sejakDate) n += klik[k] || 0; return n; }

// Perbandingan sesi yang di-mirror ke IG vs tidak (lapis bukti ke-3). null kalau salah satu kelompok < 3 sesi.
function lmMirrorVs(sesiList) {
  const sh = sesiList.filter((s) => s.sh);
  const a = sh.filter((s) => s.ig), b = sh.filter((s) => !s.ig);
  const rata = (l, k) => { const v = l.map((s) => lmNum(s.sh[k])).filter((x) => x != null); return v.length ? v.reduce((x, y) => x + y, 0) / v.length : null; };
  const kel = (l) => ({ n: l.length, penonton: rata(l, "penonton"), follow: rata(l, "follow"), pesanan: rata(l, "pesanan"), jual: rata(l, "jual") });
  return { mirror: kel(a), tanpa: kel(b), cukup: a.length >= 3 && b.length >= 3 };
}


/* ---------- kode pelacakan Shopee (UTM) ----------
   off: [{ date, campaign, channel, visits, visitors, atcUsers, atcUnits, atcValue, orders, sales, buyers, newBuyers, units }] per hari per kampanye.
   Nama kampanye dibuat host mengikuti judul sesi (mis. NGALIS10MENITTAHAN3HARI ↔ "Ngalis 10 Menit, Tahan Sampai 3 Hari"). */
function lmNorm(t) { return String(t || "").toUpperCase().replace(/[^A-Z0-9]/g, ""); }
// Kemiripan 0–1: panjang urutan huruf bersama terpanjang (LCS) dibagi panjang yang lebih pendek.
function lmSerupa(a, b) {
  a = lmNorm(a); b = lmNorm(b);
  if (!a || !b) return 0;
  let prev = new Array(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) { const cur = [0]; for (let j = 1; j <= b.length; j++) cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1]); prev = cur; }
  return prev[b.length] / Math.min(a.length, b.length);
}
// Untuk satu sesi: baris laporan pada tanggal sesi (channel Instagram), diurutkan paling mirip dulu. cocok = true bila nama kampanye mirip judul sesi (≥ 0,75).
function lmOffSesi(sesi, off) {
  const judul = (sesi.sh && sesi.sh.title) || sesi.title || "";
  const baris = (off || []).filter((o) => o.date === sesi.date && /instagram/i.test(o.channel || "instagram")).map((o) => ({ ...o, serupa: lmSerupa(judul, o.campaign) })).sort((a, b) => b.serupa - a.serupa);
  return { baris, cocok: baris.length && baris[0].serupa >= 0.75 ? baris[0] : null, adaData: (off || []).length > 0 };
}

// Kunci 10 menit WIB untuk link penghitung, dipakai api/go.js.
function lmKunciKlik(nowMs) { return new Date(nowMs + 7 * 3600000).toISOString().slice(0, 15) + "0"; }

/* ---------- produk terjual ----------
   sh.items: [{ nama, etalase, qty, jual }] — dari Seller Centre: Tinjauan Data → Penjualan → Lihat Rincian. */
function lmItems(sesi) { return sesi && sesi.sh && Array.isArray(sesi.sh.items) ? sesi.sh.items.filter((x) => x && x.nama) : []; }
// Gabungan semua sesi: per produk & per etalase, urut penjualan (lalu jumlah terjual).
function lmProdukTerlaris(sesiList) {
  const p = {}, e = {};
  for (const s of sesiList) for (const it of lmItems(s)) {
    const k = it.nama.trim().toLowerCase();
    const x = p[k] || (p[k] = { nama: it.nama.trim(), etalase: it.etalase || "", qty: 0, jual: 0, sesi: 0 });
    x.qty += lmNum(it.qty) || 0; x.jual += lmNum(it.jual) || 0; x.sesi++;
    if (!x.etalase && it.etalase) x.etalase = it.etalase;
    const ek = (it.etalase || "Tanpa etalase").trim();
    const y = e[ek] || (e[ek] = { etalase: ek, qty: 0, jual: 0 });
    y.qty += lmNum(it.qty) || 0; y.jual += lmNum(it.jual) || 0;
  }
  const urut = (a, b) => b.jual - a.jual || b.qty - a.qty;
  return { produk: Object.values(p).sort(urut), etalase: Object.values(e).sort(urut) };
}

/* ---------- rangkuman performa per sesi (aturan tetap, tanpa AI) ----------
   Dibandingkan dengan MEDIAN sesi lain (patokan akun sendiri). Butuh ≥3 sesi pembanding per angka.
   Hasil: { nilai: "atas"|"biasa"|"bawah"|null, poin:[{ teks, nada:"naik"|"turun"|"netral"|"kurang" }] } */
function lmMedian(a) { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y), h = Math.floor(s.length / 2); return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2; }
function lmRangkum(sesi, semua) {
  const f = (n) => (n == null ? "—" : Number(n).toLocaleString("id-ID", { maximumFractionDigits: 1 }));
  const rp = (n) => "Rp" + Math.round(n).toLocaleString("id-ID");
  const lain = (semua || []).filter((x) => x.id !== sesi.id);
  const banding = (nilai, ambil) => {
    const pool = lain.map(ambil).filter((x) => x != null);
    if (nilai == null || pool.length < 3) return null;
    const md = lmMedian(pool);
    if (!md) return nilai > 0 ? { r: Infinity, md } : null;
    return { r: nilai / md, md };
  };
  const nada = (b) => (!b ? "netral" : b.r >= 1.25 ? "naik" : b.r <= 0.8 ? "turun" : "netral");
  const bandTeks = (b, satuan) => (!b ? "" : b.r === Infinity ? ` · sesi lain umumnya 0` : ` · ${b.r >= 1.25 ? "di atas" : b.r <= 0.8 ? "di bawah" : "setara"} median sesi lain (${f(Math.round(b.md))}${satuan || ""})`);
  const poin = [], skor = [];
  const sh = sesi.sh, ig = sesi.ig, a = lmAsal(sesi);

  if (sh && lmNum(sh.penonton) != null) {
    const b = banding(sh.penonton, (x) => (x.sh ? lmNum(x.sh.penonton) : null)); skor.push(nada(b));
    let t = `Penonton Shopee ${f(sh.penonton)}${bandTeks(b)}.`;
    if (a.luar != null) t += ` ${f(Math.round((a.dalam / a.shopee) * 100))}% dari dalam Shopee, ${f(Math.round((a.luar / a.shopee) * 100))}% dari luar (termasuk IG).`;
    poin.push({ teks: t, nada: nada(b) });
  } else if (sh) poin.push({ teks: "Penonton Shopee belum diisi.", nada: "kurang" });

  if (ig && lmNum(ig.viewers) != null) {
    const b = banding(ig.viewers, (x) => (x.ig ? lmNum(x.ig.viewers) : null));
    const it = (lmNum(ig.komen) || 0) + (lmNum(ig.share) || 0);
    poin.push({ teks: `Instagram ${f(ig.viewers)} penonton, puncak ${f(ig.puncak)}, ${f(it)} komentar + share${bandTeks(b)}.`, nada: nada(b) });
  } else poin.push({ teks: "Data Instagram belum diunggah.", nada: "kurang" });

  if (sh) {
    const pn = lmNum(sh.penonton), kl = lmNum(sh.klik), atc = lmNum(sh.atc), ps = lmNum(sh.pesanan);
    if (kl != null && pn) {
      const rate = kl / pn, b = banding(rate, (x) => (x.sh && lmNum(x.sh.klik) != null && lmNum(x.sh.penonton) ? x.sh.klik / x.sh.penonton : null)); skor.push(nada(b));
      poin.push({ teks: `Konversi: ${f(kl)} klik produk (${f(Math.round(rate * 100))}% penonton) → ${f(atc)} masuk keranjang → ${f(ps)} pesanan${bandTeks(b && { ...b, md: b.md * 100 }, "%")}.`, nada: nada(b) });
    } else if (atc != null || ps != null) poin.push({ teks: `Konversi: ${f(atc)} masuk keranjang → ${f(ps)} pesanan. Klik produk belum diisi.`, nada: "netral" });
    const jl = lmNum(sh.jual);
    if (jl != null) {
      const b = banding(jl, (x) => (x.sh ? lmNum(x.sh.jual) : null)); skor.push(nada(b));
      const top = lmItems(sesi).slice().sort((p, q) => (lmNum(q.jual) || 0) - (lmNum(p.jual) || 0) || (lmNum(q.qty) || 0) - (lmNum(p.qty) || 0))[0];
      poin.push({ teks: jl === 0 ? "Belum ada penjualan di sesi ini." : `Penjualan ${rp(jl)}${ps != null ? " dari " + f(ps) + " pesanan" : ""}${top ? `; terlaris: ${top.nama}${top.qty != null ? " (" + f(top.qty) + " pcs)" : ""}` : ""}${bandTeks(b)}.`, nada: jl === 0 ? "turun" : nada(b) });
    }
    const fo = lmNum(sh.follow);
    if (fo != null) {
      const b = banding(fo, (x) => (x.sh ? lmNum(x.sh.follow) : null)); skor.push(nada(b));
      poin.push({ teks: `Follow baru toko ${f(fo)}${pn ? " (" + f((fo / pn) * 100) + " per 100 penonton)" : ""}${bandTeks(b)}.`, nada: nada(b) });
    } else poin.push({ teks: "Follow baru belum diisi — angka utama tujuan mirroring.", nada: "kurang" });
  } else poin.push({ teks: "Data Shopee sesi ini belum ada.", nada: "kurang" });

  const naik = skor.filter((x) => x === "naik").length, turun = skor.filter((x) => x === "turun").length;
  const dinilai = skor.length >= 2 && lain.filter((x) => x.sh).length >= 3;
  const nilai = !dinilai ? null : naik >= 2 && turun === 0 ? "atas" : turun >= 2 && naik === 0 ? "bawah" : "biasa";
  return { nilai, poin };
}

/* ---------- rekomendasi aksi per sesi ----------
   Sistem menghitung FAKTA (angka + dibanding median sesi lain, dalam kata-kata: "much lower"…) → JEV memutuskan masalah
   mana yang berlaku (ya/tidak + tingkat yakin). Tanpa JEV: "sinyal" dari aturan angka sederhana sebagai cadangan.
   Fakta ditulis dalam bahasa Inggris untuk JEV (belum teruji di bahasa Indonesia); tampilan tetap bahasa Indonesia. */
const LM_MASALAH = {
  sepi:        { judul: "Penonton sedikit", aksi: "Promosikan live di story IG ±1 jam sebelum mulai, pakai judul yang jelas manfaatnya, dan bandingkan jam tayang dengan sesi yang ramai.", jev: "this session had far fewer viewers than the other sessions" },
  retensi:     { judul: "Penonton cepat pergi", aksi: "Buka 30 detik pertama dengan hook (before–after alis), ganti segmen tiap ±10 menit, dan sapa penonton yang baru masuk dengan menyebut manfaat produk.", jev: "viewers left quickly: the average watch time is very short compared with other sessions" },
  produk:      { judul: "Produk kurang ditunjukkan / dipin", aksi: "Pin produk utama di keranjang live, tunjukkan produk dekat ke kamera, dan sebut nomor produknya setiap kali membahasnya.", jev: "many viewers but a very low product click rate, so the products were not shown or pinned enough" },
  harga:       { judul: "Harga & promo kurang jelas", aksi: "Sebut harga dan promo setiap ±5 menit, tampilkan di layar/banner, dan pin produk saat menyebut harga.", jev: "viewers seem interested (clicks or price questions in comments) but price or promo was not clear enough to make them buy" },
  checkout:    { judul: "Banyak klik tapi tidak jadi beli", aksi: "Beri alasan beli sekarang (voucher live, stok terbatas, bundling) dan pandu cara checkout langkah demi langkah di layar.", jev: "a reasonable number of product clicks but few add-to-cart or orders" },
  follow:      { judul: "Ajakan follow toko kurang", aksi: "Ajak follow toko di menit 10, 30, dan 50; tawarkan voucher khusus follower; tunjukkan tombol follow di layar.", jev: "very few new shop followers relative to the number of viewers" },
  ig_pindah:   { judul: "Penonton IG tidak pindah ke Shopee", aksi: "Sebut dan tunjukkan link di live IG berkali-kali, pin komentar berisi link, dan beri alasan pindah (voucher/harga khusus di Shopee).", jev: "the Instagram live had viewers but few of them moved to Shopee (few link clicks or few outside-Shopee viewers)" },
  pertanyaan:  { judul: "Banyak pertanyaan produk", aksi: "Siapkan demo shade dan cara pakai, jawab pertanyaan sambil menunjuk produk, dan buat daftar FAQ untuk host.", jev: "many comments ask about the product itself (shade, how to use, how long it lasts)" },
  keluhan:     { judul: "Ada keluhan penonton", aksi: "Teruskan ke CS hari ini juga, dan tanggapi dengan sopan di awal live berikutnya.", jev: "there are complaints in the comments" },
};
function lmFakta(sesi, semua, jevKom) {
  const lain = (semua || []).filter((x) => x.id !== sesi.id);
  const sh = sesi.sh || {}, ig = sesi.ig || {};
  const en = [], sinyal = [];
  const kata = (r) => (r == null ? "" : r >= 2 ? "much higher than" : r >= 1.25 ? "higher than" : r <= 0.5 ? "much lower than" : r <= 0.8 ? "lower than" : "about the same as");
  const med = (fn) => { const a = lain.map(fn).filter((x) => x != null && isFinite(x)); return a.length >= 3 ? lmMedian(a) : null; };
  const banding = (nilai, md) => (nilai == null || md == null || !md ? null : nilai / md);
  const rate = (a, b) => (lmNum(a) != null && lmNum(b) ? lmNum(a) / lmNum(b) : null);
  const f1 = (n) => (n == null ? "unknown" : Math.round(n * 10) / 10);
  const pct = (n) => (n == null ? "unknown" : Math.round(n * 1000) / 10 + "%");
  const tambah = (label, nilai, md, fmt) => { const r = banding(nilai, md); en.push(`${label}: ${fmt(nilai)}${md != null ? ` (${kata(r)} the median of other sessions, ${fmt(md)})` : ""}`); return r; };

  const rPen = tambah("Shopee viewers", lmNum(sh.penonton), med((x) => x.sh && lmNum(x.sh.penonton)), f1);
  if (rPen != null && rPen <= 0.6) sinyal.push({ k: "sepi", alasan: "Penonton Shopee jauh di bawah sesi lain." });
  const rAvg = tambah("Average watch time (seconds)", lmNum(sh.avg), med((x) => x.sh && lmNum(x.sh.avg)), f1);
  if (rAvg != null && rAvg <= 0.5) sinyal.push({ k: "retensi", alasan: "Rata-rata menonton jauh lebih singkat dari biasanya." });
  const ctr = rate(sh.klik, sh.ditonton) ?? (lmNum(sh.ctr) != null ? sh.ctr / 100 : null);
  const rCtr = tambah("Product click rate (clicks per view)", ctr, med((x) => x.sh && (rate(x.sh.klik, x.sh.ditonton) ?? (lmNum(x.sh.ctr) != null ? x.sh.ctr / 100 : null))), pct);
  if (rCtr != null && rCtr <= 0.5) sinyal.push({ k: "produk", alasan: "Persentase klik produk jauh di bawah biasanya." });
  const atcPerKlik = rate(sh.atc, sh.klik), psPerAtc = rate(sh.pesanan, sh.atc);
  const rAtc = tambah("Add-to-cart per product click", atcPerKlik, med((x) => x.sh && rate(x.sh.atc, x.sh.klik)), pct);
  tambah("Orders per add-to-cart", psPerAtc, med((x) => x.sh && rate(x.sh.pesanan, x.sh.atc)), pct);
  en.push(`Orders: ${f1(lmNum(sh.pesanan))}, sales: ${lmNum(sh.jual) == null ? "unknown" : "Rp" + Math.round(sh.jual)}`);
  if (lmNum(sh.klik) >= 10 && (rAtc != null ? rAtc <= 0.6 : lmNum(sh.pesanan) === 0)) sinyal.push({ k: "checkout", alasan: "Ada cukup klik produk tapi sedikit yang masuk keranjang / memesan." });
  const foRate = rate(sh.follow, sh.penonton);
  const rFo = tambah("New shop followers per viewer", foRate, med((x) => x.sh && rate(x.sh.follow, x.sh.penonton)), pct);
  if (lmNum(sh.follow) != null && lmNum(sh.penonton) >= 50 && (sh.follow === 0 || (rFo != null && rFo <= 0.5))) sinyal.push({ k: "follow", alasan: "Follow baru sangat sedikit dibanding jumlah penonton." });
  const a = lmAsal(sesi);
  if (a.luar != null) en.push(`Share of Shopee viewers coming from outside Shopee (includes Instagram link): ${pct(a.luar / a.shopee)}`);
  if (lmNum(ig.viewers) != null) {
    en.push(`Instagram live viewers: ${ig.viewers}, peak concurrent: ${f1(lmNum(ig.puncak))}, Instagram comments+shares: ${(lmNum(ig.komen) || 0) + (lmNum(ig.share) || 0)}`);
    if (a.luar != null && ig.viewers >= 20 && a.luar / Math.max(a.shopee, 1) < 0.05) sinyal.push({ k: "ig_pindah", alasan: "Live IG ada penontonnya, tapi hampir tidak ada penonton Shopee dari luar." });
  } else en.push("Instagram live: no data for this session");
  if (jevKom && jevKom.terpilah) {
    const p = (k) => (jevKom.kategori[k] || 0) / jevKom.terpilah;
    en.push(`Live comments sorted (${jevKom.terpilah}): asking price/promo ${pct(p("tanya_harga"))}, wants to buy ${pct(p("minat_beli"))}, product questions ${pct(p("tanya_produk"))}, complaints ${jevKom.kategori.keluhan || 0}, praise ${pct(p("pujian"))}, greetings/small talk ${pct(p("sapaan"))}`);
    if (p("tanya_harga") >= 0.2) sinyal.push({ k: "harga", alasan: "Banyak komentar menanyakan harga / promo." });
    if (p("tanya_produk") >= 0.2) sinyal.push({ k: "pertanyaan", alasan: "Banyak komentar bertanya soal produk." });
    if ((jevKom.kategori.keluhan || 0) >= 1) sinyal.push({ k: "keluhan", alasan: (jevKom.kategori.keluhan) + " komentar berisi keluhan." });
  } else en.push("Live comments: not sorted yet");
  return { fakta: en, sinyal };
}

/* ---------- pengingat data belum lengkap (ditampilkan di dashboard admin, tidak dikirim ke mana pun) ----------
   Sesi 7 hari terakhir (sampai hariIni, YYYY-MM-DD) yang datanya belum lengkap → [{ id, date, start, kurang:[…] }], terbaru dulu. */
function lmBelumLengkap(list, hariIni) {
  const t = Date.parse(hariIni + "T00:00:00Z"), batas = new Date(t - 7 * 864e5).toISOString().slice(0, 10);
  const out = [];
  for (const s of list) {
    if (s.date < batas || s.date > hariIni) continue;
    const kurang = [];
    if (s.sh) {
      if (!s.ig) kurang.push("data Instagram");
      if (lmNum(s.sh.follow) == null) kurang.push("follow baru");
      if (!s.sh.sumber || !Object.keys(s.sh.sumber).length) kurang.push("asal penonton");
      if (lmNum(s.sh.pesanan) > 0 && !lmItems(s).length) kurang.push("produk terjual");
      if (!s.start) kurang.push("jam mulai");
    } else if (s.ig) kurang.push(s.pair === "pilih" ? "pasangan sesi Shopee (pilih manual)" : "data Shopee");
    if (kurang.length) out.push({ id: s.id, date: s.date, start: s.start || "", kurang });
  }
  return out.sort(lmUrut);
}

/* ---------- report periode ----------
   jenis: "minggu" (Senin–Minggu) | "14" | "bulan" (bulan kalender) | "30". geser: 0 = periode berjalan, -1 = sebelumnya, dst.
   Semua tanggal "YYYY-MM-DD" (WIB polos). → { dari, sampai, label, berjalan } */
function lmTglTambah(d, n) { const t = Date.parse(d + "T00:00:00Z") + n * 864e5; return new Date(t).toISOString().slice(0, 10); }
function lmPeriode(jenis, hariIni, geser) {
  geser = geser || 0;
  let dari, sampai;
  if (jenis === "bulan") {
    const [y, m] = hariIni.split("-").map(Number); const t = new Date(Date.UTC(y, m - 1 + geser, 1));
    dari = t.toISOString().slice(0, 10); sampai = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
  } else if (jenis === "minggu") {
    const dow = (new Date(hariIni + "T00:00:00Z").getUTCDay() + 6) % 7; // Senin = 0
    dari = lmTglTambah(hariIni, -dow + geser * 7); sampai = lmTglTambah(dari, 6);
  } else {
    const n = jenis === "14" ? 14 : 30;
    sampai = lmTglTambah(hariIni, geser * n); dari = lmTglTambah(sampai, -(n - 1));
  }
  const p = (d) => { const x = d.split("-").map(Number); return x[2] + " " + LM_BLN[x[1] - 1]; };
  const label = jenis === "bulan" ? ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"][+dari.slice(5, 7) - 1] + " " + dari.slice(0, 4) : p(dari) + " – " + p(sampai) + " " + sampai.slice(0, 4);
  return { dari, sampai, label, berjalan: hariIni >= dari && hariIni <= sampai };
}
const LM_BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
// Rekap angka satu periode. Penjumlahan hanya dari angka yang ada; n* = jumlah sesi yang punya angka itu.
function lmRekap(list, dari, sampai, klik) {
  const sesi = list.filter((s) => s.date >= dari && s.date <= sampai);
  const r = { sesi: sesi.length, penonton: 0, ig: 0, luar: 0, dalam: 0, shopee: 0, pesanan: 0, jual: 0, follow: 0, klik: 0, nKlik: 0, nIg: 0, nFollow: 0, nJual: 0, nAsal: 0 };
  for (const s of sesi) {
    const a = lmAsal(s);
    if (a.total != null) r.penonton += a.total;
    if (a.ig != null) { r.ig += a.ig; r.nIg++; }
    if (a.shopee != null) r.shopee += a.shopee;
    if (a.luar != null) { r.luar += a.luar; r.dalam += a.dalam; r.nAsal++; }
    if (s.sh) {
      if (lmNum(s.sh.pesanan) != null) r.pesanan += s.sh.pesanan;
      if (lmNum(s.sh.jual) != null) { r.jual += s.sh.jual; r.nJual++; }
      if (lmNum(s.sh.follow) != null) { r.follow += s.sh.follow; r.nFollow++; }
    }
    const k = lmKlikSesi(s, klik); if (k != null) { r.klik += k; r.nKlik++; }
  }
  const terbaik = sesi.slice().sort((a, b) => (lmAsal(b).total || 0) - (lmAsal(a).total || 0)).slice(0, 3).map((s) => s.id);
  return { ...r, terbaik, produk: lmProdukTerlaris(sesi).produk.slice(0, 5) };
}

/* ---------- jam & hari tayang terbaik ----------
   Grid hari (Sen..Min) × blok jam; isi = rata-rata metrik per sesi + jumlah sesi. Butuh jam mulai sesi Shopee. */
const LM_BLOK = [["Pagi", 5, 11], ["Siang", 11, 15], ["Sore", 15, 18], ["Malam", 18, 22], ["Larut", 22, 29]];
function lmJamTerbaik(list, metrik) {
  const ambil = { penonton: (s) => lmNum(s.sh.penonton), pesanan: (s) => lmNum(s.sh.pesanan), follow: (s) => lmNum(s.sh.follow), jual: (s) => lmNum(s.sh.jual) }[metrik] || ((s) => lmNum(s.sh.penonton));
  const grid = LM_BLOK.map(() => Array.from({ length: 7 }, () => ({ n: 0, jml: 0 })));
  for (const s of list) {
    if (!s.sh) continue;
    const m = lmMenit(s.sh.start || s.start), v = ambil(s);
    if (m == null || v == null) continue;
    let jam = Math.floor(m / 60); if (jam < 5) jam += 24;
    const bi = LM_BLOK.findIndex(([, a, b]) => jam >= a && jam < b); if (bi < 0) continue;
    const hari = (new Date(s.date + "T00:00:00Z").getUTCDay() + 6) % 7;
    grid[bi][hari].n++; grid[bi][hari].jml += v;
  }
  let best = null;
  grid.forEach((row, bi) => row.forEach((c, hi) => { c.rata = c.n ? c.jml / c.n : null; if (c.n >= 2 && (!best || c.rata > best.rata)) best = { bi, hi, rata: c.rata, n: c.n }; }));
  return { grid, best };
}

/* ---------- filter tanggal (gaya Shopee): pintasan + per hari / minggu / bulan ---------- */
function lmSenin(d) { const dow = (new Date(d + "T00:00:00Z").getUTCDay() + 6) % 7; return lmTglTambah(d, -dow); }
function lmAkhirBulan(d) { const [y, m] = d.split("-").map(Number); return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10); }
function lmSelisihHari(a, b) { return Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 864e5); }
// id: "kemarin" | "7" | "15" | "30". 7/15/30 hari terakhir TERMASUK hari ini (sesi hari ini ikut terhitung).
function lmPreset(id, hariIni) {
  if (id === "kemarin") { const y = lmTglTambah(hariIni, -1); return { dari: y, sampai: y }; }
  const n = { "7": 7, "15": 15, "30": 30 }[id] || 7;
  return { dari: lmTglTambah(hariIni, -(n - 1)), sampai: hariIni };
}
function lmDaftarMinggu(hariIni, n) { const s = lmSenin(hariIni); return Array.from({ length: n }, (_, i) => { const d = lmTglTambah(s, -7 * i); return { dari: d, sampai: lmTglTambah(d, 6) }; }); }
function lmLabelRentang(dari, sampai) {
  const p = (d) => { const x = d.split("-").map(Number); return x[2] + " " + LM_BLN[x[1] - 1]; };
  if (dari === sampai) return lmTglPanjang(dari);
  const th = dari.slice(0, 4) === sampai.slice(0, 4);
  return p(dari) + (th ? "" : " " + dari.slice(0, 4)) + " – " + p(sampai) + " " + sampai.slice(0, 4);
}
function lmTglPanjang(d) { const p = d.split("-").map(Number); return ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"][new Date(Date.UTC(p[0], p[1] - 1, p[2])).getUTCDay()] + ", " + p[2] + " " + LM_BLN[p[1] - 1] + " " + p[0]; }
// Pembanding untuk sebuah rentang: bulan penuh → bulan sebelumnya; Senin–Minggu → minggu sebelumnya; selain itu rentang sama panjang tepat sebelumnya.
function lmBandingRange(dari, sampai) {
  if (dari.slice(8) === "01" && sampai === lmAkhirBulan(dari)) { const s2 = lmTglTambah(dari, -1); return { dari: s2.slice(0, 8) + "01", sampai: s2, nama: "bulan sebelumnya" }; }
  if (dari === lmSenin(dari) && sampai === lmTglTambah(dari, 6)) return { dari: lmTglTambah(dari, -7), sampai: lmTglTambah(dari, -1), nama: "minggu sebelumnya" };
  const n = lmSelisihHari(dari, sampai) + 1, s2 = lmTglTambah(dari, -1);
  return { dari: lmTglTambah(s2, -(n - 1)), sampai: s2, nama: n === 1 ? "hari sebelumnya" : n + " hari sebelumnya" };
}
// Angka per hari di dalam rentang (hari tanpa live tetap ada, nSesi = 0) — bahan diagram harian.
function lmHarian(list, dari, sampai, klik) {
  const peta = {};
  for (let d = dari, i = 0; d <= sampai && i < 400; d = lmTglTambah(d, 1), i++) peta[d] = { date: d, nSesi: 0, penonton: 0, ig: 0, luar: 0, dalam: 0, unk: 0, jual: 0, pesanan: 0, follow: 0, klik: 0 };
  for (const s of list) {
    const h = peta[s.date]; if (!h) continue;
    const a = lmAsal(s); h.nSesi++;
    if (a.total != null) h.penonton += a.total;
    if (a.ig != null) h.ig += a.ig;
    if (a.shopee != null) { if (a.luar != null) { h.luar += a.luar; h.dalam += a.dalam; } else h.unk += a.shopee; }
    if (s.sh) { h.jual += lmNum(s.sh.jual) || 0; h.pesanan += lmNum(s.sh.pesanan) || 0; h.follow += lmNum(s.sh.follow) || 0; }
    const k = lmKlikSesi(s, klik); if (k != null) h.klik += k;
  }
  return Object.values(peta);
}
// Angka sumbu yang "bulat" (0, 50, 100, …) untuk diagram. Selalu bilangan bulat ≥ 1 per langkah.
function lmTicks(max, n) {
  n = n || 4; if (!(max > 0)) return [0, 1];
  const raw = max / n, mag = Math.pow(10, Math.floor(Math.log10(raw))), norm = raw / mag;
  let step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag; step = Math.max(1, step);
  const out = []; for (let v = 0; v < max + step; v += step) { out.push(v); if (v >= max) break; }
  return out;
}


/* ---------- pembanding per sesi (badge ▲▼ %, bisa diganti penonton dashboard) ----------
   LM_MET: kunci metrik → [label, pengambil nilai, format "n"|"rp"|"dtk"]. list diurutkan TERBARU dulu (lmGabung). */
const LM_MET = {
  total: ["Total penonton", (s) => lmAsal(s).total, "n"],
  luar: ["Penonton Shopee dari luar", (s) => lmAsal(s).luar, "n"],
  ig: ["Penonton Instagram", (s) => (s.ig ? lmNum(s.ig.viewers) : null), "n"],
  ig_puncak: ["Puncak penonton IG", (s) => (s.ig ? lmNum(s.ig.puncak) : null), "n"],
  ig_komen: ["Komentar IG", (s) => (s.ig ? lmNum(s.ig.komen) : null), "n"],
  ig_share: ["Dibagikan IG", (s) => (s.ig ? lmNum(s.ig.share) : null), "n"],
  ig_engaged: ["Akun berinteraksi IG", (s) => (s.ig ? lmNum(s.ig.engaged) : null), "n"],
  penonton: ["Penonton Shopee", (s) => (s.sh ? lmNum(s.sh.penonton) : null), "n"],
  puncak: ["Puncak penonton Shopee", (s) => (s.sh ? lmNum(s.sh.puncak) : null), "n"],
  ditonton: ["Ditonton Shopee", (s) => (s.sh ? lmNum(s.sh.ditonton) : null), "n"],
  avg: ["Rata-rata nonton Shopee", (s) => (s.sh ? lmNum(s.sh.avg) : null), "dtk"],
  komen: ["Komentar Shopee", (s) => (s.sh ? lmNum(s.sh.komen) : null), "n"],
  bagi: ["Dibagikan Shopee", (s) => (s.sh ? lmNum(s.sh.bagi) : null), "n"],
  suka: ["Suka Shopee", (s) => (s.sh ? lmNum(s.sh.suka) : null), "n"],
  klik: ["Klik produk", (s) => (s.sh ? lmNum(s.sh.klik) : null), "n"],
  atc: ["Masuk keranjang", (s) => (s.sh ? lmNum(s.sh.atc) : null), "n"],
  pesanan: ["Pesanan", (s) => (s.sh ? lmNum(s.sh.pesanan) : null), "n"],
  jual: ["Penjualan", (s) => (s.sh ? lmNum(s.sh.jual) : null), "rp"],
  follow: ["Follow baru Shopee", (s) => (s.sh ? lmNum(s.sh.follow) : null), "n"],
};
function lmNilai(s, k) { const m = LM_MET[k]; return m ? m[1](s) : null; }
const LM_BANDING = [["sebelum", "Sesi sebelumnya"], ["rata3", "Rata-rata 3 sesi sebelumnya"], ["rata7", "Rata-rata 7 sesi sebelumnya"], ["median", "Median semua sesi lain"], ["jam", "Sesi sebelumnya di jam yang sama"]];
function lmBlokJam(s) { const m = lmMenit((s.sh && s.sh.start) || s.start); if (m == null) return -1; const j = Math.floor(m / 60) < 5 ? Math.floor(m / 60) + 24 : Math.floor(m / 60); return LM_BLOK.findIndex(([, a, b]) => j >= a && j < b); }
// → { nilai, ref:[sesi], n, persen|null } atau null kalau tidak ada pembanding yang punya angka ini.
function lmPembanding(list, s, k, mode) {
  const i = list.findIndex((x) => x.id === s.id);
  const lama = list.slice(i + 1).filter((x) => lmNilai(x, k) != null);
  let ref;
  if (mode === "rata3") ref = lama.slice(0, 3);
  else if (mode === "rata7") ref = lama.slice(0, 7);
  else if (mode === "median") ref = list.filter((x) => x.id !== s.id && lmNilai(x, k) != null);
  else if (mode === "jam") { const b = lmBlokJam(s); ref = b < 0 ? [] : lama.filter((x) => lmBlokJam(x) === b).slice(0, 1); }
  else ref = lama.slice(0, 1);
  if (!ref.length) return null;
  const vals = ref.map((x) => lmNilai(x, k));
  const nilai = mode === "median" ? lmMedian(vals) : vals.reduce((a, b) => a + b, 0) / vals.length;
  const ini = lmNilai(s, k);
  const persen = ini == null || !nilai ? null : ((ini - nilai) / nilai) * 100;
  return { nilai, ref, n: ref.length, persen };
}

if (typeof module !== "undefined") module.exports = { lmPreset, lmDaftarMinggu, lmLabelRentang, lmBandingRange, lmHarian, lmTicks, lmSenin, lmAkhirBulan, lmSelisihHari, LM_SUMBER, LM_MASALAH, LM_BLOK, lmFakta, lmBelumLengkap, lmPeriode, lmRekap, lmJamTerbaik, lmTglTambah, lmPairIg, lmGabung, lmAsal, lmKlikSesi, lmKlikTotal, lmNorm, lmSerupa, lmOffSesi, lmMirrorVs, lmKunciKlik, lmMenit, lmItems, lmProdukTerlaris, lmRangkum, lmMedian, LM_MET, lmNilai, LM_BANDING, lmBlokJam, lmPembanding };
