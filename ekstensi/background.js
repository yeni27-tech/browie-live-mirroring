// browie Live Mirroring — background.
// Tugas sekarang: menyimpan hasil MODE INTIP (bentuk data saja), mencatat aktivitas untuk pet pemantau, dan membuka dashboard.
// Tidak mengirim request ke Shopee, tidak mengirim data ke mana pun.
// Status untuk pet disimpan di storage kunci "petStatus":
//   { events:[{t,jenis:"endpoint"|"halaman"|"scrape"|"galat",teks}], halaman:[path…], scrape:{state,done,total,msg,at,galat?} }
// scrape.state: "belum" (Tahap B belum dibangun) | "jalan" | "selesai" | "gagal" — dipakai penarik data Shopee nanti lewat setScrape().

const SC_RE = /^https:\/\/[a-z0-9-]+\.shopee\.co\.id\//i;
const BATAS_PERISTIWA = 40, BATAS_HALAMAN = 60;

chrome.action.onClicked.addListener(async (tab) => {
  // Di halaman Seller Centre: ikon = tampil/sembunyikan pet. Di tempat lain: buka dashboard.
  if (tab && tab.url && SC_RE.test(tab.url) && !/^https:\/\/shopee\.co\.id\//i.test(tab.url)) {
    try { await chrome.tabs.sendMessage(tab.id, { type: "toggle-pet" }); return; } catch (e) { /* pet belum dimuat → buka dashboard */ }
  }
  chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
});

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (!msg) return false;
  if (msg.type === "intip-seen" && msg.rec && sender.tab) { simpanIntip(msg.rec).catch(() => {}); }
  else if (msg.type === "pet-halaman" && sender.tab) { catatHalaman(String(msg.path || "").slice(0, 200)).catch(() => {}); }
  else if (msg.type === "scrape-set" && sender.tab && msg.patch && typeof msg.patch === "object") {
    const p = msg.patch, ok = ["belum", "jalan", "selesai", "gagal"].includes(p.state) ? p.state : "belum";
    setScrape({ state: ok, done: Number(p.done) || 0, total: Number(p.total) || 0, msg: String(p.msg || "").slice(0, 200), galat: p.galat ? String(p.galat).slice(0, 200) : undefined }).catch(() => {});
  }
  else if (msg.type === "tarik-kirim" && sender.tab && Array.isArray(msg.sh)) { kirimSesi(msg.sh, !!msg.otomatis).then(reply, (e) => reply({ ok: false, galat: String(e && e.message || e) })); return true; }
  else if (msg.type === "off-kirim" && sender.tab && Array.isArray(msg.off)) { kirimPayload({ off: msg.off }, !!msg.otomatis, msg.off.length + " baris kode pelacakan").then(reply, (e) => reply({ ok: false, galat: String(e && e.message || e) })); return true; }
  else if (msg.type === "pratinjau" && sender.tab && msg.mentah) { kirimMentah(msg.mentah, true).then(reply, (e) => reply({ ok: false, galat: String(e && e.message || e) })); return true; }
  else if (msg.type === "kirim-mentah" && sender.tab && msg.mentah) { kirimMentah(msg.mentah, false, !!msg.otomatis).then(reply, (e) => reply({ ok: false, galat: String(e && e.message || e) })); return true; }
  else if (msg.type === "resep" && sender.tab) { ambilResep().then(reply, () => reply(null)); return true; }
  else if (msg.type === "off-tpl" && sender.tab && msg.tpl && typeof msg.tpl === "object") { chrome.storage.local.set({ offTpl: msg.tpl }).catch(() => {}); }
  else if (msg.type === "buka-dashboard") { chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") }); }
  return false;
});

async function ambilStatus() {
  const { petStatus } = await chrome.storage.local.get("petStatus");
  return petStatus && typeof petStatus === "object" ? petStatus : { events: [], halaman: [], scrape: { state: "belum", msg: "Penarikan otomatis belum aktif (menunggu hasil mode intip)." } };
}
async function catat(jenis, teks, ekstra) {
  const st = await ambilStatus();
  st.events = [{ t: Date.now(), jenis, teks: String(teks).slice(0, 160) }].concat(st.events || []).slice(0, BATAS_PERISTIWA);
  if (ekstra) Object.assign(st, ekstra(st));
  await chrome.storage.local.set({ petStatus: st });
}
async function catatHalaman(path) {
  if (!path) return;
  await catat("halaman", path, (st) => { const h = (st.halaman || []).filter((x) => x !== path); h.unshift(path); return { halaman: h.slice(0, BATAS_HALAMAN) }; });
}
// Dipanggil penarik data Shopee (Tahap B) untuk melaporkan progres ke pet.
async function setScrape(patch) {
  const st = await ambilStatus();
  st.scrape = Object.assign({}, st.scrape, patch, { at: Date.now() });
  if (patch.state === "gagal") st.events = [{ t: Date.now(), jenis: "galat", teks: String(patch.galat || patch.msg || "Penarikan gagal").slice(0, 160) }].concat(st.events || []).slice(0, BATAS_PERISTIWA);
  await chrome.storage.local.set({ petStatus: st });
}

