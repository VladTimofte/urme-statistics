import { NextResponse } from "next/server";
import { getAllOrdersForProduct } from "../../../../lib/woo";
import { cookies } from "next/headers";
import {
  verifySessionToken,
  SESSION_COOKIE_NAME,
} from "../../../../lib/session.js";

function isPaidStatus(status) {
  return status === "processing" || status === "completed";
}

export async function GET() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE_NAME)?.value || null;
  const session = verifySessionToken(token, {
    secret: process.env.AUTH_SECRET,
  });

  if (!session || (session.role !== "admin" && session.role !== "guest")) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const productId = Number(process.env.WOO_PRODUCT_ID || 4350);
  const totalStock = Number(process.env.WOO_TOTAL_STOCK || 150);

  const orders = await getAllOrdersForProduct({ productId });

  let paidOrders = 0;
  let paidTickets = 0;

  for (const o of orders) {
    const status = o.status;
    const isPaid = isPaidStatus(status);

    // qty for product in this order
    const line = (o.line_items || []).find(
      (li) => Number(li.product_id) === productId,
    );
    const qty = Number(line?.quantity || 0);

    if (isPaid) {
      paidOrders += 1;
      paidTickets += qty;
    }
  }

  const remaining = Math.max(0, totalStock - paidTickets);

  return NextResponse.json({
    ok: true,
    productId,
    totalStock,
    paidOrders,
    paidTickets,
    remaining,
  });
}
