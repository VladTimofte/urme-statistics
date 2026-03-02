import crypto from "crypto";

export const SESSION_COOKIE_NAME = "urme_session";

function base64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function sign(data, secret) {
  return crypto
    .createHmac("sha256", secret)
    .update(data)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

export function createSessionToken(
  payload,
  { secret, ttlSeconds = 60 * 60 * 12 } = {},
) {
  if (!secret) throw new Error("AUTH_SECRET missing");
  const now = Math.floor(Date.now() / 1000);

  const body = { ...payload, iat: now, exp: now + ttlSeconds };
  const bodyB64 = base64url(JSON.stringify(body));
  const sig = sign(bodyB64, secret);
  return `${bodyB64}.${sig}`;
}

export function verifySessionToken(token, { secret } = {}) {
  if (!token) return null;
  if (!secret) throw new Error("AUTH_SECRET missing");

  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [bodyB64, sig] = parts;
  const expected = sign(bodyB64, secret);

  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)))
      return null;
  } catch {
    return null;
  }

  try {
    const json = JSON.parse(
      Buffer.from(
        bodyB64.replace(/-/g, "+").replace(/_/g, "/"),
        "base64",
      ).toString("utf8"),
    );
    const now = Math.floor(Date.now() / 1000);
    if (!json.exp || now > json.exp) return null;
    return json;
  } catch {
    return null;
  }
}

export function sessionCookieOptions({ maxAgeSeconds = 60 * 60 * 12 } = {}) {
  const isProd = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd, // ✅ secure doar in production (Vercel)
    path: "/",
    maxAge: maxAgeSeconds,
  };
}
