// node test/api.test.js (dari folder web/) — fungsi server dengan Upstash tiruan di memori (tanpa jaringan).
import assert from "node:assert/strict";
import fs from "node:fs";
import { Readable } from "node:stream";

let n = 0; const tes = async (nama, fn) => { await fn(); n++; console.log("ok  " + nama); };
function mkRes() {
  const r = { statusCode: 200, headers: {}, body: null };
  r.setHeader = (k, v) => { r.headers[k.toLowerCase()] = v; };
  r.status = (c) => { r.statusCode = c; return r; };
  r.json = (b) => { r.body = b; return r; };
  r.end = () => r;
  return r;
}
function mkReq(method, { headers = {}, body } = {}) {
  const s = body === undefined ? "" : typeof body === "string" ? body : JSON.stringify(body);
  const req = Readable.from(s ? [Buffer.from(s)] : []);
  req.method = method; req.headers = headers; return req;
}

// ---- Upstash tiruan ----
const db = new Map(); // key → string | Map | Array
const H = (k) => { if (!db.has(k)) db.set(k, new Map()); return db.get(k); };
const L = (k) => { if (!db.has(k)) db.set(k, []); return db.get(k); };
function jalan([c, k, ...a]) {
  switch (c) {
    case "HINCRBY": { const h = H(k); h.set(a[0], String((+h.get(a[0]) || 0) + a[1])); return +h.get(a[0]); }
    case "HSET": H(k).set(a[0], a[1]); return 1;
    case "HGET": return H(k).get(a[0]) ?? null;
    case "HMGET": return a.map((f) => H(k).get(f) ?? null);
    case "HGETALL": return [...H(k)].flat();
    case "HEXISTS": return H(k).has(a[0]) ? 1 : 0;
    case "SET": { if (a.includes("NX") && db.has(k)) return null; db.set(k, a[0]); return "OK"; }
    case "EVAL": return H("lm:set").has("kodeAktif") || H("lm:set").has("goMati") ? 0 : jalan(["HINCRBY", "lm:klik", a[2], 1]);
    case "HDEL": return H(k).delete(a[0]) ? 1 : 0;
    case "HLEN": return H(k).size;
    case "LPUSH": L(k).unshift(a[0]); return L(k).length;
    case "LTRIM": db.set(k, L(k).slice(a[0], a[1] + 1)); return "OK";
    case "LRANGE": return L(k).slice(a[0], a[1] + 1);
    default: throw new Error("perintah tiruan belum ada: " + c);
  }
}
let mode = "ok", panggilan = 0, jevMode = "ok";
const jevKiriman = [];
globalThis.fetch = async (url, init) => {
  if (String(url).includes("typesafe")) {
    const b = JSON.parse(init.body); jevKiriman.push(b);
    if (jevMode === "ditolak") return { ok: false, status: 401, text: async () => "bad key" };
    if (b.state.facts) { // rekomendasi: "harga" & "follow" ya, sisanya tidak
      const answers = {}; for (const k of Object.keys(b.questions)) answers[k] = ["harga", "follow"].includes(k) ? { choice: "ya", confidence: 0.82, probabilities: { ya: k === "harga" ? 0.82 : 0.64, tidak: 0.18 } } : { choice: "tidak", confidence: 0.9 };
      return { ok: true, status: 200, json: async () => ({ answers }) };
    }
    const answers = {};
    b.state.comments.split("\n").forEach((line, i) => { answers["c" + (i + 1)] = { choice: /harga|berapa/i.test(line) ? "tanya_harga" : /checkout|co |order|keranjang/i.test(line) ? "minat_beli" : "lainnya", confidence: 0.9 }; });
    return { ok: true, status: 200, json: async () => ({ answers }) };
  }
  if (String(url).includes("/api/kode-klik")) {
    const h = (await import("../api/kode-klik.js")).default, u = new URL(url), res = mkRes();
    await h({ method: "GET", url: u.pathname + u.search, query: Object.fromEntries(u.searchParams), headers: { authorization: init.headers.Authorization } }, res);
    return { ok: res.statusCode === 200, status: res.statusCode, json: async () => res.body };
  }
  panggilan++;
  if (mode === "mati") throw new Error("ECONNREFUSED");
  if (mode === "lambat") await new Promise((r) => setTimeout(r, 3000));
  const cmds = JSON.parse(init.body);
  return { ok: true, json: async () => cmds.map((c) => ({ result: jalan(c) })) };
};
Object.assign(process.env, { KV_REST_API_URL: "https://contoh.upstash.io", KV_REST_API_TOKEN: "t", SHOPEE_URL: "https://shopee.co.id/browie",
  PUSH_TOKEN: "rahasia-push", LINK_SECRET: "rahasia-link", DASH_URL: "https://lm.vercel.app", SESSION_SECRET: "s3cret", ADMIN_PASSWORD: "admin-browie", JEV_KEY: "kunci-jev" });

