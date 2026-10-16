// node test/petakan.test.js (dari folder web/) — pemetaan data mentah Seller Centre (pindah dari ekstensi, 17 Okt 2026).
import assert from "node:assert/strict";
import * as T from "../api/_petakan.js";
let n = 0; const ok = (nama, f) => { f(); n++; console.log("ok  " + nama); };
const baris = { atc: 5, avgViewsDuration: 188, comments: 4, confirmedOrders: 1, confirmedSales: 84000, duration: 5801, followersGrowth: 1, likes: 331, peakViewers: 4, placedOrders: 1, placedSales: 84000, productClicks: 25, sessionId: 227046741, startTime: 1791345780000, status: 3, title: "Ngalis 10 Menit", viewers: 87, views: 124 };
ok("detik & milidetik dikenali", () => { assert.equal(T.durDetik(5801), 5801); assert.equal(T.durDetik(5801000), 5801); assert.equal(T.avgDetik(188000), 188); assert.equal(T.avgDetik(188), 188); });
ok("timestamp s/ms/µs/ns → ms", () => { for (const v of [1791345780, 1791345780000, 1791345780000000, 1791345780000000000]) assert.equal(Math.round(T.keMs(v)), 1791345780000); });
ok("pemetaan sesi + WIB + id seperti input manual", () => {
  const s = T.petakan({ ...baris, startTime: Date.UTC(2026, 9, 7, 3, 23) });
  assert.equal(s.date, "2026-10-07"); assert.equal(s.start, "10:23"); assert.equal(s.id, "s-2026-10-07-1023");
  assert.equal(s.penonton, 87); assert.equal(s.ditonton, 124); assert.equal(s.puncak, 4); assert.equal(s.avg, 188); assert.equal(s.dur, 5801);
  assert.equal(s.klik, 25); assert.equal(s.pesanan, 1); assert.equal(s.jual, 84000); assert.equal(s.follow, 1); assert.equal(s.ctr, 20.2);
});
ok("lewat tengah malam WIB pindah tanggal; null bukan nol; tanpa startTime dibuang", () => {
  assert.equal(T.petakan({ ...baris, startTime: Date.UTC(2026, 9, 7, 17, 30) }).date, "2026-10-08");
  assert.ok(!("komen" in T.petakan({ ...baris, comments: null }))); assert.equal(T.petakan({ ...baris, startTime: null }), null);
});
ok("respons salah → error jelas", () => { assert.throws(() => T.petakanRespons({ code: 1001, msg: "x" }), /Login/); assert.throws(() => T.petakanRespons({ code: 0, data: {} }), /tidak dikenali/); });
ok("ringkas terbaca manusia", () => { const r = T.ringkas(T.petakan({ ...baris, startTime: Date.UTC(2026, 9, 7, 3, 23) })); assert.ok(/1:36:41/.test(r.isi) && /Rp84\.000/.test(r.isi)); });
ok("laporan kode pelacakan per hari per kampanye", () => {
  const respons = { code: 0, result: { channel_performance_by_day: [{ date: Math.floor(Date.parse("2026-10-09T00:00:00+07:00") / 1000), campaign_description: "NGALIS10MENITTAHAN3HARI", channel: "Instagram", visits: 40, visitors: 31, add_to_cart_users: 6, add_to_cart_value: 595000, orders: 2, sales: 170000, new_buyers: 1 }] } };
  const h = T.petakanOff(respons); assert.equal(h.off[0].date, "2026-10-09"); assert.equal(h.off[0].visits, 40); assert.equal(h.off[0].sales, 170000);
  assert.ok(/Rp170\.000/.test(T.ringkasOff(h.off[0]).isi));
  assert.equal(T.petakanOff({ code: 0, result: { channel_performance_by_day: [] } }).off.length, 0); assert.throws(() => T.petakanOff({ code: 0, result: {} }), /tidak dikenali/);
});
console.log("\n" + n + " tes lolos");
