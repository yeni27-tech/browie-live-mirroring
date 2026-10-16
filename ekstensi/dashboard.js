// browie Live Mirroring — dashboard ekstensi (v0.4). Ekstensi = pengumpul data Shopee (mode intip, nanti penarik otomatis).
// Semua isian & koreksi dilakukan admin di dashboard online. Ringkasan di sini dibaca dari server (Bearer PUSH_TOKEN).
// Data lokal di chrome.storage.local: intip · settings {dashUrl, pushToken}.
(function () {
  "use strict";
  const PAGE = 10;
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const nf = (n) => (n == null || isNaN(n) ? "—" : Number(n).toLocaleString("id-ID"));
  const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const waktu = (ms) => { const d = new Date(ms); return d.getDate() + " " + BULAN[d.getMonth()] + " " + String(d.getHours()).padStart(2, "0") + "." + String(d.getMinutes()).padStart(2, "0"); };

  const hasChrome = typeof chrome !== "undefined" && chrome.storage && chrome.storage.local;
  const store = {
    get: async (k, d) => { if (hasChrome) { const o = await chrome.storage.local.get(k); return o[k] ?? d; } try { return JSON.parse(localStorage.getItem("lm-" + k)) ?? d; } catch (e) { return d; } },
    set: async (k, v) => { if (hasChrome) return chrome.storage.local.set({ [k]: v }); localStorage.setItem("lm-" + k, JSON.stringify(v)); },
  };
  let intip = [], settings = {}, intipPage = 1, openIntip = null, confirmIntipDel = false, dash = null;

  /* ---------- tema & tab ---------- */
  const themeSel = $("#theme-sel");
  try { themeSel.value = localStorage.getItem("lm-theme") || "auto"; } catch (e) {}
  themeSel.addEventListener("change", () => {
    const v = themeSel.value;
    try { localStorage.setItem("lm-theme", v); } catch (e) {}
    if (v === "auto") document.documentElement.removeAttribute("data-theme"); else document.documentElement.setAttribute("data-theme", v);
  });
  function showTab(name) {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.toggle("is-active", b.dataset.tab === name));
    document.querySelectorAll(".pane").forEach((p) => (p.hidden = p.id !== "pane-" + name));
    try { localStorage.setItem("lm-tab", name); } catch (e) {}
  }
  $("#tabs").addEventListener("click", (e) => { const b = e.target.closest(".tab-btn"); if (b) showTab(b.dataset.tab); });

  /* ---------- ringkasan dari server ---------- */
  async function ambilServer() {
    const res = await fetch(settings.dashUrl + "/api/data", { headers: { Authorization: "Bearer " + settings.pushToken }, cache: "no-store" });
    if (res.status === 401) throw new Error("Kode kirim salah. Cek lagi di Pengaturan.");
    if (!res.ok) throw new Error("Dashboard online menjawab HTTP " + res.status);
    return res.json();
  }
  // Status saja (tanpa grafik): sambungan ke dashboard online + sesi terakhir yang sudah sampai di sana.
  async function renderRingkasan() {
    const m = $("#rk-msg"), link = $("#buka-admin"), el = $("#lm");
    link.hidden = !settings.dashUrl; if (settings.dashUrl) link.href = settings.dashUrl;
    if (!settings.dashUrl || !settings.pushToken) { el.innerHTML = '<div class="empty">Isi alamat dashboard online dan kode kirim di tab ⚙️ Pengaturan.</div>'; m.textContent = ""; return; }
    m.textContent = "Mengecek…";
    try {
      const j = await ambilServer(), sh = (j.sh || []).slice().sort((a, b) => (a.date + (a.start || "") < b.date + (b.start || "") ? 1 : -1));
      const ps = await store.get("petStatus", {}), sc = (ps && ps.scrape) || {};
      const x = sh[0], esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
      el.innerHTML = `<div class="lm-facts"><div><span>Sambungan</span><b><span class="pill g">Tersambung</span></b></div>
        <div><span>Sesi Shopee di dashboard</span><b>${sh.length}</b></div>
        <div><span>Sesi terakhir yang sampai</span><b>${x ? esc(x.date + " " + (x.start || "")) : "—"}</b></div>
        <div><span>Tarikan terakhir di laptop ini</span><b>${sc.at ? waktu(sc.at) : "belum pernah"}</b></div>
        <div><span>Status tarikan</span><b>${esc(sc.state === "gagal" ? "Gagal: " + (sc.galat || "") : sc.msg || sc.state || "—")}</b></div></div>
        <p class="msg">Kalau ada live yang belum muncul: buka Seller Centre di Chrome ini, klik Si Henna → <b>Tarik sesi live</b> → <b>Kirim</b>.</p>`;
      m.textContent = "Dicek " + waktu(Date.now());
    } catch (e) { m.textContent = navigator.onLine === false ? "Internet laptop terputus." : e.message; el.innerHTML = ""; }
  }

  /* ---------- mode intip ---------- */
  function kolomCount(shape) { let n = 0; (function jalan(x) { if (Array.isArray(x)) return jalan(x[0]); if (x && typeof x === "object") for (const k in x) { n++; jalan(x[k]); } })(shape); return n; }
  function renderIntip() {
    const pages = new Set(); intip.forEach((r) => (r.pages || []).forEach((p) => pages.add(p)));
    const last = intip.reduce((a, r) => Math.max(a, r.t || 0), 0);
    const liveish = intip.filter((r) => /live|stream/i.test(r.path + " " + (r.pages || []).join(" "))).length;
    $("#intip-stats").innerHTML =
      `<div class="stat"><div class="k">Endpoint tercatat</div><div class="v">${nf(intip.length)}</div></div>` +
      `<div class="stat"><div class="k">Terkait live</div><div class="v">${nf(liveish)}</div></div>` +
      `<div class="stat"><div class="k">Halaman dibuka</div><div class="v">${nf(pages.size)}</div></div>` +
      `<div class="stat"><div class="k">Terakhir tercatat</div><div class="v">${last ? waktu(last) : "belum ada"}</div></div>`;
    $("#intip-dl").disabled = $("#intip-copy").disabled = !intip.length;
    $("#intip-del-wrap").innerHTML = confirmIntipDel
      ? '<button class="danger" id="intip-del-ok">Ya, hapus semua hasil intip</button> <button id="intip-del-no">Batal</button>'
      : '<button class="danger" id="intip-del"' + (intip.length ? "" : " disabled") + ">Hapus hasil</button>";
    const tbl = $("#intip-tbl");
    if (!intip.length) { tbl.innerHTML = '<tbody><tr><td class="empty">Belum ada yang tercatat. Ikuti langkah di atas: buka halaman Live Streaming di Seller Centre, lalu kembali ke sini.</td></tr></tbody>'; $("#intip-pager").innerHTML = ""; return; }
    const sorted = intip.slice().sort((a, b) => (/live|stream/i.test(b.path) - /live|stream/i.test(a.path)) || b.t - a.t);
    const n = Math.ceil(sorted.length / PAGE); if (intipPage > n) intipPage = n;
    let h = '<thead><tr><th>Metode</th><th>Alamat data</th><th>Dibuka dari halaman</th><th class="num">Kolom</th><th>Waktu</th></tr></thead><tbody>';
    sorted.slice((intipPage - 1) * PAGE, intipPage * PAGE).forEach((r) => {
      const key = r.method + " " + r.host + r.path;
      h += `<tr data-ik="${esc(key)}" style="cursor:pointer"><td><span class="pill ${/live|stream/i.test(r.path) ? "sh" : "n"}">${esc(r.method)}</span></td>` +
        `<td class="mono">${esc(r.host)}${esc(r.path)}<small>${r.qkeys && r.qkeys.length ? "parameter: " + esc(r.qkeys.join(", ")) : ""}${r.bkeys && r.bkeys.length ? " · body: " + esc(r.bkeys.join(", ")) : ""}</small></td>` +
        `<td class="mono">${esc((r.pages || []).join(", "))}</td><td class="num">${nf(kolomCount(r.shape))}</td><td>${waktu(r.t)}</td></tr>`;
      if (openIntip === key) h += `<tr><td colspan="5"><pre class="shape">${esc(JSON.stringify(r.shape, null, 2))}</pre></td></tr>`;
    });
    tbl.innerHTML = h + "</tbody>";
    $("#intip-pager").innerHTML = n > 1 ? `<button id="ip-prev" ${intipPage <= 1 ? "disabled" : ""}>‹ Sebelumnya</button><span>Halaman ${intipPage} dari ${n}</span><button id="ip-next" ${intipPage >= n ? "disabled" : ""}>Berikutnya ›</button>` : "";
  }
  function intipJson() {
    const v = hasChrome ? chrome.runtime.getManifest().version : "pratinjau";
    return JSON.stringify({ alat: "browie Live Mirroring", versi: v, diekspor: new Date().toISOString(), catatan: "Hanya bentuk data (nama kolom + tipe). Tanpa nilai.", intip }, null, 2);
  }
  function msg(id, t) { $(id).textContent = t; setTimeout(() => { if ($(id).textContent === t) $(id).textContent = ""; }, 4000); }

  /* ---------- klik ---------- */
  document.addEventListener("click", async (e) => {
    const t = e.target;
    if (t.id === "intip-dl") {
      const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([intipJson()], { type: "application/json" }));
      a.download = "hasil-intip-shopee-" + new Date().toISOString().slice(0, 10) + ".json"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      msg("#intip-msg", "File diunduh. Kirim ke Yeni."); return;
    }
    if (t.id === "intip-copy") { try { await navigator.clipboard.writeText(intipJson()); msg("#intip-msg", "Tersalin. Tempel ke chat dengan Yeni."); } catch (err) { msg("#intip-msg", "Gagal menyalin. Pakai Unduh hasil intip."); } return; }
    if (t.id === "intip-del") { confirmIntipDel = true; renderIntip(); return; }
    if (t.id === "intip-del-no") { confirmIntipDel = false; renderIntip(); return; }
    if (t.id === "intip-del-ok") { intip = []; confirmIntipDel = false; await store.set("intip", []); renderIntip(); return; }
    if (t.id === "ip-prev") { intipPage--; renderIntip(); return; }
    if (t.id === "ip-next") { intipPage++; renderIntip(); return; }
    if (t.id === "muat-ulang") { renderRingkasan(); return; }
    if (t.id === "set-save") {
      const url = $("#set-url").value.trim().replace(/\/$/, ""), token = $("#set-token").value.trim();
      if (url && !/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(url)) { $("#set-msg").textContent = "Alamat harus berbentuk https://nama.vercel.app"; return; }
      settings = { ...settings, dashUrl: url, pushToken: token }; await store.set("settings", settings);
      $("#set-msg").textContent = "Mengecek…";
      try { await ambilServer(); $("#set-msg").textContent = "Tersambung ke dashboard online."; renderRingkasan(); }
      catch (err) { $("#set-msg").textContent = "Tersimpan, tapi belum tersambung: " + err.message; }
      return;
    }
    const ik = t.closest("[data-ik]"); if (ik) { openIntip = openIntip === ik.dataset.ik ? null : ik.dataset.ik; renderIntip(); }
  });

  /* ---------- mulai ---------- */
  (async function () {
    $("#versi").textContent = hasChrome ? "v" + chrome.runtime.getManifest().version : "pratinjau";
    intip = await store.get("intip", []); settings = await store.get("settings", {});
    $("#set-url").value = settings.dashUrl || ""; $("#set-token").value = settings.pushToken || "";
    renderIntip(); renderRingkasan();
    // Pertama kali (belum tersambung) → buka Petunjuk; sesudahnya ingat tab terakhir.
    let tab = settings.dashUrl ? "ringkasan" : "petunjuk"; try { tab = localStorage.getItem("lm-tab") || tab; } catch (e) {}
    showTab(document.getElementById("pane-" + tab) ? tab : "petunjuk");
    if (hasChrome) chrome.storage.onChanged.addListener((ch, area) => { if (area === "local" && ch.intip) { intip = ch.intip.newValue || []; renderIntip(); } });
  })();
})();