const go = (await import("../api/go.js")).default;
const { kunciKlik } = await import("../api/go.js");
const push = (await import("../api/push.js")).default;
const data = (await import("../api/data.js")).default;
const admin = (await import("../api/admin.js")).default;
const login = (await import("../api/login.js")).default;
const { makeCookie, COOKIE } = await import("../api/_auth.js");
const core = (() => { const m = { exports: {} }; new Function("module", fs.readFileSync(new URL("../session-core.js", import.meta.url), "utf8"))(m); return m.exports; })();

const ck = (peran) => ({ cookie: `${COOKIE}=${makeCookie(peran).value}`, host: "lm.vercel.app" });
const EXT = { authorization: "Bearer rahasia-push" };
async function lihatData(h) { const r = mkRes(); await data(mkReq("GET", { headers: h }), r); return r; }
async function aksi(b, h = ck("admin")) { const r = mkRes(); await admin(mkReq("POST", { headers: h, body: b }), r); return r; }

await tes("Upstash dengan awalan kustom (mis. LM_REST_API_URL) tetap ditemukan; token read-only diabaikan", async () => {
  const simpan = { u: process.env.KV_REST_API_URL, t: process.env.KV_REST_API_TOKEN };
  delete process.env.KV_REST_API_URL; delete process.env.KV_REST_API_TOKEN;
  Object.assign(process.env, { LM_REST_API_URL: "https://kustom.upstash.io", LM_REST_API_TOKEN: "t", LM_REST_API_READ_ONLY_TOKEN: "ro" });
  const { redisSiap } = await import("../api/_redis.js?kustom");
  assert.equal(redisSiap(), true);
  delete process.env.LM_REST_API_URL; delete process.env.LM_REST_API_TOKEN; delete process.env.LM_REST_API_READ_ONLY_TOKEN;
  assert.equal(redisSiap(), false);
  process.env.KV_REST_API_URL = simpan.u; process.env.KV_REST_API_TOKEN = simpan.t; assert.equal(redisSiap(), true);
});

// ---------- link penghitung ----------
await tes("go: catat klik per 10 menit lalu 302 ke Shopee", async () => {
  const r = mkRes(); await go(mkReq("GET", { headers: { "user-agent": "Instagram 300 iPhone" } }), r);
  assert.equal(r.statusCode, 302); assert.equal(r.headers.location, "https://shopee.co.id/browie");
  assert.equal([...H("lm:klik").values()].reduce((a, v) => a + +v, 0), 1);
});
await tes("go: Upstash mati → tetap 302", async () => {
  mode = "mati"; const r = mkRes(); await go(mkReq("GET", { headers: {} }), r); mode = "ok";
  assert.equal(r.statusCode, 302);
});
await tes("go: Upstash macet → menyerah ≤1,2 dtk lalu 302", async () => {
  mode = "lambat"; const t0 = Date.now(); const r = mkRes(); await go(mkReq("GET", { headers: {} }), r); mode = "ok";
  assert.equal(r.statusCode, 302); assert.ok(Date.now() - t0 < 2000);
});
await tes("go: bot pratinjau link tidak dihitung", async () => {
  const total = () => [...H("lm:klik").values()].reduce((a, v) => a + +v, 0);
  const t0 = total(); const r = mkRes(); await go(mkReq("GET", { headers: { "user-agent": "facebookexternalhit/1.1" } }), r);
  assert.equal(r.statusCode, 302); assert.equal(total(), t0);
});
await tes("kunci klik server = kunci klik dashboard", async () => {
  const t = Date.parse("2026-10-08T03:47:10Z"); assert.equal(kunciKlik(t), core.lmKunciKlik(t));
});

