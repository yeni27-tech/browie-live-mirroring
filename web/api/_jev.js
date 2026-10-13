// JEV (TypeSafe) — memilah komentar live ke kategori. Dipanggil dari server. Kunci diisi admin di ⚙️ Pengaturan (disimpan di
// Upstash lm:set, cadangan env JEV_KEY) dan tidak pernah dikirim ke browser.
// Yang dikirim ke TypeSafe HANYA teks komentar: nama/username di depan komentar dibuang lebih dulu.
// Pertanyaan ditulis dalam bahasa Inggris (JEV belum teruji di bahasa Indonesia); komentarnya tetap bahasa asli.
const JEV_URL = "https://api.typesafe.ai/v1/systemone";
export const KATEGORI = {
  minat_beli: { label: "Mau beli / tanya cara order", jev: "wants to buy: asks how or where to order, asks for the link, keranjang or checkout, says they ordered/checked out, or asks the host to pin a product" },
  tanya_harga: { label: "Tanya harga / promo", jev: "asks the price, discount, voucher, promo, free shipping or shipping cost" },
  tanya_produk: { label: "Tanya produk (shade, cara pakai)", jev: "asks about the product itself: shade or color, how to use, how long it lasts, halal, ingredients, suitability for their skin or brows — without clearly wanting to buy yet" },
  keluhan: { label: "Keluhan", jev: "complaint or negative experience: the product did not work, delivery, service, or problems with the live stream itself" },
  pujian: { label: "Pujian / reaksi positif", jev: "praise or positive reaction to the product, the result shown, or the host" },
  sapaan: { label: "Sapaan / ngobrol", jev: "greeting, saying hi, asking for a shout-out, small talk with the host, or joining the live" },
  lainnya: { label: "Lainnya", jev: "anything else: emoji only, spam, unrelated or unclear" },
};
const KONTEKS = "Comments typed by viewers during a live-selling stream of browie, an Indonesian eyebrow-care brand (eyebrow henna, eyebrow stencil, concealer pen, eyebrow razor), on Shopee Live or Instagram Live. Comments are in casual Indonesian slang. Each line is one separate comment, numbered.";
export const MAKS_KOMENTAR = 200;

// Teks tempelan → daftar komentar bersih (tanpa nama, tanpa duplikat persis, maks 200).
export function siapkanKomentar(teks) {
  const seen = new Set(), out = [];
  for (let l of String(teks || "").split(/\r?\n/)) {
    l = l.replace(/^\s*\d{1,2}[:.]\d{2}(?::\d{2})?\s*/, "")         // jam di depan
         .replace(/^\s*@?[A-Za-z0-9_.]{2,30}\s*[:：]\s+/, "")         // "username: komentar"
         .replace(/\s+/g, " ").trim().slice(0, 300);
    if (!l || l.length < 2 || seen.has(l.toLowerCase())) continue;
    seen.add(l.toLowerCase()); out.push(l);
    if (out.length >= MAKS_KOMENTAR) break;
  }
  return out;
}

async function panggil(key, batch) {
  const questions = {};
  batch.forEach((_, i) => { questions["c" + (i + 1)] = { type: "choice", instructions: `Primary category of comment #${i + 1} in the list`, criteria: Object.fromEntries(Object.entries(KATEGORI).map(([k, v]) => [k, v.jev])) }; });
  const state = { context: KONTEKS, comments: batch.map((t, i) => `#${i + 1}: ${t}`).join("\n") };
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 25000);
  try {
    const res = await fetch(JEV_URL, { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: "jev-latest", state, questions }), signal: ctl.signal });
    if (res.status === 401 || res.status === 403) throw Object.assign(new Error("Kunci JEV ditolak TypeSafe (" + res.status + "). Ganti kunci di ⚙️ Pengaturan admin."), { fatal: true });
    if (!res.ok) throw new Error("JEV HTTP " + res.status);
    return (await res.json()).answers || {};
  } finally { clearTimeout(t); }
}

