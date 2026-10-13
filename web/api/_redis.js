// Upstash Redis lewat REST (tanpa paket tambahan). Env otomatis dari integrasi Vercel → Upstash:
// KV_REST_API_URL + KV_REST_API_TOKEN (nama lama) atau UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN.
// Cari URL & token REST Upstash dengan awalan APA PUN (Vercel memberi nama KV_REST_API_URL, UPSTASH_REDIS_REST_URL,
// atau <AWALAN-KUSTOM>_REST_API_URL). Token "READ_ONLY" tidak dipakai (kita perlu menulis).
function kredensial() {
  const e = process.env;
  const kunciUrl = ["KV_REST_API_URL", "UPSTASH_REDIS_REST_URL"].find((k) => e[k]) ||
    Object.keys(e).find((k) => /(_REST_API_URL|REDIS_REST_URL)$/.test(k) && !/READ_ONLY/.test(k) && e[k]);
  if (!kunciUrl) return null;
  const kunciToken = kunciUrl.replace(/URL$/, "TOKEN");
  return e[kunciToken] ? { url: e[kunciUrl], token: e[kunciToken] } : null;
}
export function redisSiap() { return !!kredensial(); }

// cmds: [["SET","k","v"], ["HGETALL","h"]] → array hasil per perintah. Melempar kalau gagal.
export async function redis(cmds, timeoutMs = 4000) {
  const k = kredensial();
  if (!k) throw new Error("Upstash belum disambungkan");
  const { url, token } = k;
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(url.replace(/\/$/, "") + "/pipeline", {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(cmds), signal: ctl.signal,
    });
    if (!res.ok) throw new Error("Upstash HTTP " + res.status);
    const out = await res.json();
    return out.map((r) => { if (r.error) throw new Error(r.error); return r.result; });
  } finally { clearTimeout(t); }
}

// HGETALL dari REST datang sebagai array datar [k1, v1, k2, v2, …]
export function hashObj(arr) {
  const o = {};
  if (Array.isArray(arr)) for (let i = 0; i < arr.length; i += 2) o[arr[i]] = Number(arr[i + 1]) || 0;
  else if (arr && typeof arr === "object") for (const k in arr) o[k] = Number(arr[k]) || 0;
  return o;
}
