import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  verifySessionToken,
  SESSION_COOKIE_NAME,
} from "../../../../../lib/session.js";
import { getOrder, updateOrder } from "../../../../../lib/woo.js";
import {
  validateUrmeOrderInput,
  buildUpdateOrderPayload,
  extractEditableOrder,
} from "../../../../../lib/urme-order.js";

async function requireAdmin() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE_NAME)?.value || null;

  const session = verifySessionToken(token, {
    secret: process.env.AUTH_SECRET,
  });

  return session && session.role === "admin" ? session : null;
}

export async function GET(_req, context) {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id: rawId } = await context.params;
    const orderId = Number(rawId);

    if (!orderId) {
      return NextResponse.json(
        { ok: false, error: "Order id invalid." },
        { status: 400 },
      );
    }

    const order = await getOrder(orderId);
    const editable = extractEditableOrder(order);

    return NextResponse.json({
      ok: true,
      order,
      editable,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Nu am putut citi comanda.",
      },
      { status: 500 },
    );
  }
}

export async function PUT(req, context) {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id: rawId } = await context.params;
    const orderId = Number(rawId);

    if (!orderId) {
      return NextResponse.json(
        { ok: false, error: "Order id invalid." },
        { status: 400 },
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

    const existingOrder = await getOrder(orderId);
    const payload = buildUpdateOrderPayload(
      existingOrder,
      validation.normalized,
    );

    const updated = await updateOrder(orderId, payload);

    return NextResponse.json({
      ok: true,
      order: updated,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Nu am putut actualiza comanda.",
      },
      { status: 500 },
    );
  }
}