// ---------- login & peran ----------
await tes("login: hanya password admin yang diterima", async () => {
  let r = mkRes(); await login(mkReq("POST", { body: { password: "admin-browie" } }), r); assert.equal(r.body.peran, "admin"); assert.match(r.headers["set-cookie"], /lm_session=/);
  r = mkRes(); await login(mkReq("POST", { body: { password: "tebak" } }), r); assert.equal(r.statusCode, 401);
});
await tes("cookie palsu / peran dikarang → diperlakukan sebagai tamu (tanpa riwayat & tanpa hak admin)", async () => {
  let d = await lihatData({ cookie: `${COOKIE}=9999999999999.admin.palsu` }); assert.equal(d.body.peran, "tamu"); assert.equal(d.body.log, undefined);
  const asli = makeCookie("lihat").value.split("."); // ganti peran tanpa tanda tangan baru
  d = await lihatData({ cookie: `${COOKIE}=${asli[0]}.admin.${asli[2]}` }); assert.equal(d.body.peran, "tamu");
  assert.equal((await aksi({ aksi: "data-awal" }, { cookie: `${COOKIE}=${asli[0]}.admin.${asli[2]}` })).statusCode, 403);
});
await tes("tamu / bukan admin tidak bisa memakai aksi admin", async () => {
  const r = await aksi({ aksi: "data-awal" }, ck("lihat")); assert.equal(r.statusCode, 403);
  assert.equal((await aksi({ aksi: "data-awal" }, {})).statusCode, 403);
});

// ---------- admin ----------
await tes("data-awal: 2 sesi Shopee + 2 live IG, hanya sekali", async () => {
  assert.equal((await aksi({ aksi: "data-awal" })).statusCode, 200);
  assert.equal((await aksi({ aksi: "data-awal" })).statusCode, 409);
  const d = (await lihatData(ck("admin"))).body;
  assert.equal(d.sh.length, 2); assert.equal(d.ig.length, 2); assert.equal(d.peran, "admin"); assert.ok(d.log.length >= 1);
});
await tes("simpan-sh: jam mulai wajib; sesi kembar ditolak", async () => {
  assert.equal((await aksi({ aksi: "simpan-sh", rec: { date: "2026-10-08" } })).statusCode, 400);
  assert.equal((await aksi({ aksi: "simpan-sh", rec: { date: "2026-10-08", start: "10:00", penonton: 50 } })).body.id, "s-2026-10-08-1000");
  assert.equal((await aksi({ aksi: "simpan-sh", rec: { date: "2026-10-08", start: "10:00" } })).statusCode, 409);
});
await tes("push ekstensi tidak menimpa koreksi admin", async () => {
  await aksi({ aksi: "simpan-sh", rec: { id: "s-2026-10-08-1000", date: "2026-10-08", start: "10:00", penonton: 50, follow: 3 } });
  let r = mkRes(); await push(mkReq("POST", { headers: EXT, body: { sh: [{ id: "s-2026-10-08-1000", date: "2026-10-08", start: "10:00", penonton: 999, ditonton: 1500, follow: 0 }] } }), r);
  assert.equal(r.statusCode, 200);
  const s = (await lihatData(ck("admin"))).body.sh.find((x) => x.id === "s-2026-10-08-1000");
  assert.equal(s.penonton, 50); assert.equal(s.follow, 3); assert.equal(s.ditonton, 1500); // koreksi menang, kolom baru dari ekstensi tetap masuk
  assert.equal(s.by, "auto+koreksi");
});
await tes("koreksi 1 angka tidak mengunci angka lain: tarikan berikutnya tetap memperbarui", async () => {
  let r = mkRes(); await push(mkReq("POST", { headers: EXT, body: { sh: [{ id: "s-2026-10-12-1000", date: "2026-10-12", start: "10:00", penonton: 100, pesanan: 2, follow: 0 }] } }), r);
  const s0 = (await lihatData(ck("admin"))).body.sh.find((x) => x.id === "s-2026-10-12-1000");
  await aksi({ aksi: "simpan-sh", rec: { ...s0, follow: 4 } }); // admin buka form (semua angka terisi), ubah follow saja
  r = mkRes(); await push(mkReq("POST", { headers: EXT, body: { sh: [{ id: "s-2026-10-12-1000", date: "2026-10-12", start: "10:00", penonton: 140, pesanan: 3, follow: 0 }] } }), r);
  const s = (await lihatData(ck("admin"))).body.sh.find((x) => x.id === "s-2026-10-12-1000");
  assert.equal(s.penonton, 140); assert.equal(s.pesanan, 3); assert.equal(s.follow, 4);
});
await tes("sesi dari ekstensi yang dihapus admin tidak muncul lagi saat push berikutnya", async () => {
  let r = mkRes(); await push(mkReq("POST", { headers: EXT, body: { sh: [{ id: "s-2026-10-09-1300", date: "2026-10-09", start: "13:00", penonton: 70 }] } }), r);
  assert.equal(r.body.baru, 1);
  await aksi({ aksi: "hapus-sh", id: "s-2026-10-09-1300" });
  r = mkRes(); await push(mkReq("POST", { headers: EXT, body: { sh: [{ id: "s-2026-10-09-1300", date: "2026-10-09", start: "13:00", penonton: 75 }] } }), r);
  assert.ok(!(await lihatData(ck("admin"))).body.sh.some((x) => x.id === "s-2026-10-09-1300"));
});
await tes("sesi manual dihapus benar-benar hilang", async () => {
  await aksi({ aksi: "hapus-sh", id: "s-2026-10-08-1000" });
  assert.ok(!H("lm:sh").get("s-2026-10-08-1000") || JSON.parse(H("lm:sh").get("s-2026-10-08-1000")).hidden);
});
await tes("simpan-ig + pasang manual + hapus-ig", async () => {
  const r = await aksi({ aksi: "simpan-ig", rec: { date: "2026-10-07", dur: 7000, viewers: 55, title: "LIVE SORE" } });
  const id = r.body.id;
  await aksi({ aksi: "pasang", igId: id, nilai: "s-2026-10-07-1601" });
  let ig = (await lihatData(ck("admin"))).body.ig.find((x) => x.id === id);
  assert.equal(ig.pairBy, "pilih"); assert.equal(ig.pairId, "s-2026-10-07-1601");
  await aksi({ aksi: "pasang", igId: id, nilai: "auto" });
  ig = (await lihatData(ck("admin"))).body.ig.find((x) => x.id === id); assert.equal(ig.pairBy, undefined);
  await aksi({ aksi: "hapus-ig", id });
  assert.ok(!(await lihatData(ck("admin"))).body.ig.some((x) => x.id === id));
});
await tes("angka & teks aneh dibersihkan (negatif, raksasa, persen > 100, judul kepanjangan)", async () => {
  await aksi({ aksi: "simpan-sh", rec: { date: "2026-10-10", start: "09:00", penonton: -5, jual: 1e15, title: "x".repeat(500), sumber: { Lainnya: 250, Beranda: 40 } } });
  const s = (await lihatData(ck("admin"))).body.sh.find((x) => x.id === "s-2026-10-10-0900");
  assert.equal(s.penonton, undefined); assert.equal(s.jual, undefined); assert.equal(s.title.length, 160); assert.deepEqual(s.sumber, { Beranda: 40 });
});

