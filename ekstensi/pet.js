// browie Live Mirroring — "pet" pemantau proses, bentuknya tube HENNA ALIS browie (krem + garis merah + tutup bening).
// Melayang di halaman Seller Centre Shopee. Bisa digeser (posisi diingat). Klik = buka/tutup kartu pemantau.
// Dibungkus Shadow DOM tertutup supaya gaya halaman Shopee tidak bercampur, dan pet TIDAK mengirim request apa pun ke Shopee:
// ia hanya membaca storage ekstensi (hasil mode intip + status penarikan) dan menampilkannya.
// Suasana hati: kerja (ada aktivitas <8 dtk / penarikan jalan) · senang (siaga) · panik (penarikan gagal) · tidur (lama tak ada aktivitas).

(function () {
  if (window.__lmPet) return;
  window.__lmPet = true;
  const KONTEKS_OK = typeof chrome !== "undefined" && chrome.storage && chrome.storage.local;
  if (!KONTEKS_OK) return;

  const W = 44, H = 60;
  const send = (msg) => new Promise((r) => { try { chrome.runtime.sendMessage(msg, r); } catch (e) { r(null); } });
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const nf = (n) => Number(n || 0).toLocaleString("id-ID");
  const jam = (t) => (t ? new Date(t).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—");
  const lalu = (t) => {
    if (!t) return "belum ada";
    const d = Math.max(0, Math.round((Date.now() - t) / 1000));
    return d < 60 ? d + " dtk lalu" : d < 3600 ? Math.round(d / 60) + " mnt lalu" : d < 172800 ? Math.round(d / 3600) + " jam lalu" : Math.round(d / 86400) + " hari lalu";
  };

  const T0 = Date.now();
  const SC_OK = location.hostname === "seller.shopee.co.id" && typeof lmTarik !== "undefined";
  let offPrev = null, offTpl = null, tarikSt = {}, tarikOK = false, tarikPrev = null, tarikBusy = false, intip = [], petStatus = { events: [], halaman: [], scrape: { state: "belum" } }, settings = {}, hidden = false, open = false, pos = null, userPos = null, dilihat = 0;

  // ---------- kerangka ----------
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;z-index:2147483646;left:0;top:0;width:0;height:0;";
  const root = host.attachShadow({ mode: "closed" });
  root.innerHTML = `
<style>
  :host { all: initial; }
  * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  .pet { position: fixed; width: ${W}px; height: ${H}px; cursor: grab; user-select: none; touch-action: none;
    filter: drop-shadow(0 4px 8px rgba(90,40,20,.30)); transition: transform .15s; }
  .pet:hover { transform: scale(1.07); }
  .pet.drag { cursor: grabbing; transform: scale(1.12); transition: none; }
  .pet svg { width: 100%; height: 100%; display: block; overflow: visible; }
  .bubble { position: absolute; top: -6px; right: -8px; min-width: 20px; height: 20px; padding: 0 6px; border-radius: 10px;
    background: #A24022; color: #fff; font-size: 11px; font-weight: 700; display: none; align-items: center; justify-content: center; border: 2px solid #fff; }
  .bubble.on { display: flex; }
  .body { transform-origin: 50% 94%; }
  .mood-kerja .body { animation: kerja .7s ease-in-out infinite; }
  .mood-senang .body { animation: napas 3.4s ease-in-out infinite; }
  .mood-panik .body { animation: getar .3s linear infinite; }
  @keyframes kerja { 0%,100% { transform: scale(1,1); } 50% { transform: scale(1.05,.93) translateY(1px); } }
  @keyframes napas { 50% { transform: scale(1.02,.985); } }
  @keyframes getar { 25% { transform: rotate(-4deg); } 75% { transform: rotate(4deg); } }
  .zzz, .tetes, .keringat { opacity: 0; }
  .mood-tidur .zzz { opacity: 1; animation: melayang 2.4s ease-in-out infinite; }
  .mood-kerja .tetes { animation: tetes .9s ease-in infinite; }
  .mood-panik .keringat { opacity: 1; animation: melayang 1s ease-in-out infinite; }
  @keyframes melayang { 50% { transform: translate(2px,-4px); } }
  @keyframes tetes { 0% { opacity: 0; transform: translateY(0); } 25% { opacity: 1; } 85% { opacity: 1; } 100% { opacity: 0; transform: translateY(9px); } }
  .mata-buka { display: inline; } .mood-tidur .mata-buka { display: none; } .mata-tutup { display: none; } .mood-tidur .mata-tutup { display: inline; }
  .mulut-senang { display: inline; } .mulut-panik { display: none; } .mood-panik .mulut-senang { display: none; } .mood-panik .mulut-panik { display: inline; }
  .mood-tidur .mulut-senang { display: none; }

  .card { position: fixed; width: 360px; max-width: calc(100vw - 16px); max-height: 78vh; overflow: auto; background: #FFFDFB; color: #2A1E19;
    border: 1px solid #EADFD7; border-radius: 14px; box-shadow: 0 12px 32px rgba(60,30,15,.22); padding: 14px; display: none; font-size: 13px; line-height: 1.45; }
  .card.open { display: block; }
  .hd { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
  .hd b { font-size: 15px; } .hd b span { color: #A24022; }
  .hd .st { margin-left: auto; }
  .pill { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 999px; white-space: nowrap; }
  .g { background: #E6F2EA; color: #2E7D4F; } .w { background: #FBF0DC; color: #B7791F; } .b { background: #F8E3E1; color: #B3261E; } .n { background: #F1ECE8; color: #7A6A62; }
  .sec { border-top: 1px solid #EADFD7; padding: 10px 0 2px; margin-top: 8px; }
  .sec h4 { margin: 0 0 6px; font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: #7A6A62; display: flex; justify-content: space-between; align-items: center; }
  .meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
  .meta div { background: #F6F0EB; border-radius: 8px; padding: 6px 8px; min-width: 0; }
  .meta small { display: block; font-size: 10px; text-transform: uppercase; letter-spacing: .04em; color: #7A6A62; }
  .meta span { font-weight: 700; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
  .petunjuk { font-size: 12px; color: #5C4B43; margin: 8px 0 0; }
  .alert { background: #F8E3E1; color: #B3261E; border-radius: 8px; padding: 8px 10px; margin: 0 0 8px; font-size: 12px; }
  .bar { height: 8px; background: #F1ECE8; border-radius: 4px; overflow: hidden; margin: 6px 0 4px; } .bar i { display: block; height: 100%; background: #A24022; border-radius: 4px; }
  .log { list-style: none; margin: 0; padding: 0; max-height: 170px; overflow: auto; font-size: 12px; }
  .log li { display: flex; gap: 8px; padding: 4px 0; border-bottom: 1px dashed #EADFD7; }
  .log time { color: #7A6A62; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .log span { min-width: 0; overflow-wrap: anywhere; } .log .galat { color: #B3261E; font-weight: 600; }
  .btns { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 12px; }
  button { font: inherit; font-size: 12px; border: 1px solid #EADFD7; background: #fff; color: #2A1E19; border-radius: 8px; padding: 6px 10px; cursor: pointer; }
  button.pri { background: #A24022; border-color: #A24022; color: #fff; font-weight: 600; }
  button:disabled { opacity: .5; cursor: default; }
  .ft { margin-top: 10px; font-size: 11px; color: #7A6A62; }
</style>
<div class="pet mood-senang" id="pet" title="browie Live Mirroring — klik untuk buka, seret untuk pindah">
  <svg viewBox="0 0 56 76" aria-hidden="true">
    <g class="zzz" fill="#7A6A62" font-size="10" font-weight="700" font-family="sans-serif"><text x="44" y="12">z</text><text x="50" y="5">z</text></g>
    <ellipse cx="28" cy="73.5" rx="15" ry="2.4" fill="rgba(0,0,0,.14)"/>
    <circle class="tetes" cx="28" cy="70" r="2.6" fill="#66311B"/>
    <g class="body">
      <!-- tube asli: ujung bergerigi LEBAR di atas, badan meruncing ke bawah, tutup bening sempit di bawah -->
      <path d="M10 9h36q-.4 3-1.6 8L37 52H19L11.6 17Q10.4 12 10 9z" fill="#F7DFC2"/>
      <path d="M10 9h6l-2.6 8L21 52h-2L11.6 17Q10.4 12 10 9z" fill="#FFF1DD" opacity=".8"/>
      <!-- ujung bergerigi (tutup tube krem) -->
      <path d="M11.5 2.5h33a1.5 1.5 0 0 1 1.5 1.5v6H10V4a1.5 1.5 0 0 1 1.5-1.5z" fill="#F7DFC2"/>
      <path d="M14 3v6M17.5 3v6M21 3v6M24.5 3v6M28 3v6M31.5 3v6M35 3v6M38.5 3v6M42 3v6" stroke="#E7C9A4" stroke-width="1"/>
      <!-- garis merah khas produk -->
      <path d="M17.8 45.6Q28 49.4 38.2 45.6L38.6 48.4Q28 52 17.4 48.4z" fill="#C2392F"/>
      <!-- label -->
      <image href="data:image/png;base64,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" x="15.0" y="13.07" width="26" height="5.85"/>
      <!-- alis henna (cokelat) -->
      <path id="alis-l" d="M17.5 24q4.5-3 9 0" stroke="#66311B" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path id="alis-r" d="M29.5 24q4.5-3 9 0" stroke="#66311B" stroke-width="3" fill="none" stroke-linecap="round"/>
      <!-- mata -->
      <g class="mata-buka"><circle cx="22.5" cy="30" r="2.9" fill="#fff"/><circle cx="33.5" cy="30" r="2.9" fill="#fff"/>
        <circle cx="23" cy="30.5" r="1.6" fill="#2A1E19"/><circle cx="34" cy="30.5" r="1.6" fill="#2A1E19"/></g>
      <g class="mata-tutup"><path d="M19.8 30.5q2.7 2.2 5.4 0M30.8 30.5q2.7 2.2 5.4 0" stroke="#2A1E19" stroke-width="1.7" fill="none" stroke-linecap="round"/></g>
      <!-- mulut & pipi -->
      <path class="mulut-senang" d="M24.5 36q3.5 2.8 7 0" stroke="#7B2F1C" stroke-width="1.9" fill="none" stroke-linecap="round"/>
      <ellipse class="mulut-panik" cx="28" cy="37" rx="2.2" ry="2.6" fill="#7B2F1C"/>
      <circle cx="18" cy="35" r="2.1" fill="#EE9A7C" opacity=".6"/><circle cx="38" cy="35" r="2.1" fill="#EE9A7C" opacity=".6"/>
      <!-- tutup bening di bawah, nozel putih di dalam -->
      <path d="M18.4 52h19.2l-.3 17.6a2 2 0 0 1-2 1.9H20.7a2 2 0 0 1-2-1.9z" fill="#FFFFFF" fill-opacity=".62" stroke="#CFC6BE" stroke-width="1"/>
      <path d="M22 57v13M28 57v13M34 57v13" stroke="#DDD5CE" stroke-width=".9"/>
      <path d="M24.5 62h7v8h-7z" fill="#FBF6F0" stroke="#E4DCD4" stroke-width=".8"/>
      <path class="keringat" d="M45 20q2 3 0 4.6-2-1.6 0-4.6z" fill="#8EC5E8"/>
    </g>
  </svg>
  <div class="bubble" id="bubble"></div>
</div>
<div class="card" id="card"></div>`;
  (document.body || document.documentElement).appendChild(host);

  const pet = root.getElementById("pet"), card = root.getElementById("card"), bubble = root.getElementById("bubble");
  const alisL = root.getElementById("alis-l"), alisR = root.getElementById("alis-r");

  // ---------- suasana hati ----------
  function suasana() {
    const sc = petStatus.scrape || {}, ev = petStatus.events || [], terakhir = ev[0];
    if (sc.state === "gagal") return "panik";
    if (sc.state === "jalan" || (terakhir && Date.now() - terakhir.t < 8000)) return "kerja";
    if (!ev.length && !intip.length && Date.now() - T0 > 5 * 60000) return "tidur";
    return "senang";
  }
  const ALIS = { panik: ["M17.5 22.5q4.5 1 9 3", "M29.5 25.5q4.5-2 9-3"], tidur: ["M17.5 25q4.5-1.5 9 0", "M29.5 25q4.5-1.5 9 0"], kerja: ["M17.5 23q4.5-4 9-.5", "M29.5 22.5q4.5-3.5 9 .5"], senang: ["M17.5 24q4.5-3 9 0", "M29.5 24q4.5-3 9 0"] };
  function setSuasana() {
    const m = suasana();
    pet.className = pet.className.replace(/mood-\w+/g, "").trim() + " mood-" + m;
    alisL.setAttribute("d", ALIS[m][0]); alisR.setAttribute("d", ALIS[m][1]);
    return m;
  }

  // ---------- posisi ----------
  const clamp = (p) => ({ x: Math.min(Math.max(8, p.x), window.innerWidth - W - 8), y: Math.min(Math.max(8, p.y), window.innerHeight - H - 8) });
  function place() {
    pos = clamp(userPos || { x: window.innerWidth - W - 24, y: window.innerHeight - H - 24 });
    pet.style.left = pos.x + "px"; pet.style.top = pos.y + "px";
    const cw = Math.min(360, window.innerWidth - 16), gap = 10;
    card.style.left = (pos.x + W + gap + cw < window.innerWidth ? pos.x + W + gap : Math.max(8, pos.x - cw - gap)) + "px";
    const maxH = window.innerHeight * 0.78;
    card.style.top = Math.min(Math.max(8, pos.y), Math.max(8, window.innerHeight - maxH - 8)) + "px";
  }
  window.addEventListener("resize", place);

  // ---------- seret vs klik ----------
  let start = null, moved = false;
  pet.addEventListener("pointerdown", (e) => { start = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y }; moved = false; pet.setPointerCapture(e.pointerId); });
  pet.addEventListener("pointermove", (e) => {
    if (!start) return;
    const dx = e.clientX - start.x, dy = e.clientY - start.y;
    if (!moved && Math.hypot(dx, dy) < 5) return;
    moved = true; pet.classList.add("drag"); userPos = { x: start.px + dx, y: start.py + dy }; place();
  });
  pet.addEventListener("pointerup", () => {
    if (!start) return;
    pet.classList.remove("drag");
    if (moved) { userPos = clamp(userPos); chrome.storage.local.set({ petPos: userPos }); } else { open = !open; if (open) dilihat = intip.length; paint(); }
    start = null;
  });

  // ---------- kartu ----------
  function kartu() {
    const sc = petStatus.scrape || { state: "belum" }, ev = petStatus.events || [], hal = petStatus.halaman || [], m = suasana();
    const baru = intip.filter((r) => r.t >= T0).length;
    const pillM = m === "kerja" ? ["g", "● Merekam"] : m === "panik" ? ["b", "● Ada masalah"] : m === "tidur" ? ["n", "● Tidur"] : ["g", "● Siaga"];
    const petunjuk = !intip.length ? "Belum ada yang terekam. Buka menu <b>Live Streaming</b> di Seller Centre, lalu klik satu sesi dan buka <b>Tinjauan Data</b> serta dashboard live-nya."
      : baru === 0 ? "Belum ada endpoint baru sejak halaman ini dibuka. Ganti tanggal, filter, atau buka tab lain di halaman ini supaya Shopee memuat data."
      : "Bagus, ekstensi sedang merekam. Terus jelajahi: <b>Tinjauan Data</b>, <b>dashboard live</b>, dan komentar kalau ada.";
    let scrapeIsi;
    if (sc.state === "jalan") scrapeIsi = `<span class="pill g">Berjalan</span>${sc.total ? `<div class="bar"><i style="width:${Math.min(100, Math.round(((sc.done || 0) / sc.total) * 100))}%"></i></div><div class="petunjuk" style="margin:0">${nf(sc.done)} dari ${nf(sc.total)} sesi · ${esc(sc.msg || "")}</div>` : `<div class="petunjuk" style="margin:6px 0 0">${esc(sc.msg || "Menarik data…")}</div>`}`;
    else if (sc.state === "selesai") scrapeIsi = `<span class="pill g">Selesai</span><div class="petunjuk" style="margin:6px 0 0">${esc(sc.msg || "Penarikan terakhir berhasil")} · ${lalu(sc.at)}</div>`;
    else if (sc.state === "gagal") scrapeIsi = `<span class="pill b">Gagal</span><div class="alert" style="margin:8px 0 0">${esc(sc.galat || sc.msg || "Penarikan gagal.")}</div>`;
    else scrapeIsi = `<span class="pill n">Belum ditarik</span>`;
    if (SC_OK) scrapeIsi += `<div class="petunjuk" style="margin:10px 0 0"><b>Dari Instagram menurut Shopee</b> (kode pelacakan): kunjungan, keranjang, pesanan per kampanye.${offTpl ? "" : " <b>Belum siap</b>: buka halaman Laporan Pengunjung dari Platform Eksternal di tab ini sekali, lalu muat ulang."}</div><div class="btns" style="margin-top:6px"><button data-a="tarikoff" ${tarikBusy || !offTpl ? "disabled" : ""}>⬇︎ Tarik data Instagram</button></div>`;
    if (offPrev && offPrev.off) scrapeIsi += offPrev.off.length ? `<div class="petunjuk" style="margin:8px 0 0"><b>Cocokkan dengan halaman Shopee</b> (${offPrev.off.length} baris, 3 terbaru):</div><ul class="log">${offPrev.off.slice(-3).reverse().map((o) => { const r = lmTarik.ringkasOff(o); return `<li><span><b>${esc(r.judul)}</b><br>${esc(r.isi)}</span></li>`; }).join("")}</ul><div class="btns" style="margin-top:8px"><button class="pri" data-a="kirimoff" ${tarikBusy ? "disabled" : ""}>Kirim ${offPrev.off.length} baris ke dashboard</button></div>` : `<div class="petunjuk" style="margin:8px 0 0">Shopee belum mencatat kunjungan dari kode pelacakan pada rentang ini.</div>`;
    if (SC_OK) scrapeIsi += `<div class="petunjuk" style="margin:6px 0 0">${tarikOK ? "🕒 Otomatis <b>aktif</b>: tarik tidak teratur (±15–58 menit, selalu &lt; 1 jam) saat kamu sedang memakai halaman ini, jatah acak 14–22x/hari, libur 00–07 WIB." + (tarikSt.next ? " Berikutnya sekitar " + new Date(tarikSt.next).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + "." : "") + (tarikSt.berhentiSampai > Date.now() ? " <b>Berhenti sementara</b> sampai " + new Date(tarikSt.berhentiSampai).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + "." : "") : "🕒 Otomatis <b>belum aktif</b>: aktif sendiri setelah tarikan manual pertama kamu kirim."}</div>`;
    if (sc.state !== "jalan") scrapeIsi += SC_OK ? `<div class="petunjuk" style="margin:6px 0 0">Menarik daftar sesi live (hanya membaca) dari halaman ini: durasi, penonton, puncak, klik, keranjang, pesanan, penjualan, follow. <b>Asal penonton dan produk terjual belum ikut</b> (masih screenshot).</div><div class="btns" style="margin-top:8px"><button class="pri" data-a="tarik" ${tarikBusy ? "disabled" : ""}>⬇︎ Tarik sesi live</button></div>` : `<div class="petunjuk" style="margin:6px 0 0">Penarikan jalan dari halaman <b>seller.shopee.co.id</b>. Buka Seller Centre di tab itu (bukan creator.shopee.co.id), lalu klik aku lagi.</div>`;
    if (tarikPrev && tarikPrev.sh && tarikPrev.sh.length) scrapeIsi += `<div class="petunjuk" style="margin:8px 0 0"><b>Cocokkan dulu dengan Seller Centre</b> (${tarikPrev.sh.length} sesi terbaca, 3 terbaru):</div><ul class="log">${tarikPrev.sh.slice(0, 3).map((s) => { const r = lmTarik.ringkas(s); return `<li><span><b>${esc(r.judul)}</b><br>${esc(r.isi)}</span></li>`; }).join("")}</ul><div class="btns" style="margin-top:8px"><button class="pri" data-a="kirim" ${tarikBusy ? "disabled" : ""}>Kirim ${tarikPrev.sh.length} sesi ke dashboard</button></div><div class="petunjuk" style="margin:6px 0 0">Kalau angkanya beda dari Seller Centre, <b>jangan kirim</b>, kabari Yeni.</div>`;
    const dash = settings && settings.dashUrl ? `<span class="pill g">Tersambung</span> <span style="color:#7A6A62;font-size:12px">${esc(settings.dashUrl.replace(/^https:\/\//, ""))}</span>` : `<span class="pill w">Belum disambungkan</span> <span style="color:#7A6A62;font-size:12px">isi di ekstensi → ⚙️ Pengaturan</span>`;
    const log = ev.slice(0, 8).map((e) => `<li><time>${jam(e.t)}</time><span class="${e.jenis === "galat" ? "galat" : ""}">${e.jenis === "endpoint" ? "📡 Terekam: " : e.jenis === "halaman" ? "📄 Halaman: " : e.jenis === "galat" ? "⚠️ " : ""}${esc(e.teks)}</span></li>`).join("");
    return `<div class="hd"><b>browie <span>Live Mirroring</span></b><span class="st pill ${pillM[0]}">${pillM[1]}</span></div>
      ${sc.state === "gagal" ? `<div class="alert"><b>Penarikan gagal.</b> ${esc(sc.galat || sc.msg || "")}</div>` : ""}
      <div class="sec" style="border-top:0;margin-top:0;padding-top:0"><h4>Mode intip (merekam bentuk data)</h4>
        <div class="meta"><div><small>Endpoint</small><span>${nf(intip.length)}</span></div><div><small>Halaman</small><span>${nf(hal.length)}</span></div><div><small>Terakhir</small><span style="font-size:12px">${lalu((ev.find((x) => x.jenis === "endpoint") || {}).t)}</span></div></div>
        <div class="meta" style="margin-top:6px"><div style="grid-column:1/-1"><small>Di halaman ini sejak dibuka</small><span>${nf(baru)} endpoint baru · ${esc(location.pathname.slice(0, 48))}</span></div></div>
        <p class="petunjuk">${petunjuk}</p></div>
      <div class="sec"><h4>Penarikan data Shopee</h4>${scrapeIsi}</div>
      <div class="sec"><h4>Dashboard online</h4>${dash}</div>
      <div class="sec"><h4>Aktivitas terbaru</h4>${log ? `<ul class="log">${log}</ul>` : '<div class="petunjuk" style="margin:0">Belum ada aktivitas.</div>'}</div>
      <div class="btns"><button class="pri" data-a="dash">Buka dashboard ekstensi</button><button data-a="unduh" ${intip.length ? "" : "disabled"}>⬇︎ Unduh hasil intip</button><button data-a="sembunyi">Sembunyikan pet</button></div>
      <div class="ft">Pet ini hanya membaca data ekstensi. Tidak mengirim apa pun ke Shopee. Klik ikon ekstensi di toolbar untuk menampilkan/menyembunyikannya.</div>`;
  }
  function paint() {
    place(); const m = setSuasana();
    card.classList.toggle("open", open);
    if (open) card.innerHTML = kartu();
    const naik = Math.max(0, intip.length - dilihat);
    bubble.textContent = naik > 99 ? "99+" : String(naik); bubble.classList.toggle("on", !open && naik > 0);
    host.style.display = hidden ? "none" : "";
    return m;
  }
  card.addEventListener("click", async (e) => {
    const b = e.target.closest("button[data-a]"); if (!b) return;
    if (b.dataset.a === "dash") send({ type: "buka-dashboard" });
    else if (b.dataset.a === "sembunyi") { hidden = true; chrome.storage.local.set({ petHidden: true }); paint(); }
    else if (b.dataset.a === "tarik") {
      tarikBusy = true; tarikPrev = null; send({ type: "scrape-set", patch: { state: "jalan", msg: "Menarik daftar sesi live…" } }); paint();
      try { const h = await lmTarik.tarik((u, o) => fetch(u, o), location.origin); tarikPrev = h; send({ type: "scrape-set", patch: { state: "selesai", done: h.sh.length, total: h.total || h.sh.length, msg: h.sh.length + " sesi terbaca. Cocokkan, lalu kirim." } }); }
      catch (er) { send({ type: "scrape-set", patch: { state: "gagal", galat: er.message } }); }
      tarikBusy = false; paint();
    }
    else if (b.dataset.a === "kirim" && tarikPrev) {
      tarikBusy = true; paint();
      const r = await send({ type: "tarik-kirim", sh: tarikPrev.sh });
      tarikBusy = false;
      if (r && r.ok) { send({ type: "scrape-set", patch: { state: "selesai", done: r.diterima, total: r.diterima, msg: "Terkirim: " + r.diterima + " sesi (" + r.baru + " baru)." } }); tarikPrev = null; }
      else send({ type: "scrape-set", patch: { state: "gagal", galat: (r && r.galat) || "Kirim gagal." } });
      paint();
    }
    else if (b.dataset.a === "tarikoff") {
      tarikBusy = true; offPrev = null; send({ type: "scrape-set", patch: { state: "jalan", msg: "Menarik data kode pelacakan…" } }); paint();
      try { offPrev = await tarikOffSekarang(); send({ type: "scrape-set", patch: { state: "selesai", msg: offPrev.off.length + " baris kode pelacakan terbaca. Cocokkan, lalu kirim." } }); }
      catch (er) { send({ type: "scrape-set", patch: { state: "gagal", galat: er.message } }); }
      tarikBusy = false; paint();
    }
    else if (b.dataset.a === "kirimoff" && offPrev) {
      tarikBusy = true; paint();
      const r = await send({ type: "off-kirim", off: offPrev.off });
      tarikBusy = false;
      if (r && r.ok) { send({ type: "scrape-set", patch: { state: "selesai", msg: "Terkirim: " + offPrev.off.length + " baris kode pelacakan." } }); offPrev = null; }
      else send({ type: "scrape-set", patch: { state: "gagal", galat: (r && r.galat) || "Kirim gagal." } });
      paint();
    }
    else if (b.dataset.a === "unduh") {
      const berkas = JSON.stringify({ alat: "browie Live Mirroring", diekspor: new Date().toISOString(), catatan: "Hanya bentuk data (nama kolom + tipe). Tanpa nilai.", intip }, null, 2);
      const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([berkas], { type: "application/json" }));
      a.download = "hasil-intip-shopee-" + new Date().toISOString().slice(0, 10) + ".json"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }
  });

  // ---------- data dari storage ----------
  function muat(s) {
    if (s.offTpl) offTpl = s.offTpl; if (s.tarikSt) tarikSt = s.tarikSt || {}; if (s.settings) tarikOK = !!(s.settings && s.settings.tarikOK); if (s.intip) intip = s.intip; if (s.petStatus) petStatus = s.petStatus; if (s.settings) settings = s.settings;
    if (s.petHidden !== undefined) hidden = !!s.petHidden; if (s.petPos) userPos = s.petPos;
  }
  chrome.storage.local.get(["intip", "petStatus", "settings", "petHidden", "petPos", "tarikSt", "offTpl"], (s) => { muat(s || {}); dilihat = Math.max(0, intip.length - 0); dilihat = intip.length; paint(); });
  chrome.storage.onChanged.addListener((ch, area) => {
    if (area !== "local") return;
    const s = {}; for (const k in ch) s[k] = ch[k].newValue; muat(s);
    if (s.petHidden === undefined && "petHidden" in ch) hidden = false;
    paint();
  });
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg && msg.type === "toggle-pet") { hidden = !hidden; chrome.storage.local.set({ petHidden: hidden }); paint(); }
  });
  setInterval(paint, 2000);



  // ---------- kode pelacakan: pelajari parameter dari request halaman Shopee sendiri, lalu tarik ----------
  function namaResource() { try { return performance.getEntriesByType("resource").map((e) => e.name); } catch (e) { return []; } }
  function belajarOff() {
    if (!SC_OK) return;
    const nama = namaResource();
    for (let i = nama.length - 1; i >= 0; i--) {
      if (nama[i].indexOf("/traffic-reporting/channel-metric/") < 0) continue;
      const t = lmTarik.pelajariOff(nama[i]);
      if (t) { offTpl = t; send({ type: "off-tpl", tpl: t }); }
      return;
    }
  }
  const tglWibIni = (selisihHari) => new Date(Date.now() + 7 * 3600000 - (selisihHari || 0) * 86400000).toISOString().slice(0, 10);
  async function tarikOffSekarang() {
    return lmTarik.tarikOff((u, o) => fetch(u, o), offTpl, lmTarik.cariCds(namaResource()), tglWibIni(14), tglWibIni(0), location.origin);
  }
  belajarOff(); setInterval(belajarOff, 30000);

  // ---------- tarik otomatis berpola (lihat POLA di tarik-sesi.js) ----------
  let autoJalan = false, awalDitunda = null, terakhirAktif = Date.now();
  const sentuh = () => { terakhirAktif = Date.now(); };
  for (const ev of ["mousemove", "keydown", "scroll", "pointerdown", "touchstart"]) window.addEventListener(ev, sentuh, { passive: true, capture: true });
  async function autoTarik() {
    if (!SC_OK || autoJalan || tarikBusy) return;
    const now = Date.now();
    if (awalDitunda == null) awalDitunda = now + lmTarik.acak(lmTarik.POLA.mulaiMinDtk, lmTarik.POLA.mulaiMaksDtk) * 1000;
    if (now < awalDitunda) return;
    const c = lmTarik.bolehTarik(tarikSt, now, { terverifikasi: tarikOK, tabTerlihat: document.visibilityState === "visible", online: navigator.onLine !== false, terakhirAktif });
    if (!c.boleh) return;
    if (Math.random() < lmTarik.POLA.peluangLewat) { tarikSt = lmTarik.sesudah(tarikSt, now, "lewat"); chrome.storage.local.set({ tarikSt }); return; }
    autoJalan = true; let jenis = "ok";
    await new Promise((r) => setTimeout(r, lmTarik.acak(lmTarik.POLA.tundaMinDtk, lmTarik.POLA.tundaMaksDtk) * 1000));
    try {
      send({ type: "scrape-set", patch: { state: "jalan", msg: "Tarik otomatis…" } });
      const h = await lmTarik.tarik((u, o) => fetch(u, o), location.origin);
      const fp = lmTarik.sidik(h.sh);
      if (fp !== tarikSt.fp && h.sh.length) {
        const r = await send({ type: "tarik-kirim", sh: h.sh, otomatis: true });
        if (r && r.ok) { tarikSt.fp = fp; send({ type: "scrape-set", patch: { state: "selesai", done: h.sh.length, total: h.sh.length, msg: "Otomatis: " + r.diterima + " sesi terkirim." } }); }
        else { jenis = "galat"; send({ type: "scrape-set", patch: { state: "gagal", galat: (r && r.galat) || "Kirim gagal." } }); }
      } else send({ type: "scrape-set", patch: { state: "selesai", done: h.sh.length, total: h.sh.length, msg: "Tidak ada perubahan, tidak dikirim." } });
    } catch (er) {
      const m = String(er.message || "");
      jenis = /Failed to fetch|NetworkError|Load failed/i.test(m) ? "jaringan" : /429|403|Login|code 4/.test(m) ? (/429|403/.test(m) ? "keras" : "login") : "galat";
      send({ type: "scrape-set", patch: { state: jenis === "jaringan" ? "belum" : "gagal", galat: jenis === "jaringan" ? undefined : m, msg: jenis === "jaringan" ? "Internet putus, dicoba lagi sebentar lagi." : undefined } });
    }
    if (jenis === "ok" && offTpl && Date.now() - (tarikSt.offAt || 0) > 90 * 60000) {
      try {
        const h2 = await tarikOffSekarang(); const fp2 = lmTarik.sidik(h2.off.map((o) => ({ id: o.date + "|" + o.campaign, ...o })));
        if (h2.off.length && fp2 !== tarikSt.offFp) { const r2 = await send({ type: "off-kirim", off: h2.off, otomatis: true }); if (r2 && r2.ok) tarikSt.offFp = fp2; }
        tarikSt.offAt = Date.now();
      } catch (er2) { tarikSt.offAt = Date.now(); send({ type: "scrape-set", patch: { state: "gagal", galat: "Kode pelacakan: " + er2.message } }); }
    }
    tarikSt = lmTarik.sesudah(tarikSt, Date.now(), jenis);
    chrome.storage.local.set({ tarikSt });
    autoJalan = false;
  }
  setInterval(autoTarik, 30000);

  // ---------- laporkan halaman yang dibuka (termasuk perpindahan halaman tanpa muat ulang) ----------
  let pathTerakhir = "";
  function lapor() { const p = location.pathname; if (p !== pathTerakhir) { pathTerakhir = p; send({ type: "pet-halaman", path: p }); } }
  lapor(); setInterval(lapor, 1500);
})();
