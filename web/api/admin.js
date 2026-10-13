// Aksi admin (cookie peran admin). POST { aksi, … }:
//   simpan-sh { rec }        — tambah/koreksi sesi Shopee (masuk bagian "edit", menang atas tarikan otomatis)
//   hapus-sh  { id }         — sesi dari ekstensi disembunyikan (supaya tidak muncul lagi saat tarikan berikutnya); sesi manual dihapus
//   simpan-ig { rec }        — tambah/koreksi live Instagram
//   hapus-ig  { id }
//   pasang    { igId, nilai } — nilai = id sesi Shopee | "tanpa" | "auto"
//   hapus-banyak { sh:[id], ig:[id] } — kelola data: hapus beberapa sekaligus (aturan sama dengan hapus-sh / hapus-ig)
//   pilah-komentar { id, teks } — komentar live (tempelan, 1 baris = 1 komentar) dipilah JEV → disimpan per sesi
//   hapus-komentar { id }
//   rekomendasi { id, fakta:[teks] } — JEV menilai masalah sesi dari fakta (dihitung session-core lmFakta) → disimpan per sesi
//   hapus-rekomendasi { id }
//   pengaturan { jevKey?, hapusJev?, shopeeUrl? } — dari tab Pengaturan admin (kunci JEV diuji dulu sebelum disimpan)
//   uji-jev {}               — cek kunci JEV yang tersimpan masih diterima TypeSafe
//   data-awal {}             — isi angka asli 6–7 Okt 2026 (hanya kalau penyimpanan masih kosong)
import { peranCookie, readBody } from "./_auth.js";
import { redis } from "./_redis.js";
import { bacaSh, catatLog, bacaPengaturan } from "./_store.js";
import { siapkanKomentar, pilahKomentar, ujiKunci, nilaiMasalah } from "./_jev.js";

const ID_OK = /^[A-Za-z0-9_.:-]{1,80}$/;
const TGL_OK = /^\d{4}-\d{2}-\d{2}$/;
const ANGKA_SH = ["dur", "penonton", "ditonton", "aktif", "puncak", "avg", "klik", "ctr", "atc", "pesanan", "pembeli", "produk", "jual", "follow", "suka", "bagi", "komen"];
const ANGKA_IG = ["dur", "viewers", "puncak", "komen", "share", "engaged"];
const SUMBER = ["Beranda", "Rekomendasi", "Video", "Riwayat pesanan", "Tab Live & Video", "Lainnya"];
const num = (v) => (typeof v === "number" && isFinite(v) && v >= 0 && v < 1e12 ? v : undefined);
const teks = (v, n) => (typeof v === "string" ? v.slice(0, n) : undefined);
const tgl = (d) => { const p = d.split("-"); return +p[2] + "/" + +p[1]; };

function bersihSh(r) {
  const o = { date: r.date, start: /^\d{1,2}:\d{2}$/.test(r.start || "") ? r.start : "", title: teks(r.title, 160) || "" };
  for (const k of ANGKA_SH) { const v = num(r[k]); if (v !== undefined) o[k] = v; }
  if (r.sumber && typeof r.sumber === "object") { const s = {}; for (const k of SUMBER) { const v = num(r.sumber[k]); if (v !== undefined && v <= 100) s[k] = v; } if (Object.keys(s).length) o.sumber = s; }
  // Rincian produk terjual: maks 60 baris, nama wajib.
  if (Array.isArray(r.items)) {
    const it = r.items.slice(0, 60).map((x) => ({ nama: teks(x && x.nama, 120), etalase: teks(x && x.etalase, 60) || "", qty: num(x && x.qty), jual: num(x && x.jual) }))
      .filter((x) => x.nama && x.nama.trim()).map((x) => { const y = { nama: x.nama.trim(), etalase: x.etalase.trim() }; if (x.qty !== undefined) y.qty = x.qty; if (x.jual !== undefined) y.jual = x.jual; return y; });
    o.items = it;
  }
  return o;
}
function bersihIg(r) {
  const o = { id: r.id, date: r.date, title: teks(r.title, 160) || "", importedAt: num(r.importedAt) || Date.now(), source: r.source === "manual" ? "manual" : "screenshot" };
  for (const k of ANGKA_IG) { const v = num(r[k]); if (v !== undefined) o[k] = v; }
  if (r.pairBy === "pilih" && ID_OK.test(r.pairId || "")) { o.pairBy = "pilih"; o.pairId = r.pairId; } else if (r.pairBy === "tanpa") o.pairBy = "tanpa";
  return o;
}

