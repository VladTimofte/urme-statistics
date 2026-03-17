import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  verifySessionToken,
  SESSION_COOKIE_NAME,
} from "../../../../lib/session.js";
import { createOrder } from "../../../../lib/woo.js";
import {
  validateUrmeOrderInput,
  buildCreateOrderPayload,
} from "../../../../lib/urme-order.js";

async function requireAdmin() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE_NAME)?.value || null;

  const session = verifySessionToken(token, {
    secret: process.env.AUTH_SECRET,
  });

  return session && session.role === "admin" ? session : null;
}

export async function POST(req) {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await req.json();
    const validation = validateUrmeOrderInput(body);

    if (!validation.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "Date invalide.",
          details: validation.errors,
        },
        { status: 400 },
      );
    }

    const payload = buildCreateOrderPayload(validation.normalized);
    const created = await createOrder(payload);

    return NextResponse.json({
      ok: true,
      order: created,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Nu am putut crea comanda.",
      },
      { status: 500 },
    );
  }
}
