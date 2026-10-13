// POST {password} → cookie sesi admin. Hanya admin (Yeni + host) yang login; tamu membuka dashboard tanpa password.
import { makeCookie, readBody, COOKIE, samaAman } from "./_auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method" });
  let body = {};
  try { body = JSON.parse((await readBody(req, 0.01)).toString() || "{}"); } catch {}
  const given = String(body.password || "");
  await new Promise((r) => setTimeout(r, 400)); // perlambat tebak-tebakan
  const admin = process.env.ADMIN_PASSWORD || "";
  const peran = given && admin && samaAman(given, admin) ? "admin" : null;
  if (!peran || !process.env.SESSION_SECRET) return res.status(401).json({ error: "Password salah" });
  const { value } = makeCookie(peran);
  res.setHeader("Set-Cookie", `${COOKIE}=${value}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${14 * 86400}`);
  res.json({ ok: true, peran });
}
