// Sesi berbasis cookie bertanda tangan (HMAC). Isinya hanya "sampai kapan" + peran: "lihat" (tim) atau "admin".
// Admin = satu password bersama (ADMIN_PASSWORD) untuk Yeni + manager host. Tim = DASHBOARD_PASSWORD.
import crypto from "node:crypto";

const DAY = 86400000;
export const COOKIE = "lm_session";
const PERAN = new Set(["lihat", "admin"]);

export function sign(exp, peran) {
  return crypto.createHmac("sha256", process.env.SESSION_SECRET).update(exp + "." + peran).digest("base64url");
}
export function makeCookie(peran) {
  const exp = Date.now() + 14 * DAY;
  return { value: `${exp}.${peran}.${sign(exp, peran)}`, exp };
}
// → "admin" | "lihat" | null
export function peranCookie(req) {
  if (!process.env.SESSION_SECRET) return null;
  const raw = (req.headers.cookie || "").split(/;\s*/).find((c) => c.startsWith(COOKIE + "="));
  if (!raw) return null;
  const [exp, peran, sig] = raw.slice(COOKIE.length + 1).split(".");
  if (!exp || !PERAN.has(peran) || !sig || Number(exp) < Date.now()) return null;
  try { return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(sign(exp, peran))) ? peran : null; } catch { return null; }
}
export function samaAman(a, b) {
  const x = crypto.createHash("sha256").update(String(a)).digest(), y = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
}
// Ekstensi host memakai Bearer PUSH_TOKEN (untuk kirim data Shopee & membaca ringkasan).
export function tokenEkstensi(req) {
  const want = process.env.PUSH_TOKEN || "";
  const auth = req.headers.authorization || "";
  return !!want && auth.startsWith("Bearer ") && samaAman(auth.slice(7), want);
}
export function readBody(req, limitMb = 1) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > limitMb * 1024 * 1024) { reject(new Error("body terlalu besar")); req.destroy(); return; }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}
export function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
}
