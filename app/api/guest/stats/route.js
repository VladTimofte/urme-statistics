import { NextResponse } from "next/server";
import { getAllOrdersForProduct } from "../../../../lib/woo";

function isPaidStatus(status) {
  return status === "processing" || status === "completed";
}

export async function GET() {
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