await tes("rincian produk: dibersihkan, baris tanpa nama dibuang, maks 60", async () => {
  const items = [{ nama: " Henna Alis Black ", etalase: "Henna", qty: 2, jual: 168000 }, { nama: "", qty: 5 }, { nama: "Concealer", qty: -1, jual: 59000 }]
    .concat(Array.from({ length: 70 }, (_, i) => ({ nama: "P" + i, qty: 1 })));
  await aksi({ aksi: "simpan-sh", rec: { date: "2026-10-13", start: "11:00", items } });
  const s = (await lihatData(ck("admin"))).body.sh.find((x) => x.id === "s-2026-10-13-1100");
  assert.equal(s.items.length, 59); assert.deepEqual(s.items[0], { nama: "Henna Alis Black", etalase: "Henna", qty: 2, jual: 168000 });
  assert.equal(s.items[1].qty, undefined); assert.equal(s.items[1].jual, 59000);
});
await tes("hapus-banyak: sesi manual hilang, sesi ekstensi disembunyikan, IG terhapus, tercatat di riwayat", async () => {
  let r = mkRes(); await push(mkReq("POST", { headers: EXT, body: { sh: [{ id: "s-2026-10-14-0900", date: "2026-10-14", start: "09:00", penonton: 10 }] } }), r);
  const ig = (await aksi({ aksi: "simpan-ig", rec: { date: "2026-10-14", viewers: 5 } })).body.id;
  r = await aksi({ aksi: "hapus-banyak", sh: ["s-2026-10-13-1100", "s-2026-10-14-0900", "../x"], ig: [ig] });
  assert.equal(r.statusCode, 200); assert.equal(r.body.sh, 2);
  const d = (await lihatData(ck("admin"))).body;
  assert.ok(!d.sh.some((x) => ["s-2026-10-13-1100", "s-2026-10-14-0900"].includes(x.id))); assert.ok(!d.ig.some((x) => x.id === ig));
  assert.match(d.log[0].teks, /hapus 2 sesi Shopee, 1 live IG/);
  r = mkRes(); await push(mkReq("POST", { headers: EXT, body: { sh: [{ id: "s-2026-10-14-0900", date: "2026-10-14", start: "09:00", penonton: 12 }] } }), r);
  assert.ok(!(await lihatData(ck("admin"))).body.sh.some((x) => x.id === "s-2026-10-14-0900"));
  assert.equal((await aksi({ aksi: "hapus-banyak", sh: [], ig: [] })).statusCode, 400);
  assert.equal((await aksi({ aksi: "hapus-banyak", sh: ["s-2026-10-07-1023"] }, ck("lihat"))).statusCode, 403);
});