// → { total, terpilah, kategori:{k:n}, contoh:{k:[≤3 teks]}, at }
export async function pilahKomentar(key, komentar) {
  const batches = [];
  for (let i = 0; i < komentar.length; i += 20) batches.push(komentar.slice(i, i + 20));
  const hasil = new Array(komentar.length).fill(null);
  let gagal = 0;
  // 4 panggilan bersamaan supaya 200 komentar selesai dalam batas waktu fungsi Vercel.
  for (let i = 0; i < batches.length; i += 4) {
    const grup = batches.slice(i, i + 4);
    const jawab = await Promise.allSettled(grup.map((b) => panggil(key, b)));
    jawab.forEach((r, j) => {
      if (r.status === "rejected") { if (r.reason && r.reason.fatal) throw r.reason; gagal++; return; }
      const off = (i + j) * 20;
      grup[j].forEach((_, k) => { const a = r.value["c" + (k + 1)]; if (a && KATEGORI[a.choice]) hasil[off + k] = a.choice; });
    });
  }
  const kategori = {}, contoh = {};
  hasil.forEach((k, i) => { if (!k) return; kategori[k] = (kategori[k] || 0) + 1; (contoh[k] = contoh[k] || []).length < 3 && contoh[k].push(komentar[i]); });
  const terpilah = hasil.filter(Boolean).length;
  if (!terpilah) throw new Error(gagal ? "JEV tidak menjawab. Coba lagi beberapa menit lagi." : "Tidak ada komentar yang terpilah.");
  return { total: komentar.length, terpilah, kategori, contoh, at: Date.now() };
}

// Uji kunci dengan 3 komentar contoh buatan (bukan komentar asli penonton). Melempar kalau ditolak / tidak menjawab.
export async function ujiKunci(key) {
  const a = await panggil(key, ["kak harganya berapa?", "mau checkout yang black", "halo kak"]);
  if (!a || !a.c1) throw new Error("JEV tidak memberi jawaban.");
  return true;
}

/* ---------- rekomendasi aksi: JEV menilai tiap kemungkinan masalah (ya/tidak + yakin) ----------
   Teks kriteria WAJIB sama dengan LM_MASALAH[k].jev di session-core.js (dijaga oleh tes api). */
export const MASALAH_JEV = {
  sepi: "this session had far fewer viewers than the other sessions",
  retensi: "viewers left quickly: the average watch time is very short compared with other sessions",
  produk: "many viewers but a very low product click rate, so the products were not shown or pinned enough",
  harga: "viewers seem interested (clicks or price questions in comments) but price or promo was not clear enough to make them buy",
  checkout: "a reasonable number of product clicks but few add-to-cart or orders",
  follow: "very few new shop followers relative to the number of viewers",
  ig_pindah: "the Instagram live had viewers but few of them moved to Shopee (few link clicks or few outside-Shopee viewers)",
  pertanyaan: "many comments ask about the product itself (shade, how to use, how long it lasts)",
  keluhan: "there are complaints in the comments",
};
const KONTEKS_SESI = "Facts about one live-selling session of browie (Indonesian eyebrow-care brand) streamed on Shopee Live and mirrored to Instagram Live. " +
  "Numbers were already compared with the median of the brand's other sessions; trust those comparisons and do not recompute. " +
  "Judge each possible problem only from these facts. If the facts needed for a problem are unknown, answer no.";
// → [{ k, p }] urut dari yang paling yakin; p = peluang masalah itu berlaku (0–1)
export async function nilaiMasalah(key, fakta) {
  const questions = {};
  for (const [k, kriteria] of Object.entries(MASALAH_JEV)) {
    questions[k] = { type: "choice", instructions: "Does this problem apply to this live session?", criteria: { ya: "yes — " + kriteria, tidak: "no — the facts do not show this problem, or the needed data is unknown" } };
  }
  const state = { context: KONTEKS_SESI, facts: fakta.map((f, i) => `${i + 1}. ${f}`).join("\n") };
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 25000);
  let jawab;
  try {
    const res = await fetch(JEV_URL, { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: "jev-latest", state, questions }), signal: ctl.signal });
    if (res.status === 401 || res.status === 403) throw new Error("Kunci JEV ditolak TypeSafe (" + res.status + "). Ganti kunci di ⚙️ Pengaturan admin.");
    if (!res.ok) throw new Error("JEV HTTP " + res.status);
    jawab = (await res.json()).answers || {};
  } finally { clearTimeout(t); }
  const out = [];
  for (const k of Object.keys(MASALAH_JEV)) {
    const a = jawab[k]; if (!a) continue;
    const p = a.probabilities && typeof a.probabilities.ya === "number" ? a.probabilities.ya : a.choice === "ya" ? (a.confidence ?? 0.5) : 1 - (a.confidence ?? 0.5);
    out.push({ k, p: Math.round(p * 100) / 100 });
  }
  if (!out.length) throw new Error("JEV tidak memberi jawaban. Coba lagi beberapa menit lagi.");
  return out.sort((a, b) => b.p - a.p);
}
