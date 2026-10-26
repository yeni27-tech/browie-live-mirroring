// browie Live Mirroring — TAMPILAN BERSAMA (ekstensi & dashboard online). Butuh session-core.js dimuat lebih dulu.
// File ini wajib IDENTIK di shared/, ekstensi/, dan web/ — ubah di shared/ lalu jalankan `sh salin-shared.sh`.
//
// Pakai: const dash = lmMount(document.getElementById("lm"), data, { onPair })
//   data = { sh:[...], ig:[...], klik:{...}, linkUrl?:string, sentAt?:ms }
//   onPair(igId, shId|"tanpa") — opsional, hanya di ekstensi (tombol pilih pasangan). Tanpa onPair = baca-saja.
//   dash.update(dataBaru)

(function (g) {
  const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  const PAGE = 10;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const nf = (n) => (n == null || !isFinite(n) ? "—" : Number(n).toLocaleString("id-ID", { maximumFractionDigits: 1 }));
  const rp = (n) => (n == null ? "—" : "Rp" + Math.round(n).toLocaleString("id-ID"));
  const rpk = (n) => (n == null ? "—" : n >= 1e6 ? "Rp" + nf(n / 1e6) + " jt" : n >= 1e3 ? "Rp" + nf(Math.round(n / 1e3)) + " rb" : "Rp" + nf(n));
  const pc = (a, b) => (a == null || !b ? "—" : nf((a / b) * 100) + "%");
  const dur = (s) => { if (s == null) return "—"; const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h ? h + " j " + m + " mnt" : m + " mnt"; };
  const dPend = (d) => { const p = d.split("-"); return +p[2] + " " + BLN[+p[1] - 1]; };
  const dPanj = (d) => { const p = d.split("-").map(Number); return HARI[new Date(p[0], p[1] - 1, p[2]).getDay()] + ", " + p[2] + " " + BLN[p[1] - 1] + " " + p[0]; };
  const judul = (t) => { t = String(t || "").trim(); if (t && t === t.toUpperCase() && t.length > 6) t = t.toLowerCase().replace(/(^|[\s,(&-])([a-z])/g, (a, b, c) => b + c.toUpperCase()); return t || "Tanpa judul"; };
  const v = (o, k) => (o && typeof o[k] === "number" && isFinite(o[k]) ? o[k] : null);
  // "ℹ️ Ini apa?" di tiap bagian — pola sama dengan browie Pulse: angka harus bisa dibaca tanpa bertanya.
  /* ---------- interaktif: tooltip (data-tip), detail yang bisa diklik (data-det), badge ▲▼ vs pembanding ---------- */
  let CTX = { list: [], banding: "sebelum" }, DET = {}, detN = 0;
  const det = (html) => { const id = "d" + ++detN; DET[id] = html; return `data-det="${id}"`; };
  const fmtMet = (k, x) => { const f = (LM_MET[k] || [])[2]; if (x == null || !isFinite(x)) return "—"; return f === "rp" ? rp(x) : f === "dtk" ? Math.floor(x / 60) + " mnt " + Math.round(x % 60) + " dtk" : nf(Math.round(x * 10) / 10); };
  const labelBanding = (m) => (LM_BANDING.find((b) => b[0] === m) || LM_BANDING[0])[1];
  // Isi jendela detail satu metrik untuk satu sesi: nilai, pembanding, dan 10 sesi terakhir (bisa diklik).
  function detMetrik(s, k) {
    const [label] = LM_MET[k] || [k], ini = lmNilai(s, k), p = lmPembanding(CTX.list, s, k, CTX.banding);
    const idx = CTX.list.findIndex((x) => x.id === s.id);
    const deret = CTX.list.slice(idx, idx + 10).filter((x) => lmNilai(x, k) != null).reverse();
    const mx = Math.max(...deret.map((x) => lmNilai(x, k)), 1);
    const batang = deret.map((x) => `<button class="sp-col${x.id === s.id ? " on" : ""}" data-lm-sel="${esc(x.id)}" data-tip="${esc(dPend(x.date) + (x.start ? " " + x.start : "") + ": " + fmtMet(k, lmNilai(x, k)))}"><i style="height:${Math.max((lmNilai(x, k) / mx) * 100, 3)}%"></i><span>${dPend(x.date)}</span></button>`).join("");
    return `<h3>${esc(label)}</h3><p class="det-big">${fmtMet(k, ini)} ${p ? badgeHtml(p.persen, false) : ""}</p>
      <p class="msg">${dPanj(s.date)}${s.start ? " · " + esc(s.start) : ""}</p>
      ${p ? `<div class="det-box"><b>Pembanding: ${esc(labelBanding(CTX.banding))}</b> = ${fmtMet(k, p.nilai)}${p.n > 1 ? ` <span class="msg">(dari ${p.n} sesi)</span>` : ""}
        <div class="det-ref">${p.ref.slice(0, 7).map((x) => `<button class="chip" data-lm-sel="${esc(x.id)}">${dPend(x.date)}${x.start ? " " + esc(x.start) : ""} · ${fmtMet(k, lmNilai(x, k))}</button>`).join("")}</div></div>`
        : `<div class="det-box msg">Belum ada sesi pembanding yang punya angka ini (${esc(labelBanding(CTX.banding).toLowerCase())}).</div>`}
      ${deret.length > 1 ? `<h4>${deret.length} sesi terakhir</h4><div class="sp">${batang}</div><p class="msg">Ketuk batang untuk membuka sesinya.</p>` : ""}`;
  }
  function badgeHtml(persen, kecil) {
    if (persen == null || !isFinite(persen)) return "";
    const d = Math.round(persen);
    const kl = Math.abs(persen) < 1 ? "n" : persen > 0 ? "up" : "dn";
    return `<span class="dlb ${kl}${kecil ? " sm" : ""}">${kl === "n" ? "≈ sama" : (d > 0 ? "▲ " : "▼ ") + nf(Math.abs(d)) + "%"}</span>`;
  }
  // Angka yang bisa diklik + badge persen vs pembanding (dipakai di halaman Per Sesi).
  function angka(s, k, teks) {
    const p = lmPembanding(CTX.list, s, k, CTX.banding);
    const tip = p ? `vs ${labelBanding(CTX.banding).toLowerCase()}: ${fmtMet(k, p.nilai)}` : "Belum ada pembanding";
    return `<button class="lm-num" ${det(detMetrik(s, k))} data-tip="${esc((LM_MET[k] || [k])[0] + " · " + tip + " · ketuk untuk detail")}">${teks != null ? teks : fmtMet(k, lmNilai(s, k))}${p ? badgeHtml(p.persen, true) : ""}</button>`;
  }
  const info = (isi) => `<details class="lm-info"><summary>ℹ️ Ini apa?</summary><p>${isi}</p></details>`;
  const INFO = {
    hero: "Jumlah semua orang yang menonton sesi live ini di Instagram dan Shopee, dipecah menurut asalnya. <b>Instagram</b> = Viewers di Insights IG. <b>Shopee dari luar</b> = penonton Shopee yang datang dari luar aplikasi Shopee (link dari IG, WhatsApp, dll — di Shopee tertulis \"Lainnya\"). <b>Shopee dari dalam</b> = penonton yang menemukan live dari Beranda, Rekomendasi, atau Video Shopee. Makin besar bagian Instagram + Shopee dari luar, makin besar peran mirroring.",
    off: "Angka ini dihitung Shopee sendiri, bukan perkiraan. Syaratnya link di live IG memakai <b>kode pelacakan</b> (link berlabel) yang dibuat di Seller Centre → Laporan Pengunjung dari Platform Eksternal → Kode Lacak. Nama kampanye dicocokkan ke judul sesi. <b>Kunjungan</b> = berapa kali link dibuka, <b>pengunjung</b> = orang unik. Shopee mencatat per hari dan datanya telat beberapa jam.",
    rangkum: "Kalimat otomatis yang merangkum sesi ini. Tiap angka dibandingkan dengan nilai tengah (median) sesi-sesi lain: ▲ berarti 25% lebih tinggi dari biasanya, ▼ berarti 20% lebih rendah. Label \"Di atas / Seperti / Di bawah biasanya\" muncul kalau sudah ada minimal 3 sesi pembanding.",
    vs: "Angka Instagram (kiri, merah muda) dan Shopee (kanan, oranye) untuk sesi yang sama, berdampingan supaya mudah dibandingkan. Panjang batang dibandingkan per baris.",
    corong: "Perjalanan penonton dari menonton sampai membeli. Bagian atas: berapa orang IG yang pindah ke Shopee (butuh link penghitung). Bagian bawah: dari semua penonton Shopee, berapa yang klik produk, memasukkan ke keranjang, lalu memesan. Persentase kecil di bawah tiap baris = dibanding langkah sebelumnya.",
    asal: "Dari mana penonton Shopee menemukan live ini, langsung dari dashboard live Shopee (Sumber Menonton Livestream). \"Lainnya\" termasuk penonton yang datang lewat link di Instagram.",
    produk: "Produk yang terjual di sesi ini, dari Seller Centre (Tinjauan Data → Penjualan → Lihat Rincian). Etalase = kelompok produk di toko.",
    komentar: "Komentar penonton live yang dipilah otomatis oleh JEV ke beberapa jenis. Gunanya: melihat apakah penonton banyak yang tanya harga atau mau beli (tanda bagus), atau banyak keluhan. Nama penonton tidak disimpan dan tidak dikirim ke JEV — hanya isi komentarnya.",
    tren: "Setiap batang = satu sesi live, urut dari yang lama (kiri) ke yang terbaru (kanan). Tinggi batang = total penonton, warnanya = asal penonton. Ketuk batang untuk membuka sesinya. Di bawahnya: rata-rata sesi yang juga tayang di IG dibanding yang tidak.",
    terlaris: "Gabungan semua sesi yang rincian produknya sudah diisi: produk mana yang paling laku dan etalase mana yang paling banyak menghasilkan penjualan.",
    link: "Link pengganti link beli di live Instagram. Penonton yang klik langsung diteruskan ke toko Shopee browie, sambil dicatat jam kliknya — jadi ketahuan berapa orang IG yang pindah ke Shopee di tiap sesi. Tidak ada nama atau identitas yang dicatat.",
    report: "Rekap semua sesi dalam rentang tanggal yang kamu pilih di filter 📅 (kemarin, 7/15/30 hari terakhir, atau per hari / minggu / bulan), dibandingkan dengan rentang tepat sebelumnya: bulan penuh dibanding bulan sebelumnya, Senin–Minggu dibanding minggu sebelumnya, selain itu dibanding rentang sama panjang. ▲ naik, ▼ turun. Rentang yang masih berjalan ditandai ⏳, angkanya belum lengkap. Angka yang belum diisi (—) tidak dihitung sebagai nol.",
    jam: "Rata-rata hasil per sesi menurut hari dan jam mulai live. Makin pekat warnanya, makin tinggi rata-ratanya. Angka kecil di sel = jumlah sesi yang jadi dasar. Sel dengan 1 sesi saja belum bisa dipercaya, jadi tidak dipilih sebagai \"terbaik\" (perlu minimal 2 sesi). Butuh jam mulai sesi Shopee.",
    tabel: "Daftar semua sesi. Ketuk satu baris untuk membuka sesi itu di bagian atas.",
    aksi: "Daftar hal yang sebaiknya diperbaiki di live berikutnya. Sistem menghitung angka sesi ini dan membandingkannya dengan sesi-sesi lain, lalu <b>JEV</b> memutuskan masalah mana yang benar-benar terjadi beserta seberapa yakin. Kalau belum dinilai JEV, yang tampil adalah petunjuk dari aturan angka sederhana. Ini saran untuk didiskusikan dengan host, bukan perintah mutlak.",
  };

  const PAIR_TEKS = { auto: ["g", "Dipasangkan otomatis"], pilih: ["g", "Dipasangkan manual"], ragu: ["w", "Pasangan perlu dicek"] };
  function pills(s) {
    let h = ""; const P = lmPl(s);
    h += s.sh ? `<span class="pill sh">${P === "TikTok" ? "🎵 TikTok" : "Shopee"}</span>` : '<span class="pill n">Shopee/TikTok belum ada</span>';
    h += s.ig ? '<span class="pill ig">Instagram</span>' : '<span class="pill n">IG belum ada</span>';
    if (s.ig && s.sh && PAIR_TEKS[s.pair]) h += `<span class="pill ${PAIR_TEKS[s.pair][0]}">${PAIR_TEKS[s.pair][1]}</span>`;
    if (s.ig && !s.sh && s.pair === "pilih") h += '<span class="pill w">Pilih pasangan Shopee/TikTok</span>';
    return h;
  }

  /* ---------- 1. total penonton 3 asal ---------- */
  function heroHtml(s, klik) {
    const a = lmAsal(s);
    const seg = [], P = lmPl(s);
    if (a.ig != null) seg.push(["ig", "Instagram", a.ig]);
    if (a.shopee != null) {
      if (a.luar != null) { seg.push(["luar", P + " dari luar", a.luar]); seg.push(["dalam", P + " dari dalam", a.dalam]); }
      else seg.push(["unk", P + (P === "TikTok" ? "" : " (asal belum diisi)"), a.shopee]);
    }
    const tot = a.total || 0;
    const bar = seg.map(([c, l, n]) => `<i class="seg-${c}" style="flex:${Math.max(n, 0)} 0 0" data-tip="${esc(l)}: ${nf(n)} (${pc(n, tot)} dari total)"></i>`).join("");
    const leg = seg.map(([c, l, n]) => `<div class="leg"><span class="sw seg-${c}"></span><div><b>${nf(n)}</b> <small>${pc(n, tot)}</small><span>${l}</span></div></div>`).join("");
    const k = lmKlikSesi(s, klik);
    return `<div class="lm-hero">
      <div class="lm-hero-top"><div><div class="lm-k">Total penonton</div><div class="lm-big">${angka(s, "total")}</div></div>
        <div class="lm-hero-meta"><div class="lm-when">${dPanj(s.date)}${s.start ? " · " + esc(s.start) : ""}</div><div class="msg">${esc(judul(s.title || (s.ig && s.ig.title)))}</div><div class="lm-pills">${pills(s)}</div></div></div>
      ${tot ? `<div class="lm-stack" role="img" aria-label="Pembagian penonton per asal">${bar}</div>` : ""}
      <div class="lm-legend">${leg || '<span class="msg">Belum ada angka penonton.</span>'}</div>
      ${info(INFO.hero)}<p class="note">${P === "TikTok" ? `Sesi TikTok: penonton TikTok tidak dipecah dalam/luar.${k != null ? ` Klik link penghitung IG selama sesi ini: <b>${nf(k)}</b>.` : ""} Orang yang sama bisa terhitung di IG dan TikTok.` : ""}${P === "TikTok" ? "" : `"Dari luar" = asal <b>Lainnya</b> di dashboard live Shopee: link IG, WhatsApp, dan sumber luar Shopee lain. "Dari dalam" = Beranda, Rekomendasi, Video, Riwayat pesanan, Tab Live.${k != null ? ` Klik link penghitung IG selama sesi ini: <b>${nf(k)}</b>.` : ""} Orang yang sama bisa terhitung di IG dan Shopee.`}</p>
    </div>`;
  }

  /* ---------- 2. IG vs Shopee berdampingan ---------- */
  function vsHtml(s) {
    const P = lmPl(s), IK = P === "TikTok" ? "🎵" : "🛒";
    const pair = [["Penonton", v(s.ig, "viewers"), v(s.sh, "penonton"), "ig", "penonton"], ["Puncak penonton", v(s.ig, "puncak"), v(s.sh, "puncak"), "ig_puncak", "puncak"],
      ["Komentar", v(s.ig, "komen"), v(s.sh, "komen"), "ig_komen", "komen"], ["Dibagikan", v(s.ig, "share"), v(s.sh, "bagi"), "ig_share", "bagi"]];
    const rows = pair.map(([l, a, b, ka, kb]) => {
      const mx = Math.max(a || 0, b || 0, 1), tipA = `Instagram · ${l}: ${nf(a)}`, tipB = `${P} · ${l}: ${nf(b)}${a != null && b != null && a + b ? " · " + pc(b, a + b) + " dari gabungan" : ""}`;
      return `<div class="bf"><div class="bf-l"><b>${a == null ? "—" : angka(s, ka)}</b><span class="bf-bar" data-tip="${esc(tipA)}"><i class="seg-ig" style="width:${((a || 0) / mx) * 100}%"></i></span></div>
        <div class="bf-k">${l}</div><div class="bf-r"><span class="bf-bar" data-tip="${esc(tipB)}"><i class="seg-dalam" style="width:${((b || 0) / mx) * 100}%"></i></span><b>${b == null ? "—" : angka(s, kb)}</b></div></div>`;
    }).join("");
    const fact = (l, val, k) => `<div><span>${l}</span><b>${k && lmNilai(s, k) != null ? angka(s, k) : val}</b></div>`;
    return `<div class="panel"><h2>Instagram vs ${P}</h2>${info(INFO.vs)}
      <div class="bf-head"><span class="ig-t">📸 Instagram${s.ig ? " · " + dur(v(s.ig, "dur")) : ""}</span><span></span><span class="sh-t">${IK} ${P}${s.sh ? " · " + dur(v(s.sh, "dur")) : ""}</span></div>
      ${rows}
      <div class="lm-facts">${fact("Akun berinteraksi IG", "—", "ig_engaged")}${fact("Ditonton " + P, "—", "ditonton")}${fact("Rata-rata nonton " + P, "—", "avg")}${fact("Penjualan " + P, "—", "jual")}${fact("Follow baru " + P, "—", "follow")}${fact("Suka " + P, "—", "suka")}</div>
      ${!s.ig ? '<p class="note">Data Instagram sesi ini belum diunggah.</p>' : ""}${!s.sh ? '<p class="note">Data Shopee/TikTok sesi ini belum ada.</p>' : ""}</div>`;
  }

  /* ---------- 3. corong ---------- */
  function step(label, n, base, sub, cls, s, k) {
    const w = n == null || !base ? 0 : Math.max((n / base) * 100, 1.5);
    const tip = `${label}: ${nf(n)}${sub ? " · " + String(sub).replace(/<[^>]+>/g, "") : ""}`;
    return `<div class="fs"><div class="fs-l">${label}${sub ? `<small>${sub}</small>` : ""}</div><div class="fs-bar" data-tip="${esc(tip)}"><i class="${cls}" style="width:${w}%"></i></div><b>${s && k && n != null ? angka(s, k) : nf(n)}</b></div>`;
  }
  function corongHtml(s, klik) {
    const P = lmPl(s), a = lmAsal(s), k = lmKlikSesi(s, klik);
    const ig = a.ig, pn = v(s.sh, "penonton"), kl = v(s.sh, "klik"), atc = v(s.sh, "atc"), ps = v(s.sh, "pesanan"), fo = v(s.sh, "follow");
    const baseA = Math.max(ig || 0, k || 0, a.luar || 0, 1);
    return `<div class="panel"><h2>Corong</h2>${info(INFO.corong)}
      <div class="fgrp"><h3>Dari Instagram ke ${P}</h3>
        ${step("Penonton IG", ig, baseA, "", "seg-ig", s, "ig")}
        ${step("Klik link ke " + P, k, baseA, k == null ? "link penghitung belum aktif / jam sesi belum ada" : pc(k, ig) + " dari penonton IG", "seg-ig")}
        ${step("Penonton " + P + " dari luar", a.luar, baseA, a.luar == null ? "asal penonton belum diisi" : "termasuk dari IG", "seg-luar", s, "luar")}
      </div>
      <div class="fgrp"><h3>Di ${P} <small>semua penonton, bukan hanya dari IG</small></h3>
        ${step("Penonton " + P, pn, pn || 1, "", "seg-dalam", s, "penonton")}
        ${step("Klik produk", kl, pn || 1, pc(kl, pn) + " dari penonton", "seg-dalam", s, "klik")}
        ${step("Masuk keranjang", atc, pn || 1, kl ? pc(atc, kl) + " dari klik produk" : "", "seg-dalam", s, "atc")}
        ${step("Pesanan (co)", ps, pn || 1, atc ? pc(ps, atc) + " dari keranjang" : "", "seg-dalam", s, "pesanan")}
        <div class="fs fs-side"><div class="fs-l">Follow baru ${P === "TikTok" ? "akun" : "toko"}<small>${fo != null && pn ? nf((fo / pn) * 100) + " per 100 penonton" : ""}</small></div><div></div><b>${fo != null ? angka(s, "follow") : "—"}</b></div>
      </div></div>`;
  }

  /* ---------- 3b. dari Instagram menurut Shopee (kode pelacakan / UTM) ---------- */
  function offHtml(s, off) {
    if (lmPl(s) === "TikTok") return ""; // kode pelacakan khusus Shopee
    const o = lmOffSesi(s, off);
    const head = `<h2>Dari Instagram menurut Shopee</h2>${info(INFO.off)}`;
    if (!o.adaData) return `<div class="panel">${head}<p class="msg">Belum ada data. Pasang link berlabel (kode pelacakan) dari Seller Centre di live IG, lalu ekstensi host menarik hasilnya. Hitungan datang dari Shopee sendiri, bukan perkiraan.</p></div>`;
    if (!o.baris.length) return `<div class="panel">${head}<p class="msg">Tidak ada kunjungan dari kode pelacakan pada tanggal sesi ini. Kalau live memakai link berlabel, angkanya biasanya muncul beberapa jam setelah live.</p></div>`;
    const x = o.cocok || o.baris[0], p = (a, b) => (b ? nf(Math.round((a / b) * 1000) / 10) + "%" : "—");
    const lain = o.baris.filter((y) => y !== x);
    return `<div class="panel">${head}
      <p class="msg"><span class="pill ${o.cocok ? "g" : "w"}">${o.cocok ? "Cocok dengan nama sesi" : "Nama kampanye beda dari judul sesi, cek dulu"}</span> <b>${esc(x.campaign)}</b></p>
      <div class="fgrp">
        ${step("Kunjungan dari IG", x.visits, Math.max(x.visits, 1), x.visitors != null ? nf(x.visitors) + " pengunjung unik" : "", "seg-ig")}
        ${step("Masuk keranjang (orang)", x.atcUsers, Math.max(x.visits, 1), p(x.atcUsers, x.visits) + " dari kunjungan" + (x.atcValue ? " · nilai Rp" + nf(x.atcValue) : ""), "seg-dalam")}
        ${step("Pesanan", x.orders, Math.max(x.visits, 1), x.atcUsers ? p(x.orders, x.atcUsers) + " dari keranjang" : "", "seg-dalam")}
        <div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding-top:8px;border-top:1px dashed var(--line)"><span>Penjualan<small style="display:block;color:var(--muted)">${x.newBuyers ? nf(x.newBuyers) + " pembeli baru" : ""}</small></span><b>Rp${nf(x.sales)}</b></div>
      </div>
      ${lain.length ? `<p class="note">Kampanye lain pada tanggal yang sama: ${lain.map((y) => esc(y.campaign) + " (" + nf(y.visits) + " kunjungan)").join(", ")}.</p>` : ""}
      <p class="note">Shopee mencatat per hari. Kalau ada dua sesi dengan kode yang sama di hari yang sama, angkanya gabungan.</p></div>`;
  }

  /* ---------- 4. asal penonton Shopee ---------- */
  function asalHtml(s) {
    const src = s.sh && s.sh.sumber;
    if (lmPl(s) === "TikTok") return ""; // asal penonton versi Shopee; TikTok belum diisi
    if (!src || !Object.keys(src).length) return `<div class="panel"><h2>Asal penonton Shopee</h2>${info(INFO.asal)}<p class="msg">Belum diisi. Ada di dashboard live Shopee → Sumber Menonton Livestream.</p></div>`;
    const mx = Math.max(...LM_SUMBER.map((k) => v(src, k) || 0), 1);
    return `<div class="panel"><h2>Asal penonton Shopee</h2>${info(INFO.asal)}${LM_SUMBER.filter((k) => v(src, k) != null).map((k) =>
      `<div class="src-r" data-tip="${esc(k + ": " + nf(src[k]) + "% penonton Shopee" + (v(s.sh, "penonton") != null ? " ≈ " + nf(Math.round((src[k] / 100) * v(s.sh, "penonton"))) + " orang" : ""))}"><span>${k}${k === "Lainnya" ? ' <small class="pill ig">termasuk IG</small>' : ""}</span><span class="fs-bar"><i class="${k === "Lainnya" ? "seg-luar" : "seg-dalam"}" style="width:${(src[k] / mx) * 100}%"></i></span><b>${nf(src[k])}%</b></div>`).join("")}</div>`;
  }

  /* ---------- rangkuman performa sesi ---------- */
  const NILAI = { atas: ["g", "▲ Di atas biasanya"], biasa: ["n", "Seperti biasa"], bawah: ["w", "▼ Di bawah biasanya"] };
  function rangkumHtml(s, list) {
    const r = lmRangkum(s, list);
    const ikon = { naik: "▲", turun: "▼", netral: "•", kurang: "○" };
    return `<div class="panel lm-rangkum"><div class="rk-head"><h2>Rangkuman sesi</h2>${r.nilai ? `<span class="pill ${NILAI[r.nilai][0]}">${NILAI[r.nilai][1]}</span>` : '<span class="pill n">Belum cukup sesi pembanding</span>'}</div>
      <ul>${r.poin.map((p) => `<li class="rk-${p.nada}"><span class="rk-i">${ikon[p.nada]}</span><span>${esc(p.teks)}</span></li>`).join("")}</ul>
      ${info(INFO.rangkum)}</div>`;
  }

  /* ---------- 🎯 aksi untuk live berikutnya (JEV + aturan angka) ---------- */
  function aksiHtml(s, list, data, opts) {
    const f = lmFakta(s, list, (data.jev || {})[s.id]);
    const alasan = {}; f.sinyal.forEach((x) => { alasan[x.k] = x.alasan; });
    const r = (data.aksi || {})[s.id];
    const kartu = (k, label, kelas, sub) => { const m = LM_MASALAH[k]; if (!m) return "";
      return `<li class="ak-${kelas}"><div class="ak-head"><b>${esc(m.judul)}</b><span class="pill ${kelas === "tinggi" ? "w" : "n"}">${label}</span></div>
        <p class="ak-aksi">👉 ${esc(m.aksi)}</p>${sub ? `<p class="ak-alasan">${esc(sub)}</p>` : ""}</li>`; };
    let isi, sumber;
    if (r && Array.isArray(r.hasil)) {
      const ya = r.hasil.filter((x) => x.p >= 0.5);
      sumber = `<span class="pill g">Dinilai JEV</span> <span class="msg">${new Date(r.at).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span>`;
      isi = ya.length ? `<ol class="aksi-list">${ya.slice(0, 4).map((x) => kartu(x.k, (x.p >= 0.75 ? "Sangat mungkin" : "Mungkin") + " · yakin " + Math.round(x.p * 100) + "%", x.p >= 0.75 ? "tinggi" : "sedang", alasan[x.k])).join("")}</ol>`
        : '<p class="msg">JEV tidak menemukan masalah yang menonjol di sesi ini. Pertahankan cara live-nya.</p>';
    } else {
      sumber = '<span class="pill n">Dari aturan angka · belum dinilai JEV</span>';
      isi = f.sinyal.length ? `<ol class="aksi-list">${f.sinyal.slice(0, 4).map((x) => kartu(x.k, "Petunjuk angka", "sedang", x.alasan)).join("")}</ol>`
        : '<p class="msg">Belum ada sinyal masalah dari angka. Makin lengkap data sesi (klik produk, keranjang, follow, komentar), makin tajam sarannya.</p>';
    }
    const tombol = opts.onRekomendasi ? `<div class="row" style="margin-top:10px"><button class="${r ? "" : "primary"}" data-lm-rek="nilai">🎯 ${r ? "Nilai ulang dengan JEV" : "Minta rekomendasi JEV"}</button>${r ? '<button class="danger" data-lm-rek="hapus">Hapus hasil</button>' : ""}<span class="msg" id="rek-msg"></span></div>` : "";
    return `<div class="panel lm-aksi"><div class="rk-head"><h2>🎯 Aksi untuk live berikutnya</h2>${sumber}</div>${info(INFO.aksi)}${isi}${tombol}</div>`;
  }

  /* ---------- produk terjual (per sesi) ---------- */
  function produkHtml(s) {
    if (!s.sh) return "";
    const it = lmItems(s).slice().sort((a, b) => (v(b, "jual") || 0) - (v(a, "jual") || 0) || (v(b, "qty") || 0) - (v(a, "qty") || 0));
    if (!it.length) return `<div class="panel"><h2>Produk terjual</h2>${info(INFO.produk)}<p class="msg">Belum diisi. Di Seller Centre: Tinjauan Data → Penjualan → <b>Lihat Rincian</b>.${v(s.sh, "produk") != null ? " Total produk terjual: " + nf(v(s.sh, "produk")) + "." : ""}</p></div>`;
    const tq = it.reduce((a, x) => a + (v(x, "qty") || 0), 0), tj = it.reduce((a, x) => a + (v(x, "jual") || 0), 0);
    return `<div class="panel"><h2>Produk terjual</h2>${info(INFO.produk)}<div class="tablebox flat"><table class="mini"><thead><tr><th>Produk</th><th>Etalase</th><th class="num">Terjual</th><th class="num">Penjualan</th></tr></thead><tbody>
      ${it.map((x) => `<tr><td>${esc(x.nama)}</td><td>${x.etalase ? `<span class="pill n">${esc(x.etalase)}</span>` : "—"}</td><td class="num">${nf(v(x, "qty"))}</td><td class="num">${rp(v(x, "jual"))}</td></tr>`).join("")}
      <tr class="tot"><td>Total</td><td></td><td class="num">${nf(tq)}</td><td class="num">${rp(tj)}</td></tr></tbody></table></div></div>`;
  }
  /* ---------- komentar live dipilah JEV ---------- */
  const KAT = [["minat_beli", "Mau beli / tanya cara order", "g"], ["tanya_harga", "Tanya harga / promo", "g"], ["tanya_produk", "Tanya produk (shade, cara pakai)", "n"],
    ["keluhan", "Keluhan", "w"], ["pujian", "Pujian / reaksi positif", "n"], ["sapaan", "Sapaan / ngobrol", "n"], ["lainnya", "Lainnya", "n"]];
  function komentarHtml(s, data, opts) {
    const j = (data.jev || {})[s.id];
    const admin = !!opts.onKomentar;
    let isi;
    if (j && j.terpilah) {
      const mx = Math.max(...KAT.map(([k]) => j.kategori[k] || 0), 1);
      const beli = (j.kategori.minat_beli || 0) + (j.kategori.tanya_harga || 0);
      isi = `<p class="kom-ringkas"><b>${nf(beli)}</b> dari ${nf(j.terpilah)} komentar (${pc(beli, j.terpilah)}) menunjukkan minat beli atau tanya harga.</p>
        ${KAT.filter(([k]) => j.kategori[k]).map(([k, l, c]) => `<div class="src-r"><span>${l}</span><span class="fs-bar"><i class="${c === "g" ? "seg-ig" : c === "w" ? "seg-luar" : "seg-unk"}" style="width:${(j.kategori[k] / mx) * 100}%"></i></span><b>${nf(j.kategori[k])}</b></div>
          ${(j.contoh[k] || []).length ? `<div class="kom-contoh">${j.contoh[k].map((t) => `<span>"${esc(t)}"</span>`).join("")}</div>` : ""}`).join("")}
        <p class="note">Dipilah ${nf(j.terpilah)} dari ${nf(j.total)} komentar yang ditempel.</p>`;
    } else isi = `<p class="msg">${admin ? "Belum ada. Salin komentar live dari Shopee atau Instagram, tempel di kotak di bawah (satu komentar per baris), lalu tekan Pilah." : "Belum ada komentar yang dipilah untuk sesi ini."}</p>`;
    const form = admin ? (data.jevSiap === false ? '<p class="alert warn">Kunci JEV belum dipasang. Buka ⚙️ Pengaturan di panel admin (atas), tempel kuncinya, tekan Uji &amp; simpan.</p>'
      : `<div class="kom-form"><textarea id="kom-teks" rows="5" placeholder="Tempel komentar di sini, satu komentar per baris. Nama penonton di depan (mis. &quot;budi: kak harganya?&quot;) otomatis dibuang."></textarea>
        <div class="row"><button class="primary" data-lm-kom="pilah">Pilah dengan JEV</button>${j ? '<button class="danger" data-lm-kom="hapus">Hapus hasil</button>' : ""}<span class="msg" id="kom-msg">Maks 200 komentar sekali pilah.</span></div></div>`) : "";
    return `<div class="panel"><h2>Komentar live · dipilah JEV</h2>${info(INFO.komentar)}${isi}${form}</div>`;
  }

  /* ---------- produk & etalase terlaris (semua sesi) ---------- */
  function terlarisHtml(list) {
    const t = lmProdukTerlaris(list.filter((s) => s.sh));
    if (!t.produk.length) return "";
    const mx = Math.max(...t.etalase.map((e) => e.jual), 1);
    return `<div class="lm-grid"><div class="panel"><h2>Produk terlaris · dalam rentang tanggal</h2>${info(INFO.terlaris)}<div class="tablebox flat"><table class="mini"><thead><tr><th>Produk</th><th class="num">Terjual</th><th class="num">Penjualan</th><th class="num">Sesi</th></tr></thead><tbody>
      ${t.produk.slice(0, 10).map((x, i) => `<tr><td><b>${i + 1}.</b> ${esc(x.nama)}${x.etalase ? ` <small class="pill n">${esc(x.etalase)}</small>` : ""}</td><td class="num">${nf(x.qty)}</td><td class="num">${rpk(x.jual)}</td><td class="num">${nf(x.sesi)}</td></tr>`).join("")}</tbody></table></div>
      ${t.produk.length > 10 ? `<p class="note">10 teratas dari ${t.produk.length} produk.</p>` : ""}</div>
      <div class="panel"><h2>Penjualan per etalase · dalam rentang tanggal</h2>${t.etalase.map((e) => `<div class="src-r"><span>${esc(e.etalase)}</span><span class="fs-bar"><i class="seg-dalam" style="width:${(e.jual / mx) * 100}%"></i></span><b>${rpk(e.jual)}</b></div>`).join("")}
      <p class="note">Dihitung dari sesi yang rincian produknya sudah diisi.</p></div></div>`;
  }

  /* ---------- 📅 filter tanggal (gaya Shopee) ---------- */
  const hariIni = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
  const PRESET = [["kemarin", "Kemarin"], ["7", "7 hari terakhir"], ["15", "15 hari terakhir"], ["30", "30 hari terakhir"]];
  const BLN_PANJANG = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const HARI3 = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  const pad2 = (n) => String(n).padStart(2, "0");
  const dalamRentang = (list, r) => list.filter((s) => s.date >= r.dari && s.date <= r.sampai);
  function geserBulan(ym, n) { const [y, m] = ym.split("-").map(Number); const d = new Date(Date.UTC(y, m - 1 + n, 1)); return d.getUTCFullYear() + "-" + pad2(d.getUTCMonth() + 1); }

  function kalenderHtml(st, list) {
    const [y, m] = st.calBulan.split("-").map(Number), awal = st.calBulan + "-01", off = (new Date(awal + "T00:00:00Z").getUTCDay() + 6) % 7;
    const jml = Number(lmAkhirBulan(awal).slice(8)), r = st.rentang, ini = hariIni(), ada = new Set(list.map((x) => x.date));
    const blnIni = ini.slice(0, 7);
    let sel = '<span></span>'.repeat(off);
    for (let d = 1; d <= jml; d++) {
      const tgl = st.calBulan + "-" + pad2(d), masa = tgl > ini;
      const kls = ["cal-d", tgl >= r.dari && tgl <= r.sampai ? "in" : "", tgl === r.dari || tgl === r.sampai ? "ujung" : "", tgl === ini ? "ini" : "", st.anchor === tgl ? "jangkar" : ""].filter(Boolean).join(" ");
      sel += `<button class="${kls}" ${masa ? "disabled" : ""} data-lm-hari="${tgl}" aria-label="${tgl}">${d}${ada.has(tgl) ? '<i class="cal-t"></i>' : ""}</button>`;
    }
    return `<div class="cal"><div class="cal-head"><button data-lm-cal="-12" aria-label="Tahun sebelumnya">«</button><button data-lm-cal="-1" aria-label="Bulan sebelumnya">‹</button><b>${BLN_PANJANG[m - 1]} ${y}</b>
      <button data-lm-cal="1" ${st.calBulan >= blnIni ? "disabled" : ""} aria-label="Bulan berikutnya">›</button><button data-lm-cal="12" ${geserBulan(st.calBulan, 12) > blnIni ? "disabled" : ""} aria-label="Tahun berikutnya">»</button></div>
      <div class="cal-grid">${["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((h) => `<small>${h}</small>`).join("")}${sel}</div>
      <p class="cal-hint">${st.anchor ? "Sekarang klik <b>tanggal akhir</b> untuk membentuk rentang." : "Klik satu tanggal untuk <b>satu hari</b>. Klik tanggal kedua untuk <b>rentang</b>."} Titik <i class="cal-t"></i> = ada live.</p></div>`;
  }
  function panelPick(st, list) {
    const r = st.rentang, ini = hariIni();
    if (st.pickTab === "minggu") {
      return `<div class="pk-list">${lmDaftarMinggu(ini, 12).map((w) => { const n = dalamRentang(list, w).length;
        return `<button class="pk-i${r.dari === w.dari && r.sampai === w.sampai ? " on" : ""}" data-lm-mg="${w.dari}">${lmLabelRentang(w.dari, w.sampai)}${w.sampai >= ini ? " ⏳" : ""}<small>${n} sesi</small></button>`; }).join("")}</div>`;
    }
    if (st.pickTab === "bulan") {
      const y = st.thn, ym = (i) => y + "-" + pad2(i + 1);
      return `<div class="cal-head"><button data-lm-thn="-1" aria-label="Tahun sebelumnya">‹</button><b>${y}</b><button data-lm-thn="1" ${y >= Number(ini.slice(0, 4)) ? "disabled" : ""} aria-label="Tahun berikutnya">›</button></div>
        <div class="pk-bln">${BLN_PANJANG.map((nm, i) => { const awal = ym(i) + "-01", akhir = lmAkhirBulan(awal), n = dalamRentang(list, { dari: awal, sampai: akhir }).length;
          return `<button class="pk-i${r.dari === awal && r.sampai === akhir ? " on" : ""}" ${awal > ini ? "disabled" : ""} data-lm-bln="${ym(i)}">${nm}<small>${n} sesi</small></button>`; }).join("")}</div>`;
    }
    return kalenderHtml(st, list);
  }
  function filterHtml(st, list) {
    const r = st.rentang, n = dalamRentang(list, r).length;
    let pop = "";
    if (st.pickBuka) {
      const menu = PRESET.map(([k, l]) => `<button class="pm${r.preset === k ? " on" : ""}" data-lm-preset="${k}">${l}</button>`).join("") + "<hr>" +
        [["hari", "Per Hari"], ["minggu", "Per Minggu"], ["bulan", "Per Bulan"]].map(([k, l]) => `<button class="pm${!r.preset && st.pickTab === k || (r.preset && st.pickTab === k && st.pickManual) ? " on" : ""}" data-lm-ptab="${k}">${l}<span>›</span></button>`).join("");
      pop = `<div class="lf-pop" role="dialog" aria-label="Pilih rentang tanggal"><div class="lf-menu">${menu}</div><div class="lf-isi">${panelPick(st, list)}</div></div>`;
    }
    return `<div class="lm-filter"><div class="lf-wrap"><button class="lf-btn" data-lm-pickbuka="1" aria-expanded="${st.pickBuka}">📅 <b>${lmLabelRentang(r.dari, r.sampai)}</b><span>▾</span></button>${pop}</div>
      <span class="lf-note"><b>${n}</b> sesi dalam rentang ini · berlaku untuk Report, Tren, Jam terbaik, Produk terlaris, dan Tabel</span></div>`;
  }

  /* ---------- 📈 diagram harian (mudah dibaca: garis bantu, angka di sumbu, legenda, batang diberi label) ---------- */
  function diagram(hari, seri, o) {
    const tot = (d) => (o.tumpuk ? seri.reduce((a, s) => a + (d[s.k] || 0), 0) : Math.max(0, ...seri.map((s) => d[s.k] || 0)));
    const ticks = lmTicks(Math.max(0, ...hari.map(tot)), 4), top = ticks[ticks.length - 1] || 1;
    const n = hari.length, tiap = n <= 16 ? 1 : Math.ceil(n / 12), nilai = n <= 14;
    const garis = ticks.map((t) => `<div class="ch-line" style="bottom:${(t / top) * 100}%"><span>${o.y(t)}</span></div>`).join("");
    let sebelum = null;
    const kol = hari.map((d) => {
      const p = d.date.split("-").map(Number), nm = HARI3[new Date(Date.UTC(p[0], p[1] - 1, p[2])).getUTCDay()] + " " + p[2] + " " + BULAN[p[1] - 1];
      const pv = sebelum, persen = d.nSesi && pv && tot(pv) ? ((tot(d) - tot(pv)) / tot(pv)) * 100 : null;
      if (d.nSesi) sebelum = d;
      const vsTeks = persen == null ? "" : ` · ${persen >= 0 ? "▲" : "▼"} ${nf(Math.abs(Math.round(persen)))}% vs hari live sebelumnya`;
      const tip = nm + (d.nSesi ? " · " + d.nSesi + " sesi · " + seri.map((x) => x.label + " " + o.f(d[x.k] || 0)).join(" · ") + vsTeks : " · tidak ada live");
      const sesiHari = CTX.list.filter((x) => x.date === d.date);
      const detIsi = `<h3>${nm}</h3>${d.nSesi ? `<p class="det-big">${o.f(tot(d))} ${badgeHtml(persen, false)}</p><p class="msg">${esc(o.judul)}${pv ? " · dibanding " + dPend(pv.date) + " (" + o.f(tot(pv)) + ")" : ""}</p>
        <div class="det-box">${seri.map((x) => `<div class="det-row"><span><i class="sw ${x.cls}"></i> ${x.label}</span><b>${o.f(d[x.k] || 0)}</b>${pv ? badgeHtml(pv[x.k] ? (((d[x.k] || 0) - pv[x.k]) / pv[x.k]) * 100 : null, true) : ""}</div>`).join("")}</div>
        ${sesiHari.length ? `<h4>Sesi di hari ini</h4><div class="det-ref">${sesiHari.map((x) => `<button class="chip" data-lm-sel="${esc(x.id)}">${x.start ? esc(x.start) + " · " : ""}${esc(judul(x.title || (x.ig && x.ig.title)).slice(0, 32))}</button>`).join("")}</div>` : ""}` : '<p class="msg">Tidak ada live di hari ini.</p>'}`;
      let isi;
      if (o.tumpuk) {
        const h = (tot(d) / top) * 100;
        isi = `<div class="ch-stack" style="height:${h}%">${seri.map((x) => (d[x.k] ? `<i class="${x.cls}" style="flex:${d[x.k]} 0 0"></i>` : "")).join("")}</div>${nilai && tot(d) ? `<span class="ch-val" style="bottom:calc(${h}% + 2px)">${o.f(tot(d))}</span>` : ""}`;
      } else {
        isi = `<div class="ch-grup">${seri.map((x) => { const h = ((d[x.k] || 0) / top) * 100; return `<i class="${x.cls}" style="height:${h}%">${nilai && d[x.k] ? `<em>${o.f(d[x.k])}</em>` : ""}</i>`; }).join("")}</div>`;
      }
      return `<div class="ch-col${d.nSesi ? "" : " kosong"}" tabindex="0" role="button" data-tip="${esc(tip)}" ${det(detIsi)}>${isi}</div>`;
    }).join("");
    const xl = hari.map((d, i) => { const p = d.date.split("-").map(Number); return `<span>${i % tiap === 0 ? p[2] + "<small>" + HARI3[new Date(Date.UTC(p[0], p[1] - 1, p[2])).getUTCDay()] + "</small>" : ""}</span>`; }).join("");
    const adaData = hari.some((d) => tot(d) > 0);
    return `<div class="ch"><div class="ch-judul"><h3>${o.judul}</h3><span class="ch-leg">${seri.map((x) => `<span><i class="${x.cls}"></i>${x.label}</span>`).join("")}</span></div>
      ${adaData ? `<div class="ch-plot"><div class="ch-garis">${garis}</div><div class="ch-cols">${kol}</div></div><div class="ch-x">${xl}</div><p class="ch-info" data-ch-info>Arahkan kursor ke batang untuk angkanya; ketuk batang untuk rincian hari itu.</p>` : '<p class="msg" style="margin:10px 0 0">Tidak ada angka di rentang ini.</p>'}</div>`;
  }

  /* ---------- 📋 report periode ---------- */
  function delta(a, b) {
    if (a == null || b == null) return '<span class="dl n">—</span>';
    if (!b) return a ? '<span class="dl up">baru</span>' : '<span class="dl n">sama</span>';
    const d = ((a - b) / b) * 100; if (Math.abs(d) < 1) return '<span class="dl n">sama</span>';
    return `<span class="dl ${d > 0 ? "up" : "dn"}">${d > 0 ? "▲" : "▼"} ${nf(Math.abs(Math.round(d)))}%</span>`;
  }
  function reportHtml(list, data, st) {
    const { dari, sampai } = st.rentang, bd = lmBandingRange(dari, sampai), ini = hariIni(), berjalan = ini >= dari && ini <= sampai;
    const A = lmRekap(list, dari, sampai, data.klik), B = lmRekap(list, bd.dari, bd.sampai, data.klik);
    const sesiA = dalamRentang(list, { dari, sampai });
    const kartu = (l, a, b, fmt, ket, k) => {
      const baris = k ? sesiA.filter((x) => lmNilai(x, k) != null).sort((x, y) => lmNilai(y, k) - lmNilai(x, k)) : [];
      const isi = `<h3>${esc(l)}</h3><p class="det-big">${fmt(a)} ${delta(a, b)}</p><p class="msg">${lmLabelRentang(dari, sampai)} · pembanding ${esc(bd.nama)} (${lmLabelRentang(bd.dari, bd.sampai)}) = ${fmt(b)}</p>
        ${baris.length ? `<h4>Per sesi (terbesar dulu)</h4><div class="det-tab">${baris.slice(0, 10).map((x) => `<button data-lm-sel="${esc(x.id)}"><span>${dPend(x.date)}${x.start ? " " + esc(x.start) : ""}</span><span class="msg">${esc(judul(x.title || (x.ig && x.ig.title)).slice(0, 28))}</span><b>${fmtMet(k, lmNilai(x, k))}</b></button>`).join("")}</div>${baris.length > 10 ? `<p class="msg">+${baris.length - 10} sesi lain.</p>` : ""}` : ""}`;
      return `<button class="rp-k" ${det(isi)} data-tip="${esc(l + ": " + fmt(a) + " · vs " + fmt(b) + " · ketuk untuk rincian per sesi")}"><div class="lm-k">${l}</div><div class="rp-v">${fmt(a)}</div><div class="rp-d">${delta(a, b)} <span>vs ${fmt(b)}</span></div>${ket ? `<div class="rp-ket">${ket}</div>` : ""}</button>`;
    };
    const ada = (n, k) => (n ? k : null);
    const terbaik = A.terbaik.map((id) => list.find((x) => x.id === id)).filter(Boolean);
    const panjang = lmSelisihHari(dari, sampai) + 1;
    const hari = panjang <= 62 ? lmHarian(list, dari, sampai, data.klik).filter((d) => d.date <= ini) : null;
    const grafik = !A.sesi ? "" : !hari ? '<p class="note">Diagram harian ditampilkan untuk rentang sampai 62 hari. Pilih rentang yang lebih pendek untuk melihatnya.</p>' : `
      <div class="ch-blok">${diagram(hari, [{ k: "ig", label: "Instagram", cls: "seg-ig" }, { k: "luar", label: "Shopee dari luar", cls: "seg-luar" }, { k: "dalam", label: "Shopee dari dalam", cls: "seg-dalam" }, { k: "unk", label: "Shopee (asal belum diisi)", cls: "seg-unk" }],
        { tumpuk: true, judul: "Penonton per hari", f: nf, y: nf })}${info("Satu batang = satu hari. Tinggi batang = total penonton di hari itu (semua sesi live hari itu dijumlah), warnanya = asal penonton. Hari tanpa batang = tidak ada live. Angka di kiri adalah skalanya.")}</div>
      <div class="lm-grid">
        <div class="ch-blok">${diagram(hari, [{ k: "jual", label: "Penjualan", cls: "seg-dalam" }], { judul: "Penjualan per hari (Rp)", f: rpk, y: (n) => (n >= 1e6 ? nf(n / 1e6) + " jt" : n >= 1e3 ? nf(n / 1e3) + " rb" : nf(n)) })}${info("Total rupiah pesanan live per hari, dari Shopee.")}</div>
        <div class="ch-blok">${diagram(hari, [{ k: "pesanan", label: "Pesanan", cls: "seg-dalam" }, { k: "follow", label: "Follow baru", cls: "seg-ig" }], { judul: "Pesanan dan follow baru per hari", f: nf, y: nf })}${info("Dua batang per hari: berapa pesanan dan berapa follow baru toko. Follow baru adalah tujuan utama mirroring.")}</div>
      </div>
      ${A.nKlik ? `<div class="ch-blok">${diagram(hari, [{ k: "klik", label: "Klik link IG → Shopee", cls: "seg-ig" }], { judul: "Klik link IG → Shopee per hari", f: nf, y: nf })}${info("Berapa kali link penghitung di live IG diklik per hari — orang IG yang benar-benar pindah ke Shopee.")}</div>` : ""}`;
    return `<div class="panel lm-report"><div class="rk-head"><h2>📋 Report</h2><span class="msg">${lmLabelRentang(dari, sampai)}${berjalan ? " ⏳" : ""}</span></div>${info(INFO.report)}
      ${A.sesi ? `<div class="rp-grid">
        ${kartu("Sesi live", A.sesi, B.sesi, nf)}
        ${kartu("Total penonton", A.penonton, B.penonton, nf, `IG ${nf(A.ig)} · Shopee ${nf(A.shopee)}`, "total")}
        ${kartu("Klik link IG → Shopee", ada(A.nKlik, A.klik), ada(B.nKlik, B.klik), nf, A.nKlik ? "" : "link penghitung belum aktif")}
        ${kartu("Pesanan", A.pesanan, B.pesanan, nf, "", "pesanan")}
        ${kartu("Penjualan", ada(A.nJual, A.jual), ada(B.nJual, B.jual), rpk, "", "jual")}
        ${kartu("Follow baru Shopee", ada(A.nFollow, A.follow), ada(B.nFollow, B.follow), nf, A.nFollow < A.sesi ? `dari ${A.nFollow} sesi yang diisi` : "", "follow")}
      </div>
      <p class="rp-ringkas">${A.nAsal ? `<b>${pc(A.luar, A.luar + A.dalam)}</b> penonton Shopee datang dari luar Shopee (termasuk IG). ` : ""}${A.ig ? `Penonton Instagram <b>${nf(A.ig)}</b> dari ${nf(A.nIg)} sesi. ` : ""}Perbandingan (▲▼ dan angka setelah "vs") dengan <b>${bd.nama}</b> (${lmLabelRentang(bd.dari, bd.sampai)})${berjalan ? ". <b>Periode ini belum selesai</b>, jadi angkanya wajar lebih kecil" : ""}.</p>
      ${grafik}
      ${terbaik.length ? `<div class="rp-top"><h3>Sesi terbaik (penonton terbanyak)</h3>${terbaik.map((x, i) => `<button data-lm-sel="${esc(x.id)}"><b>${i + 1}.</b> ${dPend(x.date)}${x.start ? " " + esc(x.start) : ""} · ${nf(lmAsal(x).total)} penonton${v(x.sh, "pesanan") != null ? " · " + nf(v(x.sh, "pesanan")) + " pesanan" : ""}</button>`).join("")}</div>` : ""}
      ${A.produk.length ? `<div class="rp-top"><h3>Produk terlaris di rentang ini</h3>${A.produk.map((x, i) => `<span class="rp-prod"><b>${i + 1}.</b> ${esc(x.nama)} · ${nf(x.qty)} pcs · ${rpk(x.jual)}</span>`).join("")}</div>` : ""}`
      : `<p class="msg" style="margin-top:12px">Tidak ada sesi di rentang ini. Pilih rentang lain di filter tanggal di atas.</p>`}</div>`;
  }

  /* ---------- 🕐 jam & hari tayang terbaik ---------- */
  const HARI_S = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
  const METRIK = [["penonton", "Penonton"], ["pesanan", "Pesanan"], ["follow", "Follow baru"], ["jual", "Penjualan"]];
  function jamHtml(list, st) {
    const r = lmJamTerbaik(list, st.metrik), fm = st.metrik === "jual" ? rpk : (x) => nf(Math.round(x * 10) / 10);
    const mx = Math.max(...r.grid.flat().map((c) => c.rata || 0), 1), total = r.grid.flat().reduce((a, c) => a + c.n, 0);
    const chips = METRIK.map(([k, l]) => `<button class="chip" data-lm-metrik="${k}" aria-pressed="${st.metrik === k}">${l}</button>`).join("");
    if (!total) return `<div class="panel"><h2>🕐 Jam & hari tayang terbaik</h2>${info(INFO.jam)}<p class="msg">Belum ada sesi Shopee dengan jam mulai dan angka ini. Isi jam mulai di tiap sesi.</p></div>`;
    const head = `<tr><th></th>${HARI_S.map((h) => `<th>${h}</th>`).join("")}</tr>`;
    const rows = r.grid.map((row, bi) => `<tr><th class="jm-b">${LM_BLOK[bi][0]}<small>${String(LM_BLOK[bi][1] % 24).padStart(2, "0")}–${String(LM_BLOK[bi][2] % 24).padStart(2, "0")}</small></th>${row.map((c, hi) => c.n ? `<td class="jm-c${r.best && r.best.bi === bi && r.best.hi === hi ? " best" : ""}${(c.rata || 0) / mx >= 0.55 ? " pekat" : ""}" style="--t:${Math.round(((c.rata || 0) / mx) * 100)}%" data-tip="${HARI_S[hi]} ${LM_BLOK[bi][0].toLowerCase()}: rata-rata ${fm(c.rata)} dari ${c.n} sesi"><b>${fm(c.rata)}</b><small>${c.n} sesi</small></td>` : '<td class="jm-c kosong">·</td>').join("")}</tr>`).join("");
    const b = r.best;
    return `<div class="panel"><div class="rk-head"><h2>🕐 Jam & hari tayang terbaik</h2><span class="row">${chips}</span></div>${info(INFO.jam)}
      <p class="rp-ringkas">${b ? `Rata-rata <b>${METRIK.find((m) => m[0] === st.metrik)[1].toLowerCase()}</b> tertinggi: <b>${HARI_S[b.hi]} ${LM_BLOK[b.bi][0].toLowerCase()}</b> (${fm(b.rata)} per sesi, dari ${b.n} sesi).` : "Belum ada kombinasi hari + jam dengan minimal 2 sesi, jadi belum bisa dipilih yang terbaik."} Berdasarkan ${total} sesi.</p>
      <div class="tablebox flat"><table class="jam"><thead>${head}</thead><tbody>${rows}</tbody></table></div></div>`;
  }

  /* ---------- 5. tren semua sesi ---------- */
  function trenHtml(list, selId) {
    const rows = list.slice(0, 24).reverse();
    if (!rows.length) return "";
    const asal = rows.map((s) => lmAsal(s));
    const mx = Math.max(...asal.map((a) => a.total || 0), 1);
    const cols = rows.map((s, i) => {
      const a = asal[i];
      const parts = [];
      if (a.ig) parts.push(["ig", a.ig]);
      if (a.shopee != null) { if (a.luar != null) { parts.push(["luar", a.luar]); parts.push(["dalam", a.dalam]); } else parts.push(["unk", a.shopee]); }
      const tip = `${dPend(s.date)}${s.start ? " " + s.start : ""}: total ${nf(a.total)} · IG ${nf(a.ig)} · Shopee ${nf(a.shopee)}${a.luar != null ? " (luar " + nf(a.luar) + ")" : ""} · pesanan ${nf(v(s.sh, "pesanan"))}`;
      const i0 = CTX.list.findIndex((x) => x.id === s.id), pv = CTX.list.slice(i0 + 1).find((x) => lmAsal(x).total != null), pr = pv && lmAsal(pv).total ? ((a.total - lmAsal(pv).total) / lmAsal(pv).total) * 100 : null;
      const tip2 = tip + (pr != null ? ` · ${pr >= 0 ? "▲" : "▼"} ${nf(Math.abs(Math.round(pr)))}% vs sesi sebelumnya` : "") + " · ketuk untuk buka";
      return `<button class="tc${s.id === selId ? " on" : ""}" data-lm-sel="${esc(s.id)}" data-tip="${esc(tip2)}" aria-label="${esc(tip)}">
        <span class="tc-v">${nf(a.total)}</span><span class="tc-bar" style="height:${((a.total || 0) / mx) * 100}%">${parts.map(([c, n]) => `<i class="seg-${c}" style="flex:${n} 0 0"></i>`).join("")}</span>
        <span class="tc-x">${dPend(s.date)}<br>${esc(s.start || "—")}</span></button>`;
    }).join("");
    const m = lmMirrorVs(list);
    const kel = (k, l) => `<div class="mv"><div class="lm-k">${l} · ${m[k].n} sesi</div><div class="mv-g"><div><span>Penonton Shopee</span><b>${nf(m[k].penonton == null ? null : Math.round(m[k].penonton))}</b></div><div><span>Follow baru</span><b>${nf(m[k].follow)}</b></div><div><span>Pesanan</span><b>${nf(m[k].pesanan)}</b></div><div><span>Penjualan</span><b>${rpk(m[k].jual)}</b></div></div></div>`;
    return `<div class="panel"><h2>Tren per sesi</h2>${info(INFO.tren)}
      <div class="lm-legend sm"><div class="leg"><span class="sw seg-ig"></span>Instagram</div><div class="leg"><span class="sw seg-luar"></span>Shopee dari luar</div><div class="leg"><span class="sw seg-dalam"></span>Shopee dari dalam</div><div class="leg"><span class="sw seg-unk"></span>Shopee, asal belum diisi</div></div>
      <div class="tren">${cols}</div><p class="note">Ketuk batang untuk membuka sesinya. Menampilkan ${rows.length} sesi terakhir.</p>
      <h3 class="mv-h">Sesi dengan live IG vs tanpa live IG <small>rata-rata per sesi</small></h3>
      <div class="mv-wrap">${kel("mirror", "Di-mirror ke IG")}${kel("tanpa", "Tanpa IG")}</div>
      <p class="note">${m.cukup ? "Perbandingan, belum bukti sebab-akibat: jam tayang dan tema live juga berpengaruh." : `Belum bisa disimpulkan: perlu minimal 3 sesi di tiap kelompok (sekarang ${m.mirror.n} dan ${m.tanpa.n}).`}</p></div>`;
  }

  /* ---------- 6. tabel ---------- */
  function tabelHtml(list, page, klik, selId) {
    const n = Math.max(1, Math.ceil(list.length / PAGE)); page = Math.min(Math.max(1, page), n);
    const rows = list.slice((page - 1) * PAGE, page * PAGE).map((s) => {
      const a = lmAsal(s), k = lmKlikSesi(s, klik);
      return `<tr class="${s.id === selId ? "on" : ""}" data-lm-sel="${esc(s.id)}" style="cursor:pointer"><td>${dPend(s.date)}<small>${esc(s.start || "jam ?")}</small></td>
        <td>${esc(judul(s.title || (s.ig && s.ig.title)))}<div class="lm-pills">${pills(s)}</div></td>
        <td class="num">${nf(a.total)}</td><td class="num">${nf(a.ig)}</td><td class="num">${nf(a.shopee)}</td><td class="num">${a.luar == null ? "—" : pc(a.luar, a.shopee)}</td>
        <td class="num">${nf(k)}</td><td class="num">${nf(v(s.sh, "follow"))}</td><td class="num">${nf(v(s.sh, "pesanan"))}</td><td class="num">${rpk(v(s.sh, "jual"))}</td><td>${(() => { const r = lmRangkum(s, list); return r.nilai ? `<span class="pill ${NILAI[r.nilai][0]}">${NILAI[r.nilai][1]}</span>` : '<span class="msg">—</span>'; })()}</td></tr>`;
    }).join("");
    return { page, html: `<div class="panel" style="padding:0;border:0;background:none;margin-bottom:8px"><h2>Sesi dalam rentang tanggal (${list.length})</h2>${info(INFO.tabel)}</div>
      <div class="tablebox"><table><thead><tr><th>Tanggal</th><th>Sesi</th><th class="num">Total penonton</th><th class="num">IG</th><th class="num">Shopee</th><th class="num">% dari luar</th><th class="num">Klik link IG</th><th class="num">Follow baru</th><th class="num">Pesanan</th><th class="num">Penjualan</th><th>Rangkuman</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="11" class="empty">Tidak ada sesi di rentang tanggal ini.</td></tr>'}</tbody></table></div>
      ${n > 1 ? `<div class="pager"><button data-lm-hal="${page - 1}" ${page <= 1 ? "disabled" : ""}>‹ Sebelumnya</button><span>Halaman ${page} dari ${n}</span><button data-lm-hal="${page + 1}" ${page >= n ? "disabled" : ""}>Berikutnya ›</button></div>` : ""}` };
  }

  /* ---------- link penghitung ---------- */
  function linkHtml(data) {
    if (!data.linkUrl) return "";
    const minggu = new Date(Date.now() - 6 * 864e5 + 7 * 3600e3).toISOString().slice(0, 10);
    return `<div class="panel lm-link"><h2>Link penghitung IG → Shopee</h2>${info(INFO.link)}
      <div class="lm-link-row"><code>${esc(data.linkUrl)}</code><button data-lm-copy="${esc(data.linkUrl)}">Salin link</button><span class="msg" data-lm-copymsg></span></div>
      <p class="note">Pasang link ini sebagai link beli di live Instagram. Penonton langsung diteruskan ke toko Shopee browie; tiap klik tercatat jamnya. Klik 7 hari terakhir: <b>${nf(lmKlikTotal(data.klik, minggu))}</b> · sepanjang waktu: <b>${nf(lmKlikTotal(data.klik))}</b>.</p></div>`;
  }

  /* ---------- pilih pasangan (ekstensi saja) ---------- */
  function pairHtml(s, data, onPair) {
    if (!onPair || !s.ig) return "";
    const kand = (data.sh || []).filter((x) => x.date === s.ig.date);
    if (!kand.length) return s.sh ? "" : `<div class="alert warn">Belum ada sesi Shopee di ${dPend(s.ig.date)}. Live IG ini akan dipasangkan otomatis begitu data Shopee tanggal itu masuk.</div>`;
    const opts = kand.map((x) => `<option value="${esc(x.id)}" ${s.sh && s.sh.id === x.id ? "selected" : ""}>${esc((x.start || "jam ?") + " · " + dur(x.dur) + " · " + nf(x.penonton) + " penonton")}</option>`).join("");
    const perlu = !s.sh || s.pair === "ragu";
    return `<div class="alert ${perlu ? "warn" : "good"}">${perlu ? "Pilih sesi Shopee yang tayang bersamaan dengan live IG ini (durasi IG " + dur(s.ig.dur) + "):" : "Pasangan sesi:"}
      <select data-lm-pairsel="${esc(s.ig.id)}">${opts}<option value="tanpa">Tidak di-mirror ke Shopee</option></select> <button data-lm-pair="${esc(s.ig.id)}">Simpan pasangan</button></div>`;
  }

  /* ---------- 📖 cara membaca (untuk semua orang) ---------- */
  const PANDUAN = [
    ["Dashboard ini untuk apa?", "Melihat hasil setiap sesi <b>live mirroring</b>: live yang tayang di Instagram dan Shopee sekaligus. Tujuannya mengajak penonton Instagram pindah ke toko Shopee browie lalu membeli atau follow toko."],
    ["Cara berpindah halaman", "Pakai <b>tab di bagian atas</b>. <b>📊 Ringkasan</b> = performa dalam rentang tanggal. <b>🎥 Per Sesi</b> = detail satu sesi live. <b>💡 Analisis</b> = tren, jam terbaik, produk terlaris. <b>📋 Daftar Sesi</b> = tabel semua sesi. Ketuk sesi di mana pun (grafik, tabel, daftar) dan kamu langsung dibawa ke tab Per Sesi."],
    ["Filter tanggal", "Tombol <b>📅</b> di tab Ringkasan, Analisis, dan Daftar Sesi: pilih Kemarin, 7/15/30 hari terakhir, atau <b>Per Hari</b> (kalender), <b>Per Minggu</b>, <b>Per Bulan</b>. Report, diagram, tren, jam terbaik, produk terlaris, dan tabel mengikuti rentang itu. Report membandingkan dengan rentang sebelumnya (▲ naik, ▼ turun)."],
    ["Angka apa yang paling penting?", "1) <b>Total penonton</b> dan bagian yang datang dari Instagram + Shopee dari luar. 2) <b>Klik link ke Shopee</b> (orang IG yang benar-benar pindah). 3) <b>Follow baru</b> dan <b>pesanan</b> di Shopee."],
    ["Kenapa ada tanda \"—\"?", "Artinya angka itu belum ada atau belum diisi, <b>bukan nol</b>. Misalnya klik link tampil \"—\" untuk sesi sebelum link penghitung dipasang."],
    ["Warna-warnanya artinya apa?", "<span class=\"sw seg-ig inl\"></span> Instagram · <span class=\"sw seg-luar inl\"></span> Shopee dari luar (termasuk dari IG) · <span class=\"sw seg-dalam inl\"></span> Shopee dari dalam aplikasi · arsir = asal penonton belum diisi. Label hijau = bagus/lengkap, kuning = perlu dicek."],
    ["Dari mana datanya?", "Shopee: Seller Centre (Tinjauan Data & dashboard live), diisi admin atau ditarik ekstensi. Instagram: screenshot Insights live yang diunggah admin, dibaca otomatis. Klik link: dicatat otomatis oleh link penghitung."],
    ["Tiap bagian punya \"ℹ️ Ini apa?\"", "Ketuk tulisan itu di bagian mana pun untuk penjelasan singkat cara membaca angkanya."],
  ];
  const panduanIsi = () => `<div class="panel"><div class="lm-panduan-isi">${PANDUAN.map(([q, a]) => `<div><h5>${q}</h5><p>${a}</p></div>`).join("")}</div></div>`;

  /* ---------- navigasi tab: tiap tab menjawab satu pertanyaan ---------- */
  const TAB_DASAR = [["ringkasan", "📊 Ringkasan"], ["sesi", "🎥 Per Sesi"], ["analisis", "💡 Analisis"], ["daftar", "📋 Daftar Sesi"], ["panduan", "📖 Panduan"]];
  const CATATAN_TAB = {
    ringkasan: "Bagaimana performa live di rentang tanggal yang dipilih?",
    sesi: "Bagaimana hasil satu sesi live? Pilih sesinya di bawah.",
    analisis: "Kapan live paling ramai, produk apa yang laku, dan bagaimana trennya?",
    daftar: "Semua sesi dalam satu tabel. Ketuk satu baris untuk membuka detailnya.",
    panduan: "Cara membaca dashboard ini.",
    admin: "Isi, koreksi, dan kelola data. Khusus admin.",
  };

  /* ---------- ⚠️ pengingat data belum lengkap (admin saja) ---------- */
  function pengingatHtml(list) {
    const d = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10); // hari ini, WIB
    const b = lmBelumLengkap(list, d);
    if (!b.length) return '<div class="lm-ingat ok"><span class="pill g">✓ Data 7 hari terakhir lengkap</span></div>';
    return `<details class="lm-ingat"${b.length ? " open" : ""}><summary>⚠️ <b>${b.length} sesi</b> dalam 7 hari terakhir datanya belum lengkap — ketuk untuk membuka sesinya</summary>
      <ul>${b.slice(0, 12).map((x) => `<li><button data-lm-sel="${esc(x.id)}">${dPend(x.date)}${x.start ? " " + esc(x.start) : ""}</button><span>belum ada ${esc(x.kurang.join(", "))}</span></li>`).join("")}</ul>
      ${b.length > 12 ? `<p class="note">…dan ${b.length - 12} sesi lain.</p>` : ""}</details>`;
  }

  /* ---------- tombol admin (hanya kalau opts.onAksi ada) ---------- */
  function adminHtml(s, konfirm) {
    const b = (aksi, label, cls) => konfirm === aksi + ":" + s.id
      ? `<button class="danger" data-lm-aksi="${aksi}" data-lm-ok="1">Ya, ${label.toLowerCase()}</button><button data-lm-batal="1">Batal</button>`
      : `<button class="${cls || ""}" data-lm-aksi="${aksi}">${label}</button>`;
    let h = '<div class="lm-admin"><span class="pill sh">Admin</span>';
    const P = lmPl(s);
    h += s.sh ? b("ubah-sh", "✏️ Ubah " + P) + b("hapus-sh", "Hapus " + P, "danger") : b("tambah-sh", "+ Isi data Shopee") + b("tambah-tt", "+ Isi data TikTok");
    h += s.ig ? b("ubah-ig", "✏️ Ubah IG") + b("hapus-ig", "Hapus IG", "danger") : b("tambah-ig", "+ Isi data IG");
    return h + "</div>";
  }

  function lmMount(root, data, opts) {
    opts = opts || {};
    const presetAwal = (() => { try { const k = localStorage.getItem("lm-rentang"); return PRESET.some((p) => p[0] === k) ? k : "7"; } catch (e) { return "7"; } })();
    let st = { sel: null, page: 1, konfirm: null, metrik: "penonton", rentang: { ...lmPreset(presetAwal, hariIni()), preset: presetAwal }, pickBuka: false, pickTab: "hari", banding: (() => { try { const b = localStorage.getItem("lm-banding"); return LM_BANDING.some((x) => x[0] === b) ? b : "sebelum"; } catch (e) { return "sebelum"; } })(), calBulan: hariIni().slice(0, 7), thn: Number(hariIni().slice(0, 4)), anchor: null, tab: (() => { try { return localStorage.getItem("lm-tab-dash") || "ringkasan"; } catch (e) { return "ringkasan"; } })() };
    function render() {
      const list = lmGabung(data.sh, data.ig);
      DET = {}; detN = 0; CTX = { list, banding: st.banding };
      const tabs = [...TAB_DASAR, ...(opts.onAksi ? [["admin", "🛠 Admin"]] : [])];
      if (!tabs.some((t) => t[0] === st.tab)) st.tab = "ringkasan";
      const nav = `<nav class="lm-nav" role="tablist" aria-label="Halaman dashboard">${tabs.map(([k, l]) => `<button role="tab" class="lm-tab${st.tab === k ? " on" : ""}" aria-selected="${st.tab === k}" data-lm-tab="${k}">${l}</button>`).join("")}</nav><p class="lm-tabnote">${CATATAN_TAB[st.tab]}</p>`;
      if (st.tab === "panduan") { root.innerHTML = nav + panduanIsi(); return; }
      if (st.tab === "admin") { root.innerHTML = nav; return; }
      if (!list.length) { root.innerHTML = nav + '<div class="panel empty">Belum ada sesi. Data Shopee masuk dari Seller Centre; data Instagram dari unggahan screenshot Insights.</div>' + (st.tab === "ringkasan" ? linkHtml(data) : ""); return; }
      if (!list.some((x) => x.id === st.sel)) st.sel = list[0].id;
      const i = list.findIndex((x) => x.id === st.sel), s = list[i];
      const lr = dalamRentang(list, st.rentang);
      let isi;
      if (st.tab === "ringkasan") isi = (opts.onAksi ? pengingatHtml(list) : "") + filterHtml(st, list) + reportHtml(list, data, st) + linkHtml(data);
      else if (st.tab === "analisis") isi = filterHtml(st, list) + trenHtml(lr, s.id) + jamHtml(lr, st) + terlarisHtml(lr);
      else if (st.tab === "daftar") { const tb = tabelHtml(lr, st.page, data.klik, s.id); st.page = tb.page; isi = filterHtml(st, list) + tb.html; }
      else {
        const opt = list.map((x) => `<option value="${esc(x.id)}" ${x.id === s.id ? "selected" : ""}>${esc(dPend(x.date) + (x.start ? " · " + x.start : "") + " — " + judul(x.title || (x.ig && x.ig.title)).slice(0, 40) + (x.sh && x.ig ? " (IG + " + lmPl(x) + ")" : x.sh ? " (" + lmPl(x) + ")" : " (IG)"))}</option>`).join("");
        isi = `<div class="lm-picker"><button data-lm-step="1" ${i >= list.length - 1 ? "disabled" : ""} aria-label="Sesi sebelumnya">◀</button>
          <select data-lm-pick aria-label="Pilih sesi">${opt}</select><button data-lm-step="-1" ${i <= 0 ? "disabled" : ""} aria-label="Sesi berikutnya">▶</button>
          <span class="msg">Sesi ${list.length - i} dari ${list.length}</span></div>
        <div class="lm-banding"><label for="lm-banding">Badge ▲▼ dibanding</label><select id="lm-banding" data-lm-banding>${LM_BANDING.map(([k, l]) => `<option value="${k}" ${k === CTX.banding ? "selected" : ""}>${l}</option>`).join("")}</select><span class="msg">Arahkan kursor ke angka/batang untuk detail cepat, ketuk angka untuk rincian.</span></div>
        ${opts.onAksi ? adminHtml(s, st.konfirm) : ""}${pairHtml(s, data, opts.onPair)}${heroHtml(s, data.klik)}
        ${rangkumHtml(s, list)}
        ${aksiHtml(s, list, data, opts)}
        <div class="lm-grid">${vsHtml(s)}${corongHtml(s, data.klik)}${offHtml(s, data.off)}</div>
        <div class="lm-grid">${asalHtml(s)}${produkHtml(s) || "<div></div>"}</div>
        ${komentarHtml(s, data, opts)}`;
      }
      root.innerHTML = nav + isi;
    }
    function keTab(k) { st.tab = k; try { localStorage.setItem("lm-tab-dash", k); } catch (e) {} render(); if (opts.onTab) opts.onTab(k); if (root.getBoundingClientRect().top < 0) root.scrollIntoView(); }
    root.addEventListener("click", (e) => {
      const t = e.target;
      const tabBtn = t.closest("[data-lm-tab]"); if (tabBtn) { keTab(tabBtn.dataset.lmTab); return; }
      const sel = t.closest("[data-lm-sel]"); if (sel) { st.sel = sel.dataset.lmSel; keTab("sesi"); return; }
      const stp = t.closest("[data-lm-step]"); if (stp) { const list = lmGabung(data.sh, data.ig); const i = list.findIndex((s) => s.id === st.sel) + Number(stp.dataset.lmStep); if (list[i]) { st.sel = list[i].id; render(); } return; }
      const hal = t.closest("[data-lm-hal]"); if (hal) { st.page = Number(hal.dataset.lmHal); render(); return; }
      const cp = t.closest("[data-lm-copy]"); if (cp) { const m = root.querySelector("[data-lm-copymsg]"); navigator.clipboard.writeText(cp.dataset.lmCopy).then(() => { if (m) m.textContent = "Tersalin."; }, () => { if (m) m.textContent = "Gagal menyalin, salin manual."; }); return; }
      const ak = t.closest("[data-lm-aksi]");
      if (ak && opts.onAksi) {
        const list = lmGabung(data.sh, data.ig), s = list.find((x) => x.id === st.sel), aksi = ak.dataset.lmAksi;
        if (/^hapus/.test(aksi) && !ak.dataset.lmOk) { st.konfirm = aksi + ":" + st.sel; render(); return; }
        st.konfirm = null; render(); if (s) opts.onAksi(aksi, s); return;
      }
      if (t.closest("[data-lm-batal]")) { st.konfirm = null; render(); return; }
      const terapkan = (dari, sampai, preset) => { st.rentang = { dari, sampai, preset: preset || null }; st.pickBuka = false; st.anchor = null; st.page = 1; render(); };
      if (st.pickBuka && !t.closest(".lf-wrap")) { st.pickBuka = false; st.anchor = null; render(); }
      if (t.closest("[data-lm-pickbuka]")) { st.pickBuka = !st.pickBuka; st.anchor = null; st.pickManual = false; if (st.pickBuka) { st.calBulan = st.rentang.sampai.slice(0, 7); st.thn = Number(st.rentang.dari.slice(0, 4)); st.pickTab = st.rentang.preset ? "hari" : st.pickTab; } render(); return; }
      const pst = t.closest("[data-lm-preset]"); if (pst) { const k = pst.dataset.lmPreset, r = lmPreset(k, hariIni()); try { localStorage.setItem("lm-rentang", k); } catch (e) {} st.pickManual = false; terapkan(r.dari, r.sampai, k); return; }
      const ptb = t.closest("[data-lm-ptab]"); if (ptb) { st.pickTab = ptb.dataset.lmPtab; st.pickManual = true; st.anchor = null; render(); return; }
      const cal = t.closest("[data-lm-cal]"); if (cal && !cal.disabled) { st.calBulan = geserBulan(st.calBulan, Number(cal.dataset.lmCal)); render(); return; }
      const thn = t.closest("[data-lm-thn]"); if (thn && !thn.disabled) { st.thn += Number(thn.dataset.lmThn); render(); return; }
      const hr = t.closest("[data-lm-hari]");
      if (hr && !hr.disabled) {
        const d = hr.dataset.lmHari;
        if (!st.anchor) { st.anchor = d; st.rentang = { dari: d, sampai: d, preset: null }; st.page = 1; render(); }
        else { const a = st.anchor; terapkan(a < d ? a : d, a < d ? d : a, null); }
        return;
      }
      const mg = t.closest("[data-lm-mg]"); if (mg) { const dr = mg.dataset.lmMg; terapkan(dr, lmTglTambah(dr, 6), null); return; }
      const bl = t.closest("[data-lm-bln]"); if (bl) { const awal = bl.dataset.lmBln + "-01"; terapkan(awal, lmAkhirBulan(awal), null); return; }
      const mt = t.closest("[data-lm-metrik]"); if (mt) { st.metrik = mt.dataset.lmMetrik; render(); return; }
      const rk = t.closest("[data-lm-rek]");
      if (rk && opts.onRekomendasi) { const list = lmGabung(data.sh, data.ig), s = list.find((x) => x.id === st.sel); if (s) opts.onRekomendasi(rk.dataset.lmRek, s.id, lmFakta(s, list, (data.jev || {})[s.id]).fakta, root.querySelector("#rek-msg"), rk); return; }
      const km = t.closest("[data-lm-kom]");
      if (km && opts.onKomentar) { const ta = root.querySelector("#kom-teks"), msg = root.querySelector("#kom-msg"); opts.onKomentar(km.dataset.lmKom, st.sel, ta ? ta.value : "", msg, km); return; }
      const pr = t.closest("[data-lm-pair]"); if (pr && opts.onPair) { const s = root.querySelector(`[data-lm-pairsel="${CSS.escape(pr.dataset.lmPair)}"]`); if (s) opts.onPair(pr.dataset.lmPair, s.value); }
    });
    root.addEventListener("keydown", (e) => { if (e.key === "Escape" && st.pickBuka) { st.pickBuka = false; st.anchor = null; render(); } });
    root.addEventListener("change", (e) => {
      if (e.target.matches("[data-lm-pick]")) { st.sel = e.target.value; render(); }
      if (e.target.matches("[data-lm-banding]")) { st.banding = e.target.value; try { localStorage.setItem("lm-banding", st.banding); } catch (er) {} render(); }
    });
    /* tooltip melayang + jendela detail (di luar root supaya tidak ikut digambar ulang) */
    const doc = root.ownerDocument;
    const tip = doc.createElement("div"); tip.className = "lm-tip"; tip.hidden = true; tip.setAttribute("role", "tooltip"); doc.body.appendChild(tip);
    const letak = (x, y) => { const w = tip.offsetWidth, h = tip.offsetHeight, W = doc.documentElement.clientWidth; let l = x + 14, t = y + 16; if (l + w > W - 8) l = Math.max(8, x - w - 10); if (t + h > window.innerHeight - 8) t = Math.max(8, y - h - 12); tip.style.left = l + "px"; tip.style.top = t + "px"; };
    const tunjuk = (el, x, y) => { tip.textContent = el.dataset.tip; tip.hidden = false; letak(x, y); };
    root.addEventListener("mouseover", (e) => { const el = e.target.closest && e.target.closest("[data-tip]"); if (el && root.contains(el)) { const r = el.getBoundingClientRect(); tunjuk(el, e.clientX || r.right, e.clientY || r.bottom); } });
    root.addEventListener("mousemove", (e) => { if (!tip.hidden) letak(e.clientX, e.clientY); });
    root.addEventListener("mouseout", (e) => { const el = e.target.closest && e.target.closest("[data-tip]"); if (el && !el.contains(e.relatedTarget)) tip.hidden = true; });
    root.addEventListener("focusin", (e) => { const el = e.target.closest && e.target.closest("[data-tip]"); if (el) { const r = el.getBoundingClientRect(); tunjuk(el, r.left, r.bottom); } });
    root.addEventListener("focusout", () => { tip.hidden = true; });
    const bg = doc.createElement("div"); bg.className = "lm-det-bg"; bg.hidden = true;
    bg.innerHTML = '<div class="lm-det" role="dialog" aria-modal="true" aria-label="Rincian"><button class="lm-det-x" aria-label="Tutup">×</button><div class="lm-det-isi"></div></div>';
    doc.body.appendChild(bg);
    const tutup = () => { bg.hidden = true; };
    bg.addEventListener("click", (e) => {
      if (e.target === bg || e.target.closest(".lm-det-x")) { tutup(); return; }
      const sl = e.target.closest("[data-lm-sel]"); if (sl) { tutup(); st.sel = sl.dataset.lmSel; keTab("sesi"); }
    });
    bg.addEventListener("mouseover", (e) => { const el = e.target.closest && e.target.closest("[data-tip]"); if (el) { const r = el.getBoundingClientRect(); tunjuk(el, e.clientX || r.right, e.clientY || r.bottom); } });
    bg.addEventListener("mouseout", () => { tip.hidden = true; });
    doc.addEventListener("keydown", (e) => { if (e.key === "Escape" && !bg.hidden) tutup(); });
    root.addEventListener("click", (e) => {
      const d = e.target.closest && e.target.closest("[data-det]");
      if (!d || !DET[d.dataset.det] || (e.target.closest("[data-lm-sel]") && !d.matches(".ch-col,.rp-k,.lm-num"))) return;
      e.stopPropagation(); tip.hidden = true;
      bg.querySelector(".lm-det-isi").innerHTML = DET[d.dataset.det]; bg.hidden = false; bg.querySelector(".lm-det-x").focus();
    }, true);
    render();
    if (opts.onTab) opts.onTab(st.tab);
    return { update(d) { data = d; render(); }, pilih(id) { st.sel = id; keTab("sesi"); }, setTab(k) { keTab(k); }, getTab() { return st.tab; } };
  }

  g.lmMount = lmMount;
})(typeof window !== "undefined" ? window : globalThis);