await tes("JEV: komentar dipilah, nama penonton dibuang sebelum dikirim, duplikat dibuang", async () => {
  jevKiriman.length = 0;
  const teks = "budi_88: kak harganya berapa?\n19:42 sari.ayu: mau checkout yang black\nkak harganya berapa?\nhalo kak\n\nmantap";
  const r = await aksi({ aksi: "pilah-komentar", id: "s-2026-10-07-1023", teks });
  assert.equal(r.statusCode, 200); assert.equal(r.body.total, 4); // duplikat "kak harganya berapa?" dibuang
  assert.equal(r.body.kategori.tanya_harga, 1); assert.equal(r.body.kategori.minat_beli, 1);
  const terkirim = jevKiriman.map((k) => k.state.comments).join("\n");
  assert.ok(!/budi_88|sari\.ayu|19:42/.test(terkirim), "nama/jam ikut terkirim: " + terkirim);
  const d = (await lihatData(ck("admin"))).body; assert.equal(d.jev["s-2026-10-07-1023"].terpilah, 4); // tamu memakai salinan 30 dtk, admin selalu terbaru
});
await tes("JEV: kunci ditolak / kurang dari 3 komentar / tamu → pesan jelas, tidak tersimpan", async () => {
  jevMode = "ditolak";
  let r = await aksi({ aksi: "pilah-komentar", id: "s-2026-10-07-1601", teks: "a1\nb2\nc3" }); jevMode = "ok";
  assert.equal(r.statusCode, 502); assert.match(r.body.error, /Kunci JEV ditolak/);
  r = await aksi({ aksi: "pilah-komentar", id: "s-2026-10-07-1601", teks: "halo" }); assert.equal(r.statusCode, 400);
  assert.equal((await aksi({ aksi: "pilah-komentar", id: "s-2026-10-07-1601", teks: "a1\nb2\nc3" }, {})).statusCode, 403);
  assert.equal((await lihatData(ck("admin"))).body.jev["s-2026-10-07-1601"], undefined);
});

await tes("pengaturan: kunci JEV diuji dulu, disimpan di server, tidak pernah dikirim balik (hanya 4 huruf terakhir)", async () => {
  jevMode = "ditolak";
  let r = await aksi({ aksi: "pengaturan", jevKey: "kunci-salah-1234567" }); jevMode = "ok";
  assert.equal(r.statusCode, 400); assert.match(r.body.error, /Kunci tidak disimpan/);
  r = await aksi({ aksi: "pengaturan", jevKey: "ts_live_KUNCIRAHASIA9wxyz" }); assert.equal(r.statusCode, 200);
  const adm = await lihatData(ck("admin")), tamu = await lihatData({ host: "x" });
  const semua = JSON.stringify(adm.body) + JSON.stringify(tamu.body);
  assert.ok(!semua.includes("KUNCIRAHASIA"), "kunci bocor ke browser");
  assert.equal(adm.body.pengaturan.jevAkhir, "wxyz"); assert.equal(adm.body.pengaturan.jevDariWeb, true); assert.equal(tamu.body.pengaturan, undefined);
  jevKiriman.length = 0;
  await aksi({ aksi: "pilah-komentar", id: "s-2026-10-07-1601", teks: "harga berapa\nmau checkout\nhalo" });
  assert.equal(jevKiriman.length, 1); // kunci dari web dipakai (env JEV_KEY tidak dipakai lagi)
  assert.equal((await aksi({ aksi: "uji-jev" })).statusCode, 200);
  assert.equal((await aksi({ aksi: "pengaturan", jevKey: "ts_live_lain" }, {})).statusCode, 403);
});
await tes("pengaturan: link tujuan Shopee dari web dipakai link penghitung; link bukan Shopee ditolak", async () => {
  assert.equal((await aksi({ aksi: "pengaturan", shopeeUrl: "https://penipu.com/shopee" })).statusCode, 400);
  assert.equal((await aksi({ aksi: "pengaturan", shopeeUrl: "https://shopee.co.id/browieofficial" })).statusCode, 200);
  const r = mkRes(); await go(mkReq("GET", { headers: { "user-agent": "Instagram" } }), r);
  assert.equal(r.statusCode, 410); // begitu link Shopee disimpan, kode unik dibuat dan /go dimatikan
  const l = (await import("../../link/api/l.js")).default, d = (await lihatData(ck("admin"))).body;
  const r2 = mkRes(), q = mkReq("GET", { headers: { "user-agent": "Instagram" } }); q.query = { kode: d.link.aktif }; await l(q, r2);
  assert.equal(r2.headers.location, "https://shopee.co.id/browieofficial");
  assert.equal((await lihatData(ck("admin"))).body.pengaturan.shopeeUrl, "https://shopee.co.id/browieofficial");
});