async function simpanIntip(r) {
  const { intip = [] } = await chrome.storage.local.get("intip");
  const kunci = r.method + " " + r.host + r.path;
  const ada = intip.find((x) => x.method + " " + x.host + x.path === kunci);
  const page = String(r.page || "").slice(0, 200);
  if (ada) {
    if (!ada.pages.includes(page) && ada.pages.length < 10) { ada.pages.push(page); await chrome.storage.local.set({ intip }); }
    return;
  }
  intip.unshift({ t: r.t, pages: [page], host: String(r.host).slice(0, 100), path: String(r.path).slice(0, 300), method: r.method,
    qkeys: r.qkeys, bkeys: r.bkeys, shape: r.shape });
  await chrome.storage.local.set({ intip: intip.slice(0, 400) });
  await catat("endpoint", r.method + " " + String(r.path).slice(0, 120));
}

// Kirim sesi hasil tarikan ke dashboard online (POST /api/push, Bearer = kode kirim dari Pengaturan). Server tidak menimpa koreksi admin.
async function kirimSesi(sh, otomatis) {
  const bersih = sh.slice(0, 50).map((s) => { const o = {}; for (const k of Object.keys(s)) { const v = s[k]; if (typeof v === "number" ? isFinite(v) : typeof v === "string") o[k] = typeof v === "string" ? v.slice(0, 200) : v; } return o; });
  return kirimPayload({ sh: bersih }, otomatis, bersih.length + " sesi");
}
async function kirimPayload(payload, otomatis, label) {
  const { settings } = await chrome.storage.local.get("settings");
  if (!settings || !settings.dashUrl || !settings.pushToken) return { ok: false, galat: "Alamat dashboard / kode kirim belum diisi di ⚙️ Pengaturan ekstensi." };
  const res = await fetch(settings.dashUrl.replace(/\/+$/, "") + "/api/push", { method: "POST", headers: { "content-type": "application/json", Authorization: "Bearer " + settings.pushToken }, body: JSON.stringify(payload) });
  let j = {}; try { j = await res.json(); } catch (e) {}
  if (!res.ok) return { ok: false, galat: res.status === 401 ? "Kode kirim salah. Minta kode terbaru ke Yeni." : (j.error || "HTTP " + res.status) };
  if (!otomatis && payload.sh) { const { settings: s2 } = await chrome.storage.local.get("settings"); await chrome.storage.local.set({ settings: { ...(s2 || {}), tarikOK: true } }); } // kirim manual pertama yang sukses = tanda sudah dicocokkan host
  await catat("scrape", "Terkirim ke dashboard: " + label);
  return { ok: true, diterima: j.diterima || j.off || 0, baru: j.baru || 0 };
}

// Data MENTAH Seller Centre → dashboard (pemetaan kolom di server). pratinjau=true: server memetakan & mengembalikan, tidak menyimpan.
async function kirimMentah(mentah, pratinjau, otomatis) {
  const { settings } = await chrome.storage.local.get("settings");
  if (!settings || !settings.dashUrl || !settings.pushToken) return { ok: false, galat: "Alamat dashboard / kode kirim belum diisi di ⚙️ Pengaturan ekstensi." };
  const res = await fetch(settings.dashUrl.replace(/\/+$/, "") + "/api/push", { method: "POST", headers: { "content-type": "application/json", Authorization: "Bearer " + settings.pushToken }, body: JSON.stringify({ mentah, pratinjau: !!pratinjau }) });
  let j = {}; try { j = await res.json(); } catch (e) {}
  if (!res.ok) return { ok: false, galat: res.status === 401 ? "Kode kirim salah. Minta kode terbaru ke Yeni." : (j.error || "HTTP " + res.status) };
  if (pratinjau) return j;
  if (!otomatis && mentah.sesi) { const { settings: s2 } = await chrome.storage.local.get("settings"); await chrome.storage.local.set({ settings: { ...(s2 || {}), tarikOK: true } }); }
  await catat("scrape", "Terkirim ke dashboard: " + (mentah.sesi ? (j.diterima || 0) + " sesi" : "") + (mentah.off ? (j.off || 0) + " baris kode pelacakan" : ""));
  return { ok: true, diterima: j.diterima || 0, baru: j.baru || 0, off: j.off || 0 };
}
// Resep alamat penarikan dari dashboard (disimpan ±6 jam). Gagal → pakai resep terakhir / bawaan ekstensi.
async function ambilResep() {
  const { resep, settings } = await chrome.storage.local.get(["resep", "settings"]);
  if (resep && Date.now() - (resep.at || 0) < 6 * 3600000) return resep;
  if (!settings || !settings.dashUrl || !settings.pushToken) return resep || null;
  try {
    const res = await fetch(settings.dashUrl.replace(/\/+$/, "") + "/api/resep", { headers: { Authorization: "Bearer " + settings.pushToken } });
    if (!res.ok) return resep || null;
    const r = { ...(await res.json()), at: Date.now() };
    await chrome.storage.local.set({ resep: r });
    return r;
  } catch (e) { return resep || null; }
}
