// Dashboard online browie Live Mirroring. TAMU = langsung lihat tanpa password; ADMIN (Yeni + host) = "Masuk admin" → admin.js.
// Di localhost tanpa server fungsi: pakai contoh-data.json (pratinjau saja, tidak ikut deploy).
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const app = { tabSebelum: null, dash: null, data: null, peran: null, pratinjau: false, onAksi: null, onPair: null };
  window.lmApp = app;

  const sel = $("theme-sel");
  try { sel.value = localStorage.getItem("lm-theme") || "auto"; } catch (e) {}
  sel.addEventListener("change", () => {
    try { localStorage.setItem("lm-theme", sel.value); } catch (e) {}
    if (sel.value === "auto") document.documentElement.removeAttribute("data-theme"); else document.documentElement.setAttribute("data-theme", sel.value);
  });

  // Panel admin hanya tampil di tab "🛠 Admin". Pindah ke tab lain → panel disembunyikan.
  app.tampilTab = (k) => { const adm = $("admin"); if (adm) adm.hidden = !(app.peran === "admin" && k === "admin"); if (k !== "admin") { app.tabSebelum = null; } const b = $("adm-kembali"); if (b) b.hidden = !app.tabSebelum; };
  // Dipanggil dari tombol ✏️ / form: buka tab Admin dan ingat asalnya supaya bisa kembali.
  app.keAdmin = () => { if (!app.dash || app.dash.getTab() === "admin") return; const asal = app.dash.getTab(); app.dash.setTab("admin"); app.tabSebelum = asal; const b = $("adm-kembali"); if (b) b.hidden = false; };
  app.kembali = () => { const k = app.tabSebelum || "sesi"; app.tabSebelum = null; if (app.dash) app.dash.setTab(k); };
  app.toast = (t) => { const e = $("toast"); if (!e) return; e.textContent = t; e.hidden = false; clearTimeout(app._tt); app._tt = setTimeout(() => { e.hidden = true; }, 4500); };
  $("adm-kembali").addEventListener("click", () => app.kembali());

  function ago(ms) {
    const m = Math.round((Date.now() - ms) / 60000);
    if (m < 1) return "baru saja"; if (m < 60) return m + " menit lalu"; const h = Math.round(m / 60); if (h < 24) return h + " jam lalu"; return Math.round(h / 24) + " hari lalu";
  }
  function tampil(j) {
    $("login-view").hidden = true; $("app").hidden = false;
    app.data = j; app.peran = j.peran;
    const admin = j.peran === "admin";
    $("peran").innerHTML = admin ? '<span class="pill sh">Admin</span>' : "";
    $("btn-login").hidden = admin; $("btn-logout").hidden = !admin;
    const kosong = !(j.sh || []).length && !(j.ig || []).length;
    $("fresh").textContent = kosong ? "Belum ada data" : (j.sh || []).length + " sesi Shopee · " + (j.ig || []).length + " live IG";
    $("alert").hidden = !kosong;
    if (kosong) $("alert").textContent = admin ? "Belum ada data. Impor screenshot, tambah sesi Shopee, atau muat data awal 6–7 Okt." : "Belum ada data. Admin belum mengisi sesi.";
    const payload = { sh: j.sh || [], ig: j.ig || [], jev: j.jev || {}, aksi: j.aksi || {}, jevSiap: j.jevSiap, klik: j.klik || {}, off: j.off || [], linkUrl: j.linkUrl };
    // Peran berubah (tamu → admin) = pasang ulang supaya tombol admin muncul.
    if (app.dash && app.dashPeran !== j.peran) { app.dash = null; $("lm").replaceWith(Object.assign(document.createElement("div"), { id: "lm" })); }
    if (!app.dash) {
      app.dashPeran = j.peran;
      app.dash = lmMount($("lm"), payload, admin ? { onAksi: (a, s) => app.onAksi && app.onAksi(a, s), onPair: (i, v) => app.onPair && app.onPair(i, v), onKomentar: (...x) => app.onKomentar && app.onKomentar(...x), onRekomendasi: (...x) => app.onRekomendasi && app.onRekomendasi(...x), onTab: (k) => app.tampilTab(k) } : {});
    } else app.dash.update(payload);
    document.dispatchEvent(new CustomEvent("lm:data", { detail: j }));
  }
  app.muat = async function muat() {
    try {
      const res = await fetch("/api/data", { cache: "no-store" });
      if (res.ok) return tampil(await res.json());
      throw new Error("HTTP " + res.status);
    } catch (e) {
      if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
        app.pratinjau = true;
        let c = null; try { c = JSON.parse(localStorage.getItem("lm-pratinjau")); } catch (er) {}
        if (!c) c = await fetch("contoh-data.json", { cache: "no-store" }).then((r) => r.json());
        if (location.hash === "#tamu") c = { ...c, peran: "tamu", log: undefined }; // pratinjau tampilan tamu
        return tampil(c);
      }
      $("app").hidden = false; $("alert").hidden = false; $("alert").textContent = "Dashboard gagal memuat data (" + e.message + "). Coba muat ulang halaman beberapa saat lagi.";
    }
  };
  $("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = $("login-btn"), msg = $("login-msg");
    btn.disabled = true; msg.textContent = "";
    try {
      const res = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: $("login-pass").value }) });
      if (!res.ok) { msg.textContent = (await res.json().catch(() => ({}))).error || "Gagal masuk"; return; }
      $("login-pass").value = ""; await app.muat();
    } catch (err) { msg.textContent = "Gagal masuk: " + err.message; } finally { btn.disabled = false; }
  });
  $("btn-login").onclick = () => { $("login-view").hidden = false; $("login-msg").textContent = ""; setTimeout(() => $("login-pass").focus(), 50); };
  $("login-batal").onclick = () => { $("login-view").hidden = true; };
  $("btn-logout").onclick = async () => { await fetch("/api/logout"); location.reload(); };
  // Segarkan tiap 5 menit selama tab terlihat (admin yang sedang mengisi form tidak diganggu).
  setInterval(() => { if (document.visibilityState === "visible" && !$("app").hidden && !document.querySelector("#adm-form-wrap:not([hidden]), .imp")) app.muat(); }, 5 * 60 * 1000);
  app.muat();
})();
