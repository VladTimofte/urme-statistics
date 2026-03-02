import { NextResponse } from "next/server";
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from "../../../../lib/session.js";

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const username = String(body.username || "");
  const password = String(body.password || "");

  const adminU = process.env.AUTH_ADMIN_USER;
  const adminP = process.env.AUTH_ADMIN_PASS;
  const guestU = process.env.AUTH_GUEST_USER;
  const guestP = process.env.AUTH_GUEST_PASS;

  let role = null;
  if (username === adminU && password === adminP) role = "admin";
  if (username === guestU && password === guestP) role = "guest";

  if (!role) {
    return NextResponse.json(
      { ok: false, error: "Invalid credentials" },
      { status: 401 },
    );
  }

  const token = createSessionToken(
    { role, username },
    { secret: process.env.AUTH_SECRET, ttlSeconds: 60 * 60 * 12 },
  );

  const res = NextResponse.json({ ok: true, role });
  res.cookies.set(
    SESSION_COOKIE_NAME,
    token,
    sessionCookieOptions({ maxAgeSeconds: 60 * 60 * 12 }),
  );
  return res;
}
