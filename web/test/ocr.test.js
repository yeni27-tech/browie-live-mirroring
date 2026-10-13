// node test/ocr.test.js (dari folder web/) — parser teks OCR: Insights live IG & Tinjauan Data Shopee (teks asli hasil Tesseract dari screenshot 6–7 Okt).
import fs from "node:fs";
import assert from "node:assert/strict";
// ocr-ig.js skrip biasa untuk browser; di paket "type: module" dimuat lewat Function.
const { parseIgText, parseShopeeText, jenisScreenshot } = (() => { const m = { exports: {} }; new Function("module", "chrome", "location", fs.readFileSync(new URL("../ocr.js", import.meta.url), "utf8"))(m); return m.exports; })();
const fx = (n) => fs.readFileSync(new URL("fixtures/" + n, import.meta.url), "utf8");
const now = new Date("2026-10-08T12:00:00+07:00");
let lolos = 0;
function tes(nama, fn) { fn(); lolos++; console.log("ok  " + nama); }

tes("7 Okt terbaca lengkap", () => {
  const r = parseIgText(fx("ig-insights-7okt.txt"), now);
  assert.deepEqual({ date: r.date, dur: r.dur, viewers: r.viewers, puncak: r.puncak, komen: r.komen, share: r.share, engaged: r.engaged },
    { date: "2026-10-07", dur: 5475, viewers: 40, puncak: 4, komen: 1, share: 0, engaged: 1 });
  assert.equal(r.title, "NGALIS 10 MENIT TAHAN 3 HARI!");
  assert.deepEqual(r.kurang, []);
});
tes("6 Okt terbaca lengkap", () => {
  const r = parseIgText(fx("ig-insights-6okt.txt"), now);
  assert.deepEqual({ date: r.date, dur: r.dur, viewers: r.viewers, puncak: r.puncak, komen: r.komen, share: r.share, engaged: r.engaged },
    { date: "2026-10-06", dur: 3681, viewers: 33, puncak: 6, komen: 5, share: 0, engaged: 3 });
});
tes("'Peak Concurrent Viewers' tidak tertukar dengan 'Viewers'", () => {
  const r = parseIgText("Peak Concurrent Viewers 9\nViewers 1.234", now);
  assert.equal(r.puncak, 9); assert.equal(r.viewers, 1234);
});
tes("label bahasa Indonesia", () => {
  const r = parseIgText("NGALIS PAGI\n7 Oktober · Durasi 45:10\nPenonton 120\nKomentar 3\nDibagikan 1\nAkun yang berinteraksi 2", now);
  assert.equal(r.date, "2026-10-07"); assert.equal(r.dur, 2710); assert.equal(r.viewers, 120); assert.equal(r.komen, 3); assert.equal(r.share, 1); assert.equal(r.engaged, 2);
  assert.deepEqual(r.kurang, ["puncak"]);
});
tes("tahun: tanggal > 2 hari ke depan dianggap tahun lalu", () => {
  assert.equal(parseIgText("December 30 - Duration 1:00:00", new Date("2027-01-02")).date, "2026-12-30");
});
tes("gambar bukan Insights → semua kolom ditandai kurang", () => {
  const r = parseIgText("Halo apa kabar\nfoto liburan", now);
  assert.equal(r.kurang.length, 7);
});
tes("Shopee Tinjauan Data 7 Okt 10:23 terbaca dari teks OCR asli", () => {
  const r = parseShopeeText(fx("shopee-tinjauan-7okt.txt"), now);
  assert.deepEqual({ date: r.date, start: r.start, jual: r.jual, pesanan: r.pesanan, produk: r.produk, penonton: r.penonton, aktif: r.aktif, ditonton: r.ditonton, puncak: r.puncak,
    avg: r.avg, ctr: r.ctr, pembeli: r.pembeli, klik: r.klik, atc: r.atc, suka: r.suka, bagi: r.bagi, komen: r.komen, follow: r.follow },
    { date: "2026-10-07", start: "10:23", jual: 84000, pesanan: 1, produk: 1, penonton: 87, aktif: 16, ditonton: 124, puncak: 4,
      avg: 188, ctr: 20.2, pembeli: 1, klik: 25, atc: 5, suka: 331, bagi: 2, komen: 4, follow: 1 });
  assert.deepEqual(r.ragu, []); assert.deepEqual(r.kurang, ["dur"]); assert.equal(r.cara, "urutan"); // label kacau → cadangan urutan; durasi kepala tak terbaca
});
tes("Shopee diperbesar 2× (label terbaca): dipasangkan lewat label, angka salah baca (E, D) jadi kosong + ditandai", () => {
  const r = parseShopeeText(fx("shopee-tinjauan-7okt-diperbesar.txt"), now);
  assert.equal(r.cara, "label");
  assert.deepEqual({ date: r.date, start: r.start, dur: r.dur, jual: r.jual, pesanan: r.pesanan, produk: r.produk, penonton: r.penonton, aktif: r.aktif, ditonton: r.ditonton,
    avg: r.avg, ctr: r.ctr, pembeli: r.pembeli, klik: r.klik, suka: r.suka, bagi: r.bagi, komen: r.komen, follow: r.follow },
    { date: "2026-10-07", start: "10:23", dur: 5801, jual: 84000, pesanan: 1, produk: 1, penonton: 87, aktif: 16, ditonton: 124,
      avg: 188, ctr: 20.2, pembeli: 1, klik: 25, suka: 331, bagi: 2, komen: 4, follow: 1 });
  assert.equal(r.puncak, undefined); assert.equal(r.atc, undefined); // "E" dan "D" tidak ditebak
  assert.ok(r.ragu.includes("puncak") && r.ragu.includes("atc"));
});
tes("Shopee: satu angka penjualan hilang di depan → penonton tetap benar, penjualan kosong (diisi manual), pesanan ditandai ragu", () => {
  const t = "Tinjauan Data\n1 1 Rp84.000\nRp84.000\n87 16 124 4\n00:03:08\n20,2% 1 25 4,0%\n4,0% 5 Rp677.419\n331 2 4 4,6%\n1";
  const r = parseShopeeText(t, now);
  assert.equal(r.penonton, 87); assert.equal(r.follow, 1); assert.ok(r.kurang.includes("jual")); assert.ok(r.ragu.includes("pesanan"));
});
tes("Shopee: persentase klik tidak cocok dengan klik ÷ ditonton → ditandai ragu", () => {
  const r = parseShopeeText("Tinjauan Data\nRp1 1 1 Rp1\nRp1\n87 16 124 4\n00:03:08\n20,2% 1 99 4,0%\n4% 5 Rp1\n3 2 4 4%\n1", now);
  assert.ok(r.ragu.includes("ctr") && r.ragu.includes("klik"));
});
tes("jenis screenshot dikenali otomatis", () => {
  assert.equal(jenisScreenshot(fx("ig-insights-7okt.txt")), "ig");
  assert.equal(jenisScreenshot(fx("shopee-tinjauan-7okt.txt")), "shopee");
  assert.equal(jenisScreenshot("foto liburan"), null);
});
console.log("\n" + lolos + " tes lolos");
