// Panel ADMIN dashboard online (Yeni + manager host, satu password admin bersama).
// Semua perubahan lewat /api/admin → tersimpan per sesi di server & tercatat di riwayat.
// Pratinjau localhost: aksi disimulasikan di localStorage supaya tampilan bisa diuji tanpa server.
(function () {
  "use strict";
  const app = window.lmApp;
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const nf = (n) => (n == null || isNaN(n) ? "—" : Number(n).toLocaleString("id-ID"));
  const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const tgl = (d) => { if (!d) return "—"; const p = d.split("-"); return +p[2] + " " + BULAN[+p[1] - 1]; };
  const durTxt = (s) => { if (s == null) return ""; const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return (h ? h + ":" + String(m).padStart(2, "0") : m) + ":" + String(x).padStart(2, "0"); };
  const parseDur = (t) => { if (!t || !String(t).trim()) return null; const p = String(t).trim().split(":").map(Number); if (p.some(isNaN)) return null; return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p.length === 2 ? p[0] * 60 + p[1] : p[0]; };
  const parseNum = (t) => { let s = String(t == null ? "" : t).replace(/[Rp%\s]/gi, ""); if (!s) return null; if (s.includes(",")) s = s.replace(/\./g, "").replace(",", "."); else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, ""); const n = Number(s); return isNaN(n) ? null : n; };
  const jam = (ms) => { const d = new Date(ms); return d.getDate() + " " + BULAN[d.getMonth()] + " " + String(d.getHours()).padStart(2, "0") + "." + String(d.getMinutes()).padStart(2, "0"); };
  let imports = [], editIg = null;

  /* ---------- kirim aksi ---------- */
  async function api(aksi, payload) {
    if (app.pratinjau) return simulasi(aksi, payload || {});
    const res = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ aksi, ...(payload || {}) }) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j.error || "HTTP " + res.status);
    await app.muat();
    return j;
  }
  function pesan(t, lama) { app.toast(t); const m = $("#adm-msg"); m.textContent = t; if (!lama) setTimeout(() => { if (m.textContent === t) m.textContent = ""; }, 5000); }

  /* ---------- pratinjau tanpa server ---------- */
  async function simulasi(aksi, b) {
    const d = JSON.parse(JSON.stringify(app.data)); d.log = d.log || []; d.peran = "admin";
    const log = (t) => d.log.unshift({ at: Date.now(), teks: t });
    if (aksi === "simpan-sh") { const r = b.rec; if (!r.start) throw new Error("Jam mulai wajib diisi (dipakai untuk menghitung klik link IG)."); const id = r.id || "s-" + r.date + "-" + r.start.replace(":", ""); d.sh = d.sh.filter((x) => x.id !== id).concat({ ...r, id }); log((r.id ? "Koreksi" : "Tambah") + " sesi Shopee " + r.date + " " + r.start); }
    else if (aksi === "hapus-sh") { d.sh = d.sh.filter((x) => x.id !== b.id); log("Hapus sesi Shopee " + b.id); }
    else if (aksi === "simpan-ig") { const id = b.rec.id || "ig_" + Date.now().toString(36); d.ig = d.ig.filter((x) => x.id !== id).concat({ ...b.rec, id }); log((b.rec.id ? "Koreksi" : "Tambah") + " live IG " + b.rec.date); }
    else if (aksi === "hapus-ig") { d.ig = d.ig.filter((x) => x.id !== b.id); log("Hapus live IG " + b.id); }
    else if (aksi === "pengaturan") { d.pengaturan = d.pengaturan || {}; if (b.hapusJev) { d.pengaturan.jevTerpasang = false; d.pengaturan.jevAkhir = ""; } if (b.jevKey) { d.pengaturan.jevTerpasang = true; d.pengaturan.jevAkhir = b.jevKey.slice(-4); d.pengaturan.jevDariWeb = true; } if (b.shopeeUrl) d.pengaturan.shopeeUrl = b.shopeeUrl; d.jevSiap = !!d.pengaturan.jevTerpasang; log("Pengaturan diubah (pratinjau: kunci tidak diuji)"); }
    else if (aksi === "uji-jev") { return { ok: true }; }
    else if (aksi === "rekomendasi") { const list = lmGabung(d.sh, d.ig), se = list.find((x) => x.id === b.id); const sg = lmFakta(se, list, (d.jev || {})[b.id]).sinyal; d.aksi = d.aksi || {}; d.aksi[b.id] = { at: Date.now(), hasil: Object.keys(LM_MASALAH).map((k, i) => ({ k, p: sg.some((x) => x.k === k) ? 0.8 - i * 0.02 : 0.1 })).sort((a, c) => c.p - a.p), fakta: b.fakta }; log("Rekomendasi aksi (pratinjau, bukan JEV asli)"); }
    else if (aksi === "hapus-rekomendasi") { if (d.aksi) delete d.aksi[b.id]; log("Hapus rekomendasi"); }
    else if (aksi === "hapus-banyak") { d.sh = d.sh.filter((x) => !(b.sh || []).includes(x.id)); d.ig = d.ig.filter((x) => !(b.ig || []).includes(x.id)); log(`Kelola data: hapus ${(b.sh || []).length} sesi Shopee, ${(b.ig || []).length} live IG`); }
    else if (aksi === "pasang") { d.ig = d.ig.map((x) => { if (x.id !== b.igId) return x; const y = { ...x }; delete y.pairId; delete y.pairBy; if (b.nilai === "tanpa") y.pairBy = "tanpa"; else if (b.nilai !== "auto") { y.pairBy = "pilih"; y.pairId = b.nilai; } return y; }); log("Pasangan live IG " + b.igId + " → " + b.nilai); }
    localStorage.setItem("lm-pratinjau", JSON.stringify(d));
    await app.muat();
    return { ok: true, id: aksi === "simpan-sh" ? (b.rec.id || "s-" + b.rec.date + "-" + b.rec.start.replace(":", "")) : undefined };
  }

  /* ---------- tampil hanya untuk admin ---------- */
  document.addEventListener("lm:data", (e) => {
    const j = e.detail, admin = j.peran === "admin";
    if (!admin) return;
    $("#adm-awal").hidden = !!((j.sh || []).length || (j.ig || []).length) || app.pratinjau;
    renderLog(j.log || []);
    if (imports.length) renderImports();
  });
  app.onAksi = (aksi, s) => {
    if (aksi === "ubah-sh") return formSh(s.sh);
    if (aksi === "tambah-sh") return formSh({ date: s.date });
    if (aksi === "hapus-sh") return api("hapus-sh", { id: s.sh.id }).then(() => pesan("Sesi Shopee dihapus."), (e) => pesan(e.message, 1));
    if (aksi === "ubah-ig") return formIg(s.ig);
    if (aksi === "tambah-ig") return formIg({ date: s.date });
    if (aksi === "hapus-ig") return api("hapus-ig", { id: s.ig.id }).then(() => pesan("Live IG dihapus."), (e) => pesan(e.message, 1));
  };
  app.onKomentar = async (aksi, sesiId, teks, msg, btn) => {
    if (aksi === "hapus") { try { await api("hapus-komentar", { id: sesiId }); pesan("Hasil pilah komentar dihapus."); } catch (e) { pesan(e.message, 1); } return; }
    const n = teks.split(/\n/).filter((l) => l.trim()).length;
    if (n < 3) { if (msg) msg.textContent = "Tempel minimal 3 komentar, satu per baris."; return; }
    if (app.pratinjau) { if (msg) msg.textContent = "JEV hanya jalan di dashboard online (butuh kunci JEV di server)."; return; }
    btn.disabled = true; if (msg) msg.innerHTML = `<span class="spin"></span> JEV sedang memilah ${Math.min(n, 200)} komentar… (bisa ±10–30 detik)`;
    try { const r = await api("pilah-komentar", { id: sesiId, teks }); pesan(`${r.terpilah} komentar dipilah.`); }
    catch (e) { if (msg) msg.textContent = e.message; btn.disabled = false; }
  };
  app.onRekomendasi = async (aksi, sesiId, fakta, msg, btn) => {
    if (aksi === "hapus") { try { await api("hapus-rekomendasi", { id: sesiId }); pesan("Hasil rekomendasi dihapus."); } catch (e) { pesan(e.message, 1); } return; }
    if (!app.data.jevSiap) { if (msg) msg.textContent = "Kunci JEV belum dipasang. Isi di ⚙️ Pengaturan."; return; }
    btn.disabled = true; if (msg) msg.innerHTML = '<span class="spin"></span> JEV sedang menilai sesi ini…';
    try { await api("rekomendasi", { id: sesiId, fakta }); pesan("Rekomendasi aksi diperbarui."); }
    catch (e) { if (msg) msg.textContent = e.message; btn.disabled = false; }
  };
  app.onPair = (igId, nilai) => api("pasang", { igId, nilai }).then(() => pesan("Pasangan disimpan."), (e) => pesan(e.message, 1));

  /* ---------- ⚙️ pengaturan (kunci JEV & link tujuan Shopee) ---------- */
  let hapusJevKonfirm = false;
  function renderSet() {
    const p = (app.data && app.data.pengaturan) || {};
    $("#set-jev-status").innerHTML = p.jevTerpasang
      ? `<span class="pill g">Kunci JEV terpasang · …${esc(p.jevAkhir)}</span>${p.jevDariWeb ? "" : ' <span class="msg">(dari pemasangan awal)</span>'}`
      : '<span class="pill w">Belum ada kunci JEV — fitur pilah komentar belum aktif</span>';
    $("#set-jev-uji").hidden = !p.jevTerpasang;
    $("#set-jev-hapus-wrap").innerHTML = !p.jevTerpasang || !p.jevDariWeb ? "" : hapusJevKonfirm
      ? '<button class="danger" id="set-jev-hapus-ok">Ya, hapus kunci</button> <button id="set-jev-hapus-batal">Batal</button>' : '<button class="danger" id="set-jev-hapus">Hapus kunci</button>';
    const inp = $("#set-shopee"); if (document.activeElement !== inp) inp.value = p.shopeeUrl || "";
    renderLink();
  }
  /* ---------- link penghitung unik per sesi + riwayatnya ---------- */
  let linkHal = 1, gantiKonfirm = false, ubahKode = null, hapusKode = null;
  function renderLink() {
    const L = (app.data && app.data.link) || null, el = $("#set-link");
    if (!L) { el.innerHTML = ""; return; }
    const tgl = (ms) => (ms ? new Date(ms).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");
    const r = L.riwayat || [], per = 10, n = Math.max(1, Math.ceil(r.length / per)); linkHal = Math.min(linkHal, n);
    const aksi = (x) => hapusKode === x.kode
      ? `<button class="danger" data-kode-hapus-ok="${esc(x.kode)}">Ya, hapus</button> <button data-kode-batal>Batal</button>`
      : `<button data-kode-ubah="${esc(x.kode)}">Ubah</button> ${x.aktif ? "" : `<button data-kode-aktif="${esc(x.kode)}">Jadikan aktif</button> `}<button class="danger" data-kode-hapus="${esc(x.kode)}">Hapus</button>`;
    const baris = r.slice((linkHal - 1) * per, linkHal * per).map((x) => ubahKode === x.kode
      ? `<tr><td><code>${esc(x.kode)}</code></td><td colspan="5"><div class="row" style="flex-wrap:wrap;gap:6px"><input id="ku-url" value="${esc(x.url)}" style="flex:1 1 260px" aria-label="Link Shopee"><input id="ku-cat" value="${esc(x.catatan || "")}" placeholder="Catatan (mis. live 18 Okt malam)" style="flex:1 1 180px" aria-label="Catatan"></div></td><td><button class="primary" data-kode-simpan="${esc(x.kode)}">Simpan</button> <button data-kode-batal>Batal</button></td></tr>`
      : `<tr><td><code>${esc(x.kode)}</code>${x.aktif ? ' <span class="pill g">aktif</span>' : ""}${x.catatan ? `<br><small class="msg">${esc(x.catatan)}</small>` : ""}</td><td style="max-width:260px;overflow-wrap:anywhere">${esc(x.kampanye || "—")}<br><small class="msg">${esc(x.url)}</small></td><td>${tgl(x.mulai)}</td><td>${x.selesai ? tgl(x.selesai) : "masih dipakai"}</td><td style="text-align:right">${x.klik}</td><td style="text-align:right">${x.klikLama || 0}</td><td style="white-space:nowrap">${aksi(x)}</td></tr>`).join("");
    el.innerHTML = (L.url
      ? `<div class="lm-link-row" style="margin-top:8px"><b>Link untuk live IG sekarang:</b> <code>${esc(L.url)}</code> <button data-copy-link="${esc(L.url)}">Salin link</button> ${gantiKonfirm ? '<button class="danger" id="set-kode-ok">Ya, ganti kode</button> <button id="set-kode-batal">Batal</button>' : '<button id="set-kode">Ganti kode (link Shopee tetap)</button>'} <span class="msg" id="set-link-msg"></span></div>`
      : `<p class="msg">Belum ada link penghitung aktif.${(app.data.pengaturan || {}).shopeeUrl ? ' <button id="set-kode-ok">Buat link penghitung</button>' : " Simpan Link tujuan Shopee di atas untuk membuat yang pertama."}</p>`)
      + (r.length ? `<h3 style="margin-top:14px">Riwayat link penghitung</h3><div class="tablebox"><table><thead><tr><th>Kode</th><th>Kampanye / link Shopee</th><th>Mulai</th><th>Diganti</th><th>Klik saat aktif</th><th>Klik setelah diganti</th><th>Aksi</th></tr></thead><tbody>${baris}</tbody></table></div>`
        + (n > 1 ? `<div class="pager">${Array.from({ length: n }, (_, i) => `<button data-link-hal="${i + 1}" ${i + 1 === linkHal ? 'class="on"' : ""}>${i + 1}</button>`).join("")}</div>` : "")
        + '<p class="msg">Klik dihitung sekali per perangkat per 10 menit. "Klik setelah diganti" = orang yang membuka link lama; mereka tetap diteruskan ke link Shopee terbaru. Hapus = kode dan hitungan kliknya hilang permanen, link itu jadi "tidak ditemukan".</p>' : "");
  }
  document.addEventListener("click", async (e) => {
    const t = e.target.closest("button"); if (!t || !$("#set-link").contains(t)) return;
    const d = t.dataset, jalan = async (aksiNama, isi, ok) => { try { await api(aksiNama, isi); await app.muat(); pesan(ok); } catch (er) { pesan(er.message, 1); } renderLink(); };
    if (d.linkHal) { linkHal = +d.linkHal; renderLink(); return; }
    if (d.copyLink) { try { await navigator.clipboard.writeText(d.copyLink); $("#set-link-msg").textContent = "Tersalin."; } catch { $("#set-link-msg").textContent = "Salin manual dari kotak di atas."; } return; }
    if (t.id === "set-kode") { gantiKonfirm = true; renderLink(); return; }
    if (t.id === "set-kode-batal") { gantiKonfirm = false; renderLink(); return; }
    if (t.id === "set-kode-ok") { gantiKonfirm = false; await jalan("kode-baru", {}, "Link penghitung baru dibuat. Ganti link di live IG."); return; }
    if ("kodeBatal" in d) { ubahKode = null; hapusKode = null; renderLink(); return; }
    if (d.kodeUbah) { ubahKode = d.kodeUbah; hapusKode = null; renderLink(); return; }
    if (d.kodeSimpan) { const url = $("#ku-url").value.trim(), catatan = $("#ku-cat").value; ubahKode = null; await jalan("kode-ubah", { kode: d.kodeSimpan, url, catatan }, "Kode " + d.kodeSimpan + " diubah."); return; }
    if (d.kodeHapus) { hapusKode = d.kodeHapus; ubahKode = null; renderLink(); return; }
    if (d.kodeHapusOk) { hapusKode = null; await jalan("kode-hapus", { kode: d.kodeHapusOk }, "Kode " + d.kodeHapusOk + " dihapus."); return; }
    if (d.kodeAktif) { await jalan("kode-aktifkan", { kode: d.kodeAktif }, "Kode " + d.kodeAktif + " aktif lagi. Link tujuan Shopee ikut diganti ke link milik kode itu."); return; }
  });
  document.addEventListener("lm:data", () => { if (!$("#adm-set").hidden) renderSet(); });
  $("#adm-set-btn").addEventListener("click", () => { const w = $("#adm-set"); w.hidden = !w.hidden; if (!w.hidden) { renderSet(); w.scrollIntoView({ behavior: "smooth", block: "start" }); } });
  $("#set-jev-simpan").addEventListener("click", async () => {
    const k = $("#set-jev").value.trim(), m = $("#set-jev-msg");
    if (!k) { m.textContent = "Tempel kuncinya dulu."; return; }
    m.innerHTML = '<span class="spin"></span> Menguji kunci ke TypeSafe…';
    try { await api("pengaturan", { jevKey: k }); $("#set-jev").value = ""; m.textContent = "Kunci diterima dan disimpan. Fitur pilah komentar aktif."; renderSet(); }
    catch (e) { m.textContent = e.message; }
  });
  $("#set-jev-uji").addEventListener("click", async () => {
    const m = $("#set-jev-msg"); m.innerHTML = '<span class="spin"></span> Menguji…';
    try { await api("uji-jev"); m.textContent = "Kunci masih diterima TypeSafe."; } catch (e) { m.textContent = e.message; }
  });
  $("#set-shopee-simpan").addEventListener("click", async () => {
    const u = $("#set-shopee").value.trim(), m = $("#set-shopee-msg");
    if (!/^https:\/\/(s\.)?shopee\.co\.id\/\S*$|^https:\/\/shope\.ee\/\S+$/.test(u)) { m.textContent = "Link harus diawali https://shopee.co.id/ , https://s.shopee.co.id/ , atau https://shope.ee/"; return; }
    try { await api("pengaturan", { shopeeUrl: u }); m.textContent = "Tersimpan. Kalau link Shopee berubah, link penghitung baru dibuat di bawah. Salin dan pasang di live IG."; await app.muat(); renderSet(); } catch (e) { m.textContent = e.message; }
  });

  /* ---------- riwayat ---------- */
  function renderLog(log) {
    $("#adm-log").innerHTML = log.length ? log.map((l) => `<li><time>${jam(l.at)}</time><span>${esc(l.teks)}</span></li>`).join("") : '<li class="msg">Belum ada perubahan.</li>';
  }

  /* ---------- form Shopee ---------- */
  const SH_F = [["penonton", "Penonton"], ["ditonton", "Ditonton"], ["aktif", "Penonton aktif"], ["puncak", "Penonton terbanyak"], ["avg", "Rata-rata menonton (m:dd)", "dur"],
    ["klik", "Klik produk"], ["ctr", "Persentase klik (%)"], ["atc", "Tambah ke keranjang"], ["pesanan", "Pesanan"], ["pembeli", "Pembeli"], ["produk", "Produk terjual"],
    ["jual", "Penjualan (Rp)"], ["follow", "Pengikut baru"], ["suka", "Suka"], ["bagi", "Dibagikan"], ["komen", "Komentar"]];
  const f = (id, l, val, type) => `<label>${l}<input id="${id}" type="${type || "text"}" ${type ? "" : 'inputmode="decimal"'} value="${esc(val == null ? "" : val)}"></label>`;
  function bukaForm(judul, html) {
    app.keAdmin();
    $("#adm-form-title").textContent = judul; $("#adm-form").innerHTML = html;
    $("#adm-form-wrap").hidden = false; $("#adm-form-wrap").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function formSh(s) {
    s = s || {}; const src = s.sumber || {};
    $("#adm-form").dataset.jenis = "sh"; $("#adm-form").dataset.id = s.id || "";
    bukaForm(s.id ? "Ubah sesi Shopee " + tgl(s.date) + " " + (s.start || "") : "Sesi Shopee baru",
      `<p class="msg">Salin dari Seller Centre → Live Streaming → sesi → <b>Tinjauan Data</b>, dan dari dashboard live (kotak oranye) untuk asal penonton. Koreksi di sini selalu menang atas data tarikan ekstensi.</p>
      <div class="fgrid-set">${f("f-date", "Tanggal", s.date || new Date().toISOString().slice(0, 10), "date")}${f("f-start", "Jam mulai", s.start || "", "time")}${f("f-dur", "Durasi (j:mm:dd)", durTxt(s.dur))}
      <label class="span2">Judul live<input id="f-title" type="text" value="${esc(s.title || "")}"></label></div>
      <h3 class="fh">Tinjauan Data</h3><div class="fgrid-set">${SH_F.map(([k, l, t]) => f("f-" + k, l, t === "dur" ? durTxt(s[k]) : s[k])).join("")}</div>
      <h3 class="fh">Sumber Menonton Livestream (%)</h3><div class="fgrid-set">${LM_SUMBER.map((k, i) => f("f-src-" + i, k, src[k])).join("")}</div>
      <h3 class="fh">Produk terjual <small class="msg">Tinjauan Data → Penjualan → Lihat Rincian</small></h3>
      <div class="items-ed" id="f-items"><div class="it-row it-head"><span>Produk</span><span>Etalase</span><span>Terjual</span><span>Penjualan (Rp)</span><span></span></div>
        ${(s.items || []).map(itemRow).join("")}</div>
      <datalist id="dl-etalase">${daftarEtalase().map((e) => `<option value="${esc(e)}">`).join("")}</datalist>
      <datalist id="dl-produk">${daftarProduk().map((e) => `<option value="${esc(e)}">`).join("")}</datalist>
      <button type="button" data-it-add="1" style="margin-top:6px">+ Tambah produk</button>
      <div class="actions" style="margin:12px 0 0"><button class="primary" type="submit">Simpan</button><button type="button" data-tutup="1">Tutup</button><span class="msg" id="f-msg"></span></div>`);
  }
  function itemRow(x) {
    x = x || {};
    return `<div class="it-row"><input class="it-nama" list="dl-produk" placeholder="Nama produk" value="${esc(x.nama || "")}"><input class="it-et" list="dl-etalase" placeholder="Etalase" value="${esc(x.etalase || "")}">
      <input class="it-qty" inputmode="numeric" placeholder="pcs" value="${esc(x.qty == null ? "" : x.qty)}"><input class="it-jual" inputmode="decimal" placeholder="Rp" value="${esc(x.jual == null ? "" : x.jual)}">
      <button type="button" data-it-del="1" aria-label="Hapus baris produk">×</button></div>`;
  }
  // Saran isian dari produk & etalase yang pernah diisi (supaya penulisan nama seragam antar sesi).
  function daftarProduk() { return [...new Set((app.data.sh || []).flatMap((s) => (s.items || []).map((x) => x.nama)).filter(Boolean))].sort(); }
  function daftarEtalase() { return [...new Set((app.data.sh || []).flatMap((s) => (s.items || []).map((x) => x.etalase)).filter(Boolean))].sort(); }
  function bacaItems() {
    return [...document.querySelectorAll("#f-items .it-row:not(.it-head)")].map((r) => ({ nama: r.querySelector(".it-nama").value.trim(), etalase: r.querySelector(".it-et").value.trim(),
      qty: parseNum(r.querySelector(".it-qty").value), jual: parseNum(r.querySelector(".it-jual").value) })).filter((x) => x.nama).map((x) => { for (const k in x) if (x[k] == null) delete x[k]; return x; });
  }

  function formIg(g) {
    g = g || {};
    $("#adm-form").dataset.jenis = "ig"; $("#adm-form").dataset.id = g.id || "";
    bukaForm(g.id ? "Ubah live Instagram " + tgl(g.date) : "Live Instagram (isi manual)",
      `<p class="msg">Dari Instagram → live yang sudah selesai → Insights. Lebih cepat: pakai tombol <b>📸 Impor screenshot IG</b>.</p>
      <div class="fgrid-set">${f("f-date", "Tanggal", g.date || "", "date")}${f("f-dur", "Durasi (j:mm:dd)", durTxt(g.dur))}<label class="span2">Judul live<input id="f-title" type="text" value="${esc(g.title || "")}"></label>
      ${f("f-viewers", "Penonton (Viewers)", g.viewers)}${f("f-puncak", "Puncak (Peak concurrent)", g.puncak)}${f("f-komen", "Komentar", g.komen)}${f("f-share", "Share", g.share)}${f("f-engaged", "Akun berinteraksi", g.engaged)}</div>
      <div class="actions" style="margin:12px 0 0"><button class="primary" type="submit">Simpan</button><button type="button" data-tutup="1">Tutup</button><span class="msg" id="f-msg"></span></div>`);
    editIg = g;
  }
  async function simpanForm(e) {
    e.preventDefault();
    const form = $("#adm-form"), v = (id) => { const el = document.getElementById(id); return el ? el.value : ""; }, msg = $("#f-msg");
    const date = v("f-date"); if (!date) { msg.textContent = "Isi tanggal dulu."; return; }
    try {
      msg.textContent = "Menyimpan…";
      if (form.dataset.jenis === "sh") {
        const rec = { id: form.dataset.id || undefined, date, start: v("f-start"), title: v("f-title").trim(), dur: parseDur(v("f-dur")) };
        for (const [k, , t] of SH_F) { const x = t === "dur" ? parseDur(v("f-" + k)) : parseNum(v("f-" + k)); if (x != null) rec[k] = x; }
        const src = {}; LM_SUMBER.forEach((k, i) => { const x = parseNum(v("f-src-" + i)); if (x != null) src[k] = x; }); if (Object.keys(src).length) rec.sumber = src;
        rec.items = bacaItems();
        for (const k in rec) if (rec[k] == null) delete rec[k];
        const r = await api("simpan-sh", { rec }); if (r && r.id) app.dash.pilih(r.id);
      } else {
        const rec = { ...(editIg || {}), date, title: v("f-title").trim(), dur: parseDur(v("f-dur")), viewers: parseNum(v("f-viewers")), puncak: parseNum(v("f-puncak")), komen: parseNum(v("f-komen")), share: parseNum(v("f-share")), engaged: parseNum(v("f-engaged")), source: editIg && editIg.source || "manual" };
        for (const k in rec) if (rec[k] == null) delete rec[k];
        await api("simpan-ig", { rec });
      }
      $("#adm-form-wrap").hidden = true; pesan("Tersimpan.");
    } catch (err) { msg.textContent = err.message; }
  }

  /* ---------- kelola data (hapus banyak sekaligus) ---------- */
  const kl = { jenis: "sh", cari: "", page: 1, pilih: new Set(), konfirm: false };
  function klBaris() {
    const q = kl.cari.trim().toLowerCase();
    const cocok = (r) => !q || [r.date, tgl(r.date), r.title, r.start].filter(Boolean).join(" ").toLowerCase().includes(q);
    const arr = (kl.jenis === "sh" ? app.data.sh || [] : app.data.ig || []).filter(cocok);
    return arr.slice().sort((a, b) => (b.date + (b.start || "")).localeCompare(a.date + (a.start || "")));
  }
  function renderKelola() {
    if ($("#adm-kelola").hidden) return;
    $("#kl-jenis").innerHTML = [["sh", "Sesi Shopee"], ["ig", "Live Instagram"]].map(([k, l]) => `<button class="chip" data-kl-jenis="${k}" aria-pressed="${kl.jenis === k}">${l} (${(app.data[k] || []).length})</button>`).join("");
    const rows = klBaris(), n = Math.max(1, Math.ceil(rows.length / 10)); if (kl.page > n) kl.page = n;
    const ada = new Set(rows.map((r) => r.id)); for (const id of [...kl.pilih]) if (!ada.has(id)) kl.pilih.delete(id);
    const jml = kl.pilih.size;
    $("#kl-aksi").innerHTML = !jml ? '<span class="msg">Centang data yang mau dihapus.</span>' : kl.konfirm
      ? `<button class="danger" data-kl-ok="1">Ya, hapus ${jml} data</button> <button data-kl-batal="1">Batal</button>` : `<button class="danger" data-kl-hapus="1">Hapus terpilih (${jml})</button>`;
    const hal = rows.slice((kl.page - 1) * 10, kl.page * 10);
    const semua = hal.length && hal.every((r) => kl.pilih.has(r.id));
    const head = kl.jenis === "sh"
      ? `<tr><th class="cek"><input type="checkbox" data-kl-semua="1" ${semua ? "checked" : ""} aria-label="Pilih semua di halaman ini"></th><th>Tanggal</th><th>Judul</th><th class="num">Penonton</th><th class="num">Pesanan</th><th class="num">Penjualan</th><th class="num">Produk</th><th>Sumber</th><th></th></tr>`
      : `<tr><th class="cek"><input type="checkbox" data-kl-semua="1" ${semua ? "checked" : ""} aria-label="Pilih semua di halaman ini"></th><th>Tanggal</th><th>Judul</th><th class="num">Durasi</th><th class="num">Penonton</th><th class="num">Puncak</th><th>Pasangan</th><th></th></tr>`;
    const SUMBER_TX = { manual: "Diisi admin", auto: "Ekstensi", "auto+koreksi": "Ekstensi + koreksi" };
    const body = hal.map((r) => kl.jenis === "sh"
      ? `<tr><td class="cek"><input type="checkbox" data-kl-id="${esc(r.id)}" ${kl.pilih.has(r.id) ? "checked" : ""} aria-label="Pilih"></td><td>${tgl(r.date)}<small>${esc(r.start || "jam ?")}</small></td><td>${esc(r.title || "—")}</td><td class="num">${nf(r.penonton)}</td><td class="num">${nf(r.pesanan)}</td><td class="num">${r.jual == null ? "—" : "Rp" + nf(r.jual)}</td><td class="num">${nf((r.items || []).length || null)}</td><td><span class="pill n">${SUMBER_TX[r.by] || "Diisi admin"}</span></td><td><button data-kl-ubah="${esc(r.id)}">Ubah</button></td></tr>`
      : `<tr><td class="cek"><input type="checkbox" data-kl-id="${esc(r.id)}" ${kl.pilih.has(r.id) ? "checked" : ""} aria-label="Pilih"></td><td>${tgl(r.date)}</td><td>${esc(r.title || "—")}</td><td class="num">${durTxt(r.dur) || "—"}</td><td class="num">${nf(r.viewers)}</td><td class="num">${nf(r.puncak)}</td><td>${r.pairBy === "tanpa" ? '<span class="pill n">Tidak di-mirror</span>' : r.pairBy === "pilih" ? '<span class="pill g">Dipilih manual</span>' : '<span class="pill n">Otomatis</span>'}</td><td><button data-kl-ubah="${esc(r.id)}">Ubah</button></td></tr>`).join("");
    $("#kl-tbl").innerHTML = `<thead>${head}</thead><tbody>${body || `<tr><td colspan="9" class="empty">${kl.cari ? "Tidak ada yang cocok." : "Belum ada data."}</td></tr>`}</tbody>`;
    $("#kl-pager").innerHTML = n > 1 ? `<button data-kl-hal="${kl.page - 1}" ${kl.page <= 1 ? "disabled" : ""}>‹ Sebelumnya</button><span>Halaman ${kl.page} dari ${n} · ${rows.length} data</span><button data-kl-hal="${kl.page + 1}" ${kl.page >= n ? "disabled" : ""}>Berikutnya ›</button>` : "";
  }
  $("#adm-kelola-btn").addEventListener("click", () => { const w = $("#adm-kelola"); w.hidden = !w.hidden; renderKelola(); if (!w.hidden) w.scrollIntoView({ behavior: "smooth", block: "start" }); });
  $("#kl-cari").addEventListener("input", (e) => { kl.cari = e.target.value; kl.page = 1; kl.konfirm = false; renderKelola(); });
  document.addEventListener("lm:data", renderKelola);

  /* ---------- impor screenshot IG / Shopee (Tesseract lokal, dimuat saat pertama dipakai, jenis dikenali otomatis) ---------- */
  let tessSiap = null;
  function muatTesseract() {
    if (tessSiap) return tessSiap;
    tessSiap = new Promise((ok, gagal) => {
      const a = document.createElement("script"); a.src = "vendor/tesseract.min.js";
      a.onload = () => { const b = document.createElement("script"); b.src = "ocr.js"; b.onload = ok; b.onerror = () => gagal(new Error("ocr.js gagal dimuat")); document.head.appendChild(b); };
      a.onerror = () => gagal(new Error("Tesseract gagal dimuat")); document.head.appendChild(a);
    });
    return tessSiap;
  }
  const FIELDS = [["date", "Tanggal", "date"], ["dur", "Durasi (j:mm:dd)", "dur"], ["viewers", "Penonton (Viewers)"], ["puncak", "Puncak (Peak concurrent)"], ["komen", "Komentar"], ["share", "Share"], ["engaged", "Akun berinteraksi"]];
  function pairPilihan(i, d) {
    const sh = app.data.sh || [], ig = app.data.ig || [];
    const kand = sh.filter((s) => s.date === d.date);
    if (!d.date || !kand.length) return `<span class="msg">Belum ada sesi Shopee di tanggal ini. Live IG akan dipasangkan otomatis begitu data Shopee tanggal itu masuk.</span>`;
    const terpakai = new Set(lmGabung(sh, ig).filter((g) => g.sh && g.ig).map((g) => g.sh.id));
    const r = lmPairIg(d, sh.filter((s) => !terpakai.has(s.id)));
    const opt = (v, l, s2) => `<option value="${esc(v)}" ${s2 ? "selected" : ""}>${esc(l)}</option>`;
    const teb = kand.find((s) => s.id === r.id);
    const awal = r.status === "pilih" ? opt("", "Pilih sesi (tidak bisa ditebak otomatis)…", true)
      : teb ? opt("auto", "Otomatis: sesi " + (teb.start || "jam ?") + (r.status === "ragu" ? " (durasi jauh beda, perlu dicek)" : ""), true)
      : opt("auto", "Otomatis: semua sesi tanggal ini sudah berpasangan", true);
    return `<label class="pair-sel">Pasangan sesi Shopee<select id="imp-${i}-pair">${awal}${kand.map((s) => opt(s.id, (s.start || "jam ?") + " · durasi " + (durTxt(s.dur) || "?") + " · " + nf(s.penonton) + " penonton", false)).join("")}${opt("tanpa", "Tidak di-mirror ke Shopee", false)}</select></label>`;
  }
  // Simpan ketikan yang sedang berjalan ke it.data sebelum menggambar ulang (supaya koreksi tidak hilang).
  function simpanKetikan() {
    imports.forEach((it, i) => {
      if (it.state !== "ok") return;
      const g = (k) => document.getElementById("imp-" + i + "-" + k);
      if (!g("date")) return;
      if (it.jenis === "shopee") { for (const [k, , t] of SH_KARTU) { const el = g(k); if (el) it.data[k] = t === "dur" ? parseDur(el.value) : (t === "date" || t === "time") ? el.value : parseNum(el.value); } return; }
      it.data.title = g("title").value; it.data.date = g("date").value;
      it.data.dur = parseDur(g("dur").value);
      for (const k of ["viewers", "puncak", "komen", "share", "engaged"]) it.data[k] = parseNum(g(k).value);
      const p = g("pair"); if (p) it.pair = p.value;
    });
  }
  function renderImports() {
    simpanKetikan();
    $("#adm-imports").innerHTML = imports.map((it, i) => {
      if (it.state === "reading") return `<div class="imp"><img src="${it.url}" alt="Screenshot"><div class="msg"><span class="spin"></span> Membaca screenshot…${i === 0 ? " Pertama kali butuh beberapa detik untuk menyiapkan mesin baca." : ""}</div></div>`;
      if (it.state === "error") return `<div class="imp"><img src="${it.url}" alt="Screenshot"><div><div class="alert warn">${esc(it.err)}</div><button data-imp-drop="${i}">Buang</button></div></div>`;
      if (it.jenis === "shopee") return kartuShopee(it, i);
      const d = it.data, kurang = new Set(d.kurang || []);
      const inputs = FIELDS.map(([k, l, t]) => `<label class="${kurang.has(k) ? "miss" : ""}">${l}<input id="imp-${i}-${k}" type="${t === "date" ? "date" : "text"}" ${t ? "" : 'inputmode="numeric"'} value="${esc(t === "dur" ? durTxt(d[k]) : d[k] == null ? "" : d[k])}"></label>`).join("");
      const dup = (app.data.ig || []).find((x) => x.date === d.date && x.dur === d.dur && d.dur != null);
      return `<div class="imp"><img src="${it.url}" alt="Screenshot"><div><div class="fields"><span class="jenis"><span class="pill ig">📸 Instagram · Insights live</span></span><label class="title">Judul live<input id="imp-${i}-title" type="text" value="${esc(d.title)}"></label>${inputs}</div>
        <div class="row" id="imp-${i}-pairwrap">${pairPilihan(i, d)}</div>
        <div class="row"><button class="primary" data-imp-save="${i}">Simpan</button><button data-imp-drop="${i}">Buang</button>
        <span class="msg" id="imp-${i}-msg" data-pair="${esc(it.pair || "")}">${kurang.size ? `<span class="pill w">${kurang.size} kolom belum terbaca</span> isi manual kolom yang berwarna kuning.` : '<span class="pill g">Semua kolom terbaca</span> cek sekilas lalu simpan.'}${dup ? ' <span class="pill w">Live ini sepertinya sudah tersimpan</span>' : ""}</span></div></div></div>`;
    }).join("");
    imports.forEach((it, i) => { const p = document.getElementById("imp-" + i + "-pair"); if (p && it.pair != null && [...p.options].some((o) => o.value === it.pair)) p.value = it.pair; });
  }
  // Kartu screenshot Tinjauan Data Shopee: angka terbaca + kolom manual (asal penonton tidak terbaca dari screenshot).
  const SH_KARTU = [["date", "Tanggal", "date"], ["start", "Jam mulai", "time"], ["dur", "Durasi (j:mm:dd)", "dur"], ["penonton", "Penonton"], ["aktif", "Penonton aktif"], ["ditonton", "Ditonton"],
    ["puncak", "Penonton terbanyak"], ["avg", "Rata-rata menonton (m:dd)", "dur"], ["klik", "Klik produk"], ["ctr", "Persentase klik (%)"], ["atc", "Tambah ke keranjang"],
    ["pesanan", "Pesanan"], ["pembeli", "Pembeli"], ["produk", "Produk terjual"], ["jual", "Penjualan (Rp)"], ["follow", "Pengikut baru"], ["suka", "Suka"], ["bagi", "Dibagikan"], ["komen", "Komentar"]];
  function kartuShopee(it, i) {
    const d = it.data, kurang = new Set(d.kurang || []), ragu = new Set(d.ragu || []);
    const inp = SH_KARTU.map(([k, l, t]) => `<label class="${kurang.has(k) || ragu.has(k) ? "miss" : ""}">${l}${ragu.has(k) ? " · cek" : ""}<input id="imp-${i}-${k}" type="${t === "date" ? "date" : t === "time" ? "time" : "text"}" ${t ? "" : 'inputmode="decimal"'} value="${esc(t === "dur" ? durTxt(d[k]) : d[k] == null ? "" : d[k])}"></label>`).join("");
    const ada = (app.data.sh || []).find((s) => d.date && d.start && s.date === d.date && s.start === d.start);
    const n = new Set([...kurang, ...ragu].filter((k) => SH_KARTU.some(([x]) => x === k))).size;
    return `<div class="imp"><img src="${it.url}" alt="Screenshot"><div><div class="fields"><span class="jenis"><span class="pill sh">🛒 Shopee · Tinjauan Data</span></span>${inp}</div>
      <p class="note">Asal penonton (Beranda, Lainnya, dll.) dan rincian produk tidak terbaca dari screenshot ini — isi lewat ✏️ Ubah Shopee setelah disimpan.</p>
      <div class="row"><button class="primary" data-imp-save="${i}">${ada ? "Perbarui sesi " + esc(d.start) : "Simpan sesi Shopee"}</button><button data-imp-drop="${i}">Buang</button>
      <span class="msg" id="imp-${i}-msg">${n ? `<span class="pill w">${n} kolom perlu diisi/dicek</span> kolom kuning.` : '<span class="pill g">Semua kolom terbaca</span> cek sekilas lalu simpan.'}${ada ? ' <span class="pill w">Sesi tanggal & jam ini sudah ada — angka akan memperbarui</span>' : ""}</span></div></div></div>`;
  }
  async function saveShopee(i) {
    const it = imports[i], g = (k) => { const el = document.getElementById("imp-" + i + "-" + k); return el ? el.value : ""; }, msg = document.getElementById("imp-" + i + "-msg");
    const rec = { date: g("date"), start: g("start") };
    if (!rec.date || !rec.start) { msg.innerHTML = '<span class="pill w">Tanggal dan jam mulai wajib diisi (lihat "Waktu Mulai" di atas Tinjauan Data).</span>'; return; }
    for (const [k, , t] of SH_KARTU) { if (k === "date" || k === "start") continue; const x = t === "dur" ? parseDur(g(k)) : parseNum(g(k)); if (x != null) rec[k] = x; }
    const ada = (app.data.sh || []).find((s) => s.date === rec.date && s.start === rec.start);
    if (ada) { rec.id = ada.id; for (const k of ["title", "sumber", "items"]) if (ada[k] != null) rec[k] = ada[k]; }
    msg.textContent = "Menyimpan…";
    try { const r = await api("simpan-sh", { rec }); URL.revokeObjectURL(it.url); imports.splice(i, 1); renderImports(); pesan("Sesi Shopee tersimpan."); if (r && r.id) app.dash.pilih(r.id); }
    catch (e) { msg.innerHTML = `<span class="pill w">${esc(e.message)}</span>`; }
  }
  async function handleFiles(files) {
    const list = Array.from(files).filter((x) => /^image\//.test(x.type));
    if (!list.length) return;
    const start = imports.length;
    list.forEach((x) => imports.push({ state: "reading", url: URL.createObjectURL(x), file: x }));
    renderImports();
    try { await muatTesseract(); } catch (e) { imports.slice(start).forEach((it) => { it.state = "error"; it.err = e.message; }); renderImports(); return; }
    for (let i = start; i < imports.length; i++) {
      const it = imports[i];
      try {
        const r = await bacaGambar(it.file);
        if (!r.jenis) { it.state = "error"; it.err = "Jenis screenshot tidak dikenali. Yang bisa dibaca: Insights live Instagram, atau Tinjauan Data sesi live Shopee (Seller Centre)."; }
        else { it.jenis = r.jenis; it.data = r.data; it.state = "ok"; if (r.jenis === "ig" && r.data.kurang.length === 7) { it.state = "error"; it.err = "Tidak ada angka Insights yang terbaca. Pastikan ini screenshot halaman Insights live Instagram."; } }
      }
      catch (e) { it.state = "error"; it.err = "Mesin baca gagal jalan: " + String((e && e.message) || e).slice(0, 160); }
      renderImports();
    }
  }
  async function saveImport(i) {
    const it = imports[i], g = (k) => { const el = document.getElementById("imp-" + i + "-" + k); return el ? el.value : ""; }, msg = document.getElementById("imp-" + i + "-msg");
    const rec = { date: g("date"), title: g("title").trim(), dur: parseDur(g("dur")), viewers: parseNum(g("viewers")), puncak: parseNum(g("puncak")), komen: parseNum(g("komen")), share: parseNum(g("share")), engaged: parseNum(g("engaged")), importedAt: Date.now(), source: "screenshot" };
    if (!rec.date) { msg.innerHTML = '<span class="pill w">Isi tanggal dulu.</span>'; return; }
    const pv = g("pair");
    if (document.getElementById("imp-" + i + "-pair") && pv === "") { msg.innerHTML = '<span class="pill w">Pilih sesi Shopee pasangannya dulu.</span>'; return; }
    if (pv === "tanpa") rec.pairBy = "tanpa"; else if (pv && pv !== "auto") { rec.pairBy = "pilih"; rec.pairId = pv; }
    for (const k in rec) if (rec[k] == null) delete rec[k];
    msg.textContent = "Menyimpan…";
    try { await api("simpan-ig", { rec }); URL.revokeObjectURL(it.url); imports.splice(i, 1); renderImports(); pesan("Live IG tersimpan."); }
    catch (e) { msg.innerHTML = `<span class="pill w">${esc(e.message)}</span>`; }
  }

  const drop = $("#adm-drop"), file = $("#adm-file");
  $("#adm-ig").addEventListener("click", () => { drop.hidden = false; file.click(); });
  drop.addEventListener("click", () => file.click());
  drop.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); file.click(); } });
  drop.addEventListener("dragover", (e) => { e.preventDefault(); drop.classList.add("over"); });
  drop.addEventListener("dragleave", () => drop.classList.remove("over"));
  drop.addEventListener("drop", (e) => { e.preventDefault(); drop.classList.remove("over"); handleFiles(e.dataTransfer.files); });
  file.addEventListener("change", () => { handleFiles(file.files); file.value = ""; });
  document.addEventListener("paste", (e) => { if ($("#admin").hidden) return; const fs = Array.from(e.clipboardData ? e.clipboardData.files : []); if (fs.length) { drop.hidden = false; handleFiles(fs); } });
  $("#adm-sh").addEventListener("click", () => formSh(null));
  $("#adm-log-btn").addEventListener("click", () => { const w = $("#adm-log-wrap"); w.hidden = !w.hidden; });
  $("#adm-petunjuk-btn").addEventListener("click", () => { const w = $("#adm-petunjuk"); w.hidden = !w.hidden; if (!w.hidden) w.scrollIntoView({ behavior: "smooth", block: "start" }); });
  $("#adm-awal").addEventListener("click", () => api("data-awal").then(() => pesan("Data awal 6–7 Okt dimuat."), (e) => pesan(e.message, 1)));
  $("#adm-form").addEventListener("submit", simpanForm);
  document.addEventListener("change", (e) => {
    const m = e.target.id && e.target.id.match(/^imp-(\d+)-date$/);
    if (m && imports[+m[1]] && imports[+m[1]].data && imports[+m[1]].jenis !== "shopee") {
      const i = +m[1], d = { ...imports[i].data, date: e.target.value, dur: parseDur(document.getElementById("imp-" + i + "-dur").value) };
      document.getElementById("imp-" + i + "-pairwrap").innerHTML = pairPilihan(i, d);
    }
  });
  document.addEventListener("click", (e) => {
    const t = e.target;
    if (t.closest("[data-tutup]")) { $("#adm-form-wrap").hidden = true; if (app.tabSebelum) app.kembali(); return; }
    if (t.id === "set-jev-hapus") { hapusJevKonfirm = true; renderSet(); return; }
    if (t.id === "set-jev-hapus-batal") { hapusJevKonfirm = false; renderSet(); return; }
    if (t.id === "set-jev-hapus-ok") { hapusJevKonfirm = false; api("pengaturan", { hapusJev: true }).then(() => { $("#set-jev-msg").textContent = "Kunci JEV dihapus."; renderSet(); }, (e) => { $("#set-jev-msg").textContent = e.message; }); return; }
    if (t.closest("[data-it-add]")) { $("#f-items").insertAdjacentHTML("beforeend", itemRow()); $("#f-items .it-row:last-child .it-nama").focus(); return; }
    if (t.closest("[data-it-del]")) { t.closest(".it-row").remove(); return; }
    const kj = t.closest("[data-kl-jenis]"); if (kj) { kl.jenis = kj.dataset.klJenis; kl.page = 1; kl.pilih.clear(); kl.konfirm = false; renderKelola(); return; }
    const kh = t.closest("[data-kl-hal]"); if (kh) { kl.page = +kh.dataset.klHal; renderKelola(); return; }
    if (t.matches("[data-kl-id]")) { t.checked ? kl.pilih.add(t.dataset.klId) : kl.pilih.delete(t.dataset.klId); kl.konfirm = false; renderKelola(); return; }
    if (t.matches("[data-kl-semua]")) { const hal = klBaris().slice((kl.page - 1) * 10, kl.page * 10); hal.forEach((r) => (t.checked ? kl.pilih.add(r.id) : kl.pilih.delete(r.id))); kl.konfirm = false; renderKelola(); return; }
    if (t.closest("[data-kl-hapus]")) { kl.konfirm = true; renderKelola(); return; }
    if (t.closest("[data-kl-batal]")) { kl.konfirm = false; renderKelola(); return; }
    if (t.closest("[data-kl-ok]")) {
      const ids = [...kl.pilih], body = kl.jenis === "sh" ? { sh: ids, ig: [] } : { sh: [], ig: ids };
      kl.konfirm = false; kl.pilih.clear();
      api("hapus-banyak", body).then(() => pesan(`${ids.length} data dihapus.`), (e) => pesan(e.message, 1)); return;
    }
    const ku = t.closest("[data-kl-ubah]"); if (ku) { const id = ku.dataset.klUbah; if (kl.jenis === "sh") formSh((app.data.sh || []).find((x) => x.id === id)); else formIg((app.data.ig || []).find((x) => x.id === id)); return; }
    const sv = t.closest("[data-imp-save]"); if (sv) { const i = +sv.dataset.impSave; (imports[i] && imports[i].jenis === "shopee" ? saveShopee : saveImport)(i); return; }
    const dr = t.closest("[data-imp-drop]"); if (dr) { const i = +dr.dataset.impDrop; URL.revokeObjectURL(imports[i].url); imports.splice(i, 1); renderImports(); }
  });
})();
