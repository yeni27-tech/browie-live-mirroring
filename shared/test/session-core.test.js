// node shared/test/session-core.test.js — pemasangan IG↔Shopee, pecahan 3 asal, atribusi klik. Angka dari data asli 6–7 Okt 2026.
const assert = require("node:assert/strict");
const C = require("../session-core.js");
let n = 0; const tes = (nama, fn) => { fn(); n++; console.log("ok  " + nama); };

const SH = [
  { id: "s1023", date: "2026-10-07", start: "10:23", dur: 5801, penonton: 87, pesanan: 1, follow: 1, jual: 84000 },
  { id: "s1601", date: "2026-10-07", start: "16:01", dur: 7213, penonton: 1192, pesanan: 1, jual: 134000,
    sumber: { Beranda: 62.2, Rekomendasi: 12.1, Video: 2.6, "Riwayat pesanan": 2.6, "Tab Live & Video": 2.2, Lainnya: 18.3 } },
];
const IG7 = { id: "i7", date: "2026-10-07", dur: 5475, viewers: 40, puncak: 4, komen: 1, share: 0, engaged: 1 };
const IG6 = { id: "i6", date: "2026-10-06", dur: 3681, viewers: 33 };

tes("IG 7 Okt (1:31:15) → Shopee 10:23 (1:36:41), bukan 16:01", () => {
  const r = C.lmPairIg(IG7, SH); assert.equal(r.id, "s1023"); assert.equal(r.status, "auto");
});
tes("dua kandidat durasi selisih < 10 mnt → wajib pilih", () => {
  const sh = [{ id: "a", date: "2026-10-07", dur: 5400 }, { id: "b", date: "2026-10-07", dur: 5700 }];
  assert.equal(C.lmPairIg(IG7, sh).status, "pilih");
});
tes("selisih durasi > 15 mnt → ragu (perlu dicek)", () => {
  const r = C.lmPairIg({ date: "2026-10-07", dur: 3000 }, [{ id: "x", date: "2026-10-07", dur: 7213 }]);
  assert.equal(r.status, "ragu"); assert.equal(r.id, "x");
});
tes("tanggal tanpa sesi Shopee → kosong, jadi sesi IG saja", () => {
  const g = C.lmGabung(SH, [IG7, IG6]);
  assert.equal(g.length, 3);
  assert.equal(g.find((s) => s.id === "s1023").ig.id, "i7");
  assert.equal(g.find((s) => s.id === "ig:i6").sh, null);
  assert.equal(g[0].id, "s1601"); // urut terbaru dulu
});
tes("pilihan manual menang atas tebakan otomatis", () => {
  const g = C.lmGabung(SH, [{ ...IG7, pairId: "s1601", pairBy: "pilih" }]);
  assert.equal(g.find((s) => s.id === "s1601").ig.id, "i7");
  assert.equal(g.find((s) => s.id === "s1023").ig, null);
});
tes("satu sesi Shopee tidak dipakai dua live IG", () => {
  const g = C.lmGabung([SH[0]], [IG7, { ...IG7, id: "i7b" }]);
  assert.equal(g.filter((s) => s.sh).length, 1); assert.equal(g.filter((s) => !s.sh).length, 1);
});
tes("pecahan 3 asal sesi 16:01: luar 18,3% = 218, dalam 974", () => {
  const a = C.lmAsal({ sh: SH[1], ig: null });
  assert.equal(a.luar, 218); assert.equal(a.dalam, 974); assert.equal(a.total, 1192);
});
tes("asal belum diisi → luar/dalam null, total tetap IG + Shopee", () => {
  const a = C.lmAsal({ sh: SH[0], ig: IG7 });
  assert.equal(a.luar, null); assert.equal(a.total, 127); assert.equal(a.ig, 40);
});
tes("klik dihitung hanya selama sesi berjalan", () => {
  const klik = { "2026-10-07T10:20": 2, "2026-10-07T11:50": 3, "2026-10-07T12:00": 4, "2026-10-07T15:00": 9 };
  // sesi 10:23–11:59:41 → kena blok 10:20 (overlap), 11:50; blok 12:00 dan 15:00 di luar
  assert.equal(C.lmKlikSesi({ date: "2026-10-07", sh: SH[0] }, klik), 5);
  assert.equal(C.lmKlikTotal(klik), 18);
});
tes("tanpa jam mulai → klik sesi tidak dihitung (null, bukan 0)", () => {
  assert.equal(C.lmKlikSesi({ date: "2026-10-07", sh: { dur: 3600 } }, { "2026-10-07T10:20": 2 }), null);
});
tes("sesi sebelum link dipasang → klik null (belum terukur), bukan 0", () => {
  assert.equal(C.lmKlikSesi({ date: "2026-10-07", sh: SH[0] }, {}), null);
  assert.equal(C.lmKlikSesi({ date: "2026-10-07", sh: SH[0] }, { "2026-10-09T10:00": 3 }), null);
  assert.equal(C.lmKlikSesi({ date: "2026-10-07", sh: SH[1] }, { "2026-10-07T10:00": 3 }), 0); // link sudah aktif, sesi 16:01 memang tanpa klik
});
tes("kunci klik 10 menit dalam WIB", () => {
  assert.equal(C.lmKunciKlik(Date.parse("2026-10-08T03:47:10Z")), "2026-10-08T10:40");
});
tes("mirror vs tanpa mirror butuh ≥3 sesi per kelompok", () => {
  const g = C.lmGabung(SH, [IG7]); const r = C.lmMirrorVs(g);
  assert.equal(r.mirror.n, 1); assert.equal(r.tanpa.n, 1); assert.equal(r.cukup, false);
});
// ---------- rangkuman & produk ----------
const mk = (id, penonton, extra) => ({ id, date: "2026-10-0" + (id.length % 9 + 1), sh: { id, penonton, ...extra }, ig: null });
tes("rangkuman: belum cukup pembanding → nilai null, tapi poin tetap ada", () => {
  const g = C.lmGabung(SH, [IG7]); const r = C.lmRangkum(g.find((s) => s.id === "s1023"), g);
  assert.equal(r.nilai, null);
  assert.ok(r.poin.some((p) => p.teks.startsWith("Penonton Shopee 87")));
  assert.ok(r.poin.some((p) => p.teks.startsWith("Instagram 40 penonton")));
  assert.ok(r.poin.some((p) => p.teks.startsWith("Penjualan Rp84.000 dari 1 pesanan")));
});
tes("rangkuman: penonton, penjualan & follow jauh di atas median → 'atas'", () => {
  const semua = [mk("a", 100, { jual: 50000, follow: 1 }), mk("bb", 120, { jual: 60000, follow: 1 }), mk("ccc", 90, { jual: 40000, follow: 0 }), mk("dddd", 400, { jual: 300000, follow: 6 })];
  const r = C.lmRangkum(semua[3], semua);
  assert.equal(r.nilai, "atas");
  assert.match(r.poin[0].teks, /di atas median sesi lain \(100\)/);
});
tes("rangkuman: 2 angka di bawah median → 'bawah'", () => {
  const semua = [mk("a", 300, { jual: 200000 }), mk("bb", 280, { jual: 150000 }), mk("ccc", 320, { jual: 250000 }), mk("dddd", 60, { jual: 0 })];
  assert.equal(C.lmRangkum(semua[3], semua).nilai, "bawah");
});
tes("rangkuman: follow kosong ditandai kurang (angka utama tujuan)", () => {
  const r = C.lmRangkum({ id: "x", sh: { penonton: 10 }, ig: null }, []);
  assert.ok(r.poin.some((p) => p.nada === "kurang" && /Follow baru belum diisi/.test(p.teks)));
});
tes("produk terlaris digabung lintas sesi (nama tidak peka huruf besar)", () => {
  const s1 = { sh: { items: [{ nama: "Henna Alis Black", etalase: "Henna", qty: 2, jual: 168000 }, { nama: "Concealer Pen", etalase: "Concealer", qty: 1, jual: 59000 }] } };
  const s2 = { sh: { items: [{ nama: "henna alis black", etalase: "Henna", qty: 1, jual: 84000 }, { nama: "", qty: 9 }] } };
  const r = C.lmProdukTerlaris([s1, s2]);
  assert.equal(r.produk[0].nama, "Henna Alis Black"); assert.equal(r.produk[0].qty, 3); assert.equal(r.produk[0].jual, 252000); assert.equal(r.produk[0].sesi, 2);
  assert.equal(r.etalase[0].etalase, "Henna"); assert.equal(r.produk.length, 2); // baris tanpa nama dibuang
});
tes("fakta sesi untuk JEV: angka dibandingkan median dalam kata-kata, tanpa nama/teks komentar", () => {
  const semua = [mk("a", 150, { ditonton: 200, klik: 30, atc: 6, pesanan: 2, follow: 2, avg: 150 }), mk("bb", 140, { ditonton: 180, klik: 27, atc: 5, pesanan: 1, follow: 2, avg: 160 }),
    mk("ccc", 160, { ditonton: 210, klik: 35, atc: 7, pesanan: 2, follow: 3, avg: 140 }), mk("dddd", 1192, { ditonton: 1321, klik: 26, atc: 7, pesanan: 1, follow: 0, avg: 14 })];
  const jev = { terpilah: 20, kategori: { tanya_harga: 8, minat_beli: 2, keluhan: 1 }, contoh: { keluhan: ["barangnya rusak kak (nama: budi)"] } };
  const r = C.lmFakta(semua[3], semua, jev);
  assert.ok(r.fakta.some((t) => /^Shopee viewers: 1192 \(much higher than/.test(t)));
  assert.ok(r.fakta.some((t) => /^Product click rate.*much lower than/.test(t)));
  assert.ok(r.fakta.some((t) => /asking price\/promo 40%/.test(t)));
  assert.ok(!r.fakta.join(" ").includes("budi"), "teks komentar tidak boleh ikut ke fakta");
  const k = r.sinyal.map((x) => x.k);
  for (const harus of ["produk", "retensi", "follow", "harga", "keluhan"]) assert.ok(k.includes(harus), "sinyal kurang: " + harus);
  assert.ok(!k.includes("sepi"));
});
tes("fakta: data minim → tidak ada sinyal palsu", () => {
  const r = C.lmFakta({ id: "x", sh: { penonton: 30 }, ig: null }, [], null);
  assert.deepEqual(r.sinyal, []); assert.ok(r.fakta.includes("Live comments: not sorted yet"));
});
tes("pengingat data belum lengkap: hanya sesi 7 hari terakhir; lengkap → kosong", () => {
  const g = C.lmGabung(SH, [IG7, IG6]);
  const r = C.lmBelumLengkap(g, "2026-10-08");
  assert.deepEqual(r.map((x) => [x.id, x.kurang.join(", ")]), [
    ["s1601", "data Instagram, follow baru, produk terjual"], // asal penonton sudah diisi
    ["s1023", "asal penonton, produk terjual"],
    ["ig:i6", "data Shopee/TikTok"],
  ]);
  assert.equal(C.lmBelumLengkap(g, "2026-10-20").length, 0); // sudah lewat 7 hari
  assert.deepEqual(C.lmBelumLengkap([{ id: "a", date: "2026-10-07", start: "10:00", sh: { follow: 1, pesanan: 0, sumber: { Lainnya: 10 } }, ig: { viewers: 5 } }], "2026-10-08"), []);
});
tes("periode: minggu Senin–Minggu, bulan kalender (geser lintas tahun), 14/30 hari mundur", () => {
  assert.deepEqual(C.lmPeriode("minggu", "2026-10-08", 0).dari, "2026-10-05"); // Kamis 8 Okt → Senin 5 Okt
  assert.deepEqual(C.lmPeriode("minggu", "2026-10-08", -1), { dari: "2026-09-28", sampai: "2026-10-04", label: "28 Sep – 4 Okt 2026", berjalan: false });
  assert.deepEqual(C.lmPeriode("bulan", "2026-10-08", 0), { dari: "2026-10-01", sampai: "2026-10-31", label: "Oktober 2026", berjalan: true });
  assert.equal(C.lmPeriode("bulan", "2026-01-15", -1).dari, "2025-12-01");
  assert.equal(C.lmPeriode("bulan", "2026-03-10", -1).sampai, "2026-02-28");
  assert.deepEqual([C.lmPeriode("14", "2026-10-08", 0).dari, C.lmPeriode("30", "2026-10-08", -1).sampai], ["2026-09-25", "2026-09-08"]);
});
tes("rekap periode: jumlah per asal, pesanan, follow hanya dari angka yang ada, sesi terbaik", () => {
  const g = C.lmGabung(SH, [IG7, IG6]);
  const r = C.lmRekap(g, "2026-10-05", "2026-10-11", { "2026-10-07T10:30": 4 });
  assert.equal(r.sesi, 3); assert.equal(r.penonton, 87 + 40 + 1192 + 33); assert.equal(r.ig, 73); assert.equal(r.luar, 218);
  assert.equal(r.pesanan, 2); assert.equal(r.jual, 218000); assert.equal(r.follow, 1); assert.equal(r.nFollow, 1);
  assert.equal(r.klik, 4); assert.deepEqual(r.terbaik, ["s1601", "s1023", "ig:i6"]);
  assert.equal(C.lmRekap(g, "2026-11-01", "2026-11-30", {}).sesi, 0);
});
tes("jam terbaik: rata-rata per hari×blok; 'terbaik' butuh ≥2 sesi di sel itu", () => {
  const mkj = (id, date, start, pen) => ({ id, date, start, sh: { start, penonton: pen }, ig: null });
  const list = [mkj("a", "2026-10-07", "10:23", 87), mkj("b", "2026-10-07", "16:01", 1192), mkj("c", "2026-09-30", "16:30", 216), mkj("d", "2026-10-01", "19:00", 300)];
  const r = C.lmJamTerbaik(list, "penonton");
  assert.equal(r.grid[2][2].n, 2); assert.equal(r.grid[2][2].rata, (1192 + 216) / 2); // Rabu sore
  assert.equal(r.grid[0][2].n, 1); // Rabu pagi
  assert.deepEqual([r.best.bi, r.best.hi, r.best.n], [2, 2, 2]); // Kamis malam (1 sesi) tidak boleh jadi terbaik
});
tes("filter tanggal: pintasan Kemarin/7/15/30 hari (termasuk hari ini)", () => {
  assert.deepEqual(C.lmPreset("kemarin", "2026-10-08"), { dari: "2026-10-07", sampai: "2026-10-07" });
  assert.deepEqual(C.lmPreset("7", "2026-10-08"), { dari: "2026-10-02", sampai: "2026-10-08" });
  assert.deepEqual(C.lmPreset("30", "2026-10-08"), { dari: "2026-09-09", sampai: "2026-10-08" });
  assert.equal(C.lmPreset("15", "2026-03-05").dari, "2026-02-19");
  assert.equal(C.lmDaftarMinggu("2026-10-08", 3).map((w) => w.dari).join(), "2026-10-05,2026-09-28,2026-09-21");
});
tes("filter tanggal: label rentang & pembanding (bulan → bulan lalu, Senin–Minggu → minggu lalu, lainnya → sama panjang)", () => {
  assert.equal(C.lmLabelRentang("2026-10-07", "2026-10-07"), "Rab, 7 Okt 2026");
  assert.equal(C.lmLabelRentang("2026-10-05", "2026-10-11"), "5 Okt – 11 Okt 2026");
  assert.equal(C.lmLabelRentang("2025-12-29", "2026-01-04"), "29 Des 2025 – 4 Jan 2026");
  assert.deepEqual(C.lmBandingRange("2026-10-01", "2026-10-31"), { dari: "2026-09-01", sampai: "2026-09-30", nama: "bulan sebelumnya" });
  assert.deepEqual(C.lmBandingRange("2026-03-01", "2026-03-31").sampai, "2026-02-28");
  assert.deepEqual(C.lmBandingRange("2026-10-05", "2026-10-11"), { dari: "2026-09-28", sampai: "2026-10-04", nama: "minggu sebelumnya" });
  assert.deepEqual(C.lmBandingRange("2026-10-02", "2026-10-08"), { dari: "2026-09-25", sampai: "2026-10-01", nama: "7 hari sebelumnya" });
  assert.deepEqual(C.lmBandingRange("2026-10-07", "2026-10-07"), { dari: "2026-10-06", sampai: "2026-10-06", nama: "hari sebelumnya" });
});
tes("harian: tiap hari ada (nol kalau tak ada live), pecahan asal dijumlah per hari", () => {
  const g = C.lmGabung(SH, [IG7, IG6]);
  const h = C.lmHarian(g, "2026-10-05", "2026-10-08", {});
  assert.deepEqual(h.map((x) => x.date), ["2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08"]);
  assert.deepEqual([h[0].nSesi, h[0].penonton], [0, 0]);
  assert.equal(h[1].ig, 33); assert.equal(h[1].nSesi, 1);          // 6 Okt: hanya IG
  assert.equal(h[2].nSesi, 2); assert.equal(h[2].ig, 40); assert.equal(h[2].luar, 218); assert.equal(h[2].unk, 87); // sesi 10:23 asal belum diisi
  assert.equal(h[2].jual, 218000); assert.equal(h[2].pesanan, 2);
});
tes("sumbu diagram: angka bulat, selalu mencakup nilai maksimum", () => {
  assert.deepEqual(C.lmTicks(1192, 4), [0, 500, 1000, 1500]);
  assert.deepEqual(C.lmTicks(218000, 4), [0, 100000, 200000, 300000]);
  assert.deepEqual(C.lmTicks(3, 4), [0, 1, 2, 3]);
  assert.deepEqual(C.lmTicks(0), [0, 1]);
  for (const m of [1, 7, 33, 87, 640, 12345]) { const t = C.lmTicks(m, 4); assert.ok(t[t.length - 1] >= m && t.every((v) => Number.isInteger(v))); }
});
tes("kode pelacakan: nama kampanye dicocokkan ke judul sesi", () => {
  assert.ok(C.lmSerupa("Ngalis 10 Menit, Tahan Sampai 3 Hari", "NGALIS10MENITTAHAN3HARI") >= 0.75);
  assert.ok(C.lmSerupa("Ngalis 10 Menit, Tahan Sampai 3 Hari", "browie-linktree-ig") < 0.5);
  const off = [
    { date: "2026-10-09", campaign: "browie-linktree-ig", channel: "Instagram", visits: 2 },
    { date: "2026-10-09", campaign: "NGALIS10MENITTAHAN3HARI", channel: "Instagram", visits: 40 },
    { date: "2026-10-08", campaign: "NGALIS10MENITTAHAN3HARI", channel: "Instagram", visits: 9 },
  ];
  const s = { id: "x", date: "2026-10-09", title: "", sh: { title: "Ngalis 10 Menit, Tahan Sampai 3 Hari" } };
  const o = C.lmOffSesi(s, off);
  assert.equal(o.baris.length, 2); assert.equal(o.cocok.visits, 40); assert.equal(o.baris[0].campaign, "NGALIS10MENITTAHAN3HARI"); assert.ok(o.adaData);
  const tanpa = C.lmOffSesi({ id: "y", date: "2026-10-10", sh: { title: "Lain" } }, off); assert.equal(tanpa.baris.length, 0); assert.equal(tanpa.cocok, null); assert.ok(tanpa.adaData);
  assert.equal(C.lmOffSesi(s, []).adaData, false);
  const beda = C.lmOffSesi({ id: "z", date: "2026-10-09", sh: { title: "Judul yang sama sekali lain" } }, off); assert.equal(beda.cocok, null); assert.equal(beda.baris.length, 2);
});
tes("pembanding badge: sesi sebelumnya, rata-rata, median, jam yang sama", () => {
  const L = C.lmGabung([{ id: "a", date: "2026-10-07", start: "10:23", penonton: 100 }, { id: "b", date: "2026-10-08", start: "16:00", penonton: 150 }, { id: "c", date: "2026-10-09", start: "10:00", penonton: 300 }, { id: "d", date: "2026-10-09", start: "20:00" }], []);
  const s = L.find((x) => x.id === "c");
  assert.equal(C.lmPembanding(L, s, "penonton", "sebelum").nilai, 150); assert.equal(Math.round(C.lmPembanding(L, s, "penonton", "sebelum").persen), 100);
  assert.equal(C.lmPembanding(L, s, "penonton", "rata3").nilai, 125);
  assert.equal(C.lmPembanding(L, s, "penonton", "jam").ref[0].id, "a");
  assert.equal(C.lmPembanding(L, s, "penonton", "median").n, 2); // sesi tanpa angka (d) tidak ikut
  assert.equal(C.lmPembanding(L, L.find((x) => x.id === "a"), "penonton", "sebelum"), null);
});
console.log("\n" + n + " tes lolos");
