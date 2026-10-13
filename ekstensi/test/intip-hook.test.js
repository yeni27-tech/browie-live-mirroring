// node test/intip-hook.test.js — Yang dijaga: TIDAK ADA nilai (angka, ID, nama, token) yang keluar dari mode intip.
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm"), assert = require("node:assert/strict");
const keluar = [];
class XHR { open() {} send() { this._l && this._l(); } addEventListener(ev, fn) { if (ev === "load") this._l = fn; } }
XHR.prototype.responseType = "";
const loc = { href: "https://seller.shopee.co.id/portal/livestreaming/list", pathname: "/portal/livestreaming/list", origin: "https://seller.shopee.co.id" };
const win = { location: loc, postMessage: (m) => keluar.push(m), fetch: async () => ({ headers: { get: () => "text/html" } }) };
const ctx = { window: win, XMLHttpRequest: XHR, URL, Date, JSON, Set, String, Number, Object, Array, location: loc, console };
vm.createContext(ctx); vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "intip-hook.js"), "utf8"), ctx);

const RAHASIA = { code: 0, data: { list: [{ session_id: "120938475610", title: "Ngalis 10 Menit petis", gmv: 134000, viewers: 1192, new_followers: 7, token: "abcSECRET", ok: true }], total: 50 } };
const x = new XHR(); x.responseText = JSON.stringify(RAHASIA);
x.open("POST", "https://seller.shopee.co.id/api/v3/livestream/session/list?shop_id=99887&start=2026-10-01");
x.send(JSON.stringify({ page: 1, page_size: 20 }));
assert.equal(keluar.length, 1);
const { t: _w, ...tanpaWaktu } = keluar[0].rec;
const teks = JSON.stringify(tanpaWaktu);
for (const nilai of ["120938475610", "134000", "1192", "petis", "abcSECRET", "99887", "2026-10-01", "Ngalis"]) assert.ok(!teks.includes(nilai), "nilai bocor: " + nilai);
const r = keluar[0].rec;
assert.equal(r.host, "seller.shopee.co.id"); assert.equal(r.path, "/api/v3/livestream/session/list");
assert.deepEqual([...r.qkeys], ["shop_id", "start"]); assert.deepEqual([...r.bkeys], ["page", "page_size"]);
assert.equal(r.shape.data.list[0].session_id, "id-panjang(teks)"); assert.equal(r.shape.data.list[0].new_followers, "angka"); assert.equal(r.shape.data.list[0].title, "teks");
console.log("ok  hanya BENTUK yang keluar: path, nama parameter, nama kolom + tipe — nol nilai");

const y = new XHR(); y.responseText = "{}"; y.open("POST", "https://seller.shopee.co.id/api/v3/livestream/session/list?x=1"); y.send();
const z = new XHR(); z.responseText = "{}"; z.open("GET", "https://contoh-lain.com/api"); z.send();
const s = new XHR(); s.responseText = "{}"; s.open("GET", "https://shopee.co.id/api/v4/cart"); s.send();
assert.equal(keluar.length, 1);
console.log("ok  endpoint sama tidak dicatat dua kali; domain lain & toko belanja shopee.co.id tidak dicatat");
console.log("\n2 tes lolos");