const AWAL_SH = [
  { id: "s-2026-10-07-1023", date: "2026-10-07", start: "10:23", title: "Ngalis 10 Menit, Tahan Sampai 3 Hari", dur: 5801, penonton: 87, aktif: 16, ditonton: 124, puncak: 4, avg: 188, klik: 25, ctr: 20.2, atc: 5, pesanan: 1, pembeli: 1, produk: 1, jual: 84000, follow: 1, suka: 331, bagi: 2, komen: 4 },
  { id: "s-2026-10-07-1601", date: "2026-10-07", start: "16:01", title: "Ngalis 10 Menit, Tahan Sampai 3 Hari", dur: 7213, penonton: 1192, aktif: 36, ditonton: 1321, puncak: 15, avg: 14, ctr: 2, atc: 7, pesanan: 1, pembeli: 1, produk: 1, jual: 134000, suka: 1116, bagi: 2, komen: 9,
    sumber: { Beranda: 62.2, Rekomendasi: 12.1, Video: 2.6, "Riwayat pesanan": 2.6, "Tab Live & Video": 2.2, Lainnya: 18.3 } },
];
const AWAL_IG = [
  { id: "ig-awal-7okt", date: "2026-10-07", title: "NGALIS 10 MENIT TAHAN 3 HARI!", dur: 5475, viewers: 40, puncak: 4, komen: 1, share: 0, engaged: 1 },
  { id: "ig-awal-6okt", date: "2026-10-06", title: "NGALIS 10 MENIT TAHAN 3 HARI", dur: 3681, viewers: 33, puncak: 6, komen: 5, share: 0, engaged: 3 },
];

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method" });
  if (peranCookie(req) !== "admin") return res.status(403).json({ error: "Khusus admin. Masuk dengan password admin." });
  let b;
  try { b = JSON.parse((await readBody(req, 0.2)).toString() || "{}"); } catch { return res.status(400).json({ error: "bukan JSON" }); }
  const now = Date.now();
  try {
    switch (b.aksi) {
      case "simpan-sh": {
        const r = b.rec || {};
        if (!TGL_OK.test(r.date || "")) return res.status(400).json({ error: "Tanggal wajib diisi." });
        if (!/^\d{1,2}:\d{2}$/.test(r.start || "")) return res.status(400).json({ error: "Jam mulai wajib diisi (dipakai untuk menghitung klik link IG)." });
        const id = ID_OK.test(r.id || "") ? r.id : "s-" + r.date + "-" + r.start.replace(":", "");
        const lama = (await bacaSh([id]))[id];
        if (!r.id && lama && !lama.hidden) return res.status(409).json({ error: "Sesi dengan tanggal dan jam mulai ini sudah ada. Buka sesinya lalu tekan Ubah." });
        // Simpan sebagai koreksi HANYA kolom yang beda dari tarikan ekstensi; kolom yang sama tetap ikut diperbarui otomatis.
        const edit = bersihSh(r);
        if (lama && lama.base) for (const k of Object.keys(edit)) if (JSON.stringify(edit[k]) === JSON.stringify(lama.base[k])) delete edit[k];
        const rec = { ...(lama || {}), id, edit, hidden: false, updatedAt: now };
        await redis([["HSET", "lm:sh", id, JSON.stringify(rec)], ...catatLog(`${lama ? "Koreksi" : "Tambah"} sesi Shopee ${tgl(r.date)} ${r.start}`)]);
        return res.json({ ok: true, id });
      }
      case "hapus-sh": {
        if (!ID_OK.test(b.id || "")) return res.status(400).json({ error: "id salah" });
        const lama = (await bacaSh([b.id]))[b.id];
        if (!lama) return res.json({ ok: true });
        const label = `${tgl((lama.edit && lama.edit.date) || (lama.base && lama.base.date) || "0-0-0")} ${(lama.edit && lama.edit.start) || (lama.base && lama.base.start) || ""}`;
        const cmd = lama.base ? ["HSET", "lm:sh", b.id, JSON.stringify({ ...lama, hidden: true, updatedAt: now })] : ["HDEL", "lm:sh", b.id];
        await redis([cmd, ...catatLog(`Hapus sesi Shopee ${label}`)]);
        return res.json({ ok: true });
      }
      case "hapus-banyak": {
        const shIds = (Array.isArray(b.sh) ? b.sh : []).filter((x) => ID_OK.test(x)).slice(0, 200);
        const igIds = (Array.isArray(b.ig) ? b.ig : []).filter((x) => ID_OK.test(x)).slice(0, 200);
        if (!shIds.length && !igIds.length) return res.status(400).json({ error: "Tidak ada data yang dipilih." });
        const lama = await bacaSh(shIds);
        const cmds = [];
        for (const id of shIds) { const l = lama[id]; if (!l) continue; cmds.push(l.base ? ["HSET", "lm:sh", id, JSON.stringify({ ...l, hidden: true, updatedAt: now })] : ["HDEL", "lm:sh", id]); }
        for (const id of igIds) cmds.push(["HDEL", "lm:ig", id]);
        cmds.push(...catatLog(`Kelola data: hapus ${shIds.length} sesi Shopee, ${igIds.length} live IG`));
        await redis(cmds);
        return res.json({ ok: true, sh: shIds.length, ig: igIds.length });
      }
      case "simpan-ig": {
        const r = b.rec || {};
        if (!TGL_OK.test(r.date || "")) return res.status(400).json({ error: "Tanggal wajib diisi." });
        const id = ID_OK.test(r.id || "") ? r.id : "ig_" + now.toString(36) + Math.random().toString(36).slice(2, 6);
        const rec = bersihIg({ ...r, id });
        await redis([["HSET", "lm:ig", id, JSON.stringify(rec)], ...catatLog(`${r.id ? "Koreksi" : "Tambah"} live IG ${tgl(r.date)} (${rec.viewers ?? "?"} penonton)`)]);
        return res.json({ ok: true, id });
      }
      case "hapus-ig": {
        if (!ID_OK.test(b.id || "")) return res.status(400).json({ error: "id salah" });
        await redis([["HDEL", "lm:ig", b.id], ...catatLog(`Hapus live IG ${b.id}`)]);
        return res.json({ ok: true });
      }
      case "pasang": {
        if (!ID_OK.test(b.igId || "")) return res.status(400).json({ error: "id salah" });
        const [raw] = await redis([["HGET", "lm:ig", b.igId]]);
        if (!raw) return res.status(404).json({ error: "Live IG tidak ditemukan" });
        const ig = JSON.parse(raw);
        delete ig.pairId; delete ig.pairBy;
        if (b.nilai === "tanpa") ig.pairBy = "tanpa";
        else if (b.nilai && b.nilai !== "auto" && ID_OK.test(b.nilai)) { ig.pairBy = "pilih"; ig.pairId = b.nilai; }
        await redis([["HSET", "lm:ig", ig.id, JSON.stringify(ig)], ...catatLog(`Pasangan live IG ${tgl(ig.date)} → ${b.nilai === "tanpa" ? "tidak di-mirror" : b.nilai === "auto" ? "otomatis" : b.nilai}`)]);
        return res.json({ ok: true });
      }
      case "pilah-komentar": {
        if (!ID_OK.test(b.id || "")) return res.status(400).json({ error: "Pilih sesinya dulu." });
        const { jevKey } = await bacaPengaturan();
        if (!jevKey) return res.status(400).json({ error: "Kunci JEV belum dipasang. Isi di ⚙️ Pengaturan (tombol di panel admin)." });
        const kom = siapkanKomentar(b.teks);
        if (kom.length < 3) return res.status(400).json({ error: "Tempel minimal 3 komentar, satu komentar per baris." });
        let h;
        try { h = await pilahKomentar(jevKey, kom); } catch (e) { return res.status(502).json({ error: e.message }); }
        await redis([["HSET", "lm:jev", b.id, JSON.stringify(h)], ...catatLog(`Pilah ${h.terpilah} komentar live dengan JEV (sesi ${b.id})`)]);
        return res.json({ ok: true, ...h });
      }
      case "hapus-komentar": {
        if (!ID_OK.test(b.id || "")) return res.status(400).json({ error: "id salah" });
        await redis([["HDEL", "lm:jev", b.id], ...catatLog(`Hapus hasil pilah komentar (sesi ${b.id})`)]);
        return res.json({ ok: true });
      }
      case "rekomendasi": {
        if (!ID_OK.test(b.id || "")) return res.status(400).json({ error: "Pilih sesinya dulu." });
        const fakta = (Array.isArray(b.fakta) ? b.fakta : []).filter((x) => typeof x === "string" && x.trim()).slice(0, 20).map((x) => x.slice(0, 300));
        if (fakta.length < 3) return res.status(400).json({ error: "Data sesi ini terlalu sedikit untuk dinilai. Lengkapi angka Shopee dulu." });
        const { jevKey } = await bacaPengaturan();
        if (!jevKey) return res.status(400).json({ error: "Kunci JEV belum dipasang. Isi di ⚙️ Pengaturan." });
        let hasil;
        try { hasil = await nilaiMasalah(jevKey, fakta); } catch (e) { return res.status(502).json({ error: e.message }); }
        const rec = { at: now, hasil, fakta };
        await redis([["HSET", "lm:aksi", b.id, JSON.stringify(rec)], ...catatLog(`Rekomendasi aksi JEV untuk sesi ${b.id}`)]);
        return res.json({ ok: true, ...rec });
      }
      case "hapus-rekomendasi": {
        if (!ID_OK.test(b.id || "")) return res.status(400).json({ error: "id salah" });
        await redis([["HDEL", "lm:aksi", b.id], ...catatLog(`Hapus rekomendasi aksi (sesi ${b.id})`)]);
        return res.json({ ok: true });
      }
      case "pengaturan": {
        const cmds = [], catatan = [];
        if (b.hapusJev) { cmds.push(["HDEL", "lm:set", "jevKey"]); catatan.push("hapus kunci JEV"); }
        else if (typeof b.jevKey === "string" && b.jevKey.trim()) {
          const k = b.jevKey.trim();
          if (k.length < 10 || k.length > 300 || /\s/.test(k)) return res.status(400).json({ error: "Kunci JEV terlihat tidak lengkap. Salin ulang dari TypeSafe." });
          try { await ujiKunci(k); } catch (e) { return res.status(400).json({ error: "Kunci tidak disimpan: " + e.message }); }
          cmds.push(["HSET", "lm:set", "jevKey", k]); catatan.push("ganti kunci JEV (…" + k.slice(-4) + ")");
        }
        if (typeof b.shopeeUrl === "string") {
          const u = b.shopeeUrl.trim();
          if (!/^https:\/\/(s\.)?shopee\.co\.id\/\S*$|^https:\/\/shope\.ee\/\S+$/.test(u) || u.length > 500) return res.status(400).json({ error: "Link Shopee harus diawali https://shopee.co.id/ , https://s.shopee.co.id/ , atau https://shope.ee/" });
          cmds.push(["HSET", "lm:set", "shopeeUrl", u]); catatan.push("ganti link tujuan Shopee");
        }
        if (!cmds.length) return res.status(400).json({ error: "Tidak ada yang diubah." });
        await redis([...cmds, ...catatLog("Pengaturan: " + catatan.join(", "))]);
        return res.json({ ok: true });
      }
      case "uji-jev": {
        const { jevKey } = await bacaPengaturan();
        if (!jevKey) return res.status(400).json({ error: "Belum ada kunci JEV." });
        try { await ujiKunci(jevKey); return res.json({ ok: true }); } catch (e) { return res.status(502).json({ error: e.message }); }
      }
      case "data-awal": {
        const [nSh, nIg] = await redis([["HLEN", "lm:sh"], ["HLEN", "lm:ig"]]);
        if (nSh || nIg) return res.status(409).json({ error: "Penyimpanan sudah berisi data, data awal tidak dimuat ulang." });
        const cmds = AWAL_SH.map((s) => { const { id, ...e } = s; return ["HSET", "lm:sh", id, JSON.stringify({ id, edit: e, updatedAt: now })]; })
          .concat(AWAL_IG.map((g) => ["HSET", "lm:ig", g.id, JSON.stringify({ ...g, importedAt: now, source: "screenshot" })]));
        await redis([...cmds, ...catatLog("Muat data awal 6–7 Okt 2026 (2 sesi Shopee, 2 live IG)")]);
        return res.json({ ok: true });
      }
      default: return res.status(400).json({ error: "aksi tidak dikenal" });
    }
  } catch (e) { return res.status(503).json({ error: "penyimpanan gagal: " + e.message }); }
}
