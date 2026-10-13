const assert = require("assert");
const T = require("../tarik-sesi.js");
let n = 0; const ok = (nama, f) => { f(); n++; };
// Bentuk baris persis hasil mode intip (nama kolom); nilai karangan.
const baris = { atc: 5, avgViewsDuration: 188, comments: 4, confirmedOrders: 1, confirmedSales: 84000, conversionRate: 0.01, coverImage: "x", duration: 5801, followersGrowth: 1, likes: 331, peakViewers: 4, placedOrders: 1, placedSales: 84000, productClicks: 25, sessionId: 227046741, startTime: 1791345780000, status: 3, title: "Ngalis 10 Menit", viewers: 87, views: 124 };
ok("detik & milidetik dikenali", () => { assert.strictEqual(T.durDetik(5801), 5801); assert.strictEqual(T.durDetik(5801000), 5801); assert.strictEqual(T.avgDetik(188000), 188); assert.strictEqual(T.avgDetik(188), 188); });
ok("timestamp s/ms/µs/ns → ms", () => { for (const v of [1791345780, 1791345780000, 1791345780000000, 1791345780000000000]) assert.strictEqual(Math.round(T.keMs(v)), 1791345780000); });
ok("pemetaan + WIB (UTC+7) + id seperti input manual", () => {
  const s = T.petakan({ ...baris, startTime: Date.UTC(2026, 9, 7, 3, 23) });
  assert.strictEqual(s.date, "2026-10-07"); assert.strictEqual(s.start, "10:23"); assert.strictEqual(s.id, "s-2026-10-07-1023");
  assert.strictEqual(s.penonton, 87); assert.strictEqual(s.ditonton, 124); assert.strictEqual(s.puncak, 4); assert.strictEqual(s.avg, 188); assert.strictEqual(s.dur, 5801);
  assert.strictEqual(s.klik, 25); assert.strictEqual(s.pesanan, 1); assert.strictEqual(s.jual, 84000); assert.strictEqual(s.follow, 1); assert.strictEqual(s.ctr, 20.2);
});
ok("lewat tengah malam WIB pindah tanggal", () => { const s = T.petakan({ ...baris, startTime: Date.UTC(2026, 9, 7, 17, 30) }); assert.strictEqual(s.date, "2026-10-08"); assert.strictEqual(s.start, "00:30"); });
ok("null tidak jadi nol; tanpa startTime dibuang", () => { const s = T.petakan({ ...baris, comments: null, startTime: 1791345780000 }); assert.ok(!("komen" in s)); assert.strictEqual(T.petakan({ ...baris, startTime: null }), null); });
ok("respons salah → error jelas", () => { assert.throws(() => T.petakanRespons({ code: 1001, msg: "no login" }), /Login/); assert.throws(() => T.petakanRespons({ code: 0, data: {} }), /tidak dikenali/); });
ok("ringkas terbaca manusia", () => { const r = T.ringkas(T.petakan({ ...baris, startTime: Date.UTC(2026, 9, 7, 3, 23) })); assert.ok(/1:36:41/.test(r.isi) && /Rp84\.000/.test(r.isi)); });
(async () => {
  let panggilan = [];
  const f = async (u) => { panggilan.push(u); return panggilan.length === 1 ? { ok: false, status: 400 } : { ok: true, status: 200, json: async () => ({ code: 0, data: { list: [baris], total: 1 } }) }; };
  const h = await T.tarik(f, "https://seller.shopee.co.id");
  assert.strictEqual(h.sh.length, 1); assert.strictEqual(panggilan.length, 2); assert.ok(/orderBy=startTime/.test(panggilan[1])); n++;
  const g = await T.tarik(async () => ({ ok: false, status: 401 })).catch((e) => e); assert.ok(/Login/.test(g.message)); n++;
  console.log(n + " tes lolos");
})();
// ---- pola jadwal ----
(function () {
  const A = require("assert"); let n = 0;
  const wib = (y, m, d, h, mi) => Date.UTC(y, m - 1, d, h - 7, mi);
  const ok = { terverifikasi: true, tabTerlihat: true, online: true };
  const b = (st, now, o) => T.bolehTarik(st, now, { ...ok, terakhirAktif: now - 1000, ...o });
  A.ok(!b({}, wib(2026, 10, 8, 10, 0), { terverifikasi: false }).boleh); n++;
  A.ok(!b({}, wib(2026, 10, 8, 10, 0), { tabTerlihat: false }).boleh); n++;
  A.ok(!b({}, wib(2026, 10, 8, 3, 0)).boleh && /libur/.test(b({}, wib(2026, 10, 8, 3, 0)).alasan)); n++;
  A.ok(b({}, wib(2026, 10, 8, 7, 0)).boleh); n++;
  // tidak ada sentuhan 20 menit → tidak jalan
  const now0 = wib(2026, 10, 8, 10, 0);
  A.ok(!T.bolehTarik({}, now0, { ...ok, terakhirAktif: now0 - 21 * 60000 }).boleh); A.ok(T.bolehTarik({}, now0, { ...ok, terakhirAktif: now0 - 19 * 60000 }).boleh); n += 2;
  // jeda: selalu 15–58 menit (<1 jam), TIDAK seragam (ada yang cepat, tengah, lambat), dan bervariasi
  const jd = []; for (let i = 0; i < 3000; i++) jd.push(T.jedaMenit());
  A.ok(jd.every((x) => x >= 15 && x < 58.0001)); n++;
  const cepat = jd.filter((x) => x < 28).length / jd.length, tengah = jd.filter((x) => x >= 28 && x < 42).length / jd.length, lambat = jd.filter((x) => x >= 42).length / jd.length;
  A.ok(cepat > 0.2 && cepat < 0.3 && tengah > 0.5 && tengah < 0.6 && lambat > 0.15 && lambat < 0.25); n++;
  A.ok(new Set(jd.map((x) => Math.round(x))).size > 30); n++;
  // kuota harian acak 14–22, tidak sama tiap hari
  const kuotas = new Set(); for (let d = 1; d <= 60; d++) { const s = T.sesudah({}, wib(2026, 11, 1, 9, 0) + d * 86400000, "ok"); A.ok(s.hariIni.kuota >= 14 && s.hariIni.kuota <= 22); kuotas.add(s.hariIni.kuota); }
  A.ok(kuotas.size >= 5); n += 2;
  // kuota ditegakkan
  let st = {}, now = wib(2026, 10, 8, 8, 0), kali = 0;
  while (kali < 100) { const c = b(st, now); if (!c.boleh) { if (st.next && now < st.next) { now = st.next; continue; } break; } st = T.sesudah(st, now, "ok"); kali++; now += 1000; }
  A.strictEqual(kali, st.hariIni.kuota); A.ok(kali >= 14 && kali <= 22); n += 2;
  // "lewat" tidak memakai jatah tapi menggeser jadwal
  const l = T.sesudah({}, now0, "lewat"); A.strictEqual(l.hariIni.n, 0); A.ok(l.next > now0 + 14 * 60000 && l.next < now0 + 58.1 * 60000); n += 2;
  // gagal login → berhenti 6 jam; 429/403 → 12 jam; jaringan → tidak dihitung, ulang 5 menit
  const t0 = now0;
  A.strictEqual(T.sesudah({}, t0, "login").berhentiSampai - t0, 360 * 60000); A.strictEqual(T.sesudah({}, t0, "keras").berhentiSampai - t0, 720 * 60000); n += 2;
  const j = T.sesudah({ hariIni: { tgl: "2026-10-08", n: 2, kuota: 18 } }, t0, "jaringan"); A.strictEqual(j.hariIni.n, 2); A.strictEqual(j.next - t0, 5 * 60000); n++;
  A.ok(!b(T.sesudah({}, t0, "login"), t0 + 3600000).boleh); n++;
  const s1 = [{ id: "a", penonton: 1, shopeeId: "x" }, { id: "b", penonton: 2 }], s2 = [{ id: "b", penonton: 2 }, { id: "a", penonton: 1, shopeeId: "y" }];
  A.strictEqual(T.sidik(s1), T.sidik(s2)); A.notStrictEqual(T.sidik(s1), T.sidik([{ id: "a", penonton: 9 }, { id: "b", penonton: 2 }])); n += 2;
  console.log(n + " tes pola lolos");
})();
// ---- laporan pengunjung eksternal (kode pelacakan) ----
(async function () {
  const A = require("assert"); let n = 0;
  const url = "https://seller.shopee.co.id/api/mydata/v2/marketing/off-platform/traffic-reporting/channel-metric/?SPC_CDS=abc-123&SPC_CDS_VER=2&start_time=1790874000&end_time=1791478799&period=past7days&terminal=0&channel=Instagram";
  const tpl = T.pelajariOff(url);
  A.deepStrictEqual({ p: tpl.period, t: tpl.terminal, c: tpl.channel, f: tpl.fmt }, { p: "past7days", t: "0", c: "Instagram", f: "s" }); n++;
  A.ok(!JSON.stringify(tpl).includes("abc-123")); n++; // SPC_CDS tidak disimpan
  A.strictEqual(T.pelajariOff("https://seller.shopee.co.id/api/lain/?start_time=1"), null); n++;
  A.strictEqual(T.cariCds(["https://x/a?foo=1", url]), "abc-123"); n++;
  const u = new URL(T.bangunUrlOff(tpl, "abc-123", "2026-10-01", "2026-10-09", "https://seller.shopee.co.id"));
  A.strictEqual(u.searchParams.get("start_time"), String(Math.floor(Date.parse("2026-10-01T00:00:00+07:00") / 1000)));
  A.strictEqual(u.searchParams.get("end_time"), String(Math.floor(Date.parse("2026-10-09T23:59:59+07:00") / 1000)));
  A.strictEqual(u.searchParams.get("channel"), "Instagram"); n += 3;
  A.throws(() => T.bangunUrlOff(null, "x", "2026-10-01", "2026-10-02"), /Laporan Pengunjung/); A.throws(() => T.bangunUrlOff(tpl, null, "2026-10-01", "2026-10-02"), /SPC_CDS/); n += 2;
  const respons = { code: 0, result: { channel_performance_by_day: [{ date: Math.floor(Date.parse("2026-10-09T00:00:00+07:00") / 1000), campaign_description: "NGALIS10MENITTAHAN3HARI", channel: "Instagram", visits: 40, visitors: 31, add_to_cart_users: 6, add_to_cart_units: 7, add_to_cart_value: 595000, orders: 2, sales: 170000, buyers: 2, new_buyers: 1, units: 2 }] } };
  const h = T.petakanOff(respons);
  A.strictEqual(h.off.length, 1); A.strictEqual(h.off[0].date, "2026-10-09"); A.strictEqual(h.off[0].visits, 40); A.strictEqual(h.off[0].sales, 170000); A.strictEqual(h.off[0].atcUsers, 6); n += 4;
  A.ok(/Rp170\.000/.test(T.ringkasOff(h.off[0]).isi)); n++;
  A.strictEqual(T.petakanOff({ code: 0, result: { channel_performance_by_day: [] } }).off.length, 0); A.throws(() => T.petakanOff({ code: 0, result: {} }), /tidak dikenali/); n += 2;
  const r = await T.tarikOff(async (u2) => { A.ok(/channel-metric/.test(u2)); return { ok: true, status: 200, json: async () => respons }; }, tpl, "abc-123", "2026-10-01", "2026-10-09", "https://seller.shopee.co.id"); A.strictEqual(r.off.length, 1); n++;
  console.log(n + " tes laporan eksternal lolos");
})();