await tes("rekomendasi: JEV menilai tiap masalah, hasil urut dari paling yakin, tamu ikut melihat", async () => {
  const fakta = ["Shopee viewers: 1192 (much higher than the median of other sessions, 147)", "Product click rate (clicks per view): 2% (much lower than the median of other sessions, 15%)", "New shop followers per viewer: 0%", "Live comments sorted (20): asking price/promo 40%"];
  jevKiriman.length = 0;
  const r = await aksi({ aksi: "rekomendasi", id: "s-2026-10-07-1601", fakta });
  assert.equal(r.statusCode, 200); assert.deepEqual(r.body.hasil.slice(0, 2), [{ k: "harga", p: 0.82 }, { k: "follow", p: 0.64 }]);
  assert.equal(Object.keys(jevKiriman[0].questions).length, 9);
  const d = (await lihatData(ck("admin"))).body; assert.equal(d.aksi["s-2026-10-07-1601"].hasil[0].k, "harga");
  assert.equal((await aksi({ aksi: "rekomendasi", id: "s-2026-10-07-1601", fakta: ["a"] })).statusCode, 400);
  assert.equal((await aksi({ aksi: "rekomendasi", id: "s-2026-10-07-1601", fakta }, {})).statusCode, 403);
});
await tes("kriteria masalah di server SAMA dengan session-core (LM_MASALAH)", async () => {
  const { MASALAH_JEV } = await import("../api/_jev.js");
  assert.deepEqual(Object.keys(MASALAH_JEV), Object.keys(core.LM_MASALAH));
  for (const k of Object.keys(MASALAH_JEV)) assert.equal(MASALAH_JEV[k], core.LM_MASALAH[k].jev, "beda: " + k);
});

// ---------- push & data ----------
await tes("push: tanpa token / token salah → 401; bentuk salah → 400", async () => {
  let r = mkRes(); await push(mkReq("POST", { body: { sh: [] } }), r); assert.equal(r.statusCode, 401);
  r = mkRes(); await push(mkReq("POST", { headers: { authorization: "Bearer salah" }, body: { sh: [] } }), r); assert.equal(r.statusCode, 401);
  r = mkRes(); await push(mkReq("POST", { headers: EXT, body: { x: 1 } }), r); assert.equal(r.statusCode, 400);
});
await tes("push: id/tanggal tidak sah ditolak per baris", async () => {
  const r = mkRes(); await push(mkReq("POST", { headers: EXT, body: { sh: [{ id: "../jahat", date: "2026-10-01" }, { id: "s-ok", date: "kemarin" }, { id: "s-2026-10-11-0800", date: "2026-10-11" }] } }), r);
  assert.equal(r.body.diterima, 1); assert.equal(r.body.ditolak, 2);
});
await tes("data: tamu tanpa password boleh lihat (tanpa riwayat); ekstensi boleh baca dengan token", async () => {
  const tamu = await lihatData({ host: "lm.vercel.app" }); assert.equal(tamu.statusCode, 200);
  assert.equal(tamu.body.peran, "tamu"); assert.equal(tamu.body.log, undefined); assert.equal(tamu.body.linkUrl, undefined); // tamu tidak melihat link penghitung assert.ok(Array.isArray(tamu.body.sh)); // isi bisa tertinggal ≤30 dtk (salinan tamu)
  const ext = (await lihatData({ ...EXT, host: "lm.vercel.app" })).body; assert.equal(ext.peran, "ekstensi");
});
await tes("push kode pelacakan (off): disimpan per hari-kampanye, ditimpa saat kirim ulang, data kotor ditolak, token wajib", async () => {
  const baris = { date: "2026-10-09", campaign: "NGALIS10MENITTAHAN3HARI", channel: "Instagram", visits: 40, visitors: 31, atcUsers: 6, atcUnits: 7, atcValue: 595000, orders: 2, sales: 170000, buyers: 2, newBuyers: 1, units: 2 };
  let r = mkRes(); await push(mkReq("POST", { body: { off: [baris] } }), r); assert.equal(r.statusCode, 401);
  r = mkRes(); await push(mkReq("POST", { headers: EXT, body: { off: [baris, { date: "kemarin", campaign: "x" }, { date: "2026-10-09", campaign: "  " }, null, { ...baris, campaign: "lain", visits: -5, sales: "banyak" }] } }), r);
  assert.equal(r.statusCode, 200); assert.equal(r.body.off, 2);
  let d = (await lihatData(ck("admin"))).body;
  assert.equal(d.off.length, 2); const a = d.off.find((o) => o.campaign === "NGALIS10MENITTAHAN3HARI"); assert.equal(a.visits, 40); assert.equal(a.sales, 170000);
  const b = d.off.find((o) => o.campaign === "lain"); assert.equal(b.visits, 0); assert.equal(b.sales, 0); // nilai tak sah → 0, bukan ditolak diam-diam
  r = mkRes(); await push(mkReq("POST", { headers: EXT, body: { off: [{ ...baris, visits: 55 }] } }), r);
  d = (await lihatData(ck("admin"))).body; assert.equal(d.off.filter((o) => o.campaign === "NGALIS10MENITTAHAN3HARI").length, 1); assert.equal(d.off.find((o) => o.campaign === "NGALIS10MENITTAHAN3HARI").visits, 55);
  r = mkRes(); await push(mkReq("POST", { headers: EXT, body: { foo: 1 } }), r); assert.equal(r.statusCode, 400);
});
await tes("link unik: simpan link Shopee → kode acak di alamat terpisah; ganti link → kode baru + riwayat; /go mati", async () => {
  const l = (await import("../../link/api/l.js")).default;
  const u1 = "https://shopee.co.id/universal-link/browieofficial?utm_campaign=s1_ss_id_igbp_ngalis10menittahan3hari&utm_source=instagram";
  let r = await aksi({ aksi: "pengaturan", shopeeUrl: u1 }); assert.equal(r.statusCode, 200);
  let d = (await lihatData(ck("admin"))).body;
  assert.match(d.link.aktif, /^[A-Za-z0-9]{8}$/); assert.ok(d.link.url.endsWith("/" + d.link.aktif)); assert.ok(!d.link.url.includes("lm.vercel.app"));
  const n0 = d.link.riwayat.length; assert.ok(d.link.riwayat.filter((x) => !x.selesai).length === 1); assert.equal(d.link.riwayat[0].kampanye, "s1_ss_id_igbp_ngalis10menittahan3hari");
  const k1 = d.link.aktif;
  // tamu tidak melihat link
  const tamu = (await lihatData({ host: "lm.vercel.app" })).body; assert.equal(tamu.link, undefined); assert.ok(!tamu.linkUrl);
  // simpan link yang sama → kode tidak berganti
  await aksi({ aksi: "pengaturan", shopeeUrl: u1 }); assert.equal((await lihatData(ck("admin"))).body.link.aktif, k1);
  // klik: sekali per perangkat per 10 menit
  const klik = async (kode, cookie) => { const res = mkRes(); const req = mkReq("GET", { headers: { "user-agent": "Instagram", ...(cookie ? { cookie } : {}) } }); req.query = { kode }; await l(req, res); return res; };
  let a1 = await klik(k1); assert.equal(a1.statusCode, 302); assert.equal(a1.headers.location, u1);
  const v = /v=([a-f0-9]{16})/.exec(a1.headers["set-cookie"])[1];
  await klik(k1, "v=" + v); await klik(k1, "v=" + v); await klik(k1, "v=bbbbbbbbbbbbbbbb");
  // ganti link → kode baru, kode lama ditutup, klik kode lama diteruskan ke link terbaru & dicatat terpisah
  const u2 = "https://shopee.co.id/universal-link/browieofficial?utm_campaign=s1_ss_id_igbp_alisbedasebelah";
  await aksi({ aksi: "pengaturan", shopeeUrl: u2 });
  d = (await lihatData(ck("admin"))).body; const k2 = d.link.aktif; assert.notEqual(k2, k1);
  const lama = await klik(k1, "v=cccccccccccccccc"); assert.equal(lama.headers.location, u2);
  d = (await lihatData(ck("admin"))).body;
  const rk1 = d.link.riwayat.find((x) => x.kode === k1), rk2 = d.link.riwayat.find((x) => x.kode === k2);
  assert.equal(rk1.klik, 2); assert.equal(rk1.klikLama, 1); assert.ok(rk1.selesai); assert.equal(rk2.selesai, null); assert.ok(rk2.aktif);
  // kode tebakan → 404, tidak diteruskan
  const tebak = await klik("Zz9Zz9Zz"); assert.equal(tebak.statusCode, 404);
  // pintu dashboard tanpa / dengan token salah ditolak
  const kk = (await import("../api/kode-klik.js")).default; const tk = mkRes();
  await kk({ method: "GET", query: { kode: k2, v: "a".repeat(16) }, headers: { authorization: "Bearer salah" } }, tk); assert.equal(tk.statusCode, 401);
  const salah = await klik("../../x"); assert.equal(salah.statusCode, 404);
  // ganti kode manual (link Shopee tetap)
  r = await aksi({ aksi: "kode-baru" }); assert.equal(r.statusCode, 200);
  d = (await lihatData(ck("admin"))).body; assert.notEqual(d.link.aktif, k2); assert.equal(d.link.riwayat.length, n0 + 2);
  // /go di alamat dashboard sudah mati
  const g = mkRes(); await go(mkReq("GET", { headers: {} }), g); assert.equal(g.statusCode, 410);
});
await tes("CRUD kode link: ubah link+catatan, jadikan aktif lagi, hapus (aktif → tanpa link aktif, /go tetap mati)", async () => {
  let d = (await lihatData(ck("admin"))).body; const lama = d.link.riwayat.find((x) => !x.aktif), aktif = d.link.aktif;
  const u3 = "https://shopee.co.id/universal-link/browieofficial?utm_campaign=s1_ss_id_igbp_tesubah";
  let r = await aksi({ aksi: "kode-ubah", kode: aktif, url: u3, catatan: "uji coba" }); assert.equal(r.statusCode, 200);
  d = (await lihatData(ck("admin"))).body; const x = d.link.riwayat.find((y) => y.kode === aktif);
  assert.equal(x.url, u3); assert.equal(x.kampanye, "s1_ss_id_igbp_tesubah"); assert.equal(x.catatan, "uji coba"); assert.equal(d.pengaturan.shopeeUrl, u3);
  assert.equal((await aksi({ aksi: "kode-ubah", kode: aktif, url: "https://penipu.com" })).statusCode, 400);
  r = await aksi({ aksi: "kode-aktifkan", kode: lama.kode }); assert.equal(r.statusCode, 200);
  d = (await lihatData(ck("admin"))).body; assert.equal(d.link.aktif, lama.kode); assert.equal(d.pengaturan.shopeeUrl, lama.url); assert.ok(d.link.riwayat.find((y) => y.kode === aktif).selesai);
  r = await aksi({ aksi: "kode-hapus", kode: lama.kode }); assert.equal(r.statusCode, 200);
  d = (await lihatData(ck("admin"))).body; assert.equal(d.link.aktif, null); assert.ok(!d.link.riwayat.some((y) => y.kode === lama.kode));
  const l = (await import("../../link/api/l.js")).default, res = mkRes(), q = mkReq("GET", { headers: {} }); q.query = { kode: lama.kode }; await l(q, res); assert.equal(res.statusCode, 404);
  const g = mkRes(); await go(mkReq("GET", { headers: {} }), g); assert.equal(g.statusCode, 410);
  assert.equal((await aksi({ aksi: "kode-baru" })).statusCode, 200); assert.match((await lihatData(ck("admin"))).body.link.aktif, /^[A-Za-z0-9]{8}$/);
  assert.equal((await aksi({ aksi: "kode-hapus", kode: "../x" })).statusCode, 400);
});
console.log("\n" + n + " tes lolos");
